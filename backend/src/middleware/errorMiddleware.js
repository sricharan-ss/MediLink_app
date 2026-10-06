const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err && err.name === 'ZodError') {
    return res.status(400).json({
      status: 'FAIL',
      message: 'Validation failed',
      error: err.issues,
    });
  }

  const statusCode = err?.statusCode || 500;
  return res.status(statusCode).json({
    status: statusCode >= 500 ? 'ERROR' : 'FAIL',
    message: err?.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err?.stack : undefined,
  });
};

export default errorHandler;
