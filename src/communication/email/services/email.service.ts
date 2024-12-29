import path from 'path';
import { singleton } from 'tsyringe';
import { convert } from 'html-to-text';
import pug from 'pug';
import * as nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { EmailType } from '../enum/email.enum';

@singleton()
export class EmailService {
  private readonly signUpTemplate: pug.compileTemplate;
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.signUpTemplate = pug.compileFile(
      path.join(__dirname, `../email-templates/signup.pug`)
    );

    this.transporter = this.mailTransport();
  }

  private mailTransport() {
    return nodemailer.createTransport({
      host: process.env.MAIL_HOST as string,
      port: +(process.env.MAIL_PORT as string),
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
      }
    });
  }

  async initialEmailSending(
    data: { otp: string; email: string; emailType: EmailType },
    subject: string,
    html: string
  ) {
    const mailOptions: Mail.Options = {
      from: `${process.env.APP_NAME}<${process.env.DEFAULT_MAIL_FROM}>`,
      to: data.email,
      subject,
      html,
      text: convert(html, { wordwrap: 120 })
    };

    return this.transporter.sendMail(mailOptions);
  }

  async sendEmail(data: { otp: string; email: string; emailType: EmailType }) {
    switch (data.emailType) {
      case EmailType.SIGNUP_OTP:
        return this.sendSignupOTP(data);
      default:
        throw new Error(`Unsupported email type: ${data.emailType}`);
    }
  }

  async sendSignupOTP(data: {
    otp: string;
    email: string;
    emailType: EmailType;
  }) {
    const html = this.signUpTemplate(data);
    return this.initialEmailSending(data, 'Sign up OTP', html);
  }
}
