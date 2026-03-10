# SINGGLEBEE Launch Audit Report

**Date:** March 10, 2025  
**Scope:** Deep-dive code audit for LIVE launch readiness

---

## 1. Summary of Top 5 Critical Findings

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | **Config missing `frontendUrl`** – CORS and Cashfree return URLs could fail; `config.frontendUrl` was undefined | Critical | ✅ Fixed |
| 2 | **Auth refresh response missing tokens** – API clients using localStorage/Authorization header couldn't refresh; `data.accessToken`/`data.refreshToken` were undefined | Critical | ✅ Fixed |
| 3 | **Payment webhook** – `ORDER_CANCELLED` not handled; signature verification allowed missing headers when Cashfree configured | High | ✅ Fixed |
| 4 | **Seed script schema mismatch** – `stock` vs `stockQuantity`, `name` required but only `title` provided; `insertMany` would fail | High | ✅ Fixed |
| 5 | **User search used `fullName`** – Mongoose virtual not queryable; admin user search by name would not work | Medium | ✅ Fixed |

---

## 2. Code Fixes Applied

### 2.1 Phase 1: Critical Security & Payment

#### Payment Webhook (`server/controllers/paymentController.js`)
- **HMAC verification:** Require `x-webhook-signature` and `x-webhook-timestamp` when Cashfree is configured
- **ORDER_CANCELLED:** Handle `ORDER_CANCELLED` and `ORDER_CANCELLED_WEBHOOK` (restore stock, mark session failed)
- **Idempotency:** Already ensured by `!session.orderCreated` before creating order
- **Raw body:** Use `req.rawBody` (set by `express.json` verify callback) for signature verification

#### Config (`server/config/config.js`)
- Added `frontendUrl: envVars.FRONTEND_URL` (default `http://localhost:5173`)
- Added `backendUrl` and `BACKEND_URL` for webhook notify URLs

#### Auth Refresh (`server/controllers/authController.js`)
- Include `accessToken` and `refreshToken` in refresh response for clients using Authorization header

### 2.2 Phase 2: Backend Logic

#### Custom Error Classes (`server/utils/AppError.js`)
- Added: `AppError`, `ValidationError`, `AuthError`, `NotFoundError`, `ForbiddenError`
- `errorHandler.js` updated to handle `AppError` instances

#### User Controller (`server/controllers/userController.js`)
- Search filter: use `name` instead of `fullName` (fullName is virtual, not stored)

### 2.3 Phase 4: Configuration & Seed

#### Seed Script (`server/utils/seedProducts.js`)
- Replaced `stock` with `stockQuantity`
- Added `name` to all products (required by Product schema; `insertMany` does not run pre-save)
- Fixed update logic and log output

#### .env.example
- **Server:** Added `BACKEND_URL`, updated `FRONTEND_URL` default to 5173
- **Root:** Added `VITE_API_BASE_URL`, documented for api-client

---

## 3. Verification Steps

### Payment Webhook
```bash
# Simulate Cashfree webhook (requires valid HMAC - use Cashfree dashboard or simulate_cashfree.js)
curl -X POST http://localhost:5000/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: <computed>" \
  -H "x-webhook-timestamp: <timestamp>" \
  -d '{"type":"PAYMENT_SUCCESS","data":{"order":{"order_id":"sess_xxx"}}}'
# Without signature when CASHFREE_* set → 401 INVALID_SIGNATURE
```

### Auth Refresh
```bash
# 1. Login to get tokens
# 2. Use refresh token
curl -X POST http://localhost:5000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<your_refresh_token>"}'
# Response must include data.accessToken and data.refreshToken
```

### Seed Products
```bash
cd server && node utils/seedProducts.js
# Should insert 10 products without "name is required" or "stockQuantity" errors
```

### Admin Stats
```bash
# With valid admin JWT
curl http://localhost:5000/api/v1/admin/stats -H "Authorization: Bearer <admin_token>"
# Expect: totalUsers, totalProducts, totalOrders, totalRevenue, etc.
```

### Rate limiting (auth)
```bash
# 6+ failed signin attempts in 15 min (production) → 429 AUTH_RATE_LIMIT_EXCEEDED
for i in {1..6}; do curl -X POST http://localhost:5000/api/v1/auth/signin \
  -H "Content-Type: application/json" -d '{"email":"x@x.com","password":"wrong"}'; done
```

---

## 4. Final Go/No-Go Checklist

| Item | Status |
|------|--------|
| **Security** | |
| Helmet, CORS, rate-limit, mongo-sanitize | ✅ In place |
| Auth routes: 5 req/15min (prod) | ✅ Configured |
| Webhook signature verification | ✅ Enforced when Cashfree configured |
| Sensitive fields redacted in logs | ✅ SENSITIVE_FIELDS in errorHandler |
| **Auth** | |
| Refresh token rotation (revoke old on use) | ✅ jwtService.rotateRefreshToken |
| httpOnly + Secure cookies in prod | ✅ setTokenCookies |
| Password strength (8+ chars, upper, lower, num, special) | ✅ authValidators.js |
| TOKEN_EXPIRED vs INVALID_TOKEN in frontend | ✅ ErrorHandler maps error codes |
| **Payment** | |
| PAYMENT_SUCCESS, PAYMENT_FAILED, ORDER_CANCELLED | ✅ Handled |
| Idempotency (orderCreated check) | ✅ Implemented |
| Order + stock in transaction | ✅ Mongoose session |
| **Data** | |
| Product/Order/User indexes | ✅ Schemas have .index() |
| Counter findOneAndUpdate atomic | ✅ In Order pre-validate |
| Coupon code unique | ✅ Schema |
| **Config** | |
| .env.example documented | ✅ Updated |
| No hardcoded localhost in prod paths | ⚠️ Use BACKEND_URL/FRONTEND_URL |
| **TypeScript** | ⚠️ Several pre-existing errors (lucide Bee/QuickView, hooks, types) – run `npm run build` and fix remaining |

---

## 5. Remaining Recommendations

1. **Fix TypeScript:** Run `npm run build` and resolve icon imports (`Bee` → `Heart` or custom SVG; `QuickView` → `Eye`), cart service private methods, and type definitions.
2. **Docker:** Verify `docker-compose.yml` mounts and BACKEND_URL for Cashfree webhooks in production.
3. **Accessibility:** Add `alt` on images and `aria-label` on icon-only buttons in `CartDrawer`, `Navbar`, modals.
4. **Cart sync:** Ensure cart.service syncs localStorage with DB on login (check hooks/useCart and cart.service).
5. **Receipt upload retry:** Add retry logic in order.service for payment proof upload failures.

---

## 6. Files Modified

- `server/config/config.js` – frontendUrl, backendUrl
- `server/controllers/paymentController.js` – webhook verification, ORDER_CANCELLED
- `server/controllers/authController.js` – refresh response tokens
- `server/controllers/userController.js` – search by `name`
- `server/middleware/errorHandler.js` – AppError handling
- `server/utils/AppError.js` – **NEW** custom error classes
- `server/utils/seedProducts.js` – name, stockQuantity
- `server/.env.example` – BACKEND_URL, FRONTEND_URL
- `.env.example` – VITE_API_BASE_URL
- `utils/error-handler.ts` – static method fix, isRetryable type
