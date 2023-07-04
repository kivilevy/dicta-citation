import JSZip from 'jszip';
import mimemessage from 'mimemessage';
import { fromEnv } from '@aws-sdk/credential-provider-env';
import { SESClient, SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';

const REGION = "us-east-1";
const sesClient = new SESClient({
    region: REGION,
    credentials: fromEnv()
});
const SENDER = "dicta@dicta.org.il";
const SUBJECT = 'Dicta Search Results';

export const sendEmail = async (results, recipient) => {
    if (!results) return sendErrMsgEmail(recipient); 
    const zipppedResults = await zipResults(results);
    const rawEmail = formRawEmail(recipient, zipppedResults);
    const command = new SendRawEmailCommand({
        RawMessage: { Data: Buffer.from(rawEmail) }
    });
    await sesClient.send(command);
}

const zipResults = async (results) => {
    const zip = new JSZip();
    zip.file('Dicta-results.txt', results);
    return zip.generateAsync({ type: 'nodebuffer' });
}

const formRawEmail = (recipient, zipppedResults) => {
    const msg = mimemessage.factory({
        contentType: 'multipart/mixed',
        body: []
    });
    msg.header('From', SENDER);
    msg.header('To', recipient);
    msg.header('Subject', SUBJECT);

    const bodyPart = mimemessage.factory({
        contentType: 'text/html',
        body: `<h1>Dicta Citation Search Results</h1><p>Find the document requested attached</p>`
    });
    msg.body.push(bodyPart);

    const attachmentPart = mimemessage.factory({
        contentType: 'application/zip',
        contentTransferEncoding: 'base64',
        body: zipppedResults.toString('base64')
    });
    attachmentPart.header('Content-Disposition', `attachment; filename ="Dicta-Results.zip"`);
    msg.body.push(attachmentPart);

    return msg.toString();
}

const sendErrMsgEmail = (recipient) => {
    const command = new SendEmailCommand({
        Destination: {
            ToAddresses: [recipient],
        },
        Message: {
            Body: {
                Text: {
                    Data: 'An error occurred while processing your request. Please try again later',
                    Charset: "UTF-8",
                },
            },
            Subject: {
                Data: 'Dicta search request',
                Charset: "UTF-8",
            },
        },
        Source: SENDER,
    });
    sesClient.send(command);
}