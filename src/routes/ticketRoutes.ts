import express from 'express';
import * as authContoller from '../controllers/authController';
import * as ticketController from '../controllers/ticketController';

const router = express.Router();
router.use(authContoller.protect);

router
  .route('/')
  .get(
    authContoller.restrictTo('admin'),
    ticketController.getAllTickets,
  )
  .post(
    ticketController.setTicketUserId,
    ticketController.createTicket,
  );

router.route('/my-tickets').get(ticketController.getMyTickets);

router
  .route('/:id')
  .get(ticketController.getTicket)
  .delete(ticketController.deleteTicket)
  .put(ticketController.updateTicket);

router
  .route('/:id/comments')
  .patch(
    ticketController.setTicketUserId,
    ticketController.addCommentToTicket,
  );

export default router;
