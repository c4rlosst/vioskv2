# Viosk — guest ordering

The page a guest lands on after scanning the QR code in a store. Shows that
business's menu and branding, takes an order, and hands it to staff for
verification.

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in the two values
npm run dev
```

Open with a store's QR token, for example:

    http://localhost:5173/?s=e441ae9e1b9bb90311

Without `?s=` the page shows "scan the code to start", which is correct —
it can't know which store's menu to load.

## Deploying to Vercel

The repository root is the React Native app, so the Vercel project must be
pointed at this sub-directory.

1. Import the repo in Vercel.
2. Set **Root Directory** to `web`.
3. Framework preset: **Vite** (usually detected).
4. Add two Environment Variables, for Production, Preview and Development:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. Deploy.

Anything prefixed `VITE_` is compiled into the JavaScript users download.
Only ever put the publishable key here — never the service_role key.

## After deploying

Each store's QR code should encode:

    https://<your-domain>/?s=<the store's qr_token>

Find a token with:

```sql
select s.name, s.qr_token from stores s;
```
