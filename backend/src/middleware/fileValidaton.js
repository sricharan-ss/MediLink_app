import { fileTypeFromBuffer } from 'file-type';
import fs, { readFileSync } from 'fs';

export const imageValidation = async (req, res, next) => {
  const filePath = req.file?.path;
  if (!filePath) {
    return res.status(400).json({ success: false, message: 'file not found' });
  }
  const buffer = readFileSync(filePath);
  const type = await fileTypeFromBuffer(buffer);
  const allowedType = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!type || !allowedType.includes(type.mime)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.log('cannot delete the file');
      }
    });
    return res
      .status(400)
      .json({ success: false, mesaage: 'invalid file type' });
  }
  return next();
};

export const vaultValidation = async (req, res, next) => {
  const filePath = req.file?.path;
  if (!filePath) {
    return res.status(400).json({ success: false, message: 'file not found' });
  }
  const buffer = readFileSync(filePath);
  const type = await fileTypeFromBuffer(buffer);
  const allowedType = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/pdf',
  ];
  if (!type || !allowedType.includes(type.mime)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.log('cannot delete the file');
      }
    });
    return res
      .status(400)
      .json({ success: false, mesaage: 'invalid file type' });
  }
  return next();
};
