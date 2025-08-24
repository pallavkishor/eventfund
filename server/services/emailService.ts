import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text ?? "",
      html: params.html,
    });
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string): Promise<boolean> {
  const baseUrl = process.env.REPL_URL || process.env.FRONTEND_URL || 'http://localhost:5000';
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #374151; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #E5E7EB; }
        .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { background: #F9FAFB; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6B7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EventFund - Password Reset</h1>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>You requested a password reset for your EventFund account. Click the button below to reset your password:</p>
          <a href="${resetUrl}" class="button">Reset Password</a>
          <p>If you didn't request this reset, you can safely ignore this email. The link will expire in 1 hour.</p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3B82F6;">${resetUrl}</p>
        </div>
        <div class="footer">
          <p>This email was sent by EventFund. If you have any questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    from: process.env.FROM_EMAIL || 'noreply@eventfund.com',
    subject: 'Reset Your EventFund Password',
    html,
    text: `Reset your EventFund password by clicking this link: ${resetUrl}. If you didn't request this reset, you can safely ignore this email.`,
  });
}

export async function sendCoManagerInvitation(
  email: string, 
  eventTitle: string, 
  inviterName: string, 
  inviteToken: string
): Promise<boolean> {
  // Get the current repl URL or fallback to localhost
  const baseUrl = process.env.REPL_URL || process.env.FRONTEND_URL || 'http://localhost:5000';
  const inviteUrl = `${baseUrl}/invite/${inviteToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #374151; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #E5E7EB; }
        .event-card { background: #F3F4F6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
        .footer { background: #F9FAFB; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #6B7280; }
        .warning { background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>EventFund - Co-Manager Invitation</h1>
        </div>
        <div class="content">
          <h2>You're Invited to Co-Manage an Event!</h2>
          <p>Hi there,</p>
          <p><strong>${inviterName}</strong> has invited you to be a co-manager for the following event:</p>
          
          <div class="event-card">
            <h3 style="margin-top: 0; color: #3B82F6;">${eventTitle}</h3>
            <p>As a co-manager, you'll be able to:</p>
            <ul>
              <li>Review and approve contribution requests</li>
              <li>Add and manage event expenses</li>
              <li>View detailed event statistics</li>
              <li>Help ensure transparent fund management</li>
            </ul>
          </div>

          <a href="${inviteUrl}" class="button">Accept Invitation</a>

          <div class="warning">
            <strong>⏰ Important:</strong> This invitation link will expire in 2 hours. Please accept it as soon as possible.
          </div>

          <p>If you don't have an EventFund account yet, you'll be able to create one when you click the invitation link.</p>
          
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #3B82F6;">${inviteUrl}</p>
        </div>
        <div class="footer">
          <p>This invitation was sent through EventFund. If you believe this was sent in error, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    from: process.env.FROM_EMAIL || 'noreply@eventfund.com',
    subject: `Co-Manager Invitation: ${eventTitle}`,
    html,
    text: `You've been invited by ${inviterName} to co-manage the event "${eventTitle}" on EventFund. Accept the invitation by clicking this link: ${inviteUrl}. This invitation expires in 2 hours.`,
  });
}
