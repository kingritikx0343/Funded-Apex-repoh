# FUNDED APEX — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Isolation & PII Protection**: A `users/{userId}` document can only be created or read by the authenticated user where `request.auth.uid == userId` (with verified email) or a verified `isAdmin()`. No blanket reads (`allow read: if isSignedIn()`) are permitted on `users`.
2. **Zero Self-Assigned Privilege**: When a user creates their profile in `users/{userId}`, `incoming().role` MUST equal `'user'`. Users can never modify `role`, `uid`, `email`, or `createdAt` during an update.
3. **Relational Integrity**: Every `tradingAccounts/{accountId}` and `orders/{orderId}` document must have `userId == request.auth.uid` and verify that the parent `/users/$(request.auth.uid)` (and `/tradingAccounts/$(incoming().accountId)` for orders) exists.
4. **Terminal State Locking**: Once a `tradingAccounts` document reaches `status == 'completed'` or `status == 'failed'`, or an `orders` document reaches `status == 'CLOSED'` or `status == 'CANCELLED'`, non-admin users cannot mutate it further.
5. **Strict Timestamps & Schema Keys**: Every write validates `hasAll` and `hasOnly` keys, string `.size()` bounds, numeric boundaries, and `request.time` temporal integrity.

## 2. The "Dirty Dozen" Payloads
1. **Self-Admin Escalation on Signup**: `POST /users/u1` with `{ role: "super_admin", ... }` -> `PERMISSION_DENIED`
2. **Shadow Field Injection on Profile Update**: `PATCH /users/u1` with `{ fullName: "Trader", isVerifiedAdmin: true }` -> `PERMISSION_DENIED`
3. **Unverified Email Spoofing**: Admin email token with `email_verified: false` attempting `GET /users/otherUser` -> `PERMISSION_DENIED`
4. **Cross-User PII Read**: Authenticated user `u2` attempting `GET /users/u1` -> `PERMISSION_DENIED`
5. **Unbounded String DoW Attack**: `POST /users/u1` with `fullName` of 5,000 characters -> `PERMISSION_DENIED`
6. **ID Poisoning Attack**: `POST /tradingAccounts/invalid$id!` -> `PERMISSION_DENIED`
7. **Orphaned Trading Account Creation**: `POST /tradingAccounts/acc1` where `/users/u1` does not exist -> `PERMISSION_DENIED`
8. **Cross-User Order Placement**: `POST /orders/ord1` with `userId: "victimUid"` -> `PERMISSION_DENIED`
9. **Terminal State Re-opening**: `PATCH /orders/ord1` when `existing().status == "CLOSED"` by regular user -> `PERMISSION_DENIED`
10. **Forged Creation Timestamp**: `POST /orders/ord1` with `createdAt` set to past timestamp != `request.time` -> `PERMISSION_DENIED`
11. **Immutable Owner Mutation**: `PATCH /tradingAccounts/acc1` changing `userId` or `startingBalance` -> `PERMISSION_DENIED`
12. **Client-Delegated List Scraping**: `LIST /orders` without filtering `resource.data.userId == request.auth.uid` -> `PERMISSION_DENIED`
