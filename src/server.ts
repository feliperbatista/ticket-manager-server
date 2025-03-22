import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app';
import { getEnvVar } from './utils/config';

dotenv.config();

const port = getEnvVar('PORT');

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const uri: string = getEnvVar('MONGODB_URI');

(async () => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to the database');
  } catch (error) {
    console.log(error);
  }
})();
