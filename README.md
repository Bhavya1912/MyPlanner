# Planner — Calendar, Daily Planner & To‑Do Manager

A personal productivity website: monthly calendar, daily planner, and a full
task manager (priorities, categories, tags, subtasks, recurrence, search,
filters, sorting, drag‑to‑reschedule, rich Markdown notes, file attachments,
light/dark mode) — backed by a real cloud database and a private login, so
it works the same from your laptop or your phone.

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
   the access policies for it (and for attachments — see step 1a below).
3. Open **Project Settings → API**. You'll need two values from this page:
   - **Project URL** → put this in `VITE_SUPABASE_URL`. It already contains
     your Project ID/reference, e.g. `https://abc123xyz.supabase.co`.
   - **Publishable key** / **anon public** key → put this in
     `VITE_SUPABASE_ANON_KEY`. This one is safe to expose in client code —
     it is not the secret service role key.

### 1a. Set up file attachments (new)

Attached files (PDFs, images, Word/Excel docs, ZIPs, videos) are stored in
Supabase Storage, in a private bucket.

1. In the Supabase dashboard, go to **Storage → New bucket**.
2. Name it exactly `attachments`, and leave **Public** turned **off**.
3. That's it — the access policies for this bucket are already included in
   `supabase-schema.sql` from step 2 above (they restrict each file to the
   account that uploaded it).

## 2. Create your login

1. In Supabase, go to **Authentication → Providers → Email**, and turn
   **off** "Allow new users to sign up." This stops anyone else from
   creating an account through the app.
2. Go to **Authentication → Users → Add user**, and create yourself an
   account with an email and password. That's your login for the site.
   (You can change the password later from the same screen.)

## 3. Configure the project

1. Copy `.env.example` to a new file named `.env` in this folder.
2. Fill in the two values from step 1:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-public-key
   ```

## 4. Run it locally to test

```bash
npm install
npm run dev
```

Open the printed URL, sign in with the account you created in step 2 — you
should see the planner, and any changes you make will sync to Supabase
within a second (check the small status dot in the sidebar's settings
panel: "Synced" / "Saving…" / "Offline"). Try opening a task and attaching
a file, and writing some Markdown in Notes, then hit **Preview**.

## 5. Deploy it as a real website

**Vercel (recommended, free):**

1. Push this project to a GitHub repo (or use the Vercel CLI to deploy
   directly from this folder — see below).
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo.
3. Vercel auto-detects Vite. Before deploying, add the same two
   environment variables from your `.env` file under **Environment
   Variables**: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
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

## Focus, mood & reviews (new)

- **Focus icon** (top bar) opens **Focus Mode**: a distraction-free screen
  with today's next task, a 25/5 Pomodoro timer (15-min break every 4th
  session), and an "Interrupted" button to log what pulled you away.
- The **Planner** view has a **Mood & energy** card — an emoji mood picker
  and High/Medium/Low energy for morning/afternoon/night, saved per day.
- The sidebar's **Reviews** section has four views:
  - **Daily review** — did you finish today's work, a 1–5 productivity
    rating, your logged interruptions, and tomorrow's priorities.
  - **Weekly review** — tasks completed, hours worked, best/worst day, and
    a few rule-based suggestions.
  - **Monthly review** — completion %, category and weekday breakdowns,
    longest streak.
  - **Year in review** — a "wrapped"-style summary plus a GitHub-style
    productivity heatmap.
- All of this (mood, energy, interruptions, Pomodoro sessions, reviews)
  is stored in the same Supabase row as your tasks — no extra setup needed.

## Using it day to day

- Visit your deployed URL, sign in with your email/password.
- Your tasks, categories, and settings are stored in Supabase under your
  account, so logging in from your phone shows the same data as your
  laptop.
- Open any task to see its **Notes** field, which supports Markdown:
  `**bold**`, `_italic_`, `` `code` ``, fenced code blocks, `[links](url)`,
  tables, and `- [ ] checklists`. Toggle **Write** / **Preview** to see it
  rendered.
- The same task editor has an **Attachments** section — attach PDFs,
  images, Word/Excel files, ZIPs, or videos (up to 25MB each). Files are
  private to your account; click a file's name to open/download it.
- The sidebar's gear icon has:
  - **Export JSON backup** / **Export CSV** — download a copy of everything.
  - **Import JSON backup** — restore from a previous export.
  - **Sign out**.
- A local cache is also kept in your browser so the app loads instantly and
  still works briefly offline; it reconciles with Supabase once you're back
  online. (Attachments themselves always need a connection.)

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
src/App.jsx             the core planner (calendar, tasks, sidebar, styling)
src/dailyLog.js         mood/energy/pomodoro data model + review/streak/heatmap math
src/Pomodoro.jsx        the 25/5 Pomodoro timer component
src/FocusMode.jsx       distraction-free Focus Mode screen
src/MoodEnergy.jsx      Mood & energy card + "Interrupted" distraction logger
src/Reviews.jsx         Daily/Weekly/Monthly/Year review views + heatmap
src/index.css           Tailwind entry point + Markdown preview styling
supabase-schema.sql     run once in Supabase's SQL editor
.env.example            copy to .env and fill in your project's values
```

## Tech stack

React 18, Vite, Tailwind CSS, date-fns, lucide-react icons, react-markdown
+ remark-gfm (rich notes), Supabase (Postgres database, auth, and file
storage).

## Keyboard shortcuts

- `N` — new task
- `/` — focus search
- `Esc` — close the task editor
