import {
  adminLoginSchema,
  adminSignupSchema,
} from './hospitalAdmin.validate.js';
import { fromError } from 'zod-validation-error';
import {
  adminLoginService,
  signupAdminService,
  verifyAdminService,
} from './hospitalAdmin.service.js';

export async function signupAdmin(req, res) {
  const validatedData = adminSignupSchema.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: fromError(validatedData.error).message,
    });
  }
  const data = await signupAdminService(validatedData.data);
  return res.status(data.code).json({
    success: data.success,
    message: data.message,
    token: data.token,
  });
}

export async function verifyOtp(req, res) {
  const otp = req.body?.otp;
  const token = req.headers?.authorization?.split(' ')[1];
  if (!otp) {
    return res.status(400).json({
      success: false,
      message: 'OTP not found',
    });
  }
  if (!token) {
    return res.status(400).json({
      success: false,
      message: 'Token not found or token of invalid format',
    });
  }
  const data = await verifyAdminService({ otp, token });
  return res.status(data.code).json({
    success: data.success,
    message: data.message,
    email: data.email,
    token: data.token,
  });
}

export async function loginAdmin(req, res) {
  const validatedData = adminLoginSchema.safeParse(req.body);
  if (!validatedData.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: fromError(validatedData.error).message,
    });
  }
  const data = await adminLoginService(validatedData.data);
  return res.status(data.code).json({
    success: data.success,
    message: data.message,
    email: data.email,
    token: data.token,
  });
}
