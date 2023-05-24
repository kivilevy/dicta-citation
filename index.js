import express from 'express';
import {processInput} from './main.js';
import {validateInput} from './validate.js'

const app = express();
app.use (express.json({limit:'50mb'}));
app.post('/process-text', validateInput, processInput);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));