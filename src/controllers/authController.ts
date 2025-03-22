import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import validator from 'validator';
import crypto from 'crypto';
import { User, IUser } from '../models/userModel';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/appError';
import { getEnvVar } from '../utils/config';
import sendEmail from '../utils/email';

const signToken = (id: string): string => {
  const secret = getEnvVar('JWT_SECRET');
  const expiresInValue = Number(getEnvVar('JWT_SECRET_EXPIRES_IN'));

  return jwt.sign({ id }, secret, { expiresIn: expiresInValue });
};

const createSendToken = (
  user: IUser,
  statusCode: number,
  res: Response,
): void => {
  const token = signToken(user._id);
  const cookieOptions: {
    expires: Date;
    httpOnly: boolean;
    secure?: boolean;
  } = {
    expires: new Date(
      Date.now() +
        Number(getEnvVar('JWT_SECRET_EXPIRES_IN')) * 24 * 60 * 1000,
    ),
    httpOnly: true,
  };

  const nodeEnv = getEnvVar('NODE_ENV');
  if (nodeEnv === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = '';

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

const verifyToken = (
  token: string,
  secret: string,
): Promise<{ id: string; iat: number; exp: number }> =>
  new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        reject(err);
      } else {
        resolve(decoded as { id: string; iat: number; exp: number });
      }
    });
  });

export const singup: RequestHandler = catchAsync(
  async (req, res, next) => {
    const { name, email, password, passwordConfirm } = req.body;

    if (!name || !email || !password || !passwordConfirm) {
      res.status(400).json({ message: 'All fields are required' });
    }

    const newUser = new User({
      name,
      email,
      password,
      passwordConfirm,
    });

    await newUser.save();

    res.status(201).json({
      message: 'success',
      user: newUser,
    });
  },
);

export const login: RequestHandler = catchAsync(
  async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(
        new AppError('Please provide email and password', 400),
      );
    }

    const user = await User.findOne({ email }).select('+password');

    if (
      !user ||
      !(await user.correctPassword(password, user.password))
    ) {
      return next(new AppError('Incorrect email or password', 401));
    }

    createSendToken(user, 200, res);
  },
);

export const protect: RequestHandler = catchAsync(
  async (req, res, next) => {
    let token: string | undefined;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(
        new AppError(
          'You are not logged in! Please log in to get access.',
          401,
        ),
      );
    }

    const decoded = await verifyToken(token, getEnvVar('JWT_SECRET'));
    const { iat, exp } = decoded;
    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next(
        new AppError(
          'The user belonging to this token does no longer exist',
          401,
        ),
      );
    }

    if (currentUser.changedPasswordAfter(exp)) {
      return next(
        new AppError(
          'User recently changed password! Please log in again',
          401,
        ),
      );
    }

    req.user = currentUser;

    next();
  },
);

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError(
          'You do not have permission to perform this action',
          403,
        ),
      );
    }
    next();
  };
};

export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email || !validator.isEmail(email)) {
    return next(new AppError('Please inform a correct email.', 400));
  }

  const user = await User.findOne({ email: email });

  if (!user) {
    return next(
      new AppError(
        'There is no user with the informed email address',
        404,
      ),
    );
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetUrl}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail(
      email,
      'Your password reset token (valid for 30 min)',
      message,
    );

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (error) {
    console.log(error);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later',
        500,
      ),
    );
  }
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { password, passwordConfirm } = req.body;

  if (!password || !passwordConfirm) {
    return next(
      new AppError(
        'Please inform password and password confirm.',
        400,
      ),
    );
  }

  if (!token) {
    return next(new AppError('Please inform the reset token.', 400));
  }

  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(
      new AppError('Token is invalide or has expired', 400),
    );
  }

  user.password = password;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  await user.save();

  createSendToken(user, 200, res);
});

export const updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, newPasswordConfirm } =
    req.body;

  if (!currentPassword || !newPassword) {
    return next(
      new AppError('Please provide current and new password', 400),
    );
  }

  const user = await User.findById(req.user._id).select('+password');

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  user.password = newPassword;
  user.passwordConfirm = newPasswordConfirm;

  await user.save();

  createSendToken(user, 200, res);
});
