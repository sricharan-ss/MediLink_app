import cloudinary from '../../config/cloudinary.config.js';
import {
  addFileToVault,
  addProfile,
  getMyInfo,
  getProfile,
  getUserById,
  getUserByName,
  getVault,
} from './user.repo.js';
import { userByNameSchema } from './user.validator.js';
import { fromError } from 'zod-validation-error';
import fs from 'fs';

export const getUserByIdController = async (req, res) => {
  const userId = req.body?.userId;
  if (!userId) {
    return res.status(400).json({
      status: 'failed',
      message: 'userId not found',
    });
  }
  const user = await getUserById({ userId });
  if (!user) {
    return res.status(404).json({ message: 'user not found' });
  }
  return res.json({
    status: 'success',
    message: 'user found',
    data: user,
  });
};

export const getUserByNameController = async (req, res) => {
  const userNameResult = userByNameSchema.safeParse(req.body);
  if (!userNameResult.success) {
    return res.status(400).json({
      status: 'failed',
      error: fromError(userNameResult.error).message,
    });
  }
  const { name } = userNameResult.data;
  const user = await getUserByName({ name });
  if (!user) {
    return res.status(404).json({ message: 'user not found' });
  }
  return res.status(200).json({
    status: 'success',
    message: 'user found',
    data: user,
  });
};

export const myInfoController = async (req, res) => {
  const userId = req.userId;
  const user = await getMyInfo({ userId });
  res.json({ status: 'success', data: user });
};

export const uploadProfilePhoto = async (req, res) => {
  const userId = req.userId;
  const file = req.file?.path;
  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'something went wrong with upload',
    });
  }
  const cloudUpload = await cloudinary.uploader.upload(file, {
    use_filename: true,
    unique_filename: false,
    folder: 'medilink_user_profile',
    overwrite: true,
    quality: 'auto:eco',
  });
  await addProfile({ userId, profileUrl: cloudUpload.secure_url });
  fs.unlink(file, (err) => {
    if (err) {
      console.log('cannot delete the file');
    }
  });
  return res
    .status(201)
    .json({ message: 'profile picture added', url: cloudUpload.secure_url });
};

export const uploadVault = async (req, res) => {
  const userId = req.userId;
  const file = req.file?.path;
  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'something went wrong with upload',
    });
  }
  const cloudUpload = await cloudinary.uploader.upload(file, {
    use_filename: true,
    unique_filename: false,
    folder: 'medilink_user_vault',
    overwrite: true,
    quality: 'auto:eco',
  });
  await addFileToVault({
    userId,
    fileName: cloudUpload.original_filename,
    fileUrl: cloudUpload.secure_url,
  });
  fs.unlink(file, (err) => {
    if (err) {
      console.log('cannot delete the file');
    }
  });
  return res.status(201).json({
    message: 'file uploaded successfully',
    success: true,
  });
};

export const getProfilePhoto = async (req, res) => {
  const userId = req.userId;
  const profile = await getProfile({ userId });
  return res.status(200).json({
    success: true,
    message: 'profile photo',
    profile: profile.profile,
  });
};

export const getVaultData = async (req, res) => {
  const userId = req.userId;
  const { vaults } = await getVault({ userId });
  res.status(200).json({
    success: true,
    message: 'vault data',
    vaults,
  });
};
