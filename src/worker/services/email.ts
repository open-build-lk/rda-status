// Email service with Mailgun integration

const MAILGUN_DOMAIN = "mail.road-lk.org";
const FROM_ADDRESS = `Sri Lanka Road Status <noreply@${MAILGUN_DOMAIN}>`;

export async function sendEmail(
  env: Env,
  to: string,
  subject: string,
  html: string
) {
  const formData = new FormData();
  formData.append("from", FROM_ADDRESS);
  formData.append("to", to);
  formData.append("subject", subject);
  formData.append("html", html);

  const response = await fetch(
    `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("Mailgun error:", error);
    throw new Error(`Failed to send email: ${response.status}`);
  }

  return response.json();
}

// Email template helper
function wrapInEmailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background-color: #f5f5f5;">
      <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        ${content}
      </div>
    </body>
    </html>
  `;
}

// ============ EMAIL TEMPLATES ============

export function getMagicLinkEmailHtml(url: string): string {
  return wrapInEmailTemplate(`
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Sign in to Sri Lanka Road Status</h1>
    <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
      Click the button below to sign in to your account. This link will expire in 5 minutes.
    </p>
    <a href="${url}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">
      Sign In
    </a>
    <p style="color: #999; font-size: 14px; margin-top: 24px;">
      If you didn't request this email, you can safely ignore it.
    </p>
  `);
}

export function getInvitationEmailHtml(params: {
  inviterName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
}): string {
  const roleLabel = params.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const expiryDate = params.expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return wrapInEmailTemplate(`
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">You're Invited to Sri Lanka Road Status</h1>
    <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
      <strong>${params.inviterName}</strong> has invited you to join the Sri Lanka Road Status platform as a <strong>${roleLabel}</strong>.
    </p>
    <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
      This invitation will expire on <strong>${expiryDate}</strong>.
    </p>
    <a href="${params.inviteUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">
      Accept Invitation
    </a>
    <p style="color: #999; font-size: 14px; margin-top: 24px;">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>
  `);
}

export function getVerificationEmailHtml(reportNumber: string, verifyUrl: string): string {
  return wrapInEmailTemplate(`
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Verify Your Report</h1>
    <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 8px;">
      Thank you for submitting report <strong>${reportNumber}</strong>.
    </p>
    <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 24px;">
      Please click the button below to verify your email and confirm your report.
    </p>
    <a href="${verifyUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">
      Verify Report
    </a>
    <p style="color: #999; font-size: 14px; margin-top: 24px;">
      This link will expire in 24 hours. If you didn't submit this report, you can safely ignore this email.
    </p>
  `);
}
