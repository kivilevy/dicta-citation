import { sendEmail } from './sendEmail.js';

const CHUNK_SIZE = 8000;
const BASE_URL = 'https://talmudfinder-2-0.loadbalancer.dicta.org.il/TalmudFinder/api';
const PSUKIM_URL = `${BASE_URL}/markpsukim`;
const GROUPS_URL = `${BASE_URL}/parsetogroups`;

export const handleQuestAndResults = async (req, res) => {
    res.send('Your request is being processed.\
       Results will be delivered to your email upon completion');
    const { body: { text, email }} = req;
   
    try {
        const chunks = splitText(text);
        const results = await fullTextResults(chunks, req.body);
        let footnotedText = insertFootnotes(text, results);
        footnotedText = footnotedText.replace(/<b>|<\/b>/g, '');
        sendEmail(footnotedText, email);
    } catch {
        sendEmail(null, email);
    }
}

const splitText = (text) => {    
    const chunks = [];
    let start = 0;
    let end = CHUNK_SIZE; 

    while (start < text.length) {
        // Avoid splitting in the middle of a sentence
        const currentChunk = text.substring(start, end);
        let lastPeriod = currentChunk.lastIndexOf(".");
        let lastNewline = currentChunk.lastIndexOf("\n");
        if (lastPeriod !== -1) lastPeriod += start;
        if (lastNewline !== -1) lastNewline += start;
        const lastBreak = Math.max(lastPeriod, lastNewline);  
        if (lastBreak > start && end < text.length) end = lastBreak + 1;
        else end = Math.min(end, text.length);
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
    const allResults = [];
    let currentIndex = 0;

    for (const chunk of chunks) {
        const chunkResults = await searchChunk(chunk, reqBody);
        // Adjust endIChar number to continue the last endIChar of the previous chunk 
        chunkResults.forEach((result) => result.endIChar += currentIndex);  
        allResults.push(...chunkResults);
        currentIndex += chunk.length;
    }
    return allResults;    
}

const insertFootnotes = (text, results) => {
    let newText = "";
    let currentPos = 0;
    let footnoteNumber = 1;
    let footnotes = "";
    // Sort results by endIChar
    const sortedResults = results.sort((a, b) => a.endIChar - b.endIChar); 
    sortedResults.forEach((result) => {
        const { endIChar, matches } = result;
        newText += text.slice(currentPos, endIChar) + `[${footnoteNumber}]`;
        currentPos = endIChar;
        footnotes += `\n[${footnoteNumber}] ` + matches
            .map(match => `${match.matchedText} (${match.verseDispHeb})`).join(', ');
        footnoteNumber++;
    });
    // Add the remaining text
    newText += text.slice(currentPos); 
    newText += "\n\nאזכורים: " + footnotes; 
    return newText;
}
