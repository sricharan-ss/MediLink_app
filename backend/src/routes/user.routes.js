import express from 'express';
import {
  getProfilePhoto,
  getUserByIdController,
  getUserByNameController,
  getVaultData,
  myInfoController,
  uploadProfilePhoto,
  uploadVault,
} from '../modules/users/user.controller.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
``;
const router = express.Router();
import upload from '../middleware/multerMiddleware.js';
import {
  imageValidation,
  vaultValidation,
} from '../middleware/fileValidaton.js';

router.get('/userbyid', getUserByIdController);
router.get('/userbyname', getUserByNameController);
router.get('/myinfo', authMiddleware, myInfoController);
router.post(
  '/uploadProfile',
  authMiddleware,
  upload.single('file'),
  imageValidation,
  uploadProfilePhoto,
);
router.post(
  '/uploadVault',
  authMiddleware,
  upload.single('file'),
  vaultValidation,
  uploadVault,
);
router.get('/vault', authMiddleware, getVaultData);
router.get('/profile', authMiddleware, getProfilePhoto);

export default router;
