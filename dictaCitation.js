import { sendEmail } from "./mail.js";

const CHUNK_SIZE = 10000;

export const validInput = (req, res, next) => {
    const { body: { text, email }} = req;
    if (!minHebrewWords(text)) {
        res.status(400).send({ message: 'Text must contain at least 3 Hebrew words.' });
        return;
    } 
    if (!validEmail(email)) {
        res.status(400).send({ message: 'Invalid email format. Please enter a valid email.' });
        return;
    }
    next();
}

export const processInput = async (req, res) => {
    const { body: { text, email }} = req;
    res.status(200).send({ message: 'Text is processing, you will receive an email when it is done.' });
    try {
        const chunks = splitText(text, CHUNK_SIZE);
        const results = await fullTextResults(chunks, req.body);
        sendEmail(email, results);
        //res.send(results);
    } catch (error) {
        console.error('Error processing text:', error);
    }
}

//Splits long texts into smaller chunks
const splitText = (text, chunkSize) => {    
    const chunks = [];
    let start = 0;
    let end = chunkSize;      
    while (start < text.length) {
      //Avoid splitting in the middle of a sentence
      const lastPeriod = text.lastIndexOf(".", end);    
      const lastNewline = text.lastIndexOf("\n", end);
      const lastBreak = Math.max(lastPeriod, lastNewline);  
      if (lastBreak !== -1 && end < text.length) end = lastBreak + 1;
      else end = Math.min(end, text.length);//No break found/short text
      chunks.push(text.slice(start, end));
      start = end;
      end = start + chunkSize;
    }
    return chunks;
}
  
const fullTextResults = async(chunks, reqBody) => {
    const fullResults = [];
    for (const chunk of chunks) {
        const chunkResults = await searchChunk(chunk, reqBody);
        fullResults.push(...chunkResults);
    }
    return fullResults;
}

//Calls psukimUrl for quotes in tanakh mishna and talmud separately. call groupsUrl for combined results
const searchChunk = async (chunk, {smin, smax, fdirectonly}) => {
    const modes = ['tanakh', 'mishna', 'talmud'];
    const headers = {'Content-Type': 'application/json; charset=utf-8'};
    const psukimUrl = 'https://talmudfinder-2-0.loadbalancer.dicta.org.il/TalmudFinder/api/markpsukim';
    const groupsUrl = `https://talmudfinder-2-0.loadbalancer.dicta.org.il/TalmudFinder/api/parsetogroups?smin=${smin}&smax=${smax}`;    
    const psukimResults = [];
    let psukimDownloadId;
    for (const mode of modes) {  
        const body = {mode, thresh: 0, fdirectonly, data: chunk};
        const {downloadId, results} = 
            await fetch(psukimUrl,{method: 'POST', body: JSON.stringify(body), headers})
                .then(async d => await d.json());
        psukimResults.push(...results);
        if (results.length) psukimDownloadId = downloadId;
    }
    const body = {allText: chunk, downloadId: psukimDownloadId, keepredundant: true, results: psukimResults};
    const parseToGroupsRes = await fetch(groupsUrl,{method: 'POST', body: JSON.stringify(body), headers})
        .then(async d => await d.json());
    return parseToGroupsRes;
}

const validEmail = (email) => {
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    return emailRegex.test(email);
}
const minHebrewWords = (text) => {
    const hebrewWordRegex = /[\u05D0-\u05EA]+/g;
    const matches = text.match(hebrewWordRegex);
    return matches && matches.length >= 3;
}