import nodemailer from "nodemailer";

export const sendEmail = async (
  senderHeader: string,
  email: string,
  subject: string,
  content: string
) => {
  const transporter = nodemailer.createTransport({
    // service: "gmail", //
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT),
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.MAIL_USERNAME,
      pass: process.env.MAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });
  const emailData = {
    from: `${senderHeader} <${process.env.MAIL_USERNAME}>`,
    to: email,
    subject: subject,
    html: content,
  };

  try {
    const info = await transporter.sendMail(emailData);
    console.log("Email sent to:", email);
    console.log("Message ID:", info.messageId);
    return info;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};
