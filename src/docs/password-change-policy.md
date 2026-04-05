# F3.01 – Authenticated Password Change Policy

## Objective

Define the security requirements, flow, and post-change behaviour for users changing their password while logged in.

---

## Security Requirements

| Requirement | Detail |
|---|---|
| Re-authentication | User must provide their current password before any change is accepted |
| Minimum length | 8 characters |
| Maximum length | 128 characters |
| Complexity | Must contain at least one uppercase letter and one number |
| Session invalidation | All sessions **other than the current one** are invalidated immediately after a successful change |
| Rate limiting | Delegated to Supabase Auth (built-in brute-force protection on `signInWithPassword`) |

---

## Flow

```
User navigates to /app/settings
        │
        ▼
  Enter current password
  Enter new password
  Confirm new password
        │
        ▼
  Client validates (Zod schema)
  ── fail → inline field errors, no request sent
        │
        ▼
  POST re-auth (signInWithPassword)
  ── fail → "Current password is incorrect"
        │
        ▼
  POST updateUser({ password })
  ── fail → server error message shown
        │
        ▼
  signOut({ scope: 'others' })   ← invalidates all other sessions
        │
        ▼
  "Password updated successfully" shown
  Form is reset
```

---

## Error States

| Scenario | User-facing message |
|---|---|
| New password too short | "Password must be at least 8 characters" |
| No uppercase letter | "Must contain an uppercase letter" |
| No number | "Must contain a number" |
| Passwords don't match | "Passwords do not match" |
| Current password wrong | "Current password is incorrect. Please try again." |
| Supabase update failure | Error message from Supabase (e.g. "New password should be different from the old password.") |

---

## Post-Change Behaviour

- The **current session remains active** — the user stays logged in.
- All **other active sessions are revoked** via `supabase.auth.signOut({ scope: 'others' })`.
- The form is **reset** to empty after success.
- A success message is shown inline.

---

## Implementation References

- Component: `src/components/auth/AccountSettings.tsx`
- Tests: `src/tests/accountSettings.test.tsx`
