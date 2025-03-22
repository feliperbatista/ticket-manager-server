import crypto from 'crypto';
import mongoose, { Document, CallbackError, Query } from 'mongoose';
import validator from 'validator';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  password: string;
  passwordConfirm?: string;
  role: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  active: boolean;
  [key: string]: any;
  correctPassword: (
    candidatePassword: string,
    userPassword: string,
  ) => Promise<boolean>;
  changedPasswordAfter: (JWTTimeStamp: number) => boolean;
  createPasswordResetToken: () => string;
}

const userSchema = new mongoose.Schema<IUser>({
  name: {
    type: String,
    required: [true, 'Please provide your name.'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email.'],
    unique: true,
    lowercase: true,
    validator: [validator.isEmail, 'Please provide a valid email.'],
  },
  password: {
    type: String,
    required: [true, 'Please provide your password.'],
    minlength: 8,
    select: false,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password.'],
    validate: {
      validator: function (this: IUser, el: string) {
        return el === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

//Hash password before saving
userSchema.pre<IUser>(
  'save',
  async function (next: (err?: CallbackError) => void) {
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 12);
    this.passwordConfirm = undefined;
    next();
  },
);

//Set password changed at on update
userSchema.pre<IUser>(
  'save',
  async function (next: (err?: CallbackError) => void) {
    if (!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = new Date(Date.now() - 1000);
    next();
  },
);

//Select only active users
userSchema.pre<Query<IUser[], IUser>>(
  /^find/,
  function (next: (err?: CallbackError) => void) {
    this.where({ active: { $ne: false } });
    next();
  },
);

//Compare candidate password with hashed password
userSchema.methods.correctPassword = async function (
  candidatePassword: string,
  userPassword: string,
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//Check if password was changed after the JWT was issued
userSchema.methods.changedPasswordAfter = function (
  JWTTimeStamp: number,
): boolean {
  if (this.passwordChangedAt) {
    const changedTimeStamp = Math.floor(
      this.passwordChangedAt.getTime() / 1000,
    );
    return JWTTimeStamp < changedTimeStamp;
  }
  return false;
};

userSchema.methods.createPasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);

  return resetToken;
};

export const User = mongoose.model<IUser>('User', userSchema);
