import mongoose from 'mongoose';
import { IUser } from './userModel';

export interface Comment {
  user: string;
  text: string;
  createdAt: Date;
}

export interface ITicket extends Document {
  _id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: IUser;
  status: 'open' | 'in_progress' | 'closed' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  comments?: Comment[];
  assignedTo?: IUser;
}

const ticketSchema = new mongoose.Schema<ITicket>(
  {
    title: {
      type: String,
      required: [true, 'Please inform a title for the ticket.'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please inform a description for the ticket.'],
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    updatedAt: Date,
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A ticket must belong to a user.'],
    },
    assignedTo: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'closed', 'pending'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgente'],
      default: 'medium',
    },
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        text: {
          type: String,
          required: true,
        },
        createdAt: { type: Date, default: Date.now() },
      },
    ],
  },
  { timestamps: true },
);

export const Ticket = mongoose.model<ITicket>('Ticket', ticketSchema);
