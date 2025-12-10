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

// Role descriptions for invitation emails
const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full access to manage users, reports, organizations, and system settings.",
  rda_admin: "Manage road damage reports, assign work to organizations, and oversee province-wide operations.",
  org_admin: "Manage your organization's team members and oversee assigned road repair work.",
  field_officer: "Update progress on assigned road repairs, upload photos, and mark work as complete.",
  viewer: "View road status reports and track repair progress across the system.",
};

export function getInvitationEmailHtml(params: {
  inviterName: string;
  role: string;
  inviteUrl: string;
  expiresAt: Date;
  note?: string;
  sentAt?: Date;
}): string {
  const roleLabel = params.role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const roleDescription = ROLE_DESCRIPTIONS[params.role] || "Access the Sri Lanka Road Status platform.";
  const expiryDate = params.expiresAt.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Personal note section (only if note is provided)
  const noteSection = params.note ? `
    <div style="background-color: #fefce8; border-left: 4px solid #ca8a04; padding: 16px; margin-bottom: 20px; border-radius: 0 6px 6px 0;">
      <p style="color: #854d0e; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">Personal note from ${params.inviterName}:</p>
      <p style="color: #713f12; font-size: 14px; margin: 0; line-height: 1.5; font-style: italic;">"${params.note}"</p>
    </div>
  ` : "";

  // Sent timestamp
  const sentAt = params.sentAt || new Date();
  const sentTimestamp = sentAt.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return wrapInEmailTemplate(`
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">You're Invited to Sri Lanka Road Status</h1>
    <p style="color: #666; font-size: 16px; line-height: 1.5; margin-bottom: 16px;">
      <strong>${params.inviterName}</strong> has invited you to join the Sri Lanka Road Status platform.
    </p>
    ${noteSection}
    <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 16px; margin-bottom: 20px; border-radius: 0 6px 6px 0;">
      <p style="color: #1e40af; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">Your Role: ${roleLabel}</p>
      <p style="color: #1e3a5f; font-size: 14px; margin: 0; line-height: 1.4;">${roleDescription}</p>
    </div>
    <p style="color: #666; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
      This invitation expires on <strong>${expiryDate}</strong>.
    </p>
    <a href="${params.inviteUrl}" style="display: inline-block; background-color: #2563eb; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; font-size: 16px;">
      Accept Invitation
    </a>
    <p style="color: #999; font-size: 14px; margin-top: 24px;">
      If you weren't expecting this invitation, you can safely ignore this email.
    </p>
    <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0 16px 0;">
    <p style="color: #b0b0b0; font-size: 12px; margin: 0; text-align: center;">
      Sent: ${sentTimestamp}
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
