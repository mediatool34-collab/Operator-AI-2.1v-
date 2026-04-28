# Security Specification - Ad Spy System Hardened Firestore Rules

## 1. Data Invariants
- **Identity Isolation**: Users can only access their own profile, tokens, and settings.
- **Relational Integrity**: Workspace access is permitted only if the user has an entry in the `/workspaces/{workspaceId}/members/{userId}` subcollection.
- **Role Hierarchy**:
  - `admin`: Full workspace management.
  - `media_buyer`: Read access + execution of optimization actions.
  - `analyst`: Read-only access.
- **Immutability**: `createdAt` and `ownerId` (for users and workspaces) cannot be modified after creation.
- **Atomicity**: Increments or state shifts must reflect valid transitions.

## 2. The "Dirty Dozen" Payloads (Red Team Test Cases)

1. **Self-Promotion Attack**: Non-admin member attempts to update `role` to `admin` in `/members`.
2. **PII Scraping Attack**: Authenticated user attempts to `list` the `/users` collection.
3. **Workspace Hijack**: User attempts to update `ownerId` of a workspace they do not own.
4. **Token Theft**: User A attempts to `get` or `list` tokens belonging to User B.
5. **ID Poisoning**: Attempting to create a workspace with a 2KB junk character string as ID.
6. **Action Escalation**: `analyst` attempting to update `status` of an ad or campaign.
7. **Social Engineering**: User A attempts to write to User B's settings.
8. **Relational Bypass**: Attempting to read `/ads` under a workspace ID where the user is not a member.
9. **Timestamp Spoofing**: Client providing `createdAt` as a hardcoded past date instead of `serverTimestamp()`.
10. **Shadow Field Injection**: Adding `isSystemAdmin: true` to a user profile update.
11. **Verification Gap**: Non-email-verified user attempting to connect a platform token.
12. **Zombie Member Update**: Attempting to update a member record that no longer exists in a workspace.

## 3. Conflict Report & Mitigation Strategy

| Collection | Identity Spoofing | State Shortcutting | Resource Poisoning | Mitigation |
|------------|-------------------|-------------------|-------------------|------------|
| `users` | Blocked via `uid` match | N/A | `isValidId` on `uid` | Strict `userId() == uid` |
| `tokens` | Blocked via `uid` match | N/A | Size limits on tokens | 32KB max for tokens |
| `workspaces` | `ownerId` immutable | Status gated | `isValidId` on path | `hasOnly` on updates |
| `members` | Role immutable for non-admin | N/A | `isValidId` on `memberId` | Admin-only role updates |
| `ads` | Workspace membership check | Role-gated status | N/A | Relational sync via parent |
