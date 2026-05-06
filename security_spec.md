# Security Specification - Ad Spy System RBAC

## Data Invariants
1. A user can only access workspaces where they are an explicit member.
2. Roles define granular access:
   - `admin`: Full access to settings, members, and data.
   - `media_buyer`: Access to view data and execute optimization actions.
   - `analyst`: Read-only access to data.
3. Data is strictly isolated by `workspaceId`.
4. Users cannot modify their own roles or promote themselves.

## The "Dirty Dozen" Payloads

1. **Self-Promotion**: Non-admin member trying to update their role to 'admin'.
2. **Ghost Workspace**: Unauthorized user trying to read workspace data for an ID they aren't members of.
3. **Invalid Member**: User trying to add a member with an invalid role string.
4. **Owner Hijack**: User trying to update `ownerId` of a workspace they don't own.
5. **Analyst Sabotage**: User with `analyst` role trying to update campaign status (`execute_actions` permission needed).
6. **Token Leak**: Normal user trying to read `access_token` fields without proper role.
7. **Bypassing Membership**: User trying to create a test result directly under a workspace they aren't part of.
8. **ID Poisoning**: Injecting massive/junk strings as `workspaceId`.
9. **PII Scraping**: Attempting to list all users in the system to harvest emails.
10. **Action Injection**: `media_buyer` trying to update integration settings (`admin` permission needed).
11. **Timestamp Spoofing**: Client providing a `createdAt` date in the past for a new workspace.
12. **Zombie Update**: Updating a workspace name after it's been deleted (if soft-delete is used) or terminal state.

## Implementation Details
- `getWorkspaceRole(workspaceId)` helper: Checks `/workspaces/{workspaceId}/members/{userId}`.
- `hasPermission(role, permission)` logic mapped into rules helpers.
- Strict `affectedKeys().hasOnly()` for role-based updates.
