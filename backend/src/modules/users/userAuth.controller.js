import {
  authUserOtpSchema,
  authWithMpinSchema,
  authWithPasswordSchema,
  emailOtpSchema,
  loginEmailSchema,
  passwordSchema,
  phoneOtpSchema,
} from './user.validator.js';
import { fromError, fromZodError } from 'zod-validation-error';
import jwt from 'jsonwebtoken';
import {
  authUserOtpService,
  loginByMpinService,
  loginByPasswordService,
  loginEmailService,
  loginPhoneOtpVerifyService,
  loginPhoneService,
  setMpinService,
  setPasswordService,
  signupEmailService,
  signupPhoneService,
  verifyOTPService,
  verifyOtpTempService,
} from './user.service.js';

export async function authUserOtp(req, res) {
  const validationResult = authUserOtpSchema.safeParse(req.body);
  if (!validationResult.success) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Validation failed',
      error: fromError(validationResult.error).message,
    });
  }
  const data = await authUserOtpService(validationResult.data);
  if (data.success == true) {
    return res.status(data.code).json({
      status: data.status,
      message: data.message,
      data: data.data,
      token: data.token,
      devOtp: data.devOtp,
    });
  }
  if (data.success == false) {
    return res.status(data.code).json({
      status: data.status,
      message: data.message,
    });
  }
}

export async function verifyOtp(req, res) {
  // this function will verify the otp and if otp is correct then it will generate a new token which will be used for authentication in future requests and also it will delete the otp from database after successful verification
  const otp = req.body?.otp;
  const headers = req.headers.authorization;
  if (!otp) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'OTP is required',
    });
  }
  if (!headers) {
    return res.status(401).json({
      status: 'ERROR',
      message: 'Token is missing or invalid Token format',
    });
  }
  const token = headers.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      status: 'ERROR',
      message: 'Token is missing or invalid Token format',
    });
  }
  const data = await verifyOTPService({ token, otp });
  if (data.success == true) {
    if (data.refreshToken) {
      // ###turn on secure cookie in production
      res.cookie('refreshToken', data.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days.
        httpOnly: true,
      });
    }
    res.json({
      status: data.status,
      message: data.message,
      accessToken: data.accessToken,
    });
  }
  if (data.success == false) {
    res.status(data.code).json({ status: data.status, message: data.message });
  }
}

export async function refreshAccessToken(req, res) {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({
      status: 'ERROR',
      message: 'Refresh token is missing',
    });
  }
  try {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const userId = decoded.userId;
    const accessToken = jwt.sign(
      {
        userId,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' },
    );
    return res.status(200).json({
      status: 'OK',
      message: 'Access token refreshed successfully',
      accessToken,
    });
  } catch (error) {
    return res.status(401).json({
      status: 'ERROR',
      message: 'Invalid or expired refresh token',
    });
  }
}

export async function logout(_req, res) {
  res.clearCookie('refreshToken');
  return res.status(200).json({
    status: 'OK',
    message: 'Logged out successfully',
  });
}

// in frontend patiens will only see log in by otp and mpin but for staff members options will be by otp and password
export async function setMpin(req, res) {
  const mpin = req.body?.mpin;
  const userId = req.userId;
  if (!mpin || mpin.length !== 6) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'MPIN must be a 6-digit number',
    });
  }
  const data = await setMpinService({ userId, mpin });
  return res.status(200).json({
    status: data.status,
    message: data.message,
  });
}

export async function loginWithMpin(req, res) {
  const validatedData = authWithMpinSchema.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Validation failed',
      error: fromError(validatedData.error).message,
    });
  }
  const data = await loginByMpinService(validatedData.data);
  if (data.success == true) {
    if (data.refreshToken) {
      // ###turn on secure cookie in production
      res.cookie('refreshToken', data.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days.
        httpOnly: true,
      });
    }
    return res.json({
      status: data.status,
      message: data.message,
      accessToken: data.accessToken,
    });
  }
  if (data.success == false) {
    res.status(data.code).json({
      status: data.status,
      message: data.message,
    });
  }
}

export async function setPassword(req, res) {
  const userId = req.userId;
  const passwordResult = passwordSchema.safeParse(req.body);
  if (!passwordResult.success) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Validation failed',
      error: fromError(passwordResult.error).message,
    });
  }
  const { password } = passwordResult.data;
  const data = await setPasswordService({ userId, password });
  return res.status(200).json({
    status: data.status,
    message: data.message,
  });
}

export async function loginWithPassword(req, res) {
  const validatedData = authWithPasswordSchema.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'Validation failed',
      error: fromError(validatedData.error).message,
    });
  }
  const data = await loginByPasswordService(validatedData.data);
  if (data.success == true) {
    if (data.refreshToken) {
      // ###turn on secure cookie in production
      res.cookie('refreshToken', data.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days.
        httpOnly: true,
      });
    }
    return res.json({
      status: data.status,
      message: data.message,
      accessToken: data.accessToken,
    });
  }
  if (data.success == false) {
    return res.status(data.code).json({
      status: data.status,
      message: data.message,
    });
  }
}

export const signupEmail = async (req, res) => {
  const validateResult = emailOtpSchema.safeParse(req.body);
  if (!validateResult.success) {
    return res.status(400).json({
      status: 'Failed',
      message: fromZodError(validateResult.error).message,
    });
  }
  const data = await signupEmailService(validateResult.data);
  return res.status(data.code).json({
    status: data.status,
    message: data.message,
    token: data.token,
    setUp: data.setUp,
  });
};

export const signUpPhone = async (req, res) => {
  const validateResult = phoneOtpSchema.safeParse(req.body);
  if (!validateResult.success) {
    return res.status(400).json({
      status: 'Failed',
      message: fromZodError(validateResult.error).message,
    });
  }
  const data = await signupPhoneService(validateResult.data);
  return res.status(data.code).json({
    status: data.status,
    message: data.message,
    token: data.token,
    setUp: data.setUp,
  });
};

export const verifyOtpTemp = async (req, res) => {
  const headers = req.headers.authorization;
  if (!headers) {
    return res.status(401).json({
      status: 'ERROR',
      message: 'Token is missing or invalid Token format',
    });
  }
  const otp = req.body?.otp;
  const token = req.headers.authorization.split(' ')[1];
  if (!otp) {
    return res.status(400).json({
      status: 'ERROR',
      message: 'OTP is required',
    });
  }
  if (!token) {
    return res.status(401).json({
      status: 'ERROR',
      message: 'Token is missing or invalid Token format',
    });
  }
  const data = await verifyOtpTempService({ token, otp });
  if (data.success == true) {
    if (data.refreshToken) {
      // ###turn on secure cookie in production
      res.cookie('refreshToken', data.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days.
        httpOnly: true,
      });
    }
    res.json({
      status: data.status,
      message: data.message,
      accessToken: data.accessToken,
    });
  }
  if (data.success == false) {
    res.status(data.code).json({ status: data.status, message: data.message });
  }
};

export const loginEmail = async (req, res) => {
  const validateResult = loginEmailSchema.safeParse(req.body);
  if (!validateResult.success) {
    return res.status(400).json({
      status: 'Failed',
      message: fromZodError(validateResult.error).message,
    });
  }
  const data = await loginEmailService(validateResult.data);
  if (data.success == true) {
    if (data.refreshToken) {
      // ###turn on secure cookie in production
      res.cookie('refreshToken', data.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days.
        httpOnly: true,
      });
    }
    return res.json({
      status: data.status,
      message: data.message,
      accessToken: data.accessToken,
      setUp: data.setUp,
    });
  }
  if (data.success == false) {
    return res.status(data.code).json({
      status: data.status,
      message: data.message,
    });
  }
};

export const loginPhone = async (req, res) => {
  const phoneNumber = req.body?.phoneNumber;
  if (!phoneNumber) {
    return res
      .status(400)
      .json({ message: 'phoneNumber not found', status: 'ERROR' });
  }
  const data = await loginPhoneService({ phoneNumber });
  return res.status(data.code).json({
    message: data.message,
    status: data.status,
    token: data.token,
    devOtp: data.devOtp,
  });
};

export const loginPhoneOtpVerify = async (req, res) => {
  const otp = req.body?.otp;
  if (!otp) {
    return res.status(400).json({
      message: 'otp not found',
      status: 'ERROR',
    });
  }
  const headers = req.headers.authorization;
  if (!headers) {
    return res.status(400).json({
      message: 'headers not found',
      status: 'ERROR',
    });
  }
  const token = headers.split(' ')[1];
  if (!token) {
    return res.status(400).json({
      message: 'token of invalid format',
      status: 'ERROR',
    });
  }
  const data = await loginPhoneOtpVerifyService({ token, otp });
  if (data.success == true) {
    if (data.refreshToken) {
      // ###turn on secure cookie in production
      res.cookie('refreshToken', data.refreshToken, {
        maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days.
        httpOnly: true,
      });
    }
    res.json({
      status: data.status,
      message: data.message,
      accessToken: data.accessToken,
      setUp: data.setUp,
    });
  }
  if (data.success == false) {
    res.status(data.code).json({ status: data.status, message: data.message });
  }
};
