# Security notes

What is protected, what is not, and why.

## Keys

`OPENROUTER_API_KEY`, `GROQ_API_KEY`, `NVIDIA_API_KEY` and `ADMIN_TOKEN` are
read only by the functions in `api/`, which run on the server. They are never
imported into `src/`, so they cannot reach the browser. Verified against the
deployed bundle: no provider key appears in it.

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are in the bundle on purpose.
The anon key identifies the project and grants nothing on its own. What
protects the data is row level security, below. The service role key must never
be used in this app.

No key has ever been committed. `.env` and `.env.local` are ignored, and only
`.env.example`, which holds no values, is tracked.

## Database

`supabase/schema.sql` enables row level security on both tables and restricts
every row to `auth.uid() = user_id`, for select, insert, update and delete.
Without those policies the anon key would read every row.

`user_count()` is `security definer` so it can count rows the caller cannot
see. It returns a single number and nothing else, and execute is granted only
to `anon` and `authenticated`.

All queries go through the Supabase client, which parameterises them. No SQL is
built by string concatenation anywhere.

## The AI endpoints

Every call spends real quota, so `/api/generate`, `/api/testgen` and
`/api/grade` are gated by `api/_guard.js`:

- POST only
- Origin or Referer must be this site or localhost, which stops another site
  driving them from a visitor's browser
- Rate limited per address, 6 a minute for generation and grading, 10 for
  question writing

`/api/models`, and the `?debug=1` view that returns raw model output, require
`ADMIN_TOKEN` and return 404 without it. The probe calls every candidate model,
so leaving it open would let anyone spend the quota.

**Known limit.** Rate limiting counts per serverless instance, in memory, so
the effective limit across many instances is higher than the number suggests,
and `Origin` can be forged by anything that is not a browser. This stops casual
abuse and runaway loops. It is not a defence against a determined distributed
attacker. If that becomes a concern, require a signed in Supabase session on
these endpoints and check the JWT server side.

**Spending.** There is no spend cap in the code because the provider owns that.
Set one on the provider: OpenRouter has credit limits per key, Groq has a free
tier that stops rather than bills. Do that as well as the rate limits here.

## The browser

React escapes everything it interpolates, and `dangerouslySetInnerHTML`,
`innerHTML`, `eval` and `new Function` appear nowhere in the source, so model
output and user notes cannot execute as markup.

Uploaded files never leave the browser. PDFs are parsed locally by pdf.js and
only the extracted text is sent. Files are capped at 20 MB and limited to PDF,
TXT and Markdown, checked when the file is chosen and again before reading.

Sessions are held by the Supabase client in local storage rather than cookies,
so there is no cookie for another site to send: CSRF does not apply to the
authenticated calls. The AI endpoints carry no credentials at all, which is why
they are protected by origin and rate limits instead.

## Headers

Set in `vercel.json` for every response: `Content-Security-Policy` limiting
scripts to this origin and connections to this origin and Supabase,
`X-Frame-Options: DENY` and `frame-ancestors 'none'`, `X-Content-Type-Options:
nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a
`Permissions-Policy` denying camera, microphone and location, and
`Cross-Origin-Opener-Policy: same-origin`. Responses under `/api` are
`no-store`.

HTTPS is enforced by the host, which answers plain HTTP with a 308 redirect and
sends `Strict-Transport-Security` with a two year max age and preload.

## Prompt injection

Notes and PDFs are third party text handed to a model. The model is asked for
JSON, and every field that comes back is validated before use: questions must
have a prompt and at least two choices, the answer index is bounds checked and
falls back to 0, and everything is coerced to a string. Malformed entries are
dropped rather than rendered. A model persuaded to write nonsense can therefore
produce bad questions, but it cannot reach the database or the DOM.

## Not done

- No server side verification of the Supabase session on the AI endpoints, so
  they are open to anyone on the site rather than to signed in users only
- No audit log of who generated what
- Nothing detects a shared or leaked `ADMIN_TOKEN`; rotate it by changing the
  environment variable
