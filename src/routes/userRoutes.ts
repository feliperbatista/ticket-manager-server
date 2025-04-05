import express from 'express';
import * as userContoller from '../controllers/userController';
import * as authContoller from '../controllers/authController';

const router = express.Router();
router.route('/signup').post(authContoller.singup);
router.route('/login').post(authContoller.login);
router.route('/forgot-password').post(authContoller.forgotPassword);
router
  .route('/reset-password/:token')
  .patch(authContoller.resetPassword);

router.use(authContoller.protect);

router.patch('/update-my-password', authContoller.updatePassword);

router
  .route('/')
  .get(authContoller.restrictTo('admin'), userContoller.findAll);

export default router;
