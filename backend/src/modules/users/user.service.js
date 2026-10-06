import { sendOtpNum } from '../../services/sendOtpByNumber.js';
import {
  createNewUser,
  createTempUserEmail,
  createTempUserPhone,
  createUser,
  deleteUserOtp,
  findUserByNumber,
  getMpin,
  getPassword,
  getTempUser,
  getUserByEmail,
  getUserOtp,
  setMpin,
  setPassword,
  updateOtp,
  userPassEmail,
  userPassPhone,
} from './user.repo.js';
import otpGen from 'otp-generator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { sendOtpEmail } from '../../services/sendOtpByEmail.js';

let verifyOtpSecret = process.env.VERIFY_OTP_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
let accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
let refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

function ensureJwtSecret(name, value) {
  if (!value) {
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_INSECURE_JWT === 'true') {
      console.warn(`Using insecure fallback for ${name} because ALLOW_INSECURE_JWT=true in development`);
      return 'dev-insecure-secret';
    }
    throw new Error(`${name} is not configured. Set the appropriate environment variable.`);
  }
  return value;
}

function getDevOtp(otp) {
  return process.env.NODE_ENV === 'development' && process.env.OTP_MOCK === 'true'
    ? otp
    : undefined;
}

verifyOtpSecret = ensureJwtSecret('VERIFY_OTP_TOKEN_SECRET', verifyOtpSecret);
accessTokenSecret = ensureJwtSecret('ACCESS_TOKEN_SECRET', accessTokenSecret);
refreshTokenSecret = ensureJwtSecret('REFRESH_TOKEN_SECRET', refreshTokenSecret);

export const authUserOtpService = async ({
  firstName,
  lastName,
  phoneNumber,
}) => {
  // checking that user exists or not
  const user = await findUserByNumber({ phoneNumber });

  // user does not exists
  if (!user) {
    // create user
    if (!firstName || !lastName) {
      return {
        success: false,
        code: 400,
        status: 'ERROR',
        message: 'First name and last name are required for new users',
      };
    }
    const otp = otpGen.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false,
      digits: true,
    });
    const otpCheck = await sendOtpNum({ phoneNumber, otp });
    if (!otpCheck) {
      return {
        success: false,
        code: 500,
        status: 'ERROR',
        message: 'Failed to send OTP. Please try again later.',
      };
    }
    const hashedOtp = await bcrypt.hash(otp, 12);
    const newUser = await createNewUser({
      firstName,
      lastName,
      phoneNumber,
      hashedOtp,
    });
    const token = jwt.sign(
      {
        userId: newUser.userId,
      },
      verifyOtpSecret,
      { expiresIn: '10m' },
    );
    return {
      success: true,
      code: 201,
      status: 'OK',
      message: 'New User created and OTP sent successfully',
      data: {
        firstName: newUser.firstName,
        phoneNumber: newUser.phoneNumber,
      },
      token,
      devOtp: getDevOtp(otp),
    };
  }

  // user exists: do not allow signup flow for existing accounts.
  return {
    success: false,
    code: 409,
    status: 'ERROR',
    message: 'You already have an account, so you can only login.',
  };
};

export const verifyOTPService = async ({ token, otp }) => {
  try {
    const decoded = jwt.verify(token, verifyOtpSecret);
    const userId = decoded.userId;
    const user = await getUserOtp({ userId });
    if (!user || !user.otp) {
      return {
        success: false,
        code: 400,
        status: 'ERROR',
        message: 'Invalid token or OTP not found in DATABASE',
      };
    }
    const isOtpValid = await bcrypt.compare(otp, user.otp);
    if (!isOtpValid) {
      return {
        success: false,
        code: 400,
        status: 'ERROR',
        message: 'Invalid OTP',
      };
    }
    // OTP is valid, generate authentication token
    const accessToken = jwt.sign(
      {
        userId: user.userId,
      },
      accessTokenSecret,
      { expiresIn: '15m' },
    );
    const refreshToken = jwt.sign(
      {
        userId: user.userId,
      },
      refreshTokenSecret,
      { expiresIn: '14d' },
    );
    // delete otp from database
    await deleteUserOtp({ userId });
    return {
      success: true,
      status: 'OK',
      message: 'OTP verified successfully',
      accessToken,
      refreshToken,
    };
  } catch (error) {
    return {
      success: false,
      code: 400,
      status: 'ERROR',
      message: 'Invalid or expired token',
    };
  }
};

export const setMpinService = async ({ userId, mpin }) => {
  const hashedMpin = await bcrypt.hash(mpin, 12);
  await setMpin({ userId, hashedMpin });
  return {
    status: 'OK',
    message: 'MPIN set successfully',
  };
};

export const loginByMpinService = async ({ phoneNumber, mpin }) => {
  const user = await getMpin({ phoneNumber });
  if (!user || !user.mpin) {
    return {
      success: false,
      code: 400,
      status: 'ERROR',
      message: 'User not found or MPIN not set',
    };
  }
  const isMpinValid = await bcrypt.compare(mpin, user.mpin);
  if (!isMpinValid) {
    return {
      success: false,
      code: 400,
      status: 'ERROR',
      message: 'Invalid MPIN',
    };
  }
  // MPIN is valid, generate authentication token
  const accessToken = jwt.sign(
    {
      userId: user.userId,
    },
    accessTokenSecret,
    { expiresIn: '15m' },
  );
  const refreshToken = jwt.sign(
    {
      userId: user.userId,
    },
    refreshTokenSecret,
    { expiresIn: '14d' },
  );
  return {
    success: true,
    status: 'OK',
    message: 'Logged in successfully',
    accessToken,
    refreshToken,
  };
};

export const setPasswordService = async ({ userId, password }) => {
  const hashedPassword = await bcrypt.hash(password, 12);
  await setPassword({ userId, hashedPassword });
  return {
    status: 'OK',
    message: 'Password set successfully',
  };
};

export const loginByPasswordService = async ({ password, phoneNumber }) => {
  const user = await getPassword({ phoneNumber });
  if (!user || !user.password) {
    return {
      success: false,
      code: 400,
      status: 'ERROR',
      message: 'User not found or password not set',
    };
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return {
      success: false,
      code: 400,
      status: 'ERROR',
      message: 'Invalid password',
    };
  }
  // Password is valid, generate authentication token
  const accessToken = jwt.sign(
    {
      userId: user.userId,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' },
  );
  const refreshToken = jwt.sign(
    {
      userId: user.userId,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '14d' },
  );
  return {
    success: true,
    status: 'OK',
    message: 'Logged in successfully',
    accessToken,
    refreshToken,
  };
};

export const signupEmailService = async ({
  firstName,
  lastName,
  email,
  password,
}) => {
  const user = await getUserByEmail({ email });
  if (user) {
    return {
      code: 400,
      status: 'failed',
      message: 'User already exists in Database',
      setUp: user.setUp,
    };
  }
  const otp = otpGen.generate(6, {
    upperCaseAlphabets: true,
    specialChars: false,
    lowerCaseAlphabets: false,
    digits: true,
  });
  sendOtpEmail(email, otp);
  const hashedOtp = await bcrypt.hash(otp, 12);
  const hashedPassword = await bcrypt.hash(password, 12);
  const tempUser = await createTempUserEmail({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    otp: hashedOtp,
  });
  const token = jwt.sign(
    {
      userId: tempUser.tempUserId,
    },
    process.env.VERIFY_OTP_TOKEN_SECRET,
    { expiresIn: '10m' },
  );
  return {
    code: 201,
    message: 'temperary user created please verify your email',
    token,
    status: 'success',
  };
};

export const signupPhoneService = async ({
  firstName,
  lastName,
  phoneNumber,
}) => {
  const user = await findUserByNumber({ phoneNumber });
  if (user) {
    return {
      code: 400,
      status: 'failed',
      message: 'User already exists in Database',
      setUp: user.setUp,
    };
  }
  const otp = otpGen.generate(6, {
    upperCaseAlphabets: false,
    digits: true,
    specialChars: false,
    lowerCaseAlphabets: false,
  });
  const checkPhone = await sendOtpNum({ phoneNumber, otp });
  if (!checkPhone) {
    return {
      code: 500,
      status: 'failed',
      message: 'Unable to send otp to the Phone Number',
    };
  }
  const hashedOtp = await bcrypt.hash(otp, 12);
  const tempUser = await createTempUserPhone({
    firstName,
    lastName,
    phoneNumber,
    otp: hashedOtp,
  });
  const token = jwt.sign(
    {
      userId: tempUser.tempUserId,
    },
    process.env.VERIFY_OTP_TOKEN_SECRET,
    { expiresIn: '10m' },
  );
  return {
    code: 201,
    message: 'temperary user created please verify your phone number',
    token,
    status: 'success',
  };
};

export const verifyOtpTempService = async ({ token, otp }) => {
  try {
    const tokenData = jwt.verify(token, process.env.VERIFY_OTP_TOKEN_SECRET);
    const tempUserId = tokenData.userId;
    const tempUser = await getTempUser({ tempUserId });
    const checkOtp = await bcrypt.compare(otp, tempUser.otp);
    if (!checkOtp) {
      return {
        success: false,
        code: 400,
        status: 'ERROR',
        message: 'Invalid OTP',
      };
    }
    const user = await createUser({
      firstName: tempUser.firstName,
      lastName: tempUser.lastName,
      email: tempUser.email,
      phoneNumber: tempUser.phoneNumber,
      mpin: tempUser.mpin,
      password: tempUser.password,
    });
    const accessToken = jwt.sign(
      {
        userId: user.userId,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' },
    );
    const refreshToken = jwt.sign(
      {
        userId: user.userId,
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '14d' },
    );
    return {
      success: true,
      status: 'OK',
      message: 'OTP verified successfully user account created',
      accessToken,
      refreshToken,
    };
  } catch (error) {
    return {
      success: false,
      code: 400,
      status: 'ERROR',
      message: 'Invalid or expired token',
    };
  }
};

export const loginEmailService = async ({ email, password }) => {
  const userPass = await userPassEmail({ email });
  if (!userPass || !userPass.password) {
    return {
      code: 404,
      message: 'user does not have a account in database',
      status: 'ERROR',
      success: false,
    };
  }
  const passCheck = await bcrypt.compare(password, userPass.password);
  if (!passCheck) {
    return {
      code: 400,
      message: 'Invalid Password',
      status: 'ERROR',
      success: false,
    };
  }
  const accessToken = jwt.sign(
    {
      userId: userPass.userId,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' },
  );
  const refreshToken = jwt.sign(
    {
      userId: userPass.userId,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '14d' },
  );
  return {
    success: true,
    status: 'OK',
    message: 'user verified',
    accessToken,
    refreshToken,
    setUp: userPass.setUp,
  };
};

export const loginPhoneService = async ({ phoneNumber }) => {
  const user = await findUserByNumber({ phoneNumber });
  if (!user) {
    return {
      code: 404,
      message: 'user does not have a account in database',
      status: 'ERROR',
    };
  }
  const otp = otpGen.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
    digits: true,
  });
  const hashedOtp = await bcrypt.hash(otp, 12);
  await updateOtp({ userId: user.userId, hashedOtp });
  sendOtpNum({ phoneNumber, otp });
  const token = jwt.sign(
    { userId: user.userId },
    process.env.LOGINPHONESECRET,
    { expiresIn: '10m' },
  );
  return {
    token,
    message: 'please verify yourself by otp',
    status: 'otp send',
    code: 200,
    devOtp: getDevOtp(otp),
  };
};

export const loginPhoneOtpVerifyService = async ({ token, otp }) => {
  try {
    const tokenData = jwt.verify(token, process.env.LOGINPHONESECRET);
    const userId = tokenData.userId;
    const userPass = await userPassPhone({ userId });
    if (!userPass.otp) {
      return {
        code: 400,
        success: false,
        message: 'user otp not found',
        status: 'ERROR',
      };
    }
    const checkOtp = await bcrypt.compare(otp, userPass.otp);
    if (!checkOtp) {
      return {
        code: 400,
        success: false,
        message: 'invalid otp',
        status: 'ERROR',
      };
    }
    const accessToken = jwt.sign(
      {
        userId: userPass.userId,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' },
    );
    const refreshToken = jwt.sign(
      {
        userId: userPass.userId,
      },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '14d' },
    );
    await deleteUserOtp({ userId: userPass.userId });
    return {
      success: true,
      status: 'OK',
      message: 'OTP verified successfully',
      accessToken,
      refreshToken,
      setUp: userPass.setUp,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      code: 400,
      message: 'Token corrupted',
      status: 'ERROR',
    };
  }
};
