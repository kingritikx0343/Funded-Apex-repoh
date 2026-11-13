export interface VaultUserRecord {
  uid: string;
  fullName: string;
  email: string;
  country: string;
  referralCode: string;
  referredBy?: string;
  role: 'user' | 'admin' | 'super_admin';
  rewardPoints: number;
  lastSpinDate?: string;
  mfaEnabled: boolean;
  deletionRequested: boolean;
  avatarUrl?: string;
  passwordHash?: string;
  passwordUpdatedAt?: number;
  isSeedDefault?: boolean;
  createdAt: string;
  kycStatus?: 'unsubmitted' | 'pending' | 'verified' | 'rejected';
  kycDocType?: string;
  kycSubmittedAt?: string;
  [key: string]: any;
}

export function normalizeUserEmail(email: string | undefined | null): string {
  return String(email || '').trim().toLowerCase();
}

/**
 * Safely merges two records representing the same user (matched by normalized email or uid).
 * Guarantees:
 * - A real user passwordHash is NEVER overwritten by a seed default, an empty/undefined hash,
 *   or an older passwordUpdatedAt timestamp.
 * - Earned rewardPoints, country, KYC state, and earliest createdAt are preserved.
 */
export function mergeUserProfileRecords<T extends VaultUserRecord>(
  existing: T | undefined | null,
  incoming: T
): T {
  if (!existing) {
    return {
      ...incoming,
      email: normalizeUserEmail(incoming.email) || incoming.email,
    };
  }

  const existingEmail = normalizeUserEmail(existing.email);
  const incomingEmail = normalizeUserEmail(incoming.email);
  const email = incomingEmail || existingEmail;

  const existingIsSeed = Boolean(existing.isSeedDefault);
  const incomingIsSeed = Boolean(incoming.isSeedDefault);
  const existingHasHash = Boolean(existing.passwordHash);
  const incomingHasHash = Boolean(incoming.passwordHash);

  const existingPwTs =
    typeof existing.passwordUpdatedAt === 'number'
      ? existing.passwordUpdatedAt
      : existingIsSeed
      ? 0
      : 1;
  const incomingPwTs =
    typeof incoming.passwordUpdatedAt === 'number'
      ? incoming.passwordUpdatedAt
      : incomingIsSeed
      ? 0
      : 1;

  let resolvedPasswordHash: string | undefined = existing.passwordHash;
  let resolvedPwTs: number | undefined = existing.passwordUpdatedAt;
  let resolvedIsSeed: boolean | undefined = existing.isSeedDefault;

  if (!existingHasHash && incomingHasHash) {
    resolvedPasswordHash = incoming.passwordHash;
    resolvedPwTs = incoming.passwordUpdatedAt;
    resolvedIsSeed = incoming.isSeedDefault;
  } else if (existingHasHash && !incomingHasHash) {
    // NEVER wipe an existing passwordHash with a passwordless profile update
    resolvedPasswordHash = existing.passwordHash;
    resolvedPwTs = existing.passwordUpdatedAt;
    resolvedIsSeed = existing.isSeedDefault;
  } else if (existingHasHash && incomingHasHash) {
    if (existingIsSeed && !incomingIsSeed) {
      resolvedPasswordHash = incoming.passwordHash;
      resolvedPwTs = incoming.passwordUpdatedAt ?? Date.now();
      resolvedIsSeed = false;
    } else if (!existingIsSeed && incomingIsSeed) {
      resolvedPasswordHash = existing.passwordHash;
      resolvedPwTs = existing.passwordUpdatedAt;
      resolvedIsSeed = false;
    } else if (incomingPwTs > existingPwTs) {
      resolvedPasswordHash = incoming.passwordHash;
      resolvedPwTs = incoming.passwordUpdatedAt;
      resolvedIsSeed = incoming.isSeedDefault;
    } else {
      // Equal or older timestamp keeps existing passwordHash to prevent stale overwrites
      resolvedPasswordHash = existing.passwordHash;
      resolvedPwTs = existing.passwordUpdatedAt ?? incoming.passwordUpdatedAt;
      resolvedIsSeed = existing.isSeedDefault ?? incoming.isSeedDefault;
    }
  }

  const incomingCountry =
    incoming.country && incoming.country !== 'United States'
      ? incoming.country
      : existing.country || incoming.country || 'United States';

  const rolePriority: Record<string, number> = {
    user: 0,
    admin: 1,
    super_admin: 2,
  };
  const resolvedRole =
    (rolePriority[incoming.role] ?? 0) >= (rolePriority[existing.role] ?? 0)
      ? incoming.role || existing.role
      : existing.role;

  const createdA = existing.createdAt ? Date.parse(existing.createdAt) : Number.MAX_SAFE_INTEGER;
  const createdB = incoming.createdAt ? Date.parse(incoming.createdAt) : Number.MAX_SAFE_INTEGER;
  const earliestCreatedAt =
    Number.isFinite(createdA) && Number.isFinite(createdB)
      ? createdA <= createdB
        ? existing.createdAt
        : incoming.createdAt
      : existing.createdAt || incoming.createdAt;

  return {
    ...existing,
    ...incoming,
    uid: existing.uid && !existing.isSeedDefault ? existing.uid : incoming.uid || existing.uid,
    email,
    fullName:
      incoming.fullName && (!existing.fullName || !incomingIsSeed)
        ? incoming.fullName
        : existing.fullName || incoming.fullName,
    country: incomingCountry,
    referralCode: existing.referralCode || incoming.referralCode,
    role: resolvedRole,
    rewardPoints: Math.max(Number(existing.rewardPoints || 0), Number(incoming.rewardPoints || 0)),
    lastSpinDate: incoming.lastSpinDate || existing.lastSpinDate,
    mfaEnabled: Boolean(existing.mfaEnabled || incoming.mfaEnabled),
    deletionRequested: Boolean(incoming.deletionRequested ?? existing.deletionRequested),
    avatarUrl: incoming.avatarUrl || existing.avatarUrl,
    passwordHash: resolvedPasswordHash,
    passwordUpdatedAt: resolvedPwTs,
    isSeedDefault: resolvedIsSeed,
    createdAt: earliestCreatedAt,
    kycStatus: incoming.kycStatus || existing.kycStatus,
    kycDocType: incoming.kycDocType || existing.kycDocType,
    kycSubmittedAt: incoming.kycSubmittedAt || existing.kycSubmittedAt,
  };
}

/**
 * Deduplicates and safely merges two arrays of user records keyed by normalized email
 * (with uid fallback when email is absent), ensuring zero duplicate email rows and zero password loss.
 */
export function mergeUserDirectories<T extends VaultUserRecord>(
  existingUsers: T[] = [],
  incomingUsers: T[] = []
): T[] {
  const byKey = new Map<string, T>();

  const upsert = (userRecord: T) => {
    if (!userRecord) return;
    const normEmail = normalizeUserEmail(userRecord.email);
    const key = normEmail || String(userRecord.uid || '');
    if (!key) return;
    const prev = byKey.get(key);
    byKey.set(key, mergeUserProfileRecords(prev, userRecord));
  };

  for (const u of existingUsers) upsert(u);
  for (const u of incomingUsers) upsert(u);

  return Array.from(byKey.values());
}
