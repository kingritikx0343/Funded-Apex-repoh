/**
 * FUNDED APEX (fundedapex.com) — Institutional Email Notification System
 * Automated & Branded Email Notification Engine for:
 *  1. Successful Registration (`registration_welcome`)
 *  2. Password Reset & Security Updates (`password_reset`)
 *  3. Challenge Status Updates (`challenge_status_update`: `passed`, `failed`, `suspended`, `active`)
 *  4. Promotional Offers (`promotional_offer`)
 *  5. Terminal Credentials Allocation (`terminal_credentials`)
 * Official Support & Dispatch Sender: fundedapexsupport@gmail.com
 */

export type EmailEventType =
  | 'registration_welcome'
  | 'password_reset'
  | 'challenge_status_update'
  | 'promotional_offer'
  | 'terminal_credentials'
  | 'custom_manual';

export type ChallengeStatusEmailType = 'passed' | 'failed' | 'suspended' | 'active';

export interface FundedApexEmailPayload {
  id: string;
  eventType: EmailEventType;
  to: string;
  recipientEmail?: string;
  recipientName: string;
  from: string;
  fromName: string;
  sender: string;
  domain: string;
  subject: string;
  html: string;
  htmlBody: string;
  text: string;
  textBody: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaRoute?: string;
  sentAt: string;
  createdAt: string;
  read?: boolean;
  // Optional metadata for specific email types
  accountId?: string;
  accountNumber?: string;
  challengeId?: string;
  challengeTitle?: string;
  accountSize?: number;
  challengeStatus?: ChallengeStatusEmailType;
  terminalUserId?: string;
  terminalPassword?: string;
  promoCode?: string;
  discountPct?: number;
  triggeredBy?: string;
}

export type TerminalCredentialMailPayload = FundedApexEmailPayload;

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

function wrapBrandedEmailHtml(params: {
  badgeText: string;
  badgeColorHex: string;
  headline: string;
  subheadline: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  ctaColorHex?: string;
}): string {
  const ctaBg = params.ctaColorHex || '#00FFA3';
  return `
<div style="font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background-color: #030A07; color: #F8FAFC; padding: 32px 24px; border-radius: 20px; border: 1px solid rgba(0, 255, 163, 0.28); max-width: 620px; margin: 0 auto; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);">
  <!-- Header Bar -->
  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(0, 255, 163, 0.18); padding-bottom: 18px; margin-bottom: 24px;">
    <div>
      <div style="font-size: 18px; font-weight: 900; letter-spacing: 1px; color: #FFFFFF;">
        FUNDED <span style="color: #00FFA3;">APEX</span>
      </div>
      <div style="font-size: 11px; font-family: monospace; color: #94B8AA; margin-top: 2px;">
        INSTITUTIONAL PROPRIETARY TRADING • ${FUNDED_APEX_DOMAIN.toUpperCase()}
      </div>
    </div>
    <span style="display: inline-block; padding: 5px 12px; border-radius: 999px; font-size: 10px; font-family: monospace; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase; background-color: rgba(0, 255, 163, 0.12); color: ${params.badgeColorHex}; border: 1px solid ${params.badgeColorHex};">
      ${params.badgeText}
    </span>
  </div>

  <!-- Headline -->
  <div style="margin-bottom: 20px;">
    <h1 style="margin: 0 0 8px; color: #FFFFFF; font-size: 22px; font-weight: 800; line-height: 1.3;">
      ${params.headline}
    </h1>
    <p style="margin: 0; color: #94B8AA; font-size: 13px; line-height: 1.5;">
      ${params.subheadline}
    </p>
  </div>

  <!-- Content Body -->
  <div style="margin-bottom: 26px;">
    ${params.bodyHtml}
  </div>

  <!-- Branded Call To Action Button -->
  <div style="text-align: center; margin: 28px 0;">
    <a href="${params.ctaUrl}" style="display: inline-block; background: ${ctaBg}; color: #021008; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; padding: 14px 28px; border-radius: 12px; text-decoration: none; box-shadow: 0 0 24px rgba(0, 255, 163, 0.35);">
      ${params.ctaLabel}
    </a>
  </div>

  <!-- Official Footer -->
  <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 18px; margin-top: 24px; font-size: 11px; color: #64748B; line-height: 1.6;">
    <div style="color: #94B8AA; font-weight: 700; margin-bottom: 4px;">
      FUNDED APEX Prop Firm Operations &amp; Risk Desk
    </div>
    <div>
      Official Support: <a href="mailto:${FUNDED_APEX_SUPPORT_EMAIL}" style="color: #00FFA3; text-decoration: none;">${FUNDED_APEX_SUPPORT_EMAIL}</a> • Web Portal: <a href="https://${FUNDED_APEX_DOMAIN}" style="color: #00FFA3; text-decoration: none;">https://${FUNDED_APEX_DOMAIN}</a>
    </div>
    <div style="margin-top: 6px; font-size: 10px; color: #475569;">
      © ${new Date().getFullYear()} FUNDED APEX. All rights reserved. Instant, 1-Step, 2-Step &amp; 3-Step Evaluations up to $200,000.
    </div>
  </div>
</div>
  `.trim();
}

/**
 * 1. Successful Registration Welcome Email
 */
export function buildRegistrationWelcomeEmailPayload(params: {
  recipientEmail: string;
  recipientName: string;
  referralCode?: string;
  country?: string;
}): FundedApexEmailPayload {
  const now = new Date().toISOString();
  const cleanName = params.recipientName || params.recipientEmail.split('@')[0] || 'Trader';
  const refCode = params.referralCode || 'APEX-PARTNER';
  const subject = `Welcome to FUNDED APEX — Your Prop Trader Account is Active!`;
  const ctaLabel = 'Explore Evaluation Challenges & Get Funded →';
  const ctaUrl = `https://${FUNDED_APEX_DOMAIN}/?page=challenges`;

  const bodyHtml = `
    <p style="font-size: 14px; color: #E2E8F0; line-height: 1.6; margin: 0 0 16px;">
      Hello <strong>${cleanName}</strong>,
    </p>
    <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6; margin: 0 0 18px;">
      Welcome to <strong>FUNDED APEX</strong>! Your trader profile (<span style="color: #00FFA3; font-family: monospace;">${params.recipientEmail}</span>) has been verified and activated on our institutional trading infrastructure.
    </p>
    <div style="background-color: #07150F; border: 1px solid rgba(0, 255, 163, 0.3); border-radius: 14px; padding: 18px; margin-bottom: 18px;">
      <div style="font-size: 11px; font-family: monospace; color: #00FFA3; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 10px;">
        YOUR TRADER PROFILE SUMMARY
      </div>
      <div style="font-size: 13px; color: #F8FAFC; margin-bottom: 6px;">
        • <strong>Registered Email:</strong> <span style="font-family: monospace; color: #00FFA3;">${params.recipientEmail}</span>
      </div>
      <div style="font-size: 13px; color: #F8FAFC; margin-bottom: 6px;">
        • <strong>Region / Country:</strong> ${params.country || 'Global'}
      </div>
      <div style="font-size: 13px; color: #F8FAFC; margin-bottom: 6px;">
        • <strong>Partner Referral Code:</strong> <span style="font-family: monospace; color: #00FFA3;">${refCode}</span> (Earn up to 15% commission)
      </div>
      <div style="font-size: 13px; color: #F8FAFC;">
        • <strong>New Trader Promo:</strong> Use code <span style="font-family: monospace; background: rgba(0,255,163,0.15); color: #00FFA3; padding: 2px 6px; border-radius: 4px; font-weight: 800;">5K30OFF</span> for <strong>30% OFF</strong> your $5K Starter Evaluation ($7.00 Only)!
      </div>
    </div>
    <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6; margin: 0;">
      Click the button below to select your evaluation program ($5K to $200K) or launch your Trader Dashboard.
    </p>
  `;

  const html = wrapBrandedEmailHtml({
    badgeText: 'REGISTRATION CONFIRMED',
    badgeColorHex: '#00FFA3',
    headline: `Welcome to FUNDED APEX, ${cleanName}!`,
    subheadline: 'Your institutional prop trading portal and live execution dashboard are ready.',
    bodyHtml,
    ctaLabel,
    ctaUrl,
  });

  const text = [
    `Welcome to FUNDED APEX, ${cleanName}!`,
    `Your trader account (${params.recipientEmail}) is now active.`,
    `Partner Referral Code: ${refCode}`,
    `Starter Offer: Use code 5K30OFF for 30% OFF the $5K Evaluation ($7.00 Only).`,
    `CTA: ${ctaLabel} -> ${ctaUrl}`,
  ].join('\n');

  return {
    id: `mail-reg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventType: 'registration_welcome',
    to: params.recipientEmail,
    recipientName: cleanName,
    from: FUNDED_APEX_SUPPORT_EMAIL,
    fromName: 'FUNDED APEX Welcome Desk',
    sender: `FUNDED APEX <${FUNDED_APEX_SUPPORT_EMAIL}>`,
    domain: FUNDED_APEX_DOMAIN,
    subject,
    html,
    htmlBody: html,
    text,
    textBody: text,
    ctaLabel,
    ctaUrl,
    ctaRoute: 'challenges',
    promoCode: '5K30OFF',
    discountPct: 30,
    sentAt: now,
    createdAt: now,
    read: false,
  };
}

/**
 * 2. Password Reset & Security Notification Email
 */
export function buildPasswordResetEmailPayload(params: {
  recipientEmail: string;
  recipientName: string;
  resetCodeOrPassword?: string;
  initiatedBy: 'user_self_service' | 'admin_reset' | 'password_changed';
}): FundedApexEmailPayload {
  const now = new Date().toISOString();
  const cleanName = params.recipientName || params.recipientEmail.split('@')[0] || 'Trader';
  const isChanged = params.initiatedBy === 'password_changed';
  const isAdminReset = params.initiatedBy === 'admin_reset';

  const subject = isChanged
    ? `[FUNDED APEX] Security Alert: Your Account Password Was Updated`
    : isAdminReset
    ? `[FUNDED APEX] Your Account Password Has Been Reset by Administrator`
    : `[FUNDED APEX] Password Reset Instructions & Verification Token`;

  const ctaLabel = isChanged
    ? 'Review Account Security Settings →'
    : 'Sign In & Reset Your Password Now →';
  const ctaUrl = isChanged
    ? `https://${FUNDED_APEX_DOMAIN}/?page=dashboard`
    : `https://${FUNDED_APEX_DOMAIN}/?page=login`;

  const tokenBlock = params.resetCodeOrPassword
    ? `
    <div style="background-color: #07150F; border: 1px solid rgba(6, 182, 212, 0.4); border-radius: 14px; padding: 18px; margin-bottom: 18px; text-align: center;">
      <div style="font-size: 10px; font-family: monospace; text-transform: uppercase; letter-spacing: 1.5px; color: #67E8F9; margin-bottom: 6px;">
        ${isAdminReset ? 'YOUR TEMPORARY LOGIN PASSWORD' : 'PASSWORD RESET VERIFICATION CODE'}
      </div>
      <div style="font-size: 20px; font-family: monospace; font-weight: 900; color: #00FFA3; letter-spacing: 2px;">
        ${params.resetCodeOrPassword}
      </div>
    </div>`
    : '';

  const bodyHtml = `
    <p style="font-size: 14px; color: #E2E8F0; line-height: 1.6; margin: 0 0 14px;">
      Hello <strong>${cleanName}</strong>,
    </p>
    <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6; margin: 0 0 18px;">
      ${
        isChanged
          ? `Your FUNDED APEX login password for <strong>${params.recipientEmail}</strong> was recently updated. If you made this change, no further action is needed.`
          : isAdminReset
          ? `An administrator at FUNDED APEX has issued a new login password for your trader account (<strong>${params.recipientEmail}</strong>). Use the credential below to sign in:`
          : `We received a request to reset the password for your FUNDED APEX trader account (<strong>${params.recipientEmail}</strong>). Use the verification token or click the button below to complete your password reset:`
      }
    </p>
    ${tokenBlock}
    <p style="font-size: 12px; color: #94A3B8; line-height: 1.6; margin: 0;">
      If you did not request this security action, please contact our Risk &amp; Security Desk immediately at <a href="mailto:${FUNDED_APEX_SUPPORT_EMAIL}" style="color: #00FFA3;">${FUNDED_APEX_SUPPORT_EMAIL}</a>.
    </p>
  `;

  const html = wrapBrandedEmailHtml({
    badgeText: 'SECURITY & PASSWORD',
    badgeColorHex: '#38BDF8',
    headline: isChanged ? 'Account Password Updated' : 'Reset Your FUNDED APEX Password',
    subheadline: `Automated Security Dispatch for ${params.recipientEmail}`,
    bodyHtml,
    ctaLabel,
    ctaUrl,
  });

  const text = [
    `Hello ${cleanName},`,
    subject,
    params.resetCodeOrPassword ? `Code / Temporary Password: ${params.resetCodeOrPassword}` : '',
    `Action: ${ctaLabel} -> ${ctaUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    id: `mail-pwd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventType: 'password_reset',
    to: params.recipientEmail,
    recipientName: cleanName,
    from: FUNDED_APEX_SUPPORT_EMAIL,
    fromName: 'FUNDED APEX Security Desk',
    sender: `FUNDED APEX <${FUNDED_APEX_SUPPORT_EMAIL}>`,
    domain: FUNDED_APEX_DOMAIN,
    subject,
    html,
    htmlBody: html,
    text,
    textBody: text,
    ctaLabel,
    ctaUrl,
    ctaRoute: isChanged ? 'dashboard' : 'login',
    sentAt: now,
    createdAt: now,
    read: false,
  };
}

/**
 * 3. Challenge Status Update Email (passed, failed, suspended, active/phase advance)
 */
export function buildChallengeStatusUpdateEmailPayload(params: {
  recipientEmail: string;
  recipientName: string;
  accountId?: string;
  accountNumber: string;
  challengeId: string;
  challengeTitle: string;
  accountSize: number;
  status: ChallengeStatusEmailType;
  reason?: string;
  currentBalance?: number;
  currentEquity?: number;
  currentStep?: number;
  totalSteps?: number;
  profitSplitPct?: number;
}): FundedApexEmailPayload {
  const now = new Date().toISOString();
  const cleanName = params.recipientName || params.recipientEmail.split('@')[0] || 'Trader';
  const { status, accountNumber, challengeTitle, accountSize } = params;

  const isPassed = status === 'passed';
  const isFailed = status === 'failed';
  const isSuspended = status === 'suspended';

  const subject = isPassed
    ? `[FUNDED APEX] Congratulations! Challenge PASSED — Account #${accountNumber} is Now FUNDED!`
    : isFailed
    ? `[FUNDED APEX] Challenge Status Update: Account #${accountNumber} Breached / Failed`
    : isSuspended
    ? `[FUNDED APEX] Urgent Notice: Account #${accountNumber} Suspended for Compliance Review`
    : `[FUNDED APEX] Challenge Milestone Reached: Account #${accountNumber} Advanced to Next Phase!`;

  const badgeText = isPassed
    ? 'CHALLENGE PASSED • FUNDED'
    : isFailed
    ? 'CHALLENGE FAILED • BREACHED'
    : isSuspended
    ? 'ACCOUNT SUSPENDED'
    : 'PHASE PROMOTED • ACTIVE';

  const badgeColorHex = isPassed
    ? '#00FFA3'
    : isFailed
    ? '#FB7185'
    : isSuspended
    ? '#FBBF24'
    : '#38BDF8';

  const ctaLabel = isPassed
    ? 'Claim Certificate & Request Profit Payout →'
    : isFailed
    ? 'Retry Evaluation with 20% OFF (Code: APEX20) →'
    : isSuspended
    ? 'Contact Compliance & Review Rules →'
    : 'Open Live Trading Terminal →';

  const ctaUrl = isPassed
    ? `https://${FUNDED_APEX_DOMAIN}/?page=dashboard`
    : isFailed
    ? `https://${FUNDED_APEX_DOMAIN}/?page=challenges&coupon=APEX20`
    : isSuspended
    ? `https://${FUNDED_APEX_DOMAIN}/?page=trading-rules`
    : `https://${FUNDED_APEX_DOMAIN}/?page=terminal`;

  const bodyHtml = `
    <p style="font-size: 14px; color: #E2E8F0; line-height: 1.6; margin: 0 0 14px;">
      Hello <strong>${cleanName}</strong>,
    </p>
    <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6; margin: 0 0 18px;">
      ${
        isPassed
          ? `Congratulations! You have officially completed all evaluation objectives on <strong>${challengeTitle}</strong> (Account <span style="color:#00FFA3;font-family:monospace;">#${accountNumber}</span>). Your account is now <strong>FUNDED</strong> and eligible for up to <strong>${params.profitSplitPct || 90}% profit split payouts</strong>.`
          : isFailed
          ? `Your evaluation account <strong>#${accountNumber}</strong> (${challengeTitle}) has been marked as <strong>FAILED (Breached)</strong> due to a risk rule violation. All open positions have been automatically settled and terminal execution access has been locked.`
          : isSuspended
          ? `Your trading account <strong>#${accountNumber}</strong> (${challengeTitle}) has been temporarily <strong>SUSPENDED</strong> by the FUNDED APEX Risk &amp; Compliance Desk.`
          : `Great trading! Your evaluation account <strong>#${accountNumber}</strong> (${challengeTitle}) has passed its current step and been promoted to the next evaluation phase.`
      }
    </p>
    <div style="background-color: #07150F; border: 1px solid ${badgeColorHex}55; border-radius: 14px; padding: 18px; margin-bottom: 18px;">
      <div style="font-size: 11px; font-family: monospace; color: ${badgeColorHex}; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 10px;">
        CHALLENGE TELEMETRY • #${accountNumber}
      </div>
      <div style="font-size: 13px; color: #F8FAFC; margin-bottom: 6px;">
        • <strong>Program:</strong> ${challengeTitle} ($${accountSize.toLocaleString()})
      </div>
      <div style="font-size: 13px; color: #F8FAFC; margin-bottom: 6px;">
        • <strong>New Status:</strong> <span style="color: ${badgeColorHex}; font-weight: 800; text-transform: uppercase;">${status}</span>
      </div>
      ${
        params.currentBalance !== undefined
          ? `<div style="font-size: 13px; color: #F8FAFC; margin-bottom: 6px;">• <strong>Recorded Balance / Equity:</strong> $${params.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} / $${(params.currentEquity ?? params.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>`
          : ''
      }
      ${
        params.reason
          ? `<div style="font-size: 13px; color: #F8FAFC; margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08);">• <strong>Details / Reason:</strong> ${params.reason}</div>`
          : ''
      }
    </div>
    <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6; margin: 0;">
      ${
        isPassed
          ? 'Open your Trader Dashboard to download your Funded Trader Certificate and submit your profit payout request.'
          : isFailed
          ? 'Do not give up — you can start a fresh evaluation immediately with our <strong>20% OFF Retry Coupon (Code: APEX20)</strong> or our <strong>30% OFF $5K Starter Promo (Code: 5K30OFF)</strong>.'
          : isSuspended
          ? `Please review our Trading Rules or contact ${FUNDED_APEX_SUPPORT_EMAIL} with your account number (#${accountNumber}) to resolve this suspension.`
          : 'Launch your Live Trading Terminal to continue executing your strategy under our institutional risk parameters.'
      }
    </p>
  `;

  const html = wrapBrandedEmailHtml({
    badgeText,
    badgeColorHex,
    headline: isPassed
      ? `Challenge Passed — You Are Funded! (#${accountNumber})`
      : isFailed
      ? `Evaluation Breached — Account #${accountNumber}`
      : isSuspended
      ? `Account #${accountNumber} Suspended`
      : `Phase Milestone Reached (#${accountNumber})`,
    subheadline: `${challengeTitle} • Official Status Notification`,
    bodyHtml,
    ctaLabel,
    ctaUrl,
    ctaColorHex: isFailed ? '#38BDF8' : isSuspended ? '#FBBF24' : '#00FFA3',
  });

  const text = [
    `Hello ${cleanName},`,
    subject,
    `Account: #${accountNumber} (${challengeTitle})`,
    `Status: ${status.toUpperCase()}`,
    params.reason ? `Reason: ${params.reason}` : '',
    `CTA: ${ctaLabel} -> ${ctaUrl}`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    id: `mail-status-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventType: 'challenge_status_update',
    to: params.recipientEmail,
    recipientName: cleanName,
    from: FUNDED_APEX_SUPPORT_EMAIL,
    fromName: 'FUNDED APEX Risk & Evaluations',
    sender: `FUNDED APEX <${FUNDED_APEX_SUPPORT_EMAIL}>`,
    domain: FUNDED_APEX_DOMAIN,
    accountId: params.accountId,
    accountNumber,
    challengeId: params.challengeId,
    challengeTitle,
    accountSize,
    challengeStatus: status,
    promoCode: isFailed ? 'APEX20' : undefined,
    discountPct: isFailed ? 20 : undefined,
    subject,
    html,
    htmlBody: html,
    text,
    textBody: text,
    ctaLabel,
    ctaUrl,
    ctaRoute: isPassed ? 'payouts' : isFailed ? 'challenges' : isSuspended ? 'faq' : 'terminal',
    sentAt: now,
    createdAt: now,
    read: false,
  };
}

/**
 * 4. Promotional Offer Email
 */
export function buildPromotionalOfferEmailPayload(params: {
  recipientEmail: string;
  recipientName: string;
  offerTitle: string;
  discountPct: number;
  promoCode: string;
  challengeId?: string;
  challengeTitle?: string;
  originalPriceUsd?: number;
  discountedPriceUsd?: number;
  expiresLabel?: string;
}): FundedApexEmailPayload {
  const now = new Date().toISOString();
  const cleanName = params.recipientName || 'FUNDED APEX Trader';
  const cleanCode = params.promoCode.toUpperCase();
  const subject = `[FUNDED APEX] Exclusive Offer: ${params.discountPct}% OFF (${cleanCode}) — ${params.offerTitle}`;
  const ctaLabel = `Claim ${params.discountPct}% OFF With Code ${cleanCode} Now →`;
  const ctaUrl = `https://${FUNDED_APEX_DOMAIN}/?page=challenges&coupon=${encodeURIComponent(cleanCode)}`;

  const priceComparisonHtml =
    params.originalPriceUsd && params.discountedPriceUsd
      ? `<div style="font-size: 14px; color: #F8FAFC; margin-top: 8px;">
          Special Price: <span style="text-decoration: line-through; color: #94A3B8;">$${params.originalPriceUsd.toFixed(2)}</span>
          <strong style="color: #00FFA3; font-size: 18px; margin-left: 6px;">$${params.discountedPriceUsd.toFixed(2)} USD ONLY</strong>
        </div>`
      : '';

  const bodyHtml = `
    <p style="font-size: 14px; color: #E2E8F0; line-height: 1.6; margin: 0 0 14px;">
      Hello <strong>${cleanName}</strong>,
    </p>
    <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6; margin: 0 0 18px;">
      Take advantage of our limited-time institutional prop trading promotion on <strong>FUNDED APEX</strong>! Unlock up to <strong>$200,000 in simulated funded capital</strong> with raw institutional spreads, zero hidden rules on 1-Step/2-Step/3-Step evaluations, and fast USDT BEP-20 payouts.
    </p>
    <div style="background: linear-gradient(135deg, #071A12 0%, #04100B 100%); border: 2px dashed #00FFA3; border-radius: 16px; padding: 22px; margin-bottom: 18px; text-align: center;">
      <div style="font-size: 11px; font-family: monospace; color: #FBBF24; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;">
        LIMITED-TIME PROMOTIONAL VOUCHER
      </div>
      <div style="font-size: 26px; font-weight: 900; color: #FFFFFF; margin: 6px 0;">
        ${params.discountPct}% OFF INSTANT DISCOUNT
      </div>
      <div style="font-size: 13px; color: #94B8AA; margin-bottom: 12px;">
        ${params.challengeTitle || 'Valid on FUNDED APEX Evaluation Challenges'}
      </div>
      <div style="display: inline-block; background-color: #030A07; border: 1px solid #00FFA3; border-radius: 10px; padding: 10px 20px; font-family: monospace; font-size: 18px; font-weight: 900; color: #00FFA3; letter-spacing: 2px;">
        CODE: ${cleanCode}
      </div>
      ${priceComparisonHtml}
    </div>
    <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6; margin: 0;">
      Click the Call-To-Action button below to automatically apply promo code <strong>${cleanCode}</strong> at checkout and receive your trading account credentials.
    </p>
  `;

  const html = wrapBrandedEmailHtml({
    badgeText: `PROMO OFFER • ${params.discountPct}% OFF`,
    badgeColorHex: '#FBBF24',
    headline: params.offerTitle,
    subheadline: `Use Official Promo Code ${cleanCode} at Checkout`,
    bodyHtml,
    ctaLabel,
    ctaUrl,
  });

  const text = [
    `Hello ${cleanName},`,
    `Exclusive FUNDED APEX Promotional Offer: ${params.offerTitle}`,
    `Discount: ${params.discountPct}% OFF`,
    `Promo Code: ${cleanCode}`,
    `Claim Offer: ${ctaUrl}`,
  ].join('\n');

  return {
    id: `mail-promo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventType: 'promotional_offer',
    to: params.recipientEmail,
    recipientName: cleanName,
    from: FUNDED_APEX_SUPPORT_EMAIL,
    fromName: 'FUNDED APEX Promotions',
    sender: `FUNDED APEX <${FUNDED_APEX_SUPPORT_EMAIL}>`,
    domain: FUNDED_APEX_DOMAIN,
    challengeId: params.challengeId || 'two-step-5000',
    challengeTitle: params.challengeTitle || '$5K Starter Two-Step Evaluation',
    promoCode: cleanCode,
    discountPct: params.discountPct,
    subject,
    html,
    htmlBody: html,
    text,
    textBody: text,
    ctaLabel,
    ctaUrl,
    ctaRoute: 'challenges',
    sentAt: now,
    createdAt: now,
    read: false,
  };
}

/**
 * 5. Terminal Credentials Email
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
}): FundedApexEmailPayload {
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

  const now = new Date().toISOString();
  const subject = `[FUNDED APEX] Your Trading Terminal Credentials (${accountNumber})`;
  const ctaLabel = `Launch Live Trading Terminal (#${accountNumber}) →`;
  const ctaUrl = `https://${FUNDED_APEX_DOMAIN}/?page=terminal`;

  const textBody = [
    `Hello ${recipientName || 'Trader'},`,
    ``,
    `Your FUNDED APEX (${FUNDED_APEX_DOMAIN}) Trading Terminal login credentials for ${challengeTitle} (Account ${accountNumber}) have been generated/updated:`,
    ``,
    `• Terminal User ID: ${terminalUserId}`,
    `• Terminal Password: ${terminalPassword}`,
    `• Trading Portal: ${ctaUrl}`,
    ``,
    `If you need any assistance, contact our support desk at ${FUNDED_APEX_SUPPORT_EMAIL}.`,
  ].join('\n');

  const bodyHtml = `
    <p style="font-size: 14px; color: #E2E8F0; line-height: 1.6; margin: 0 0 14px;">
      Hello <strong>${recipientName || recipientEmail}</strong>,
    </p>
    <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6; margin: 0 0 18px;">
      Your institutional <strong>FUNDED APEX</strong> Trading Terminal credentials for <strong>${challengeTitle}</strong> (Account <span style="color:#00FFA3;font-family:monospace;">#${accountNumber}</span>) are ready for live execution:
    </p>
    <div style="background-color: #07130E; border: 1px solid rgba(0, 255, 163, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <p style="margin: 0 0 8px; font-size: 12px; color: #94A3B8; text-transform: uppercase; letter-spacing: 1px;">Account &amp; Challenge</p>
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
    <p style="font-size: 13px; color: #CBD5E1; line-height: 1.6; margin: 0;">
      Enter your <strong>Terminal User ID</strong> and <strong>Terminal Password</strong> on the FUNDED APEX Trading Terminal lock screen to unlock live chart execution.
    </p>
  `;

  const htmlBody = wrapBrandedEmailHtml({
    badgeText: 'TERMINAL CREDENTIALS',
    badgeColorHex: '#00FFA3',
    headline: `New Trading Terminal Credentials (${accountNumber})`,
    subheadline: `Automated Cloud Function Notification for ${recipientName || recipientEmail}`,
    bodyHtml,
    ctaLabel,
    ctaUrl,
  });

  return {
    id: `mail-cred-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventType: 'terminal_credentials',
    to: recipientEmail,
    recipientName: recipientName || 'Trader',
    from: FUNDED_APEX_SUPPORT_EMAIL,
    fromName: 'FUNDED APEX Operations Desk',
    sender: `FUNDED APEX <${FUNDED_APEX_SUPPORT_EMAIL}>`,
    domain: FUNDED_APEX_DOMAIN,
    accountId,
    accountNumber,
    challengeId,
    challengeTitle,
    terminalUserId,
    terminalPassword,
    subject,
    html: htmlBody,
    htmlBody,
    text: textBody,
    textBody,
    ctaLabel,
    ctaUrl,
    ctaRoute: 'terminal',
    triggeredBy,
    sentAt: now,
    createdAt: now,
    read: false,
  };
}

export interface CustomManualEmailInput {
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  headline?: string;
  subheadline?: string;
  badgeText?: string;
  badgeColorHex?: string;
  badgeColor?: string;
  bodyTextOrHtml?: string;
  bodyText?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  ctaColorHex?: string;
  ctaColor?: string;
  highlightItems?: { label: string; value: string; isMono?: boolean; isHighlight?: boolean }[];
  highlights?: { label: string; value: string; isMono?: boolean; isHighlight?: boolean }[];
  adminSenderEmail?: string;
  adminNotes?: string;
}

/**
 * 6. Manual Professional Email Composer Payload
 */
export function buildCustomManualEmailPayload(
  params: CustomManualEmailInput
): FundedApexEmailPayload {
  const now = new Date().toISOString();
  const cleanEmail = (params.recipientEmail || '').trim();
  const cleanName = params.recipientName?.trim() || cleanEmail.split('@')[0] || 'Trader';
  const cleanSubject = (params.subject || '').trim() || `[FUNDED APEX] Official Trading Account Notice`;
  const badgeText = (params.badgeText || 'OFFICIAL COMMUNICATION').toUpperCase();
  const badgeColorHex = params.badgeColorHex || params.badgeColor || '#00FFA3';
  const headline = params.headline?.trim() || cleanSubject.replace(/^\[FUNDED APEX\]\s*/i, '');
  const subheadline =
    params.subheadline?.trim() ||
    `Official Dispatch from the FUNDED APEX Operations & Risk Desk`;
  const ctaLabel = params.ctaLabel?.trim() || 'Access FUNDED APEX Portal →';
  const ctaUrl = params.ctaUrl?.trim() || `https://${FUNDED_APEX_DOMAIN}`;
  const ctaColorHex = params.ctaColorHex || params.ctaColor || '#00FFA3';

  // Format body text: if it's already HTML (contains tags), preserve; otherwise format paragraphs
  const rawBody = (params.bodyTextOrHtml || params.bodyText || '').trim();
  let formattedBodyHtml = '';
  if (rawBody.includes('<p>') || rawBody.includes('<div>') || rawBody.includes('<br>')) {
    formattedBodyHtml = rawBody;
  } else {
    // Split by double newlines into paragraphs, and single newlines into line breaks
    const paragraphs = rawBody.split(/\n\s*\n/);
    formattedBodyHtml = paragraphs
      .map((p) => {
        const withBreaks = p
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br />');
        return `<p style="font-size: 13.5px; color: #CBD5E1; line-height: 1.65; margin: 0 0 16px;">${withBreaks}</p>`;
      })
      .join('\n');
  }

  // Optional Key-Value Highlight items box
  let highlightHtml = '';
  const rawHighlights = params.highlightItems || params.highlights;
  if (Array.isArray(rawHighlights) && rawHighlights.length > 0) {
    const itemsHtml = rawHighlights
      .filter((it) => it && it.label && it.value)
      .map(
        (it) => `
        <div style="background: #030A07; padding: 10px 14px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);">
          <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.2px; color: #94A3B8; margin-bottom: 2px;">
            ${it.label}
          </div>
          <div style="font-size: 14px; font-weight: 700; color: ${
            it.isHighlight ? badgeColorHex : '#FFFFFF'
          }; ${it.isMono ? "font-family: 'JetBrains Mono', monospace;" : ''}">
            ${it.value}
          </div>
        </div>`
      )
      .join('\n');

    highlightHtml = `
      <div style="background-color: #07130E; border: 1px solid ${badgeColorHex}44; border-radius: 12px; padding: 16px; margin: 20px 0;">
        <div style="font-size: 10.5px; font-family: monospace; color: ${badgeColorHex}; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 12px; font-weight: 800;">
          TELEMETRY &amp; TRANSACTION REFERENCE
        </div>
        <div style="display: grid; gap: 8px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  const fullBodyHtml = `
    <p style="font-size: 14px; color: #FFFFFF; font-weight: 600; line-height: 1.6; margin: 0 0 16px;">
      Dear <strong>${cleanName}</strong>,
    </p>
    ${formattedBodyHtml}
    ${highlightHtml}
    <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; color: #94A3B8; line-height: 1.6;">
      Sincerely,<br />
      <strong style="color: #FFFFFF;">FUNDED APEX Institutional Trading Desk</strong><br />
      <span style="color: #64748B;">Official Risk &amp; Client Operations • <a href="mailto:${FUNDED_APEX_SUPPORT_EMAIL}" style="color: #00FFA3; text-decoration: none;">${FUNDED_APEX_SUPPORT_EMAIL}</a></span>
    </div>
  `;

  const html = wrapBrandedEmailHtml({
    badgeText,
    badgeColorHex,
    headline,
    subheadline,
    bodyHtml: fullBodyHtml,
    ctaLabel,
    ctaUrl,
    ctaColorHex,
  });

  const textBody = [
    `Dear ${cleanName},`,
    ``,
    headline,
    subheadline,
    ``,
    rawBody,
    ``,
    params.highlightItems?.length
      ? params.highlightItems.map((h) => `${h.label}: ${h.value}`).join('\n') + '\n'
      : '',
    `${ctaLabel}: ${ctaUrl}`,
    ``,
    `FUNDED APEX Institutional Trading Desk (${FUNDED_APEX_SUPPORT_EMAIL})`,
  ]
    .filter(Boolean)
    .join('\n');

  return {
    id: `mail-manual-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    eventType: 'custom_manual',
    to: cleanEmail,
    recipientEmail: cleanEmail,
    recipientName: cleanName,
    from: params.adminSenderEmail || FUNDED_APEX_SUPPORT_EMAIL,
    fromName: 'FUNDED APEX Executive Desk',
    sender: `FUNDED APEX <${params.adminSenderEmail || FUNDED_APEX_SUPPORT_EMAIL}>`,
    domain: FUNDED_APEX_DOMAIN,
    subject: cleanSubject,
    html,
    htmlBody: html,
    text: textBody,
    textBody,
    ctaLabel,
    ctaUrl,
    sentAt: now,
    createdAt: now,
    read: false,
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

  const terminalUserId =
    after.terminalUserId ||
    `APEX-ID-${after.accountNumber.replace(/[^0-9]/g, '').slice(-4) || '1001'}`;
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
