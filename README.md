# Moneyger (Next.js + Google Sheets)

Moneyger is a personal budgeting app where each user has one private Google Sheet as the data store.

## Requirements

- Node.js 20+
- Google Cloud project with:
  - OAuth consent screen configured
  - OAuth client credentials
  - Google Drive API enabled
  - Google Sheets API enabled

## Environment

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Required keys:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_PROJECT_ID`

## Google OAuth setup

Set the OAuth redirect URI to:

- `http://localhost:3000/api/auth/callback/google`

For deployed environments, add:

- `https://<your-domain>/api/auth/callback/google`

## Scripts

- `npm run dev` start local dev server
- `npm run build` production build
- `npm run start` run production server
- `npm run lint` run ESLint
- `npm run test` run Vitest test suite
- `npm run format:check` verify Prettier formatting

## Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

On first sign-in, Moneyger creates one spreadsheet in your Drive with app property `project=moneyger`, initializes tabs and headers, and stores metadata schema version.

## Deployment notes

- Deploy on Vercel or any Node-compatible platform.
- Set environment variables in your host settings.
- Use HTTPS in production because Google OAuth callback URLs and secure session cookies depend on it.
- Ensure serverless functions have network access to Google APIs.
