import { Resend } from 'resend';

export interface SendResetEmailOptions {
  to: string;
  name: string;
  rawToken: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private static resendClient: Resend | null = null;
  private static mockHandler: ((options: SendResetEmailOptions) => Promise<EmailSendResult>) | null = null;

  /**
   * Initialize or retrieve Resend client
   */
  private static getResendClient(): Resend | null {
    if (this.resendClient) {
      return this.resendClient;
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey && apiKey.trim() && apiKey.startsWith('re_')) {
      this.resendClient = new Resend(apiKey.trim());
      return this.resendClient;
    }

    return null;
  }

  /**
   * Set a custom mock handler (for unit/integration testing)
   */
  static setMockHandler(handler: ((options: SendResetEmailOptions) => Promise<EmailSendResult>) | null): void {
    this.mockHandler = handler;
  }

  /**
   * Get configured sender address
   */
  static getFromAddress(): string {
    const fromEnv = process.env.EMAIL_FROM;
    if (fromEnv && fromEnv.trim()) {
      return fromEnv.trim();
    }
    // Default Resend sandbox sender or generic branded fallback
    return 'HabitHero <onboarding@resend.dev>';
  }

  /**
   * Get frontend application URL for reset link
   */
  static getFrontendUrl(): string {
    const frontendUrl = process.env.FRONTEND_URL;
    if (frontendUrl && frontendUrl.trim()) {
      return frontendUrl.trim().replace(/\/+$/, '');
    }
    return 'http://localhost:5173';
  }

  /**
   * Build the responsive HabitHero-branded HTML email template
   */
  static buildResetEmailHtml(name: string, resetLink: string): string {
    const firstName = name.trim().split(' ')[0] || 'there';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your HabitHero Password</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F7F7F2;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #26352D;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #F7F7F2;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 560px;
      margin: 0 auto;
      background-color: #FFFFFF;
      border-radius: 20px;
      border: 1px solid #E9ECE7;
      overflow: hidden;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
    }
    .header {
      background-color: #245C46;
      padding: 32px 32px 28px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background-color: #1a4232;
      border-radius: 100px;
      color: #DCEBDD;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
    }
    .brand-title {
      margin: 0;
      color: #FFFFFF;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .brand-sub {
      margin: 6px 0 0;
      color: #DCEBDD;
      font-size: 13px;
      font-weight: 400;
    }
    .content {
      padding: 36px 32px;
    }
    .greeting {
      font-size: 17px;
      font-weight: 700;
      color: #26352D;
      margin-top: 0;
      margin-bottom: 16px;
    }
    .paragraph {
      font-size: 14px;
      line-height: 1.6;
      color: #5F6F65;
      margin: 0 0 20px;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0;
    }
    .cta-button {
      display: inline-block;
      background-color: #245C46;
      color: #FFFFFF !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      padding: 14px 32px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(36, 92, 70, 0.25);
    }
    .expiry-card {
      background-color: #F7F7F2;
      border: 1px solid #E9ECE7;
      border-radius: 12px;
      padding: 16px;
      margin: 24px 0;
    }
    .expiry-card p {
      margin: 0;
      font-size: 12px;
      line-height: 1.5;
      color: #5F6F65;
    }
    .expiry-highlight {
      font-weight: 700;
      color: #245C46;
    }
    .fallback-url {
      font-size: 11px;
      color: #8C9A91;
      word-break: break-all;
      margin: 20px 0 0;
      line-height: 1.4;
    }
    .footer {
      background-color: #FAFBF9;
      border-top: 1px solid #E9ECE7;
      padding: 24px 32px;
      text-align: center;
      font-size: 11px;
      color: #8C9A91;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="badge">HABITHERO RECOVERY</div>
        <h1 class="brand-title">HabitHero</h1>
        <p class="brand-sub">Your personal habit coach • Never miss twice</p>
      </div>

      <div class="content">
        <h2 class="greeting">Hello, ${firstName}!</h2>
        <p class="paragraph">
          We received a request to reset the password for your HabitHero account. Click the button below to choose a new, secure password:
        </p>

        <div class="cta-container">
          <a href="${resetLink}" class="cta-button" target="_blank" rel="noopener noreferrer">
            Reset My Password
          </a>
        </div>

        <div class="expiry-card">
          <p>
            <span class="expiry-highlight">⏱ This recovery link will expire in 15 minutes</span> for your security. If it expires before you use it, you can simply request another link from the login page.
          </p>
        </div>

        <p class="paragraph" style="font-size: 12px; color: #8C9A91; margin-bottom: 8px;">
          If the button above doesn't work, copy and paste this link into your web browser:
        </p>
        <p class="fallback-url">
          <a href="${resetLink}" style="color: #245C46; text-decoration: underline;">${resetLink}</a>
        </p>
      </div>

      <div class="footer">
        <p style="margin: 0 0 8px;">
          If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged and your account stays protected.
        </p>
        <p style="margin: 0;">
          &copy; ${new Date().getFullYear()} HabitHero. Built for human habit consistency.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Build plain text fallback for email clients without HTML support
   */
  static buildResetEmailText(name: string, resetLink: string): string {
    const firstName = name.trim().split(' ')[0] || 'there';

    return `Hello, ${firstName}!\n\n` +
      `We received a request to reset your HabitHero password.\n\n` +
      `Please use the following link to reset your password:\n${resetLink}\n\n` +
      `This link expires in 15 minutes.\n\n` +
      `If you did not request this reset, you can safely ignore this email. Your password will remain unchanged.\n\n` +
      `Best regards,\nThe HabitHero Team`;
  }

  /**
   * Send the password reset email via Resend (or mock handler in test environments)
   */
  static async sendPasswordResetEmail(options: SendResetEmailOptions): Promise<EmailSendResult> {
    const { to, name, rawToken } = options;
    const frontendUrl = this.getFrontendUrl();
    const resetLink = `${frontendUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;

    // 1. Check if mock handler is active (e.g. for unit and load tests)
    if (this.mockHandler) {
      return this.mockHandler(options);
    }

    // 2. Obtain Resend client
    const resend = this.getResendClient();
    if (!resend) {
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        console.error('[EmailService] Cannot send password reset: RESEND_API_KEY is not configured in production.');
        return {
          success: false,
          error: 'Email delivery provider is unconfigured in production.',
        };
      } else {
        // In development/test without an API key, log a friendly development notification
        console.log(`[EmailService DEV] Simulated password reset email to: ${to}`);
        console.log(`[EmailService DEV] Reset link: ${resetLink}`);
        return {
          success: true,
          messageId: `dev-simulated-${Date.now()}`,
        };
      }
    }

    // 3. Send email via Resend API
    try {
      const fromAddress = this.getFromAddress();
      const html = this.buildResetEmailHtml(name, resetLink);
      const text = this.buildResetEmailText(name, resetLink);

      const response = await resend.emails.send({
        from: fromAddress,
        to: [to],
        subject: 'Reset your HabitHero password',
        html,
        text,
      });

      if (response.error) {
        console.error('[EmailService] Resend API responded with error:', {
          code: response.error.name,
          message: response.error.message,
        });
        return {
          success: false,
          error: response.error.message,
        };
      }

      return {
        success: true,
        messageId: response.data?.id,
      };
    } catch (err: any) {
      // Sanitize log: never log the raw token or full auth payload
      console.error('[EmailService] Unexpected network or provider error sending reset email:', err?.message || err);
      return {
        success: false,
        error: err?.message || 'Failed to dispatch email via Resend.',
      };
    }
  }
}

