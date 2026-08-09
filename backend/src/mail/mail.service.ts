import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log('SMTP transporter configured successfully');
    } else {
      this.logger.warn(
        'SMTP credentials not set — emails will be logged to the console. ' +
        'Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env to enable real sending.',
      );
    }
  }

  private async send(options: nodemailer.SendMailOptions): Promise<void> {
    const from =
      this.configService.get<string>('SMTP_FROM') || 'AuctionHouse <noreply@auctionhouse.dev>';

    if (!this.transporter) {
      // Dev fallback — pretty-print to console instead of sending
      this.logger.log(
        `\n📧  [EMAIL FALLBACK]\n` +
        `  To      : ${options.to}\n` +
        `  Subject : ${options.subject}\n` +
        `  Body    :\n${options.text ?? options.html}\n`,
      );
      return;
    }

    try {
      await this.transporter.sendMail({ from, ...options });
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${options.to}: ${err.message}`);
      // Don't crash the caller — log and continue
    }
  }

  // ─── Public methods ───────────────────────────────────────────────────────

  async sendPasswordReset(email: string, resetLink: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'AuctionHouse — Reset your password',
      text:
        `You requested a password reset.\n\n` +
        `Click the link below to reset your password (expires in 1 hour):\n\n` +
        `${resetLink}\n\n` +
        `If you did not request this, you can safely ignore this email.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;">
          <h2 style="color:#4f46e5;">Reset your password</h2>
          <p>You requested a password reset for your AuctionHouse account.</p>
          <p>Click the button below (link expires in <strong>1 hour</strong>):</p>
          <a href="${resetLink}"
             style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;
                    border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
            Reset Password
          </a>
          <p style="color:#6b7280;font-size:13px;">
            Or copy this link:<br/>
            <a href="${resetLink}" style="color:#4f46e5;">${resetLink}</a>
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
          <p style="color:#9ca3af;font-size:12px;">
            If you did not request this reset, ignore this email.
          </p>
        </div>
      `,
    });
  }

  async sendVerificationEmail(email: string, verifyLink: string): Promise<void> {
    await this.send({
      to: email,
      subject: 'AuctionHouse — Verify your email address',
      text:
        `Welcome to AuctionHouse!\n\n` +
        `Please verify your email address by visiting:\n\n` +
        `${verifyLink}\n\n` +
        `This link expires in 24 hours.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;">
          <h2 style="color:#4f46e5;">Welcome to AuctionHouse 🏛️</h2>
          <p>Thanks for signing up! Please verify your email address to activate your account.</p>
          <a href="${verifyLink}"
             style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 24px;
                    border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
            Verify Email
          </a>
          <p style="color:#6b7280;font-size:13px;">
            Or copy this link:<br/>
            <a href="${verifyLink}" style="color:#4f46e5;">${verifyLink}</a>
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
          <p style="color:#9ca3af;font-size:12px;">
            This link expires in 24 hours. If you did not create an account, ignore this email.
          </p>
        </div>
      `,
    });
  }
}
