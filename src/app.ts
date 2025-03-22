import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import userRouter from './routes/userRoutes';
import ticketRouter from './routes/ticketRoutes';
import globalErrorHandler from './controllers/errorController';

const app: Express = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/users', userRouter);
app.use('/api/v1/tickets', ticketRouter);
app.use(globalErrorHandler);

export default app;
