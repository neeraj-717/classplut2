import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";

export async function sendOtpEmail(toEmail, otp) {
  const mailerSend = new MailerSend({
    apiKey: process.env.MAILERSEND_API_KEY,
  });

  const sentFrom = new Sender(process.env.MAIL_FROM, "OneRoof Edutec");

  const recipients = [new Recipient(toEmail, "User")];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject("Your OTP Code")
    .setHtml(`<p>Your OTP code is <b>${otp}</b>. It is valid for 5 minutes.</p>`)
    .setText(`Your OTP code is ${otp}. It is valid for 5 minutes.`);

  try {
    await mailerSend.email.send(emailParams);
    console.log("✅ OTP email sent to:", toEmail);
  } catch (error) {
    console.error("❌ Error sending OTP:", error);
    throw error;
  }
}
