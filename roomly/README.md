# Roomly: Hotel Management System (MERN)

Full-stack hotel booking and operations platform: guests search, book and pay; staff run the front desk, housekeeping and service requests; managers handle inventory, pricing and refunds; admins manage users, security and configuration.

(Your spec calls it both "HotelPro" and "Roomly"; the code uses **Roomly**. Rename in `client/index.html`, `Navbar.jsx` and `.env.example` if you prefer HotelPro.)

## Quick start

Requirements: Node.js 18+, MongoDB (local or Atlas).

```bash
# 1. install everything
npm install            # root (concurrently)
npm run install:all    # server + client

# 2. configure
cp server/.env.example server/.env     # set MONGO_URI and a long JWT_SECRET
cp client/.env.example client/.env     # optional in dev

# 3. demo data (wipes the DB; refuses to run when NODE_ENV=production)
npm run seed

# 4. run API (http://localhost:5000) + web app (http://localhost:5173)
npm run dev
```

Demo accounts (password `Password@123`):

| Role | Email |
|---|---|
| Admin | admin@roomly.test |
| Manager | manager@roomly.test |
| Staff | staff@roomly.test |
| Guest | guest@roomly.test |

## Project layout

```
server/   Express + Mongoose API
  models/        User, Hotel, RoomCategory, Room, Booking, Payment, Review,
                 Notification, ServiceRequest, CheckInOut, Report, AdminLog, Config
  controllers/   business logic      routes/   endpoint wiring + validation
  middleware/    JWT auth, RBAC, validation, uploads, error handler
  utils/         pricing, availability, email, notifications, audit log
  jobs/          background job (expires unpaid bookings)
client/   React (Vite) + Redux Toolkit + Bootstrap + Material UI + Recharts
```

Note on collections: guests and staff are stored in `users` with a `role` (`guest | staff | manager | admin`) instead of separate Guests/Staff collections. This keeps auth simple; `hotel` links staff and managers to their property.

## Modules implemented

- **Guest**: register/login, email verification, profile + password change, search rooms (city, category, price, capacity, dates) with 30s live availability refresh, booking with price quote, payment, booking history, modify/cancel, refund requests, invoices, reviews and ratings, service requests during a stay, notifications.
- **Staff**: front desk (arrivals, departures, in-house) with check-in/check-out and extra charges, room status updates, housekeeping queue, service request handling, reservation management.
- **Manager**: room inventory, pricing, seasonal pricing, image upload, availability, booking approval/modification/cancellation, staff-to-room assignment, refund approval, occupancy and revenue analytics.
- **Admin**: user and staff management, hotels, payments, saved reports, security/audit log with failed-login counter, platform configuration (tax rate, cancellation window).
- **Shared**: notifications, email confirmations (SMTP, or logged to console when unset), HTML invoices, dark/light theme.

## Payments

- With `STRIPE_SECRET_KEY` (server) and `VITE_STRIPE_PK` (client) set, the app uses Stripe PaymentIntents + Payment Element. The server verifies the intent, amount and booking before confirming.
- Without keys, a **demo mode** confirms payments without charging anyone. It is disabled when `NODE_ENV=production` unless `ALLOW_MOCK_PAYMENTS=true`.
- Razorpay: the `Payment.provider` field already allows `razorpay`; add a branch in `paymentController.js` where the Stripe calls are.

## Key business rules

- Bookings start `pending` and unpaid; unpaid ones auto-cancel after 30 minutes (background job).
- After payment the booking becomes `confirmed` (or stays `pending` for hotel approval if `REQUIRE_BOOKING_APPROVAL=true`).
- Cancelling a paid booking more than 24h before check-in (configurable) raises a refund request that a manager approves or declines. Hotel staff cancelling always raises one.
- Check-in requires a confirmed booking and a room in `available` status; check-out sets the room to `cleaning`.
- "Today" for check-ins uses `TZ_OFFSET_MINUTES` (default 330, IST).

## Security

bcrypt password hashing (12 rounds), JWT auth with expiry, role-based route guards (frontend and backend), hotel-scoped data access for staff/managers, express-validator input validation, NoSQL-injection sanitization, Helmet headers, CORS restricted to `CLIENT_URL`, auth rate limiting, upload type/size limits, and an audit log of sensitive actions.

Not included: field-level encryption (use TLS in transit and MongoDB Atlas encryption at rest), refresh tokens, and password-reset emails.

## Known limitations / next steps

- Double-booking protection is check-then-insert; for very high concurrency add a transaction or per-room-night lock.
- Images are stored on local disk (`server/uploads`); swap `middleware/upload.js` for S3/Cloudinary in production.
- No automated tests are included. Suggested test plan follows your spec: auth, booking workflow, payments/refunds, check-in/out, admin. Postman works well against `/api/*`.
- Optional extras from the spec (Redis caching, CDN, microservices split) are left out; indexes, aggregation pipelines, pagination, lazy loading and code splitting are in place.

## API overview

`/api/auth` · `/api/hotels` · `/api/categories` · `/api/rooms` · `/api/bookings` · `/api/payments` · `/api/reviews` · `/api/notifications` · `/api/services` · `/api/staff` · `/api/admin` · `/api/reports` · `/api/health`
