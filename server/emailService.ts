import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

// Debug logging
console.log("SendGrid API key loaded:", process.env.SENDGRID_API_KEY ? "✓" : "✗");
console.log("SendGrid From Email:", process.env.SENDGRID_FROM_EMAIL || "not set");

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
    console.log(`✓ Email sent successfully to ${params.to}`);
    return true;
  } catch (error: any) {
    console.error('SendGrid email error:', error);
    
    // Check for specific SendGrid errors
    if (error.response?.body?.errors) {
      const errors = error.response.body.errors;
      console.error('SendGrid error details:', JSON.stringify(errors, null, 2));
      
      // Check for credits exceeded error
      if (errors.some((err: any) => err.message?.includes('Maximum credits exceeded'))) {
        console.error('⚠️  SendGrid credits exceeded. Please upgrade your SendGrid plan or wait for credits to reset.');
        console.error('   Alternative: Set up SMTP credentials instead of SendGrid API.');
      }
      
      // Check for sender authentication error
      if (errors.some((err: any) => err.message?.includes('sender'))) {
        console.error('⚠️  SendGrid sender authentication issue. Please verify your from email address in SendGrid dashboard.');
      }
    }
    
    return false;
  }
}

export async function sendManagerInvite(email: string, inviteLink: string, eventTitle: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">You've been invited as a co-manager!</h2>
      <p>You have been invited to co-manage the event: <strong>${eventTitle}</strong></p>
      <p>Click the link below to accept the invitation and join as a co-manager:</p>
      <div style="margin: 20px 0;">
        <a href="${inviteLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Accept Invitation</a>
      </div>
      <p style="color: #666; font-size: 14px;">
        This invitation will expire in 2 hours. If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@eventfunding.com',
    subject: `Co-Manager Invitation for ${eventTitle}`,
    html,
    text: `You've been invited as a co-manager for ${eventTitle}. Accept invitation: ${inviteLink}`,
  });
}

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Password Reset Request</h2>
      <p>You requested to reset your password for the Event Funding Platform.</p>
      <p>Click the link below to reset your password:</p>
      <div style="margin: 20px 0;">
        <a href="${resetLink}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #666; font-size: 14px;">
        This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.
      </p>
    </div>
  `;

  return await sendEmail({
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@eventfunding.com',
    subject: 'Password Reset Request',
    html,
    text: `Reset your password: ${resetLink}`,
  });
}