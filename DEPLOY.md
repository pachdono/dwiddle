# Deploying Dwiddle

Three things to set up, in this order. Supabase first, because Vercel needs two
values from it.

The whole thing runs on free tiers.

---

## 1. NVIDIA API key

The key that generates questions and marks writing.

1. Go to https://build.nvidia.com and sign in.
2. Open any model, then click **Get API Key** and **Generate Key**.
   The key works across the whole catalogue, so it does not matter which model
   page you happen to be on when you generate it.
3. Copy it. It starts with `nvapi-`. You will paste it into Vercel in step 3.

**You do not need to choose a model.** The catalogue changes and models get
retired, so the server asks your key what it can run and picks the best
instruct model itself. If you want to check before deploying:

```bash
NVIDIA_API_KEY=nvapi-your-key-here node scripts/list-models.mjs
```

That prints every model the key can use. After deploying you can see the same
list, plus which one the server chose, at `/api/models` on your site.

To pin a specific one, set `NVIDIA_MODEL` in Vercel to an id exactly as it
appears in that list. Leave it blank otherwise.

**Do not put this key anywhere in the code, and do not paste it into a chat.**
It only ever goes in Vercel's environment variables, where the browser cannot
reach it.

---

## 2. Supabase

Gives you sign in and progress that follows you between devices.

1. Go to https://supabase.com, sign in, click **New project**.
2. Name it `dwiddle`, choose a region near you, set a database password, create.
   It takes a minute or two to spin up.
3. Open **SQL Editor** in the left sidebar, click **New query**.
4. Open `supabase/schema.sql` from this repo, copy the whole file, paste it in,
   and click **Run**. It should say Success.
   This creates the two tables and, importantly, the row level security
   policies that stop anyone reading anyone else's data.
5. Go to **Project Settings**, then **API**. Copy two values:
   - **Project URL**
   - **anon public** key
6. Go to **Authentication**, then **URL Configuration**, and set
   **Site URL** to your Vercel URL once you have it in step 3. Until then
   `http://localhost:5180` works for local testing.

The anon key is meant to be public. It identifies the project, it does not
grant access. The SQL from step 4 is what actually protects the data.

---

## 3. Vercel

1. Go to https://vercel.com and sign in **with GitHub**.
2. Click **Add New**, then **Project**.
3. Find **pachdono/dwiddle** and click **Import**.
   If it is not listed, click **Adjust GitHub App Permissions** and give Vercel
   access to the repo.
4. Leave the build settings alone. `vercel.json` already sets them.
5. Before deploying, open **Environment Variables** and add four:

   | Name | Value | Notes |
   |---|---|---|
   | `NVIDIA_API_KEY` | your `nvapi-...` key | server only |
   | `NVIDIA_MODEL` | leave blank | only to pin one model |
   | `VITE_SUPABASE_URL` | Project URL from step 2.5 | |
   | `VITE_SUPABASE_ANON_KEY` | anon public key from step 2.5 | |

   Tick all three environments (Production, Preview, Development) for each.

6. Click **Deploy**. It takes about a minute.
7. Copy the live URL, go back to Supabase, **Authentication**, **URL
   Configuration**, and set **Site URL** to it. Sign in links will not work
   until you do this.

Every push to `main` now redeploys automatically.

---

## Running it locally

Plain `npm run dev` works, but the `/api` functions do not exist, so generating
questions and marking writing will fail with a message saying so. Everything
else works.

To run the functions locally too:

```bash
npm i -g vercel
vercel link
vercel env pull .env.local
vercel dev
```

`vercel env pull` writes the environment variables into `.env.local`, which is
gitignored. Never commit it.

---

## Checking it worked

1. Open the deployed site, go to **Add material**, click **Use sample**, then
   **Generate questions**. After a few seconds you should get topics and
   questions built from those notes.
2. Go to **Settings**. Enter your email, click **Email me a link**, and open the
   link from your inbox. The Account card should then show your email and
   "Progress synced".
3. Answer a question wrong in **Practice**, sign in on a second device or a
   private window, and it should appear in **Missed** there too.

## If something fails

| Symptom | Cause |
|---|---|
| "The AI endpoints are not running" | You are on `npm run dev`. Use `vercel dev`, or test on the deployed site. |
| "The NVIDIA key was rejected" | `NVIDIA_API_KEY` is wrong or missing in Vercel. Redeploy after adding it. |
| "The model X is not available to your key" | You pinned `NVIDIA_MODEL` to an id that does not exist. Clear it, or copy an exact id from `/api/models`. |
| "Rate limited by NVIDIA" | Free tier limit. Wait a minute. |
| Sign in link goes to the wrong place | Supabase **Site URL** is not set to your Vercel URL. |
| Signed in but nothing syncs | The SQL from step 2.4 did not run. Check the `progress` table exists. |
| "Accounts are not switched on" | The two `VITE_SUPABASE_` variables are missing. They must be set at build time, so redeploy after adding them. |
