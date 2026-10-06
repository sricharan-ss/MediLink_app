import express from 'express';
const router = express.Router();
import {
  loginAdmin,
  signupAdmin,
  verifyOtp,
} from '../modules/hospitalAdmin/authHospitalAdmin.controller.js';
import { adminAuthMiddleware, authMiddleware } from '../middleware/authMiddleware.js';
import {
  createRequest,
  linkDoctorToHospital,
  linkInventoryManagerWithHospital,
  linkLabManagerWithHospital,
  linkNurseWithHospital,
  linkReceptionistWithHospital,
  viewRequest,
} from '../modules/hospitalAdmin/hospitalAdmin.controller.js';

router.post('/signup', signupAdmin);
router.post('/verify-otp', verifyOtp);
router.post('/login', loginAdmin);

router.patch('/link-doctor', adminAuthMiddleware, linkDoctorToHospital);
router.patch('/link-nurse', adminAuthMiddleware, linkNurseWithHospital);
router.patch(
  '/link-lab-manager',
  adminAuthMiddleware,
  linkLabManagerWithHospital,
);
router.patch(
  '/link-inventory-manager',
  adminAuthMiddleware,
  linkInventoryManagerWithHospital,
);
router.patch(
  '/link-Receptionist',
  adminAuthMiddleware,
  linkReceptionistWithHospital,
);
router.get('/view-requests',adminAuthMiddleware,viewRequest)

router.post('/create-request',authMiddleware,createRequest)

export default router;
