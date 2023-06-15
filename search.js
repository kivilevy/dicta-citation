import { sendEmail } from './mail.js';

const CHUNK_SIZE = 8000;
const BASE_URL = 'https://talmudfinder-2-0.loadbalancer.dicta.org.il/TalmudFinder/api';
const PSUKIM_URL = `${BASE_URL}/markpsukim`;
const GROUPS_URL =` ${BASE_URL}/parsetogroups`;

export const processAndFormatText = async (req, res) => {
    res.send('Your request is being processed.\
       Results will be delivered to your email upon completion');
    const { body: { text, email }} = req;
   
    try {
        const chunks = splitText(text);
        const results = await fullTextResults(chunks, req.body);
        let formattedText = insertFootnotes(text, results);
        formattedText = formattedText.replace(/<b>|<\/b>/g, '');
        sendEmail(formattedText, email);
    } catch (error) {
        const message = 'an error occurred while processing your request.\
           Please try again later.';
        sendEmail(message, email);
    }
}

const splitText = (text) => {    
    const chunks = [];
    let start = 0;
    let end = CHUNK_SIZE; 

    while (start < text.length) {
      // Avoid splitting midsentence
      const lastPeriod = text.lastIndexOf(".", end);   
      const lastNewline = text.lastIndexOf("\n", end);
      const lastBreak = Math.max(lastPeriod, lastNewline);  
      if (lastBreak > start  && end < text.length) end = lastBreak + 1;
      //No break found or the remaining text is short 
      else end = Math.min(end, text.length)  
      chunks.push(text.slice(start, end));
      start = end;
      end = start + CHUNK_SIZE;
    }
    return chunks;
}
 
const searchChunk = async (chunk, {smin, smax, fdirectonly}) => {
    const modes = ['tanakh', 'mishna', 'talmud'];
    const headers = {'Content-Type': 'application/json; charset=utf-8'};
    const psukimResults = [];
    let psukimDownloadId;

    for (const mode of modes) {
        const body = {mode, thresh: 0, fdirectonly, data: chunk};
        const {downloadId, results} =
            await fetch(PSUKIM_URL,{method: 'POST', body: JSON.stringify(body), headers})
                .then(d => d.json());
        psukimResults.push(...results);
        if (results.length) psukimDownloadId = downloadId;
    }
    const body = {allText: chunk, downloadId: psukimDownloadId, keepredundant: true, results: psukimResults};
    const url = `${GROUPS_URL}?smin=${smin}&smax=${smax}`;
    const res = await fetch (url,{method: 'POST', body: JSON.stringify(body), headers});

    return res.json();
}   

const fullTextResults = async (chunks, reqBody) => {
    const fullResults = [];
    let currentIndex = 0;

    for (const chunk of chunks) {
        const chunkResults = await searchChunk(chunk, reqBody);
        //adjusting endIchar of the next chunk to cuntinue the previous chunk 
        chunkResults.forEach((result) => result.endIChar += currentIndex);  
        fullResults.push(...chunkResults);
        currentIndex += chunk.length;
    }
    return fullResults;    
}

const insertFootnotes = (text, results) => {
    let newText = "";
    let currentPos = 0;
    let footnoteNumber = 1;
    let footnotes = "";
     // Sort results by endIChar
    const sortedResults = results.sort((a, b) => a.endIChar - b.endIChar); 
    sortedResults.forEach((result) => {
        const endIChar = result.endIChar;
        newText += text.slice(currentPos, endIChar) + `[${footnoteNumber}]`;
        currentPos = endIChar;
        footnotes += `\n[${footnoteNumber}] ` + result.matches
            .map(match => `${match.matchedText} (${match.verseDispHeb})`).join(', ');
        footnoteNumber++;
    });
     // Add the remaining text
    newText += text.slice(currentPos); 
    newText += "\n\nאזכורים: " + footnotes; 
    return newText;
}