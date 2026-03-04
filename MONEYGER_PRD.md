## Moneyger – Next.js + Google Sheets + PWA PRD

### 1. Product overview

- **Goal**: Personal budgeting app inspired by YNAB, focused on:
  - Bucket-based budgeting
  - Assigning money to buckets
  - Tracking spending and cash flow
  - Handling credit cards and loans
- **Target user**: Individual users managing their own finances (no multi-tenant/shared budgets).
- **Key constraint**: **One user account = one Google Sheet in that user’s Google Drive**. The app never stores financial data in its own database.
- **Form factor**: Responsive SPA, PWA-capable for mobile and desktop install, offline-first for reads and queued writes.

### 2. High-level architecture

```mermaid
graph TD
  Browser[Next.js SPA (PWA)] -->|OAuth| GoogleAuth[Google OAuth 2.0]
  Browser -->|HTTPS| NextAPI[Next.js API Routes]
  NextAPI -->|Sheets API| UserSheet[User's Google Sheet]
  NextAPI -->|Drive API| UserDrive[User's Google Drive]
```

- **Frontend**: Next.js App Router, TypeScript, TailwindCSS, PWA support.
- **Backend**: Next.js API routes (Node) providing typed REST/JSON interface to Google Sheets and Drive APIs.
- **Persistence**: Single spreadsheet per user, created and owned by that user in Drive.
- **Auth**:
  - Frontend: NextAuth.js with Google provider.
  - Backend: Uses the NextAuth session to call Google APIs with per-user access tokens / refresh tokens.
- **Data model**: Mirrors the original Rails app:
  - `User`
  - `Account`
  - `Budget`
  - `Transaction`
  - `AccountBudget` (join between accounts and budgets)
  - `Payee`
- **PWA**:
  - Web app manifest
  - Service worker for asset caching and basic API caching
  - Install prompt support on compatible browsers

---

### 3. Tech stack

- **Framework**: Next.js (App Router, `/app` directory)
- **Language**: TypeScript
- **Styling**: TailwindCSS wired into `app/globals.css`
- **State management**: React hooks + server components + lightweight client-side state (no heavy global store required)
- **API**: Next.js route handlers in `app/api/**/route.ts`
- **Linting / formatting**:
  - ESLint with:
    - `next/core-web-vitals`
    - `@typescript-eslint`
  - Prettier with:
    - Print width: 100
    - Single quotes
    - Semi: true
- **PWA**:
  - `public/manifest.json`
  - `public/service-worker.js` (or `next-pwa` style integration)
- **Google integration**:
  - OAuth 2.0 (NextAuth Google Provider)
  - APIs enabled:
    - Google Sheets API
    - Google Drive API
  - Scope: `openid email profile https://www.googleapis.com/auth/drive.file`

---

### 4. Authentication & user provisioning

#### 4.1 Auth flow

1. User visits `/`.
2. If **not authenticated**, show marketing/landing page with “Sign in with Google”.
3. On sign in:
   - Use NextAuth Google provider.
   - Request scopes: `openid email profile https://www.googleapis.com/auth/drive.file`.
   - Persist:
     - `user.id`, `user.email`, `user.name`
     - `accessToken`, `refreshToken`, `accessTokenExpires` (in NextAuth JWT + database or encrypted storage, depending on hosting).
4. On first successful login:
   - Backend checks if a Moneyger sheet exists for this user.
   - If not, create one via Drive API and initialize all tabs and headers.
   - Store `sheetId` in a user record in the app’s own auth DB (NextAuth’s adapter DB) or in the session token.
5. On subsequent requests:
   - Use stored `sheetId` and valid access token to talk to Sheets/Drive.

#### 4.2 NextAuth configuration

- Use App Router compatible NextAuth handler in `app/api/auth/[...nextauth]/route.ts`.
- Providers:
  - `GoogleProvider` with client ID/secret.
- Callbacks:
  - `jwt`:
    - Store / refresh `accessToken`, `refreshToken`, and `accessTokenExpires`.
  - `session`:
    - Expose `session.user.email`, `session.user.id`, and `session.user.sheetId` (if stored).
  - `signIn`:
    - On first sign-in, create the Google Sheet and persist its ID.

Pseudo-config (spec, not production code):

```ts
// app/api/auth/[...nextauth]/route.ts
const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile https://www.googleapis.com/auth/drive.file",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Ensure Moneyger sheet exists; store sheetId
      // (see section 8 for details)
      return true;
    },
    async jwt({ token, account }) {
      // Handle token refresh logic
      return token;
    },
    async session({ session, token }) {
      // Attach sheetId to session.user
      return session;
    },
  },
};
```

---

### 5. Google Sheets data model (per-user sheet)

Each user gets **one spreadsheet** with the following tabs:

1. `Accounts`
2. `Budgets`
3. `Transactions`
4. `AccountBudgets`
5. `Payees`
6. `Metadata`

#### 5.1 Common conventions

- First row = header row with **fixed column names** (used by the API layer).
- All IDs are string-encoded integers (or UUIDs) generated by the app.
- Timestamps stored as ISO 8601 strings (e.g. `2025-02-04T12:34:56.000Z`).
- Dates stored as `YYYY-MM-DD` strings.
- Money stored as decimal strings (e.g. `"12345.67"`), converted to `number` in code.

#### 5.2 Accounts sheet

**Tab name**: `Accounts`

Columns:

1. `id` (string, primary key)
2. `account_name` (string, not null, unique per user)
3. `account_type` (enum string: `"cash" | "savings" | "credit" | "loan"`)
4. `account_balance` (decimal string, default `"0.00"`, not null)
5. `is_reconciled` (`"true"` or `"false"`, default `"false"`)
6. `last_reconciled_date` (nullable date string `YYYY-MM-DD`)
7. `created_at` (ISO datetime string)
8. `updated_at` (ISO datetime string)

Derived behavior from Rails:

- `savings_cash_accounts`: accounts where `account_type` in `["cash", "savings"]`.
- `liability_accounts`: accounts where `account_type` in `["credit", "loan"]`.
- `available_balance`:
  - `account_balance - sum(AccountBudgets.allocated_amount where account_id == this.id)`.

#### 5.3 Budgets sheet

**Tab name**: `Budgets`

Columns:

1. `id` (string)
2. `budget_name` (string, not null, unique)
3. `budget_type` (string, currently `"savings"` or `"payment"`, but front-end can treat as display-only until needed)
4. `cadence` (enum string: `"weekly" | "bi_weekly" | "monthly" | "quarterly" | "yearly"`, nullable)
5. `goal_date` (legacy, can be kept as nullable `YYYY-MM-DD` if needed)
6. `annotate` (text, optional)
7. `target_amount` (decimal string, not null, >= 0)
8. `target_date` (date string `YYYY-MM-DD`, required if `is_indefinite` is `"false"`)
9. `is_indefinite` (`"true"` or `"false"`, default `"false"`)
10. `minimum_payment_amount` (decimal string, nullable)
11. `current_cadence_goal` (decimal string, nullable, updated by job logic)
12. `linked_account_id` (string, nullable, references `Accounts.id`)
13. `created_at` (ISO)
14. `updated_at` (ISO)

Business rules:

- `budget_name` required and unique.
- `target_amount` required and `>= 0`.
- `is_indefinite` must be `"true"` or `"false"`.
- If `is_indefinite == "true"`:
  - `cadence` must be one of the allowed values.
- If `is_indefinite == "false"`:
  - `target_date` must be present.

Derived methods:

- `monthly_assigned(date)`:
  - Sum of `AccountBudgets.allocated_amount` where:
    - `budget_id == this.id`
    - `created_at` is in the same calendar month as `date`.
- `monthly_activity(date)`:
  - Sum of `Transactions.transaction_amount` where:
    - `budget_id == this.id`
    - `transaction_date` is in the same calendar month as `date`.
- `monthly_available(date)`:
  - `monthly_assigned(date) + monthly_activity(date)`.

#### 5.4 Transactions sheet

**Tab name**: `Transactions`

Columns:

1. `id` (string)
2. `transaction_amount` (decimal string, not null, can be positive or negative)
3. `transaction_date` (date string `YYYY-MM-DD`, not null)
4. `annotate` (text, optional)
5. `account_id` (string, not null, references `Accounts.id`)
6. `budget_id` (string, not null, references `Budgets.id`)
7. `payee_id` (string, not null, references `Payees.id`)
8. `created_at` (ISO)
9. `updated_at` (ISO)

Business rules:

- `transaction_amount` required and numeric.
- `transaction_date` required and must not be in the future (compared to current local date).
- `payee_id` required.

Callbacks (to replicate in API logic):

- After **create**:
  - Update `Accounts.account_balance += transaction_amount`.
- After **delete**:
  - Update `Accounts.account_balance -= transaction_amount`.

#### 5.5 AccountBudgets sheet

**Tab name**: `AccountBudgets`

Columns:

1. `id` (string)
2. `account_id` (string, not null)
3. `budget_id` (string, not null)
4. `allocated_amount` (decimal string, not null, `>= 0`)
5. `created_at` (ISO)
6. `updated_at` (ISO)

Business rules:

- `allocated_amount` required and `>= 0`.
- For any given `(account_id, budget_id)` pair, there must be at most one row.
- Custom validation:
  - Let `total_allocated = sum(allocated_amount for all rows where account_id == this.account_id and id != this.id)`.
  - Let `available_balance = Accounts.account_balance - total_allocated`.
  - If `allocated_amount > available_balance` fail with error “allocated_amount exceeds available account balance”.

#### 5.6 Payees sheet

**Tab name**: `Payees`

Columns:

1. `id` (string)
2. `name` (string, not null, unique)
3. `created_at` (ISO)
4. `updated_at` (ISO)

Business rules:

- `name` required and unique.
- All transactions reference payees via `payee_id`.

#### 5.7 Metadata sheet

**Tab name**: `Metadata`

Columns:

- Row 1: headers: `key`, `value`
- Subsequent rows store:
  - `schemaVersion` → string, e.g. `"1"`
  - `createdAt` → ISO
  - `updatedAt` → ISO

The API layer reads `schemaVersion` and runs any migrations required.

---

### 6. Derived user-level metrics

These mirror the `User` model methods.

Given all data loaded into memory:

#### 6.1 Cash flow

```ts
assets = sum(account_balance where account_type in ["cash", "savings"]);
liabilities = sum(account_balance where account_type in ["credit", "loan"]);
net = assets - liabilities;
```

#### 6.2 Unassigned money (global)

```ts
total_budget_amount = sum(Budgets.target_amount);
total_allocated = sum(AccountBudgets.allocated_amount);
unassigned_money = total_budget_amount - total_allocated;
```

#### 6.3 Monthly unassigned

For a given `date`:

```ts
start = beginningOfMonth(date);
end = endOfMonth(date);

total_budget_amount = sum(Budgets.target_amount);
monthly_allocated = sum(AccountBudgets.allocated_amount where created_at in [start, end]);
monthly_unassigned = total_budget_amount - monthly_allocated;
```

#### 6.4 Monthly leftover (previous month)

For a given `date`:

```ts
prevStart = beginningOfMonth(date - 1 month);
prevEnd = endOfMonth(date - 1 month);

total_assigned = sum(AccountBudgets.allocated_amount where created_at in [prevStart, prevEnd]);
total_activity = sum(Transactions.transaction_amount where transaction_date in [prevStart, prevEnd]);
monthly_leftover = total_assigned + total_activity;
```

#### 6.5 Monthly assigned / activity (global)

For a given `date`:

```ts
monthly_assigned = sum(AccountBudgets.allocated_amount where created_at in [start, end]);
monthly_activity = sum(Transactions.transaction_amount where transaction_date in [start, end]);
```

These values drive the sidebar and budgets page.

---

### 7. API surface (Next.js route handlers)

All API routes are internal (called only by the app) and protected by NextAuth.

#### 7.1 Authentication

- `GET /api/auth/session` – provided by NextAuth.
- `GET /api/auth/signin` – provided by NextAuth.
- `GET /api/auth/signout` – provided by NextAuth.

#### 7.2 Accounts

- `GET /api/accounts`
  - Returns all accounts with derived `available_balance`.
- `POST /api/accounts`
  - Body: `{ account_name, account_type, account_balance }`.
  - Validations:
    - Non-empty name
    - Unique name
    - `account_type` in allowed set
    - `account_balance` numeric
- `PUT /api/accounts/:id`
  - Same validations.
- `DELETE /api/accounts/:id`
  - Ensure no foreign-key-like constraints are violated (or enforce via UI).

#### 7.3 Budgets

- `GET /api/budgets?month=YYYY-MM-01`
  - Returns:
    - All budgets
    - For each budget:
      - `monthly_assigned`
      - `monthly_activity`
      - `monthly_available`
    - Also global:
      - `unassigned_money`
      - `monthly_leftover`
      - `monthly_assigned_total`
      - `monthly_activity_total`
- `POST /api/budgets`
  - Body: `{ budget_name, target_amount, is_indefinite, cadence?, target_date?, linked_account_id?, minimum_payment_amount? }`.
  - Apply validations from section 5.3.
  - After create, call the logic equivalent to `UpdateBudgetGoalsJob` to set `current_cadence_goal`.
- `PUT /api/budgets/:id`
  - Same validations.
  - Recompute `current_cadence_goal`.
- `DELETE /api/budgets/:id`
  - Also deletes related AccountBudgets and Transactions (or prohibit if present, spec whichever behavior you prefer; original Rails app uses `dependent: :destroy`).

#### 7.4 Transactions

- `GET /api/transactions?accountId=&budgetId=&startDate=&endDate=`
  - Filter chain:
    - If `accountId` provided, filter by account.
    - If `budgetId` provided, filter by budget.
    - If both `startDate` and `endDate` provided, filter by date range.
  - Return latest first (order by `created_at` desc).
- `POST /api/transactions`
  - Body: `{ transaction_amount, transaction_date, account_id, budget_id, payee_name, annotate? }`.
  - Behavior:
    - `transaction_date` cannot be in the future.
    - Find or create `Payees.name = payee_name`.
    - Create transaction row.
    - Update account balance: `account_balance += transaction_amount`.
- `PUT /api/transactions/:id`
  - More complex, since updating amount or account must adjust previous account’s balance.
  - Simplest spec:
    - Load existing transaction.
    - Reverse old effect (`oldAccount.account_balance -= oldAmount`).
    - Apply new effect (`newAccount.account_balance += newAmount`).
    - Update transaction row.
    - Payee logic same as create.
- `DELETE /api/transactions/:id`
  - Reverse account balance effect (`account_balance -= transaction_amount`).
  - Delete transaction.

#### 7.5 AccountBudgets

You can choose either:

- Expose separate endpoints for allocations, or
- Roll them into budgets API.

Spec minimal endpoints:

- `POST /api/account-budgets`
  - Body: `{ account_id, budget_id, allocated_amount }`.
  - Enforce `allocated_amount >= 0`.
  - Enforce combination uniqueness.
  - Enforce `allocated_amount <= account.available_balance` (calculated as described).
- `PUT /api/account-budgets/:id`
  - Same validations.
- `DELETE /api/account-budgets/:id`
  - Remove allocation; no other side effects.

#### 7.6 Payees

- `GET /api/payees`
  - Returns all payees sorted by name.
- Creation handled implicitly by `POST /api/transactions` using find-or-create semantics.

#### 7.7 Metadata

- `GET /api/metadata`
  - Returns `schemaVersion` and other metadata.
- Internal function `ensureSchemaUpToDate` used by every API call:
  - Reads `Metadata`.
  - If `schemaVersion < CURRENT_SCHEMA_VERSION`, run migrations.

---

### 8. Google Sheets / Drive operations

All these run on the server (API routes) using the user’s OAuth tokens.

#### 8.1 On first sign-in

1. Use Drive API `files.list` with:
   - Query: files with `appProperties.project == "moneyger"` and `owners.me == true` (or simpler name-based search).
2. If no file exists:
   - Create a spreadsheet via Sheets API or Drive API.
   - Set:
     - Title: `Moneyger`
     - App properties: `{ project: "moneyger" }`.
   - Initialize tabs and header rows according to section 5.
   - Initialize `Metadata` with:
     - `schemaVersion = "1"`, `createdAt`, `updatedAt`.
3. Persist `sheetId` against the user.

#### 8.2 Reading data

- Always use **batch requests** where possible:
  - `spreadsheets.values.batchGet` for multiple ranges:
    - `Accounts!A:Z`
    - `Budgets!A:Z`
    - etc.
- Parse header row to map column names to indices.
- Convert each row into typed objects in TypeScript.

#### 8.3 Writing data

- Use `spreadsheets.values.append` for new rows.
- Use `spreadsheets.values.update` for editing existing rows.
- Union primary keys:
  - App-level code must track row index (`rowNumber`) for each entity to enable updates/deletes.
  - Strategy:
    - On read, store `rowNumber` in memory for each entity.
    - On write:
      - For `create`, use `append` and then re-read or compute new rowNumber.
      - For `update/delete`, use stored `rowNumber`.
- All writes should be **batched** where feasible:
  - For example, transaction create + account balance update in a single `batchUpdate`.

---

### 9. UI and pages (Next.js App Router)

#### 9.1 Layout

- `app/layout.tsx`
  - Global Tailwind styles.
  - Inject `<html lang="en">`, `<body>`.
  - Wrap children in `SessionProvider` for NextAuth.
  - Conditionally render:
    - If authenticated and not on `/`:
      - Sidebar on the left (similar to Rails `shared/_sidebar.html.erb`):
        - Navigation:
          - Budgets
          - Cash Flow
          - Transactions (accounts index)
        - Accounts breakdown (cash/savings, credit, loans) with balances.
        - Current user email.
        - Sign out button.
    - Else:
      - Public landing page layout.

#### 9.2 Pages

1. **Landing page** – `/`
   - Mirrors `landing_pages/home.html.erb`.
   - Hero section:
     - Title: “Take control of your finances”.
     - CTA: “Get started” → `/api/auth/signin?provider=google`.
   - Secondary features:
     - “Buckets, Not Categories”
     - “Plan Ahead”
     - “Fast & Simple”

2. **Budgets index** – `/budgets`
   - Mirrors `budgets/index.html.erb`.
   - Features:
     - Month navigation:
       - Prev / Next month buttons.
       - “Today” button if viewing non-current month.
     - Unassigned amount at top-right with status text:
       - 0 → “All Money Assigned!”
       - > 0 → “Ready to Assign”
       - < 0 → “You assigned more than you have”
     - Budget table:
       - Columns: Buckets, Assigned, Activity, Available, Actions.
       - Each row:
         - `budget_name`
         - `monthly_assigned`
         - `monthly_activity`
         - `monthly_available`
         - Edit action (pencil icon).
     - Side panel:
       - “Available in [Month]”
       - Left Over, Total Assigned, Total Activity.
   - Data source:
     - `GET /api/budgets?month=YYYY-MM-01`.

3. **Budget form** – `/budgets/new` and `/budgets/[id]/edit`

   - Mirrors `_form.html.erb`:
     - Fields:
       - Bucket name (`budget_name`)
       - Target amount (`target_amount`)
       - Repeat? (`is_indefinite`)
       - Cadence (`cadence`)
       - Target date (`target_date`)
     - UX:
       - If `Repeat?` is checked:
         - Enable cadence select.
       - Otherwise:
         - Target date required.
     - Buttons:
       - Cancel → `/budgets`
       - Save
       - Delete (only on edit).

4. **Accounts index (used as “Transactions overview”)** – `/accounts`

   - Mirrors `accounts/index.html.erb`.
   - Header:
     - “Total Accounts Amount” with sum of all account balances.
     - “Add Transaction” button → `/transactions/new`.
     - “Add Account” button → `/accounts/new`.
   - Table:
     - Columns: Account, Payee, Budget, Notes, Outflow, Inflow.
     - Uses latest transactions data.
     - Outflow shows negative amounts as positive in Outflow column.
     - Inflow shows positive amounts.

5. **Cash flow** – `/cashflow`

   - Mirrors `cashflows/show.html.erb`.
   - Top card:
     - Total Assets
     - Total Liabilities
     - Net Cash Flow
   - Monthly receipts:
     - One card per account with transactions in current month.
     - Shows:
       - Account name and type.
       - List of transactions:
         - Payee name.
         - Amount.
         - Created at date.
       - Total amount per account.

6. **Transactions index** – `/transactions`

   - Mirrors `transactions/index.html.erb`.
   - Header:
     - “Transactions”
     - “New transaction” button → `/transactions/new`.
   - Table:
     - Columns: Account, Date, Payee, Notes, Amount, Actions.
     - Edit icon leads to `/transactions/[id]/edit`.
   - Optional filters:
     - account, budget, date range (map to query params used by API).

7. **Transactions form** – `/transactions/new` and `/transactions/[id]/edit`

   - Mirrors `_form.html.erb`.
   - Fields:
     - Amount (with ₱ prefix)
     - Date
     - Account select (user’s accounts)
     - Budget select (user’s budgets)
     - Payee name:
       - Text input with datalist of existing payees.
       - Create or reuse payees as needed.
     - Notes (annotate)
   - Buttons:
     - Cancel → `/transactions`
     - Save

8. **Accounts form** – `/accounts/new` and `/accounts/[id]/edit`

   - Mirrors `accounts/_form.html.erb`.
   - Fields:
     - Account name
     - Account balance
     - Account type (cash, savings, credit, loan)
   - Standard validation error display.

9. **Auth pages**

   - NextAuth default pages can be used or lightly themed to fit Moneyger’s style.

---

### 10. Tailwind and styling

- Configure Tailwind in `tailwind.config.ts`.
- Include Tailwind base in `app/globals.css`:
  - `@tailwind base;`
  - `@tailwind components;`
  - `@tailwind utilities;`
- Use existing semantics from ERB templates:
  - Layout:
    - Sidebar with fixed width.
    - Main content area with padding similar to Rails app.
  - Typography:
    - Budget / cashflow headings roughly match existing font sizes and weights.
  - Components:
    - Tables with `border-b`, `px-4`, `py-2`.
    - Buttons with hover states, subtle shadows.

---

### 11. PWA requirements

#### 11.1 Manifest (`public/manifest.json`)

Include at least:

- `name`: `"Moneyger"`
- `short_name`: `"Moneyger"`
- `start_url`: `"/budgets"`
- `display`: `"standalone"`
- `background_color`: `"#141f2e"`
- `theme_color`: `"#141f2e"`
- `icons`: array of PNG icons at multiple sizes (192x192, 512x512).

#### 11.2 Service worker

- `public/service-worker.js`:
  - Cache static assets (`/_next/static`, images).
  - Cache `GET` requests to key API endpoints (e.g. budgets, accounts, transactions) with a **stale-while-revalidate** strategy.
  - Provide offline fallback:
    - If offline and cache hit: serve cached.
    - If offline and no cache: show simple offline page or error toast.
- Registration:
  - In a client component (e.g. `app/pwa-provider.tsx`) hook into `navigator.serviceWorker.register("/service-worker.js")` on client side.

#### 11.3 Offline behavior

- Reads:
  - Use SW cache to show last known state.
- Writes:
  - Basic strategy:
    - If offline, show message “You are offline; writes disabled” and block.
    - Optional enhancement: queue writes in IndexedDB and sync when online.

---

### 12. Schema versioning & migrations

- `CURRENT_SCHEMA_VERSION = "1"` initially.
- On every API request:
  - Read `Metadata` tab for `schemaVersion`.
  - If less than current:
    - Run migration steps:
      - e.g. adding a new column:
        - Read header row.
        - Append new column name.
        - Apply default values to existing rows where needed.
      - Update `schemaVersion` and `updatedAt`.
- Migrations should be **idempotent**:
  - Safe to re-run if partially applied.

---

### 13. Seed / initial data behavior

Instead of seeding a global DB, each new user’s sheet can be initialized with:

- Example accounts:
  - `BDO` (savings, 100000.00)
  - `BPI` (savings, 56000.00)
  - `Wallet` (cash, 3500.00)
  - `GCash` (cash, 15000.00)
  - `Car Loan` (loan, 500000.00)
  - `SeaBank` (savings, 65000.00)
  - `Master Card` (credit, 12000.00)
  - `Visa` (credit, 8000.00)
- Example budgets:
  - Emergency Fund, Bills, Family, Subscription, Socialization, Dates, Groceries
  - Use same fields as in Rails seeds but adjusted for the new schema.
- Example payees:
  - `Work Park`, `Work Lunch`, `Groceries`, `Bills`, `Church`, `Friends`, `Families`, `Dates`
- Optionally a small set of example transactions (like the Rails seed’s 100 random ones) **only** if you want a demo mode. For real users you may skip auto-generated random transactions.

Implementation detail:

- On first login:
  - After creating the spreadsheet:
    - Optionally ask “Start with sample data?”:
      - Yes → populate from above template.
      - No → leave empty except headers.

---

### 14. ESLint + Prettier baseline

#### 14.1 ESLint

- Extend:
  - `"next/core-web-vitals"`
  - `"plugin:@typescript-eslint/recommended"`
- Basic rules:
  - No unused vars (`@typescript-eslint/no-unused-vars`).
  - Prefer const.
  - No explicit any unless justified.

#### 14.2 Prettier

- Config:
  - `printWidth: 100`
  - `singleQuote: true`
  - `semi: true`
  - `trailingComma: "all"`

---

### 15. AI agent expectations

An AI agent should be able to build the app from this PRD by following these steps:

1. **Bootstrap the Next.js app**
   - Create Next.js (App Router) + TypeScript project.
   - Install Tailwind, ESLint, Prettier, NextAuth.
   - Configure Tailwind with `globals.css`.
   - Set up basic layout and pages structure described in section 9.

2. **Configure NextAuth and Google OAuth**
   - Implement `/api/auth/[...nextauth]/route.ts` with Google provider and scopes from section 4.
   - Implement token refresh handling and attach `sheetId` to user session.

3. **Implement Google Sheets client**
   - Write a typed client for Sheets/Drive:
     - Functions to read and write each tab.
     - Mapping between rows and model types.
   - Implement `ensureUserSheetExists` and `ensureSchemaUpToDate`.

4. **Implement domain services**
   - Pure TypeScript functions implementing:
     - Account, Budget, Transaction, AccountBudget, Payee CRUD-level operations.
     - User-level metrics (cash flow, monthly stats).
     - Validation rules as per section 5 and 6.
     - Side-effect rules (account balance updates).

5. **Wire API routes**
   - Implement all endpoints from section 7 using the domain services and Sheets client.
   - Protect endpoints with NextAuth.

6. **Build UI**
   - Implement pages in section 9 with Tailwind and React components.
   - Connect to API using `fetch` or `react-query` style hooks.

7. **Add PWA support**
   - Add `manifest.json`.
   - Implement `service-worker.js`.
   - Register service worker from a client component.

8. **Polish**
   - Validate against the behaviors and UI flows mirrored from the Rails app.
   - Ensure basic offline read behavior and clean error states for Sheets API failures.

This PRD is intentionally explicit so an AI agent can reconstruct the entire application without needing to inspect the original Rails codebase.

