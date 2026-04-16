# Backoffice UI — Crypto Payment Control Center

Next.js 15 (App Router) admin dashboard for a Crypto Payment System. Reads from Postgres (Supabase) via Prisma and displays Transactions, Inventory, and Users.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **UI:** shadcn/ui (new-york style)
- **Data:** React Server Components + Server Actions; TanStack Table; Recharts; Lucide React

## Setup

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Environment**

   Copy `.env.example` to `.env.local` and set `DATABASE_URL` (Supabase/Postgres connection string).

3. **Prisma**

   Generate the client and (when ready) run migrations:

   ```bash
   pnpm prisma generate
   # pnpm prisma migrate dev   # when schema is final
   ```

4. **Run dev**

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Adding shadcn components

The project is pre-configured for shadcn (see `components.json`). To add more components:

```bash
pnpm dlx shadcn@latest add <component-name>
```

## Structure

- **Layout:** Sidebar (Dashboard, Transactions, Inventory, Users, Settings) + top bar with mocked System Health.
- **`/`** — Dashboard: KPI cards (Volume 24h/7d, Active Orders, Low Liquidity), Recent Activity (last 5 transactions).
- **`/transactions`** — DataTable (TanStack Table): ID, Type, Status (badges), Amounts, Provider; filters (Status, Date range); Retry action for Failed (stubbed Server Action).
- **`/inventory`** — Cards per chain/token (e.g. USDC on BASE), Line chart for InventoryHistory (mock shape when no DB).
- **`/users`** — Searchable user list; expand row to see transaction history.
- **`/settings`** — Placeholder.

Data layers in `src/lib/data*.ts` use Prisma when available and fall back to mock data so the app runs without a database.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Prisma](https://www.prisma.io/docs)
