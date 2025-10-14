// utils/mailer.js
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY,
});

export async function sendOtpEmail(toEmail, otp) {
  try {
    const sentFrom = new Sender(process.env.MAIL_FROM, "OneRoof Edutec");
    const recipients = [new Recipient(toEmail, "User")];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject("Your OTP Code")
      .setHtml(`<p>Your OTP is <strong>${otp}</strong>. It is valid for 5 minutes.</p>`)
      .setText(`Your OTP is ${otp}. It is valid for 5 minutes.`);

    const resp = await mailerSend.email.send(emailParams);
    // resp may contain API response — keep for debugging
    return resp;
  } catch (err) {
    // rethrow so route can catch and send response
    throw err;
  }
}
