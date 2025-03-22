import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
} from 'express';
import catchAsync from '../utils/catchAsync';
import AppError from '../utils/appError';
import { Ticket } from '../models/ticketModel';
import { error } from 'console';

export const setTicketUserId: RequestHandler = (req, res, next) => {
  if (!req.body.createdBy) req.body.createdBy = req.user._id;
  next();
};

export const createTicket: RequestHandler = catchAsync(
  async (req, res, next) => {
    const { title, description } = req.body;
    if (!title || !description) {
      return next(
        new AppError('Please provide title and description.', 400),
      );
    }

    const newTicket = new Ticket({
      title,
      description,
      createdBy: req.body.createdBy,
    });

    await newTicket.save();

    res.status(201).json({
      message: 'success',
      ticket: newTicket,
    });
  },
);

export const getAllTickets: RequestHandler = catchAsync(
  async (req, res, next) => {
    const tickets = await Ticket.find();

    res.status(200).json({
      message: 'success',
      tickets,
    });
  },
);

export const getTicket: RequestHandler = catchAsync(
  async (req, res, next) => {
    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return next(new AppError('Ticket not found', 404));
    }

    res.status(200).json({
      message: 'success',
      ticket,
    });
  },
);

export const deleteTicket: RequestHandler = catchAsync(
  async (req, res, next) => {
    const ticket = await Ticket.findByIdAndDelete(req.params.id);

    if (!ticket) {
      return next(new AppError('Ticket not found', 404));
    }

    res.status(204).json({
      message: 'success',
      ticket: null,
    });
  },
);

export const updateTicket: RequestHandler = catchAsync(
  async (req, res, next) => {
    const { title, description, status, priority } = req.body;
    if (!title || !description || !status || !priority) {
      return next(
        new AppError(
          'Please provide title, description, status and priority.',
          400,
        ),
      );
    }

    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!ticket) {
      return next(new AppError('Ticket not found', 404));
    }

    res.status(200).json({
      message: 'success',
      ticket: ticket,
    });
  },
);

export const getMyTickets: RequestHandler = catchAsync(
  async (req, res, next) => {
    const tickets = await Ticket.find({ createdBy: req.user._id });

    res.status(200).json({
      message: 'success',
      tickets,
    });
  },
);

export const addCommentToTicket: RequestHandler = catchAsync(
  async (req, res, next) => {
    const { comment, createdBy } = req.body;

    if (!comment) {
      return next(new AppError('Please provide comments.', 400));
    }

    const ticket = await Ticket.findById(req.params.id);

    if (!ticket) {
      return next(new AppError('Ticket not found', 404));
    }

    const newComment = {
      user: createdBy,
      text: comment,
      createdAt: new Date(),
    };

    if (!ticket.comments) ticket.comments = [];

    ticket.comments.push(newComment);

    await ticket.save();

    res.status(200).json({
      message: 'success',
      ticket,
    });
  },
);
