import nodemailer from 'nodemailer';
import { getEnvVar } from './config';

const sendEmail = async (
  email: string,
  subject: string,
  message: string,
) => {
  const transporter = nodemailer.createTransport({
    service: getEnvVar('MAIL_HOST'),
    auth: {
      user: getEnvVar('MAIL_USERNAME'),
      pass: getEnvVar('MAIL_PASSWORD'),
    },
  });

  const mailOptions = {
    from: getEnvVar('MAIL_USERNAME'),
    to: email,
    subject: subject,
    html: message,
  };

  transporter.sendMail(mailOptions);
};

export default sendEmail;
