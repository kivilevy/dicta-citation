import {SESClient, SendEmailCommand} from "@aws-sdk/client-ses";

const fromAddress = "dicta@dicta.org.il";
const REGION = "us-east-1";
let sesClient;

const initcredentials = () => {
  if (sesClient)
    return;  
  sesClient = new SESClient({
    region: REGION, 
    credentials: {
        accessKeyId: process.env.ACCESS_KEY_ID,
        secretAccessKey: process.env.SECRET_ACCESS_KEY
    }
  });
}

const createSendEmailCommand = (toAddress, fromAddress, results) => {
  return new SendEmailCommand({
    Destination: {
      ToAddresses: [
        toAddress
      ],
    },
    Message: {
      Body: {
        Text: {
          Charset: "UTF-8",
          Data: results,
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: "Dicta search results",
      },
    },
    Source: fromAddress
  });
};

export const sendEmail = (results, toAddress) => {
  initcredentials();  
  const command = createSendEmailCommand(toAddress, fromAddress, results);
  sesClient.send(command);
}