import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    host: 'your_smtp_server',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: 'Dicta_email',
      pass: 'password',
    },
  });
  
export const sendEmail = async (email, results) => {
    try {
      const mailOptions = {
        from: 'Dicta_email',
        to: email,
        subject: 'Citation Finder Results',
        text: JSON.stringify(results, null, 2),
      };
  
      await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${email}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
};
  