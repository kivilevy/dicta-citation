import express from 'express';
import { validInput, processInput } from './dictaCitation.js';

const app = express();
app.use (express.json({limit:'50mb'}));

app.post('/process-text', validInput, processInput);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));