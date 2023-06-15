import pkg from 'aws-sdk';
import fs from 'fs';
import JSZip from "jszip";
import nodemailer from "nodemailer";

const zip = new JSZip();
const { SES: AWSSES } = pkg;
const FROM_ADDRESS = "dicta@dicta.org.il";
const REGION = "us-east-1";
let transporter;

export const sendEmail = async (results, toAddress) => {
    initTransporter();
    const filePath =  await compressToZip(results);
    await transporter.sendMail({
        from: FROM_ADDRESS,
        to: toAddress,
        subject: 'Dicta search results',
        attachments: [{
            filename: 'results.zip',  
            content: fs.readFileSync(filePath + '.zip'), 
            contentType: 'application/zip',
        }],
    });
    fs.unlinkSync(filePath + '.txt');
    fs.unlinkSync(filePath + '.zip');
}

const initTransporter = () => {
    if(transporter)
      return;
    const ses = new AWSSES({
      region: REGION, 
      credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
      }
    });
    transporter = nodemailer.createTransport({
      SES: { ses, aws: { region: REGION } }
    });
}
  
const compressToZip = async(results) => {
    const filename = Date.now();
    const filePath = 'resultsFiles/' + filename;
    fs.writeFileSync(filePath + '.txt', results);
    const txtFile = fs.readFileSync(filePath + '.txt');
    zip.file('results.txt', txtFile);

    await new Promise((resolve, reject) => {
        zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
            .pipe(fs.createWriteStream(filePath + '.zip'))
            .on('finish', resolve).on('error', reject);
    });
    return filePath;  
}