/**
 * Updated by MinhDang on FA25
 * "A bit of fragrance clings to the hand that gives flowers!"
*/

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './src/routes/index.js';

dotenv.config();

const app = express();
const hostname = 'localhost';
const port = 8017;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ message: 'myFEvent API Server is running!' });
});

app.listen(port, hostname, () => {
  console.log(`Server is running at http://${hostname}:${port}/`);
});
