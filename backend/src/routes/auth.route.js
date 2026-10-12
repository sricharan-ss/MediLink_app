import express from 'express';
import {
  authUserOtp,
  loginEmail,
  loginPhone,
  loginPhoneOtpVerify,
  logout,
  verifyOtp,
  verifyOtpTemp,
} from '../modules/users/userAuth.controller.js';

const router = express.Router();

router.post('/user', authUserOtp);
router.post('/verify-otp', verifyOtp);
router.post('/verify-otp-temp', verifyOtpTemp);
router.post('/login/phone', loginPhone);
router.post('/login/phone/verify', loginPhoneOtpVerify);
router.post('/login/email', loginEmail);
router.post('/logout', logout);

export default router;
