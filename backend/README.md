# AI Finance Platform — Express + MongoDB Backend (MVC)

This is the converted backend for the original **Next.js + Prisma/PostgreSQL** "ai-finance-platform"
app. It's now a standalone **Express/Node.js** REST API using **MongoDB + Mongoose**, organized in
**MVC** (Models / Controllers / Routes), with the same business logic as the original `actions/*.js`
server actions and `lib/inngest/function.js` background jobs.

## Structure

```
backend/
  server.js                     # entry point
  src/
    app.js                      # express app (middleware + route mounting)
    config/db.js                # mongoose connection
    models/                     # Mongoose models (User, Account, Transaction, Budget)
    controllers/                # business logic, ported 1:1 from actions/*.js
    routes/                     # express routers, one per resource
    middleware/
      auth.middleware.js        # JWT auth, replaces Clerk's auth()/currentUser()
      rateLimiter.middleware.js # in-memory token bucket, replaces Arcjet
      upload.middleware.js      # multer, for receipt image uploads
      errorHandler.middleware.js
    services/
      email.service.js          # Resend integration, ported from actions/send-email.js
      gemini.service.js         # Gemini receipt scanning + AI insights
    emails/template.js          # plain-HTML email templates (replaces react-email JSX)
    jobs/cron.js                # node-cron jobs, replaces Inngest's cron-triggered functions
    utils/                      # date helpers, categories data, zod schemas
```

## What changed vs. the original Next.js app

| Original (Next.js)                          | Now (Express)                                        |
|-----------------------------------------------|-------------------------------------------------------|
| Prisma + PostgreSQL                           | Mongoose + MongoDB                                    |
| Clerk auth (`auth()`, `currentUser()`)        | JWT auth (`/api/auth/register`, `/login`), `protect` middleware |
| Server Actions (`"use server"`)               | REST controllers under `src/controllers`               |
| Arcjet `tokenBucket` rate limiting            | In-memory token bucket middleware (`rateLimiter.middleware.js`) |
| Inngest event/cron functions                  | `node-cron` jobs in `src/jobs/cron.js`, running inside the Express process |
| `emails/template.jsx` (react-email component) | `src/emails/template.js` (plain HTML string templates) |
| `next.config`/middleware.js route protection  | Express route-level `protect` middleware               |

All numeric logic (balance calculations, recurring-date math, budget percentage checks, receipt
parsing, seed data generation) was ported **unchanged** from the original files — only the
framework/database plumbing around it changed.

## Setup

```bash
cd backend
cp .env.example .env      # fill in MONGODB_URI, JWT_SECRET, GEMINI_API_KEY, RESEND_API_KEY
npm install
npm run dev                # nodemon, or `npm start` for plain node
```

MongoDB must be a **replica set** (even a single-node one) because several controllers use
multi-document transactions (`session.withTransaction`) to keep transaction + account-balance
updates atomic — the same atomicity the original Prisma `$transaction` calls provided. A quick
way to get one locally:

```bash
mongod --replSet rs0 --dbpath /path/to/data
# then, once, in a mongosh shell:
rs.initiate()
```

Or use a MongoDB Atlas free cluster, which is already a replica set.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/dashboard/accounts`, `POST /api/dashboard/accounts`, `GET /api/dashboard/transactions`
- `GET /api/accounts/:id`, `PATCH /api/accounts/:id/default`, `POST /api/accounts/transactions/bulk-delete`
- `GET /api/budgets/current?accountId=...`, `PUT /api/budgets`
- `GET /api/transactions`, `POST /api/transactions`, `GET /api/transactions/:id`, `PUT /api/transactions/:id`
- `POST /api/transactions/scan-receipt` (multipart, field `receipt`)
- `GET /api/seed` (seeds 90 days of demo transactions for the authenticated user)
- `GET /api/categories`

All routes except `/auth/register` and `/auth/login` require `Authorization: Bearer <token>`.

## Not included

The original Next.js **frontend** (`app/`, `components/`) is not part of this backend package —
it should be rewired to call this REST API (via `fetch`/`axios` + the JWT it gets back from
`/api/auth/login`) instead of importing the old `actions/*.js` server actions directly.
