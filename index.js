import express from 'express';
import { processText, validate } from './dictaCitation.js';

const app = express();
app.use (express.json());

app.post('/process-text', validate, processText);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));