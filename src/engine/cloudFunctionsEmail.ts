/**
 * FUNDED APEX (fundedapex.com) — Firebase Cloud Functions
 * Automated Email Notification Engine for Terminal User ID & Password Dispatches
 * Official Support & Dispatch Sender: fundedapexsupport@gmail.com
 */

export interface TerminalCredentialMailPayload {
  to: string;
  recipientName: string;
  sender: string;
  domain: string;
  accountId: string;
  accountNumber: string;
  challengeId: string;
  challengeTitle: string;
  terminalUserId: string;
  terminalPassword: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  triggeredBy: 'admin_account_update' | 'admin_challenge_update' | 'account_allocation';
  createdAt: string;
}

export interface FirestoreDocumentChange<T> {
  before: T | undefined;
  after: T | undefined;
}

export interface TradingAccountDoc {
  id: string;
  accountNumber: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  challengeId: string;
  challengeTitle: string;
  terminalUserId?: string;
  terminalPassword?: string;
}

export interface ChallengeDoc {
  id: string;
  title: string;
  terminalUserId?: string;
  terminalPassword?: string;
}

export const FUNDED_APEX_SUPPORT_EMAIL = 'fundedapexsupport@gmail.com';
export const FUNDED_APEX_DOMAIN = 'fundedapex.com';

/**
 * Builds the transactional email payload sent to a trader when an Admin
 * generates or updates their Challenge / Trading Account Terminal User ID or Password.
 */
export function buildTerminalCredentialsEmailPayload(params: {
  recipientEmail: string;
  recipientName: string;
  accountId: string;
  accountNumber: string;
  challengeId: string;
  challengeTitle: string;
  terminalUserId: string;
  terminalPassword: string;
  triggeredBy: 'admin_account_update' | 'admin_challenge_update' | 'account_allocation';
}): TerminalCredentialMailPayload {
  const {
    recipientEmail,
    recipientName,
    accountId,
    accountNumber,
    challengeId,
    challengeTitle,
    terminalUserId,
    terminalPassword,
    triggeredBy,
  } = params;

  const subject = `[FUNDED APEX] Your New Trading Terminal Credentials (${accountNumber})`;
  const textBody = [
    `Hello ${recipientName || 'Trader'},`,
    ``,
    `Your FUNDED APEX (${FUNDED_APEX_DOMAIN}) Trading Terminal login credentials for ${challengeTitle} (Account ${accountNumber}) have been generated/updated by the Administrator:`,
    ``,
    `• Terminal User ID: ${terminalUserId}`,
    `• Terminal Password: ${terminalPassword}`,
    `• Trading Portal: https://${FUNDED_APEX_DOMAIN}`,
    ``,
    `How to access the Trading Terminal:`,
    `1. Sign in to your account at https://${FUNDED_APEX_DOMAIN}`,
    `2. Open your Trader Dashboard and click "Open Terminal" on Account ${accountNumber}`,
    `3. Enter both your Terminal User ID (${terminalUserId}) and Terminal Password (${terminalPassword}) to unlock live execution.`,
    ``,
    `If you need any assistance, contact our support desk at ${FUNDED_APEX_SUPPORT_EMAIL}.`,
    ``,
    `— FUNDED APEX Risk & Operations Desk`,
    `${FUNDED_APEX_SUPPORT_EMAIL}`,
  ].join('\n');

  const htmlBody = `
    <div style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #030A07; color: #F8FAFC; padding: 32px; border-radius: 16px; border: 1px solid rgba(0, 255, 163, 0.25); max-width: 600px; margin: 0 auto;">
      <div style="margin-bottom: 20px;">
        <span style="font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #00FFA3;">FUNDED APEX • ${FUNDED_APEX_DOMAIN.toUpperCase()}</span>
        <h2 style="margin: 8px 0 4px; color: #FFFFFF; font-size: 22px;">New Trading Terminal Credentials</h2>
        <p style="margin: 0; color: #94A3B8; font-size: 13px;">Automated Cloud Function Notification for ${recipientName || recipientEmail}</p>
      </div>
      <div style="background-color: #07130E; border: 1px solid rgba(0, 255, 163, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
        <p style="margin: 0 0 8px; font-size: 12px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px;">Account & Challenge</p>
        <p style="margin: 0 0 16px; font-size: 15px; font-weight: 700; color: #FFFFFF;">${challengeTitle} — <span style="color: #00FFA3; font-family: monospace;">${accountNumber}</span></p>
        <div style="display: grid; gap: 12px;">
          <div style="background: #030A07; padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #94A3B8;">Terminal User ID</div>
            <div style="font-size: 16px; font-weight: 800; font-family: monospace; color: #00FFA3; margin-top: 4px;">${terminalUserId}</div>
          </div>
          <div style="background: #030A07; padding: 12px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #94A3B8;">Terminal Password</div>
            <div style="font-size: 16px; font-weight: 800; font-family: monospace; color: #00FFA3; margin-top: 4px;">${terminalPassword}</div>
          </div>
        </div>
      </div>
      <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6;">
        Enter both your <strong>Terminal User ID</strong> and <strong>Terminal Password</strong> on the FUNDED APEX Trading Terminal lock screen to start executing trades.
      </p>
      <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 20px 0;" />
      <p style="font-size: 11px; color: #64748B; margin: 0;">
        Need help? Contact <a href="mailto:${FUNDED_APEX_SUPPORT_EMAIL}" style="color: #00FFA3; text-decoration: none;">${FUNDED_APEX_SUPPORT_EMAIL}</a> • <a href="https://${FUNDED_APEX_DOMAIN}" style="color: #00FFA3; text-decoration: none;">${FUNDED_APEX_DOMAIN}</a>
      </p>
    </div>
  `.trim();

  return {
    to: recipientEmail,
    recipientName,
    sender: `FUNDED APEX <${FUNDED_APEX_SUPPORT_EMAIL}>`,
    domain: FUNDED_APEX_DOMAIN,
    accountId,
    accountNumber,
    challengeId,
    challengeTitle,
    terminalUserId,
    terminalPassword,
    subject,
    htmlBody,
    textBody,
    triggeredBy,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Firebase Cloud Function Trigger Handler:
 * Fires whenever `tradingAccounts/{accountId}` is created or updated with a new
 * `terminalPassword` or `terminalUserId`.
 */
export async function onTradingAccountCredentialsWrite(
  change: FirestoreDocumentChange<TradingAccountDoc>,
  enqueueMail: (payload: TerminalCredentialMailPayload) => Promise<void>
): Promise<TerminalCredentialMailPayload | null> {
  const before = change.before;
  const after = change.after;
  if (!after || !after.userEmail) return null;

  const passwordChanged = before?.terminalPassword !== after.terminalPassword;
  const userIdChanged = before?.terminalUserId !== after.terminalUserId;

  if (!passwordChanged && !userIdChanged) {
    return null;
  }

  const terminalUserId = after.terminalUserId || `APEX-ID-${after.accountNumber.replace(/[^0-9]/g, '').slice(-4) || '1001'}`;
  const terminalPassword = after.terminalPassword || 'APEX-0000';

  const mailPayload = buildTerminalCredentialsEmailPayload({
    recipientEmail: after.userEmail,
    recipientName: after.userName || 'Trader',
    accountId: after.id,
    accountNumber: after.accountNumber,
    challengeId: after.challengeId,
    challengeTitle: after.challengeTitle,
    terminalUserId,
    terminalPassword,
    triggeredBy: before ? 'admin_account_update' : 'account_allocation',
  });

  await enqueueMail(mailPayload);
  return mailPayload;
}
