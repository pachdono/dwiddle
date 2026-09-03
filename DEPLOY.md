# Deploying Dwiddle

Three things to set up, in this order. Supabase first, because Vercel needs two
values from it.

The whole thing runs on free tiers.

---

## 1. Model provider key

The key that generates questions and marks writing.

Any one of these works. If several are set, they are used in this order:
Groq, then OpenRouter, then NVIDIA.

**Groq** is free and by far the fastest. https://console.groq.com/keys, sign
in, **Create API Key**. It starts with `gsk_`. Set it as `GROQ_API_KEY`.

**OpenRouter** has the widest catalogue and free models.
https://openrouter.ai/keys, **Create key**, starts with `sk-or-`. Set it as
`OPENROUTER_API_KEY`.

The app also supports a free NVIDIA key from https://build.nvidia.com as a
fallback, but that tier limits an account to a couple of models and they are
often overloaded, so generation fails with "the free model service is busy".
If both keys are set, OpenRouter is used.

**You do not need to choose a model.** The server asks the provider which
models the key can use and works down a preference list until one answers.
After deploying you can see the list, and which one it settled on, at
`/api/models`. Add `?probe=1` to actually call the top few and see which
respond and how fast.

**Do not put this key anywhere in the code, and do not paste it into a chat.**
It only ever goes in Vercel's environment variables, where the browser cannot
reach it.

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
   - **Project URL**, which looks like `https://abcdefghijklmnop.supabase.co`
   - **anon public** key

   Do not use the address of the dashboard page you are looking at. The
   dashboard lives at `https://supabase.com/dashboard/project/<ref>` and the
   API is at `https://<ref>.supabase.co`. Pasting the first is the single
   easiest mistake here: everything builds, and every request quietly fails.
6. Optional: to offer **Continue with Google**, go to **Authentication**,
   **Providers**, and enable **Google**. It needs an OAuth client from the
   Google Cloud console, and Supabase shows you the callback URL to paste
   there. Until it is enabled the app hides the button and offers the email
   link only, so nothing is broken by leaving it off.

7. Go to **Authentication**, then **URL Configuration**. Set **Site URL** to
   your Vercel URL, and under **Redirect URLs** add `https://your-site.vercel.app/**`.
   Sign in links are refused with "requested path is invalid" until the site is
   on that allow list, and the same applies to Google. Until then
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
   | `GROQ_API_KEY` | your `gsk_...` key | server only, or use `OPENROUTER_API_KEY` |
   | `VITE_SUPABASE_URL` | Project URL from step 2.5 | must be `https://<ref>.supabase.co` |
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
| "The API key was rejected" | The provider key is wrong or missing in Vercel. Redeploy after adding it. |
| "The model X is not available to your key" | You pinned `NVIDIA_MODEL` to an id that does not exist. Clear it, or copy an exact id from `/api/models`. |
| "The free model service is busy" | Provider capacity, not configuration. On the NVIDIA free tier this is common; switch to OpenRouter. |
| Sign in link goes to the wrong place | Supabase **Site URL** is not set to your Vercel URL. |
| Signed in but nothing syncs | The SQL from step 2.4 did not run. Check the `progress` table exists. |
| "Accounts are not switched on" | The two `VITE_SUPABASE_` variables are missing. They must be set at build time, so redeploy after adding them. |
| `{"error":"requested path is invalid"}` when opening the sign in link, or after Google | The site is not in Supabase's **Redirect URLs** allow list. Authentication, URL Configuration, add `https://your-site.vercel.app/**`. This affects the email link and OAuth equally. |
| "Unsupported provider: provider is not enabled" | Google is not enabled under Authentication, Providers. The app hides the button once it can see that, so this only appears on an old build. |
| Sign in does nothing, no error | `VITE_SUPABASE_URL` is probably the dashboard link. It must be `https://<ref>.supabase.co`. Check the browser console for a warning naming the correct value. |
