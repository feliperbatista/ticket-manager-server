import express from 'express';
import * as userContoller from '../controllers/userController';
import * as authContoller from '../controllers/authController';

const router = express.Router();
router.route('/signup').post(authContoller.singup);
router.route('/login').post(authContoller.login);
router.route('/forgotPassword').post(authContoller.forgotPassword);
router
  .route('/resetPassword/:token')
  .patch(authContoller.resetPassword);

router.use(authContoller.protect);

router.patch('/updateMyPassword', authContoller.updatePassword);

router
  .route('/')
  .get(authContoller.restrictTo('admin'), userContoller.findAll);

export default router;
