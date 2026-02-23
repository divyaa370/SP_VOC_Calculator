# TrueCost Authentication Architecture

Status: Approved Design (Pre-Implementation)  
Owner: Johan  
Scope: Defines authentication routes, session handling, redirect logic, and access control behavior for TrueCost.

---

## 1. Route Access Classification

### Public Routes
- `/` (Landing Page)
- `/signin`
- `/signup`
- `/reset-password`

Public routes are accessible without authentication.

---

### Protected Routes
- `/app`
- `/dashboard`
- `/results`
- `/profile`
- `/saved-analyses`

Protected routes require a valid authenticated session.

---

## 2. Session Lifecycle

### Session Creation
- Session is created after successful sign-in.
- Session token is managed by authentication provider.
- Session state is persisted via provider configuration.

---

### Session Persistence
- Session persists across browser refresh.
- On application load:
  - If valid session exists → user is authenticated.
  - If no session exists → user is unauthenticated.

---

### Session Expiration
- Expired sessions automatically invalidate authentication state.
- Expired session triggers redirect to `/signin`.

---

### Logout Behavior
- Logout clears active session.
- User is redirected to `/signin`.
- All protected routes become inaccessible immediately.

---

## 3. Redirect Rules

### Rule 1 — Accessing Protected Route While Unauthenticated
If a user attempts to access a protected route without a valid session:
→ Redirect to `/signin`

---

### Rule 2 — Accessing Signin/Signup While Authenticated
If a user is already authenticated and visits:
- `/signin`
- `/signup`

→ Redirect to `/app`

---

### Rule 3 — Root Route Behavior
If user visits `/`:
- If unauthenticated → show landing page.
- If authenticated → optionally redirect to `/app`.

---

## 4. Authentication Flow

### Signup Flow
User → `/signup` → Submit credentials → Account created → Redirect to `/signin`  
(Optional: Email verification step)

---

### Signin Flow
User → `/signin` → Submit credentials → Session created → Redirect to `/app`

---

### Session Validation Flow
App Load → Check session  
- If valid → Allow protected access  
- If invalid → Redirect to `/signin`

---

### Logout Flow
User clicks logout → Session cleared → Redirect to `/signin`

---

## 5. Error Handling Rules

- Invalid credentials → Show generic error message.
- Session expired → Redirect to `/signin`.
- Network failure → Show retry message.
- Do NOT expose provider internal errors.
- Do NOT reveal whether an email exists in system.
- Do NOT leak authentication token details.

---

## 6. Security Constraints

- No plaintext password storage.
- No authentication logic inside UI components.
- All authentication calls must route through centralized AuthService.
- Protected routes enforced at routing layer.
- No sensitive tokens logged to console.
- HTTPS required in all environments.

---

## 7. Dependencies

- Authentication Provider (e.g., Supabase)
- AuthService abstraction layer
- AuthContext for global session state
- ProtectedRoute middleware

---

## 8. Ownership

Architecture: Johan  
Frontend Wiring: Priyanka  
Testing & Validation: Dyviaa  
Observer/Reviewer: Tobi  

---

## 9. Implementation Checklist

- [ ] AuthService created
- [ ] Signin UI implemented
- [ ] Signup UI implemented
- [ ] AuthContext implemented
- [ ] ProtectedRoute implemented
- [ ] Redirect logic verified
- [ ] Logout verified
- [ ] Session persistence verified
- [ ] Auth tests written