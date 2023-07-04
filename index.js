import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { validateInput } from './validate.js';
import { handleQuestAndResults } from './search.js';

dotenv.config();

const app = express();
app.use(express.json({limit:'50mb'}));
app.use(cors());
app.post('/process-text', validateInput, handleQuestAndResults);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));