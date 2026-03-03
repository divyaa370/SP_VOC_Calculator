# F2.01 – Password Reset Architecture & Token Policy

## Flow

```
User clicks "Forgot Password"
  → Enters email on /reset-password
  → Supabase sends reset email with secure token link
  → User clicks link → redirected to /update-password
  → User enters new password
  → Supabase validates token & updates password
  → Redirect to /signin
```

## Token Policy

| Property        | Value                          |
|-----------------|-------------------------------|
| Provider        | Supabase (built-in reset flow) |
| Token type      | Single-use, time-limited       |
| Expiration      | 1 hour                         |
| Token transport | Email link (PKCE flow)         |

## Redirect Configuration

- Set `VITE_APP_URL` in your `.env` file (e.g. `http://localhost:5173`)
- In Supabase dashboard → Authentication → URL Configuration:
  - **Site URL**: your production domain
  - **Redirect URLs**: add `http://localhost:5173/update-password`

## Invalid / Expired Token Behavior

- Supabase returns an error on session retrieval
- App detects missing/invalid session on `/update-password`
- User sees a clear error message with a link to re-request reset

## Security Notes

- Reset request UI never reveals whether an email exists (prevents enumeration)
- Tokens are single-use; re-clicking the same link returns an error
- No token or session data is logged to the console
