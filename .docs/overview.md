## 1) Objective & Success Criteria

**Goal:** Ship a web-first PWA that proves the core value of zero-based budgeting: “every peso has a job,” manual transaction entry, and month-to-month category rollovers—stable enough for a small public beta (1–5% of traffic).

**Success criteria (v0 / MVP):**

- Users can: create a budget → add accounts → assign money → log spending → see category balances and “To Be Assigned (TBA)” update instantly.
- Budget math is correct across month boundaries (carryover & overspend rules below).
- Works well on mobile home-screen (installable PWA) and offline for quick transaction capture.
- P50 interactive latency <150 ms on common flows; <1s first meaningful paint on warm loads.
- Error rate <0.5% on budgeting/transactions endpoints.

---

## 2) MVP Scope

### Must-have (Iteration 1)

- **Auth & tenancy:** email/password, password reset; multi-budget per user.
- **Core entities:** Budgets, Accounts (on-budget checking/savings, off-budget cash), Category Groups & Categories, Payees, Transactions (incl. splits), Monthly budget sheets.
- **Budgeting engine:**
    - Integer **milliunits** for money (₱1.00 → 1000).
    - TBA (To Be Assigned) for active month.
    - Rollover: positive category balance carries; **cash overspend** reduces next month TBA.
    - Transfers between on-budget accounts are neutral to TBA.
- **Manual transaction entry** (with split lines), editing, delete, flag, cleared/uncleared.
- **Basic reports:** Category activity & balance for current month; Net worth snapshot (sum of account balances).
- **PWA:** installable, offline capture of transactions, background sync when online.
- **Accessibility & mobile UI:** Tailwind-based responsive forms, keyboardable.

### Nice-to-have (fit only if capacity remains)

- Scheduled transactions (templates).
- Simple goals: **Monthly Funding** (MF) goal amount per category (advisory only).
- CSV import (per-account).
- Export CSV.

### Out-of-scope (later iterations)

- Bank feeds/direct import; connections/MFA.
- Advanced reports; Age of Money.
- Shared budgets & granular permissions.
- Multi-currency & investments.

---

## 3) Core UX Flows (first release)

1. **New user onboarding** → Create first budget (name, base currency) → create at least one **on-budget** account (opening balance) → land on **Budget Month** view with TBA.
2. **Assign money (TBA → Categories)** via inline cell editing; negative TBA blocked.
3. **Log a transaction** (date, payee, account, amount, category, memo, cleared). Splits supported.
4. **See impact**: category activity/balance & account balance update instantly (Turbo Streams).
5. **Month turnover**: navigate next month; rollover logic applies; TBA recomputed.

Acceptance checks (sample):

- “As a user, when I assign ₱10,000 to ‘Groceries’, TBA decreases by the same amount and ‘Groceries’ balance increases by ₱10,000 for that month.”
- “When I post a ₱1,200 Groceries outflow, ‘Groceries’ activity shows −₱1,200 and balance reduces accordingly.”

---

## 4) Data Model (v1)

> Store all money as integer milliunits to avoid float issues.
> 

### DBML (MVP)

```
Table users {
  id uuid [pk]
  email text [unique, not null]
  password_digest text [not null]
  created_at timestamptz
  updated_at timestamptz
}

Table budgets {
  id uuid [pk]
  user_id uuid [not null, ref: > users.id]
  name text [not null]
  base_currency char(3) [not null, default: 'PHP']
  server_knowledge bigint [not null, default: 0] // revision for delta sync (future)
  created_at timestamptz
  updated_at timestamptz
}

Table accounts {
  id uuid [pk]
  budget_id uuid [not null, ref: > budgets.id]
  name text [not null]
  type text [not null] // checking, savings, cash
  on_budget boolean [not null, default: true]
  closed boolean [not null, default: false]
  note text
  balance_bigint bigint [not null, default: 0]         // total
  cleared_balance_bigint bigint [not null, default: 0] // cleared subset
  created_at timestamptz
  updated_at timestamptz
  index (budget_id)
}

Table category_groups {
  id uuid [pk]
  budget_id uuid [not null, ref: > budgets.id]
  name text [not null]
  hidden boolean [not null, default: false]
  position int [not null, default: 0]
  created_at timestamptz
  updated_at timestamptz
  index (budget_id)
}

Table categories {
  id uuid [pk]
  budget_id uuid [not null, ref: > budgets.id]
  category_group_id uuid [not null, ref: > category_groups.id]
  name text [not null]
  hidden boolean [not null, default: false]
  // goal fields (optional in MVP)
  goal_type text // 'MF' for monthly funding in MVP
  goal_target_bigint bigint // milliunits/month for MF
  position int [not null, default: 0]
  created_at timestamptz
  updated_at timestamptz
  index (budget_id)
}

Table months {
  id uuid [pk]
  budget_id uuid [not null, ref: > budgets.id]
  month date [not null] // YYYY-MM-01
  to_be_assigned_bigint bigint [not null, default: 0]
  created_at timestamptz
  updated_at timestamptz
  unique (budget_id, month)
  index (budget_id, month)
}

Table month_category_totals {
  id uuid [pk]
  month_id uuid [not null, ref: > months.id]
  category_id uuid [not null, ref: > categories.id]
  budgeted_bigint bigint [not null, default: 0]
  activity_bigint bigint [not null, default: 0]
  balance_bigint bigint [not null, default: 0]
  unique (month_id, category_id)
  index (category_id)
}

Table payees {
  id uuid [pk]
  budget_id uuid [not null, ref: > budgets.id]
  name text [not null]
  created_at timestamptz
  updated_at timestamptz
  index (budget_id, name)
}

Table transactions {
  id uuid [pk]
  budget_id uuid [not null, ref: > budgets.id]
  account_id uuid [not null, ref: > accounts.id]
  date date [not null]
  payee_id uuid [ref: > payees.id]
  category_id uuid [ref: > categories.id] // null for transfers or unassigned
  memo text
  amount_bigint bigint [not null] // negative = outflow, positive = inflow
  cleared boolean [not null, default: false]
  approved boolean [not null, default: true]
  transfer_account_id uuid // future: internal account transfers
  import_id text // future: CSV/feeds de-dup
  deleted boolean [not null, default: false]
  created_at timestamptz
  updated_at timestamptz
  index (budget_id, account_id, date)
}

Table subtransactions {
  id uuid [pk]
  transaction_id uuid [not null, ref: > transactions.id]
  category_id uuid [ref: > categories.id]
  amount_bigint bigint [not null]
  memo text
  created_at timestamptz
  updated_at timestamptz
  index (transaction_id)
}

```

**Why store `months` & `month_category_totals`?**

- Fast read of budget view; simple, deterministic rollover math.
- “Ledger” approach: recompute `activity` from transactions for the month via triggers/jobs; `balance` = prior balance + budgeted − activity.

---

## 5) Budgeting Rules (MVP)

1. **TBA (To Be Assigned)** for a given `month`:

```
TBA[m] = InflowsToTBA[m] + PriorTBA[m-1]
         - Σ budgeted[m]  - CashOverspendAdjustment[m-1]

```

- **InflowsToTBA**: opening balances (on-budget) + any transaction explicitly marked “Inflow: To Be Assigned”.
- **Cash overspend**: if a category’s `balance` < 0 at month end, subtract its absolute value from next month’s TBA and set that category’s carried balance to 0.
1. **Category balances** per month:

```
balance[m, c] = balance[m-1, c] + budgeted[m, c] - activity[m, c]

```

- Split transactions contribute to each target category’s `activity`.
1. **Transfers (MVP)**: supported only **within same budget**; represented as two transactions with opposite signs; category null; net effect on TBA = 0 for on-budget↔on-budget.

---

## 6) Architecture (Rails 8 Monolith, Turbo-native)

- **Rails 8 app** (API + server-rendered HTML).
- **Hotwire**:
    - **Turbo** frames/streams for budget grid updates (assignment & activity).
    - **Stimulus** for transaction form, split row management, inline editors, and PWA sync status.
- **Persistence**: Postgres 15+; **integer milliunits**; UUID PKs.
- **Background jobs**: **Solid Queue** (built-in, Postgres-backed) for month rollovers, nightly reconciliation of aggregates.
- **Caching**: Russian-doll fragment caches + keyed partials for budget month; `SELECT FOR UPDATE` on hot rows (months, month_category_totals) to keep math atomic.
- **Observability**: Rails logs + request IDs, basic metrics (Prometheus exporter or Skylight/New Relic later), audit trail per mutation (budget_id, actor_id, before/after hashes for finance-critical tables).

### Controllers/Routing (high-level)

```
resources :budgets do
  resources :months, only: [:index, :show]      # /budgets/:id/months/:month
  resources :accounts
  resources :category_groups
  resources :categories
  resources :payees
  resources :transactions do
    resources :subtransactions
  end
end
namespace :api do
  namespace :v1 do
    resources :budgets do
      resources :months, only: [:show]
      resources :transactions, only: [:index, :create, :update, :destroy]
      # minimal endpoints for PWA offline sync
    end
  end
end

```

---

## 7) PWA & Offline Strategy

- **App shell**: cache-first for CSS/JS/fonts via Service Worker (Workbox or custom minimal SW).
- **Pages**: stale-while-revalidate for budget & accounts routes.
- **Offline capture**:
    - When offline, **Stimulus** stores drafted transactions to **IndexedDB** queue.
    - Background Sync API (when available) or reconnection hook flushes queue to `/api/v1/budgets/:id/transactions` (batched).
    - On success, Turbo Stream updates budget cells & account balances.
- **Installability**: manifest.json (name, icons, display: standalone, theme colors), iOS splash assets.

---

## 8) Concurrency & Integrity

- All budget mutations wrapped in a single DB transaction:
    1. Insert/Update Transaction(s)
    2. Recompute `activity` for affected `month_category_totals` (by delta)
    3. Recompute category `balance` (current month and forward if needed)
    4. Recompute TBA for current (and next, when overspend applies)
    5. Bump `budgets.server_knowledge` (future delta API)
- Use **`SELECT … FOR UPDATE`** on `months` and touched `month_category_totals` rows to prevent race conditions.

---

## 9) Security, Privacy, Compliance (MVP)

- Devise or built-in Auth: bcrypt/argon2 password hashing; session & CSRF protection.
- Authorization: Pundit/Action Policy; budget scoping on every query.
- No bank credentials (no direct-import in MVP).
- Audit trail for finance tables (who/when/what) to aid debugging.
- Backups: daily logical backups; PITR if available.

---

## 10) Analytics & Product Telemetry

- Minimal, privacy-respecting: event stream for
    - budget_created, account_created, category_assigned, transaction_created/updated/deleted.
- Capture client perf (TTFB, FCP) and error rates; store aggregated metrics.

---

## 11) Testing Strategy

- **Model specs:** budgeting math (edge cases: end-of-month overspend, splits, transfers).
- **Request/system specs:** TBA and category cell updates via Turbo Streams.
- **Property tests** on rollover invariants:
    - Σ category balances + TBA == Σ on-budget account balances (per month).
- **E2E** happy path on mobile viewport.

---

## 12) Release Plan & Rollout Controls

- **Feature flags** (Flipper): gated access to budgets, CSV import, goals.
- **Seed script**: demo budget with mock data.
- **Progressive rollout**: internal → friends/family → 1% external; monitor error budget & feedback.
- **Operational playbooks**: rollback, hotfix, data-repair migration (idempotent scripts).

**Release criteria (go/no-go):**

- Rollover math verified against 20+ scripted scenarios.
- p95 transaction create <300 ms; JS bundle <200 KB gz (initial).
- Offline add-a-transaction works & syncs on reconnection.

---

## 13) Initial Jira/Epics & Sample Stories

**EPIC 1: Budget Shell & Entities**

- As a user, I create a budget and first account with opening balance.
    - *Given* I’m authenticated
        
        *When* I create “Main Budget” and “BPI Checking” ₱50,000
        
        *Then* TBA for current month increases by ₱50,000
        

**EPIC 2: Assign Money**

- As a user, I assign money from TBA to categories inline.
    - *When* I assign ₱10,000 to “Rent”
        
        *Then* TBA decreases by ₱10,000 and “Rent” balance increases by ₱10,000
        

**EPIC 3: Transactions & Splits**

- As a user, I record a grocery purchase with a split.
    - *When* I create a ₱1,500 outflow in “BPI Checking” split ₱1,200 “Groceries”, ₱300 “Household”
        
        *Then* both categories’ activity reflect amounts and account balance decreases by ₱1,500
        

**EPIC 4: Rollover & Overspend**

- As a user, cash overspend reduces next month’s TBA.
    - *Given* “Dining” balance is −₱800 on Aug 31
        
        *When* I open September
        
        *Then* September TBA is reduced by ₱800 and “Dining” carried balance is ₱0
        

**EPIC 5: PWA Offline Capture**

- As a user, I can add a transaction offline and see it sync later.
    - *Given* I’m offline
        
        *When* I add a ₱200 cash outflow
        
        *Then* it appears locally; *and when* I reconnect
        
        *Then* it persists server-side and updates budget totals.
        

---

## 14) Design System & UI Notes

- **Budget Grid:** Sticky category names (left), columns: Budgeted | Activity | Available; TBA banner at top.
- **Transaction Register:** Per-account list with add form at top; split UX as expandable rows.
- **Tailwind:** semantic utility classes; dark mode later; color tokens for positive/negative.

---

### Implementation Notes (gotchas)

- Always compute/compare using **milliunits**; format on the edge.
- Guardrails in UI: prevent negative TBA; show overspend warnings; treat transfers as category-less.
- Keep math paths **idempotent**; aggregation uses deltas where possible; ship a **rebuild aggregates** rake task.