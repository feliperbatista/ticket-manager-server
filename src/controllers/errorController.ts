import { NextFunction, Request, Response } from 'express';
import AppError from '../utils/appError';
import { getEnvVar } from '../utils/config';
import { MongooseError } from 'mongoose';

interface MongoError extends Error {
  code?: number;
  keyValue?: Record<string, any>;
  path?: string;
  value?: string;
  erorrs?: Record<string, any>;
}

const handleCastErrorDB = (err: MongoError) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldDB = (err: MongoError) => {
  const message = `Duplicate field value "${err.keyValue?.name || 'Unkown'}". Please use another value.`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err: MongoError) => {
  const errors = Object.values(err.erorrs || {}).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please log in again', 401);

const sendErrorDev = (err: AppError, res: Response) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err: AppError, res: Response) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.log('❌ ERROR: ', err);
    res.status(err.statusCode).json({
      status: 'error',
      message: 'Something went very wrong',
    });
  }
};

const globalErrorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  const nodeEnv = getEnvVar('NODE_ENV');
  if (nodeEnv === 'development') {
    sendErrorDev(err as AppError, res);
  } else {
    let error: AppError | MongooseError = { ...err };

    if (err.name === 'CastError') error = handleCastErrorDB(err);
    if (err.statusCode === 11000) error = handleDuplicateFieldDB(err);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error as AppError, res);
  }
};

export default globalErrorHandler;
