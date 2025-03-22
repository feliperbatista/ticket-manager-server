import { RequestHandler } from 'express';
import { User } from '../models/userModel';

export const findAll: RequestHandler = async (req, res, next) => {
  try {
    const users = await User.find();

    res.status(200).json({
      status: 'success',
      data: { users },
    });
  } catch (error) {
    console.log(error);
  }
};
