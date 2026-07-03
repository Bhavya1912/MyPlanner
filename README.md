# Planner — Calendar, Daily Planner & To‑Do Manager

A personal productivity website: monthly calendar, daily planner, and a full
task manager (priorities, categories, tags, subtasks, recurrence, search,
filters, sorting, drag‑to‑reschedule, light/dark mode) — backed by a real
cloud database and a private login, so it works the same from your laptop
or your phone.

This is a **single-account app**: there's no public sign-up. You create the
one login for yourself, and everything is locked to that account.

---

## 1. Create your database (Supabase, free)

1. Go to [supabase.com](https://supabase.com) and create a free account and
   a new project (pick any name/region; save the database password it
   generates somewhere safe, though you won't need it day-to-day).
2. Once the project is ready, open **SQL Editor** in the left sidebar, paste
   in the contents of `supabase-schema.sql` (included in this project), and
   click **Run**. This creates the table that stores your planner data and
   locks it so only you can read or write it.
3. Open **Project Settings → API**. You'll need two values from this page:
   - **Project URL** → put this in `VITE_SUPABASE_URL`. It already contains
     your Project ID/reference, for example `https://abc123xyz.supabase.co`.
     You do not enter the Project ID separately; use it as part of this URL.
   - **Publishable key** / **anon public** key → put this in
     `VITE_SUPABASE_ANON_KEY`. This one is safe to expose in client code —
     it is not the secret service role key.

## 2. Create your login

1. In Supabase, go to **Authentication → Providers → Email**, and turn
   **off** "Allow new users to sign up." This stops anyone else from
   creating an account through the app.
2. Go to **Authentication → Users → Add user**, and create yourself an
   account with an email and password. That's your login for the site.
   (You can change the password later from the same screen.)

## 3. Configure the project

1. Copy `.env.example` to a new file named `.env` in this folder.
2. Fill in the two values from step 1. If Supabase shows a Project ID/reference
   such as `abc123xyz`, put it inside the URL like this:
   ```
   VITE_SUPABASE_URL=https://abc123xyz.supabase.co
   VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-public-key
   ```
   Do not add a separate Project ID variable; the app only needs the full
   Supabase URL and the anon/public key. If `npm run dev` is already running,
   stop it and start it again after saving `.env` so Vite reloads the values.

## 4. Run it locally to test

```bash
npm install
npm run dev
```

Open the printed URL, sign in with the account you created in step 2 — you
should see the planner, and any changes you make will sync to Supabase
within a second (check the small status dot in the sidebar's settings
panel: "Synced" / "Saving…" / "Offline").

## 5. Deploy it as a real website

**Vercel (recommended, free):**

1. Push this project to a GitHub repo (or use the Vercel CLI to deploy
   directly from this folder — see below).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Use the **Vite** framework preset if Vercel asks you to choose one
   (the app is React + Vite, not Create React App). Before deploying, add the same two
   environment variables from your `.env` file under **Environment
   Variables**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   If the site is already deployed and says Supabase is not configured, open
   **Vercel → Project → Settings → Environment Variables**, add both values
   for Production, then redeploy because Vite reads these values at build time.
   Supabase's Vercel integration may create `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; this app supports those too.
4. Click **Deploy**. You'll get a permanent `https://your-app.vercel.app`
   URL you can open from any device.

Deploying without GitHub, straight from this folder:
```bash
npm install -g vercel
vercel login
vercel --prod
```
It will ask for the same two environment variables the first time.

**Netlify** works the same way: connect the repo (or drag the built `dist/`
folder after running `npm run build`, then add the env vars under
**Site settings → Environment variables** and redeploy so the build picks
them up).

## Using it day to day

- Visit your deployed URL, sign in with your email/password.
- Your tasks, categories, and settings are stored in Supabase under your
  account, so logging in from your phone shows the same data as your
  laptop.
- The sidebar's gear icon has:
  - **Export JSON backup** / **Export CSV** — download a copy of everything.
  - **Import JSON backup** — restore from a previous export.
  - **Sign out**.
- A local cache is also kept in your browser so the app loads instantly and
  still works briefly offline; it reconciles with Supabase once you're back
  online.

## If you ever want to change your password

Supabase dashboard → Authentication → Users → click your user → you can
reset the password there directly.

## Project structure

```
index.html            entry HTML (loads fonts)
src/main.jsx           React bootstrap, wraps the app in AuthGate
src/AuthGate.jsx        checks login state, shows Login or the app
src/Login.jsx           the sign-in screen
src/supabaseClient.js   Supabase connection (reads .env values)
src/App.jsx             the entire planner (components, state, styling)
src/index.css           Tailwind entry point
supabase-schema.sql     run once in Supabase's SQL editor
.env.example            copy to .env and fill in your project's values
```

## Tech stack

React 18, Vite, Tailwind CSS, date-fns, lucide-react icons, Supabase
(Postgres database + auth).

## Keyboard shortcuts

- `N` — new task
- `/` — focus search
- `Esc` — close the task editor
