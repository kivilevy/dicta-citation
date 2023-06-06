import dotenv from 'dotenv';
import express from 'express';
import { processAndFormatText } from './search.js';
import { validateInput } from './validate.js';

dotenv.config();

const app = express();
app.use(express.json({limit:'50mb'}));
app.post('/process-text', validateInput, processAndFormatText);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));