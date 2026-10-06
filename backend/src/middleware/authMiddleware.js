import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  const accessToken = req.headers.authorization;
  if (!accessToken || !accessToken.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'UNAUTHORIZED',
      message: 'Authorization header missing or malformed',
    });
  }
  const token = accessToken.split(' ')[1];
  let accessTokenSecret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!accessTokenSecret) {
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_INSECURE_JWT === 'true') {
      console.warn('Using insecure fallback JWT secret because ALLOW_INSECURE_JWT=true in development');
      accessTokenSecret = 'dev-insecure-secret';
    } else {
      return res.status(500).json({
        status: 'ERROR',
        message: 'Server JWT secret not configured',
      });
    }
  }

  try {
    const decoded = jwt.verify(token, accessTokenSecret);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }
};

export const adminAuthMiddleware = (req, res, next) => {
  const accessToken = req.headers.authorization;
  if (!accessToken || !accessToken.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'UNAUTHORIZED',
      message: 'Authorization header missing or malformed',
    });
  }
  const token = accessToken.split(' ')[1];
  let adminTokenSecret = process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET;
  if (!adminTokenSecret) {
    if (process.env.NODE_ENV === 'development' && process.env.ALLOW_INSECURE_JWT === 'true') {
      console.warn('Using insecure fallback admin JWT secret because ALLOW_INSECURE_JWT=true in development');
      adminTokenSecret = 'dev-insecure-secret';
    } else {
      return res.status(500).json({
        status: 'ERROR',
        message: 'Server admin JWT secret not configured',
      });
    }
  }

  try {
    const decoded = jwt.verify(token, adminTokenSecret);
    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'UNAUTHORIZED',
      message: 'Invalid or expired token',
    });
  }
};
