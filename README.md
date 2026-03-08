<div align="center">

<br/>

# 🐝 SINGGLEBEE

### *Where Every Page Buzzes with Knowledge*

**A production-grade MERN Stack e-commerce platform built for books, stationery & gourmet foods — packed with a Cashfree payment gateway, real-time admin dashboard, JWT auth, and atomic stock management.**

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Cashfree](https://img.shields.io/badge/Cashfree-Payments-00b09b?style=for-the-badge)](https://cashfree.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](#license)

<br/>

[🌐 Website](https://singglebee.com) · [📚 API Docs](#api-reference) · [🚀 Quick Start](#quick-start) · [⚙️ Configuration](#configuration)

<br/>

---

</div>

## 📖 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Payment Flows](#payment-flows)
- [Admin Dashboard](#admin-dashboard)
- [Deployment](#deployment)
- [Security](#security)
- [License](#license)

---

## Overview

SINGGLEBEE is a full-featured, production-ready e-commerce platform specialising in **Tamil & English Books**, **Stationery**, and **Gourmet Foods**. The platform delivers a premium, animated shopping experience on the frontend while maintaining enterprise-grade security, data integrity, and observability on the backend.

### What makes it special

| 🏆 Feature | Detail |
|---|---|
| **Dual Payment System** | Cashfree gateway (automatic) with UPI manual fallback + receipt upload |
| **Atomic Stock Locking** | 15-minute "soft-lock" prevents overselling under concurrent load |
| **Refresh Token Security** | Concurrent-safe JWT refresh with subscriber queue; no duplicate refreshes |
| **Real-time Admin Panel** | Live order management, UPI verification, product control, skeleton loaders |
| **Cross-tab Cart Sync** | `window.storage` listener keeps cart consistent across browser tabs |
| **Optimized Media** | Cloudinary CDN with `quality: auto` + `fetch_format: auto` for WebP delivery |
| **SEO Ready** | Dynamic OpenGraph + Twitter meta tags per product, GA4 analytics |
| **Low-device Aware** | Reduces particle / animation load on low-end CPUs automatically |

---

## Architecture

```
SINGGLEBEE/
├── Frontend (Vite + React 19 + TypeScript)   → Port 5173
│   ├── components/          # All UI components
│   ├── services/api.ts      # Type-safe API client + JWT interceptor
│   ├── App.tsx              # Root router, global state, cart sync
│   └── index.tsx            # Google Analytics bootstrap
│
└── Backend (Express + MongoDB + Node 18+)    → Port 5000
    ├── server/controllers/  # Business logic per domain
    ├── server/models/       # Mongoose schemas (Product, Order, User, …)
    ├── server/routes/       # REST API versioned at /api/v1/
    ├── server/middleware/   # Auth, rate-limit, validation, error handling
    ├── server/services/     # Cashfree, Cloudinary, email integrations
    └── server/utils/        # Logger (Winston), seeder, cloudinary config
```

---

## Features

### 🛍️ Storefront
- Animated hero section with interactive bee character
- Auto-scrolling product bands (Tamil Books, English Books)
- Fuzzy search with relevance scoring + typo tolerance
- Category pills, price range, rating, and language filters
- Fully animated product cards with quick-view + wishlist
- OpenGraph meta tags per product page (social sharing ready)
- Google Analytics 4 integration

### 🔐 Authentication
- Email / password sign-up and sign-in with Bcrypt hashing
- Strong password enforcement (min 8 chars, ≥1 number or special character)
- Access tokens (15 min) + Refresh tokens (7 days) with rotation
- Concurrent refresh deduplication via subscriber queue — no duplicate calls
- Forced password change on first admin login
- Email-based password reset flow

### 💳 Payments
- **Cashfree** — full payment session + webhook (`PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `PAYMENT_USER_DROPPED`)
- **UPI Manual** — fallback flow with screenshot upload (Multer → Cloudinary)
- Admin one-click UPI verification direct from the dashboard
- 15-minute stock soft-lock on session creation, auto-released on failure/expiry
- Webhook signature verification for Cashfree events

### 📦 Inventory & Orders
- Atomic stock decrements (MongoDB transactions on Replica Sets)
- Sequential, collision-safe Order IDs via atomic `Counter` collection (`SB-YYYYMMDD-NNNNN`)
- Stock automatically restored on order cancellation
- `stockQuantity` and `countInStock` are Mongoose Virtuals — single source of truth (`stock`)

### 🛡️ Admin Dashboard
- Real-time stats: revenue, orders, customers, low-stock alerts
- Tab-aware skeleton loaders (no jarring layout shifts)
- Order status pipeline management (pending → processing → shipped → delivered)
- UPI payment verification button per order
- Product grid with stock indicators

### ⚡ Performance
- Vite code-splitting + lazy-loaded route components
- `navigator.hardwareConcurrency` device detection — disables heavy animations on low-end devices
- Node-cache in-memory caching for product listings
- Cloudinary `quality: auto` + `fetch_format: auto` → WebP delivery
- Gzip compression via Express `compression` middleware

---

## Tech Stack

### Frontend
| Technology | Version | Role |
|---|---|---|
| React | 19 | UI framework |
| TypeScript | 5.8 | Type safety |
| Vite | 6 | Build tool & dev server |
| TailwindCSS | 4 | Utility-first styling |
| React Router | 7 | Client-side routing |
| Cashfree JS SDK | — | Hosted payment checkout |

### Backend
| Technology | Version | Role |
|---|---|---|
| Node.js | ≥18 | Runtime |
| Express | 4 | HTTP framework |
| MongoDB / Mongoose | 8 | Database + ODM |
| JWT / Bcrypt | — | Auth & hashing |
| Multer + Cloudinary | — | File upload & CDN |
| Cashfree SDK | — | Payment gateway |
| Helmet | 8 | HTTP security headers |
| express-rate-limit | 7 | API rate limiting |
| express-mongo-sanitize | 2 | NoSQL injection prevention |
| Joi | 17 | Request validation |
| Winston | 3 | Structured logging |
| node-cache | 5 | In-memory caching |

---

## Project Structure

```
singglebee/
├── 📁 components/           # React UI components
│   ├── AdminDashboard.tsx   # Full admin control panel
│   ├── CheckoutModal.tsx    # Multi-step checkout + UPI upload
│   ├── AuthModal.tsx        # Sign-in / Sign-up modal
│   ├── ProductCard.tsx      # Product listing card
│   ├── ProductDetails.tsx   # PDP with OpenGraph meta
│   ├── CartDrawer.tsx       # Sliding cart panel
│   ├── ErrorBoundary.tsx    # Offline / maintenance mode UI
│   └── ...
├── 📁 services/
│   └── api.ts               # Typed API client + JWT interceptor
├── 📁 server/
│   ├── 📁 controllers/
│   │   ├── authController.js
│   │   ├── paymentController.js    # Soft-lock + webhook + proof upload
│   │   ├── orderController.js
│   │   └── productController.js
│   ├── 📁 models/
│   │   ├── User.js          # Auth model with password strength
│   │   ├── Product.js       # stock as primary; stockQuantity/countInStock = Virtuals
│   │   ├── Order.js         # Atomic Counter-based Order IDs
│   │   ├── PaymentSession.js # 15-min TTL soft-lock sessions
│   │   └── Counter.js       # Atomic sequence generator
│   ├── 📁 middleware/
│   │   ├── auth.js          # JWT authenticate + requireAdmin
│   │   └── rateLimiter.js   # authLimiter + paymentLimiter
│   ├── 📁 routes/api/v1/
│   │   ├── auth.js
│   │   ├── products.js
│   │   ├── orders.js
│   │   ├── payments.js      # /create-session, /webhook, /upload-proof
│   │   └── admin.js
│   └── 📁 utils/
│       ├── cloudinary.js    # quality:auto, fetch_format:auto
│       ├── logger.js        # Winston multi-transport
│       └── seedAdmin.js
├── App.tsx                  # Root + cross-tab cart sync
├── index.tsx                # GA4 bootstrap
├── Dockerfile               # Multi-stage build
├── vercel.json              # Frontend deployment
└── server/render.yaml       # Backend deployment
```

---

## Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (local) or a [MongoDB Atlas](https://www.mongodb.com/atlas) cluster *(Replica Set required for transactions)*
- **Cashfree** account — [sandbox](https://merchant.cashfree.com/) is fine for development
- **Cloudinary** account — free tier works for development

### 1. Clone & Install

```bash
git clone https://github.com/singglebee/singglebee-store.git
cd singglebee-store

# Install frontend deps
npm install

# Install backend deps
cd server && npm install && cd ..
```

### 2. Configure Environment

```bash
# Backend
cp server/.env.example server/.env
# → Edit server/.env (see Configuration section)

# Frontend (optional — defaults to /api/v1 proxy)
cp .env.example .env.local
```

### 3. Seed the Database

```bash
cd server

# Create admin account + seed products
npm run seed
```

> Default admin credentials are read from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `server/.env`.

### 4. Run Development Servers

```bash
# From the project root — runs frontend + backend concurrently
npm run full-stack

# Frontend → http://localhost:5173
# Backend  → http://localhost:5000
# API      → http://localhost:5000/api/v1
```

---

## Configuration

### Backend — `server/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | ✅ | `development` | `production` enables HSTS, secure cookies |
| `PORT` | | `5000` | HTTP port |
| `MONGODB_URI` | ✅ | — | MongoDB connection string |
| `JWT_ACCESS_SECRET` | ✅ | — | Min 32 chars. Strong random string |
| `JWT_REFRESH_SECRET` | ✅ | — | Min 32 chars. Different from access secret |
| `JWT_ACCESS_EXPIRES_IN` | | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | | `7d` | Refresh token lifetime |
| `FRONTEND_URL` | ✅ | `http://localhost:5173` | Exact domain for CORS allowlist |
| `BACKEND_URL` | ✅ | `http://localhost:5000` | Public URL Cashfree sends webhooks to |
| `CASHFREE_APP_ID` | ✅ | — | Cashfree App ID (sandbox or production) |
| `CASHFREE_SECRET_KEY` | ✅ | — | Cashfree Secret Key |
| `CASHFREE_API_VERSION` | | `2023-08-01` | Cashfree API version |
| `CASHFREE_ENV` | | `sandbox` | `sandbox` or `production` |
| `UPI_ID` | | — | UPI VPA for manual payment fallback display |
| `CLOUDINARY_CLOUD_NAME` | ✅ | — | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | ✅ | — | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | ✅ | — | Cloudinary API secret |
| `ADMIN_EMAIL` | ✅ | — | Initial admin email (seed only) |
| `ADMIN_PASSWORD` | ✅ | — | Initial admin password (seed only) |
| `COOKIE_SECRET` | | — | Secret for cookie signing |
| `RATELIMIT_WINDOW_MS` | | `900000` | Rate limit window (ms) |
| `RATELIMIT_MAX` | | `100` | Max requests per window |

### Frontend — `.env.local`

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | | Backend API URL. Defaults to `/api/v1` (proxy). Set to `https://api.singglebee.com/api/v1` in production |
| `VITE_GA_ID` | | Google Analytics 4 Measurement ID (e.g. `G-XXXXXXXXXX`) |

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Auth — `/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/signup` | Public | Register new user |
| `POST` | `/auth/signin` | Public | Sign in, returns access + refresh tokens |
| `POST` | `/auth/refresh` | Public | Rotate refresh token |
| `POST` | `/auth/logout` | Public | Invalidate refresh token |
| `GET` | `/auth/me` | 🔐 User | Get current user profile |
| `PUT` | `/auth/me` | 🔐 User | Update profile |
| `POST` | `/auth/forgot-password` | Public | Send reset email |
| `POST` | `/auth/reset-password` | Public | Reset with token |
| `POST` | `/auth/change-password` | 🔐 User | Change password |

### Products — `/products`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/products` | Public | List products (pagination, filter, sort, search) |
| `GET` | `/products/:id` | Public | Single product |
| `POST` | `/products` | 🔑 Admin | Create product |
| `PUT` | `/products/:id` | 🔑 Admin | Update product |
| `DELETE` | `/products/:id` | 🔑 Admin | Soft-delete product |
| `PATCH` | `/products/:id/stock` | 🔑 Admin | Adjust stock |

### Orders — `/orders`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/orders` | 🔐 User | Create order (UPI manual flow) |
| `GET` | `/orders` | 🔐 User | My orders |
| `GET` | `/orders/:id` | 🔐 User | Single order |
| `POST` | `/orders/:id/cancel` | 🔐 User | Cancel order + restore stock |

### Payments — `/payments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/payments/create-session` | 🔐 User | Create Cashfree or UPI session, soft-locks stock (rate-limited: 5/15min) |
| `POST` | `/payments/webhook` | Public | Cashfree webhook handler |
| `GET` | `/payments/status/:id` | 🔐 User | Check payment/order status |
| `POST` | `/payments/upload-proof` | 🔐 User | Upload UPI receipt screenshot (multipart/form-data) |

### Admin — `/admin`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/admin/stats` | 🔑 Admin | Dashboard statistics |
| `GET` | `/admin/users` | 🔑 Admin | List users |
| `PATCH` | `/admin/users/:id/status` | 🔑 Admin | Ban / suspend user |
| `GET` | `/admin/orders` | 🔑 Admin | All orders |
| `PATCH` | `/admin/orders/:id/status` | 🔑 Admin | Update order status |
| `PATCH` | `/admin/orders/:id/payment` | 🔑 Admin | Mark UPI payment complete |
| `GET` | `/admin/products` | 🔑 Admin | All products |

### Reviews & Wishlist

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/reviews/:productId` | Public | Get reviews |
| `POST` | `/reviews/:productId` | 🔐 User | Add review |
| `GET` | `/wishlist` | 🔐 User | Get wishlist |
| `POST` | `/wishlist/:productId` | 🔐 User | Add to wishlist |
| `DELETE` | `/wishlist/:productId` | 🔐 User | Remove from wishlist |

---

## Payment Flows

### Cashfree (Automatic)

```
User Checkout
     │
     ▼
POST /payments/create-session
     │  Stock soft-locked (-qty)
     │  PaymentSession created (TTL: 15 min)
     ▼
Cashfree Hosted Checkout (SDK)
     │
     ▼
POST /payments/webhook (Cashfree → Backend)
     ├─ PAYMENT_SUCCESS  → Order created, session marked complete
     ├─ PAYMENT_FAILED   → Session failed, stock restored
     └─ USER_DROPPED     → Session failed, stock restored
```

### UPI Manual (Fallback)

```
User Checkout (no Cashfree keys configured)
     │
     ▼
POST /payments/create-session
     │  Returns: { paymentMethod: 'upi_manual', upiId, amount }
     ▼
User pays via GPay / PhonePe / BHIM
     │
     ▼
POST /orders  (order created directly)
     │
     ▼
POST /payments/upload-proof  (screenshot → Cloudinary)
     │  order.payment.proofUrl stored
     ▼
Admin reviews → PATCH /admin/orders/:id/payment  (marks as paid)
```

---

## Admin Dashboard

Access the admin dashboard by signing in with an admin account and clicking the crown icon in the navbar.

### Features

| Tab | Capabilities |
|---|---|
| **Stats** | Revenue, total orders, customer count, low-stock alerts, order distribution by status |
| **Orders** | Full order table, status pipeline dropdown, UPI verify button for manual payments |
| **Products** | Product grid with stock level indicators (red < 5, green ≥ 5) |

> **First login:** Admin accounts created via `npm run seed` are flagged `mustChangePassword: true`. A force-change-password modal appears before access is granted to the dashboard.

---

## Deployment

### Frontend — Vercel

The `vercel.json` is pre-configured. Set the following environment variables in Vercel:

```
VITE_API_URL=https://api.singglebee.com/api/v1
VITE_GA_ID=G-XXXXXXXXXX
```

### Backend — Render

The `server/render.yaml` is pre-configured for Render.com. Set all variables from the [Configuration](#configuration) table in Render's Environment settings.

### Docker (Self-hosted)

```bash
# Build backend image
docker build -t singglebee-backend --target backend .

# Build frontend image (served via Nginx)
docker build -t singglebee-frontend --target frontend .

# Run backend
docker run -p 5000:5000 --env-file server/.env singglebee-backend

# Run frontend
docker run -p 80:80 singglebee-frontend
```

### Production Checklist

- [ ] `NODE_ENV=production` set on backend
- [ ] `FRONTEND_URL` set to your exact production domain
- [ ] `BACKEND_URL` is publicly reachable (Cashfree needs to POST webhooks to it)
- [ ] MongoDB Atlas cluster is a **Replica Set** (required for Mongoose transactions)
- [ ] All JWT secrets are ≥ 32 random characters
- [ ] `CASHFREE_ENV=production` and production credentials configured
- [ ] Cloudinary credentials configured for media uploads
- [ ] Admin seed password changed after first login

---

## Security

| Mechanism | Implementation |
|---|---|
| **SQL / NoSQL Injection** | `express-mongo-sanitize` strips `$` and `.` from inputs |
| **XSS / Clickjacking** | `helmet` sets CSP, X-Content-Type, X-Frame-Options headers |
| **Brute Force** | `express-rate-limit` — 5 attempts/15 min on auth + payment endpoints |
| **Password Storage** | Bcrypt with 12 rounds |
| **Password Policy** | Min 8 chars + at least 1 number or special character |
| **JWT Security** | Short-lived access tokens (15 min) + rotating refresh tokens (7 days) |
| **Concurrent Refresh** | Subscriber queue prevents duplicate `/refresh` calls |
| **Webhook Integrity** | Cashfree HMAC-SHA256 signature verification on every webhook |
| **CORS** | Strict origin allowlist via `FRONTEND_URL` |
| **HSTS** | Enabled automatically when `NODE_ENV=production` |
| **Audit Logging** | Winston logs all critical events (auth, orders, payments, errors) |

---

## License

© 2024–2025 **SINGGLEBEE / RS Ventures**. All rights reserved.

This is proprietary software. Unauthorised copying, distribution, or modification is strictly prohibited.

---

<div align="center">

Made with 🐝 by **SINGGLEBEE**

[singglebee.com](https://singglebee.com) · [singglebee.rsventures@okhdfcbank](mailto:singglebee.rsventures@okhdfcbank)

<br/>

*Where Every Page Buzzes with Knowledge*

</div>
