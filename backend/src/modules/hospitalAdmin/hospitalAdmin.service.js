import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import otpGen from 'otp-generator';
import { sendOtpEmail } from '../../services/sendOtpByEmail.js';
import {
  createAdmin,
  createTempAdmin,
  deleteTempAdmin,
  getAdminDetails,
  getadminId,
  getOtpTempAdmin,
} from './hospitalAdmin.repo.js';

export const signupAdminService = async ({ email, password }) => {
  const existingAdmin = await getadminId({ email });
  if (existingAdmin) {
    return {
      success: false,
      code: 400,
      message: 'Email already in use, you have a account with us',
    };
  }
  const hashedPassword = await bcrypt.hash(password, 12);
  const otp = otpGen.generate(6, {
    upperCaseAlphabets: true,
    specialChars: true,
    lowerCaseAlphabets: false,
    digits: true,
  });
  sendOtpEmail(email, otp);
  const hashedOtp = await bcrypt.hash(otp, 10);
  await createTempAdmin({
    email,
    hashedPassword,
    hashedOtp,
  });
  const token = jwt.sign(
    { adminEmail: email },
    process.env.VERIFY_OTP_TOKEN_SECRET,
    { expiresIn: '10m' },
  );
  return {
    success: true,
    code: 200,
    message:
      'Temporary hospital admin created successfully, verify OTP to complete registration',
    token,
  };
};

export const verifyAdminService = async ({ otp, token }) => {
  try {
    const decoded = jwt.verify(token, process.env.VERIFY_OTP_TOKEN_SECRET);
    const email = decoded.adminEmail;
    const tempAdmin = await getOtpTempAdmin({ email });
    if (!tempAdmin) {
      return {
        success: false,
        code: 404,
        message: 'Temporary admin not found',
      };
    }
    const isOtpValid = await bcrypt.compare(otp, tempAdmin.otp);
    if (!isOtpValid) {
      return {
        success: false,
        code: 400,
        message: 'Invalid OTP',
      };
    }
    // Create permanent hospital admin
    const permanentAdmin = await createAdmin({
      email: tempAdmin.email,
      password: tempAdmin.password,
    });
    // Delete temporary admin
    await deleteTempAdmin({ email: tempAdmin.email });
    // Generate JWT token for permanent admin
    const jwtToken = jwt.sign(
      { adminId: permanentAdmin.adminId },
      process.env.JWT_ADMIN_SECRET,
      { expiresIn: '1h' },
    );
    return {
      success: true,
      code: 201,
      message: 'OTP verified successfully',
      email: permanentAdmin.email,
      token: jwtToken,
    };
  } catch (error) {
    return {
      success: false,
      code: 400,
      message: 'Invalid token or token expired',
    };
  }
};

export const adminLoginService = async ({ email, password }) => {
  const admin = await getAdminDetails({ email });
  if (!admin) {
    return {
      success: false,
      code: 400,
      message: 'Invalid email or password',
    };
  }
  const isPasswordValid = await bcrypt.compare(password, admin.password);
  if (!isPasswordValid) {
    return {
      success: false,
      code: 400,
      message: 'Invalid email or password',
    };
  }
  const token = jwt.sign(
    { adminId: admin.adminId },
    process.env.JWT_ADMIN_SECRET,
    {
      expiresIn: '1h',
    },
  );
  return {
    success: true,
    message: 'Login successful',
    code: 200,
    email: admin.email,
    token,
  };
};
