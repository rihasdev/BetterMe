# BetterMe

A lightweight personal daily tracker for faith, character, health, movement, mental strength, communication, relationships, career, business and discipline. Independent of BetterDaily.

## First version
- Daily checkbox and quantity habits, three priorities, reflection, custom habits and archiving.
- Date-wise history, seven-day personal progress and CSV habit export.
- Supabase email/password accounts, per-user PostgreSQL rows protected by RLS, IndexedDB cache and outbox, periodic and reconnect sync.
- Responsive PWA with offline app shell after first successful online production load. Local-only mode is separate from cloud accounts.
- Worship is recorded privately and excluded from the overall habit score.

## Local setup
Install Node.js 22 and run:
```sh
npm install
npm test
npm run dev
npm run build
npm run preview
```
Without configuration, use local-only mode. Do not put real personal data into demo mode if you expect it to migrate to cloud; export is habit CSV only.

## Supabase setup
1. Create a dedicated BetterMe project in the Supabase dashboard.
2. In SQL Editor, run `supabase/migrations/001_entries.sql` once on that new project.
3. Under Authentication, enable email/password and configure the Site URL and allowed redirect URLs to your deployment (and localhost for development).
4. Copy `.env.example` to `.env.local`; set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY from the project's Connect/API settings. Use only the publishable (or legacy anon) key, never the secret/service_role key or database password.
5. Restart Vite after editing env. Sign up and confirm the email if required.
6. For personal-only use, disable new signups after your account is created.

## Vercel
Import this repository in Vercel, select Vite, build command npm run build, output directory dist. Add the same two environment variables. Deploy and set the Supabase auth Site URL to the resulting HTTPS URL. On a phone, open the URL and use Add to Home Screen / Install app where supported. Initial use and offline shell preparation require an internet connection.

## Sync and limitations
Each log is keyed by local calendar date and habit ID, with independent keys for priorities and reflections. An IndexedDB outbox retries when online and while the app is open. The server accepts the last uploaded change for the same entry; concurrent edits of the exact same entry are not merged. Sign out does not delete offline data from the device. Avoid shared devices. Browser storage may be evicted; cloud sync is the durable copy. Local-only records are not automatically migrated. Default habits are fixed in this MVP; custom habits can be added and archived (effective after today). Account deletion, password reset UI, editing recurring templates, deeper analytics and multi-tab reconciliation are follow-up work.

## Release verification
Run npm test and npm run build, then confirm in two devices with the same account: change distinct habits, reload both, disconnect one after the first online production visit, record a habit, reconnect and verify the pending queue clears. Test a second account cannot read/write the first account's rows. Verify install and offline app shell on Android and iOS. Do not treat this initial PR as production verified until these checks pass.
