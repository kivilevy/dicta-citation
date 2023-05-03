import { sendEmail } from "./mail.js";

const CHUNK_SIZE = 10000;

export const validate = (req, res, next) => {
    const { email, text } = req.body;
    if (!isValidEmail(email)) {
        res.status(400).send({ message: 'Invalid email format. Please enter a valid email.' });
        return;
    }
    if (!hasThreeHebrewWords(text)) {
        res.status(400).send({ message: 'Text must contain at least 3 Hebrew words.' });
        return;
    } 
    next();
}

export const processText = async (req, res) => {
    const { email, text } = req.body;
    res.status(200).send({ message: 'Text is processing, you will receive an email when it is done.' });
    try {
        const chunks = splitText(text, CHUNK_SIZE);
        const results = await processChunks(chunks, req.body);
        sendEmail(email, results);
    } catch (error) {
        console.error('Error processing text:', error);
    }
}

const splitText = (text, chunkSize) => {
    const chunks = [];
    let start = 0;
    let end = chunkSize;
    while (start < text.length) {
      // Find the closest sentence or line end to the chunk end
      const lastPeriod = text.lastIndexOf(".", end);    
      const lastNewline = text.lastIndexOf("\n", end);
      const lastBreak = Math.max(lastPeriod, lastNewline);
      /* Move the end index to the last break to avoid splitting mid-sentence
       +1 to include the period or newline character*/
      if (lastBreak !== -1 && end < text.length) end = lastBreak + 1;
      else end = Math.min(end, text.length); //no break found
      chunks.push(text.slice(start, end));
      start = end;
      end = start + chunkSize;
    }
    return chunks;
}
  
const processChunks = async(chunks, reqBody) => {
    const combinedResults = [];
    for (const chunk of chunks) {
        const chunkResults = await processChunk(chunk, reqBody);
        combinedResults.push(...chunkResults);
    }
    return combinedResults;
}

const processChunk = async (chunk, {smin, smax, fdirectonly}) => {
    const modes = ['tanakh', 'mishna', 'talmud'];
    const headers = {'Content-Type': 'application/json; charset=utf-8'};
    const psukimUrl = 'https://talmudfinder-2-0.loadbalancer.dicta.org.il/TalmudFinder/api/markpsukim';
    const groupsUrl = `https://talmudfinder-2-0.loadbalancer.dicta.org.il/TalmudFinder/api/parsetogroups?smin=${smin}&smax=${smax}`;    
    const psukimResults = [];
    let psukimDownloadId;
    for (const mode of modes) {  // Call markpsukim endpoint
        const body = {mode, thresh: 0, fdirectonly, data: chunk};
        const {downloadId, results} = 
            await fetch(psukimUrl,{method: 'POST', body: JSON.stringify(body), headers})
                .then(async d => await d.json());
        psukimResults.push(...results);
        if (results.length) psukimDownloadId = downloadId;
    }
    const body = {allText: chunk, downloadId: psukimDownloadId, keepredundant: true, results: psukimResults};
    const parseToGroupsRes = await fetch(groupsUrl,{method: 'POST', body: JSON.stringify(body), headers})
        .then(async d => await d.json());   // Call parsetogroups endpoint
    return parseToGroupsRes;
}

const isValidEmail = (email) => {
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    return emailRegex.test(email);
}

const hasThreeHebrewWords = (text) => {
    const hebrewWordRegex = /[\u05D0-\u05EA]+/g;
    const matches = text.match(hebrewWordRegex);
    return matches && matches.length >= 3;
}