# Ledger — Frontend (Vite + React)

A Vite + React client for the Express/MongoDB finance API, using JWT bearer auth (no cookies), Tailwind v4 + a small set of hand-built shadcn-style primitives, and plain `fetch`/`useState`/`useEffect` for data loading (no React Query/SWR).

## Design

"Ledger" aesthetic: paper background, a deep ledger-green for income/primary actions, rust-red for expenses/destructive actions, `Fraunces` for display type, `Inter` for UI text, `IBM Plex Mono` with tabular numerals for all monetary amounts.

## Setup

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173`. In dev, Vite proxies `/api/*` to `http://localhost:5000` (see `vite.config.js`) — start the backend separately with its own `npm run dev` in the sibling `finance-platform-express-mongodb-backend` project (needs `MONGODB_URI` and `JWT_SECRET` set per its `.env.example`).

## Production build

```bash
npm run build
npm run preview
```

If the built frontend is served from a different origin than the API, set `VITE_API_BASE_URL` (see `.env.example`) at build time — e.g. `VITE_API_BASE_URL=https://api.example.com`. If they share an origin/reverse proxy, leave it unset.

## Structure

```
src/
  lib/
    api.js          fetch wrapper: attaches JWT bearer token, normalizes {success,data,error} responses
    utils.js        cn(), currency/date formatting
    useCategories.js hook fetching /api/categories once
  context/
    AuthContext.jsx  user/token state, login/register/logout, bootstraps via /auth/me
  components/
    ui/              Button, Card, Input, Label, Select, Badge, Dialog — hand-built shadcn-style primitives
    Layout.jsx        top nav shell
    ProtectedRoute.jsx route guard, redirects to /login
    AccountCard.jsx, NewAccountDialog.jsx, TransactionFormDialog.jsx, TransactionsTable.jsx
  pages/
    LoginPage, RegisterPage
    DashboardPage      accounts grid, quick add account/transaction, 6-month income/expense chart, recent activity
    AccountPage        per-account transaction list, type filter, bulk delete (checkboxes), click row to edit
    BudgetPage         set a monthly budget, progress bar against current month's expenses for a chosen account
```

## Notes / things to know when wiring this to the backend

- **Amounts are sent as JS numbers**, not strings, on every write (account balance, transaction amount, budget amount). The backend's `createTransaction` does unvalidated arithmetic on `data.amount` — sending a string there corrupts the balance on the `INCOME` branch (string concatenation instead of addition). This client avoids that by construction, but it's worth fixing server-side too (see the earlier review) since any other client (curl, a future mobile app) could still trigger it.
- The **receipt scanner** posts `multipart/form-data` with field name `receipt` to `/api/transactions/scan-receipt`, then pre-fills the new-transaction form from the response (`amount`, `date`, `description`, `category`).
- **Bulk delete** on the account page recalculates the account balance server-side via `$inc`, so the client just reloads the account after the call rather than optimistically patching the balance.
- Token is stored under `ledger_token` — via `localStorage` in a real browser deployment, with an in-memory fallback if `localStorage` is unavailable (e.g. certain embedded/preview contexts).
