# Deploying Pixel Academy for free, on your own domain

This runs the app on entirely free tiers: **Render** (backend API), **Neon**
(Postgres), **Upstash** (Redis), **Cloudflare R2** (file storage), and
**Cloudflare Pages** (frontend). Total cost: **$0/month** for low traffic.

**Honest tradeoffs of free tiers:**
- Render's free web service **sleeps after ~15 minutes of inactivity** — the
  first request after a sleep takes ~20–30 seconds to wake up. Fine for
  internal/early use, not for a customer-facing app that needs instant response.
- Neon and Upstash free tiers cap storage/throughput — plenty for early use,
  not for scale.
- No managed backups beyond what each free tier includes by default.

When you outgrow this, the same Render/Neon/Upstash services have paid tiers
you can upgrade individually — nothing here is a dead end.

---

## What you'll create (all free, ~45–60 minutes total)

1. A Neon Postgres database
2. An Upstash Redis database
3. A Cloudflare R2 bucket (file storage) + API token
4. A Render web service (the backend API) — using `render.yaml` in this repo
5. A Cloudflare Pages project (the frontend) — pointed at `apps/web`
6. DNS records on your existing domain

---

## 1. Database — Neon

1. Sign up at [neon.tech](https://neon.tech) (free, no card required).
2. Create a project (any region close to your users — Singapore is closest to India).
3. On the project dashboard, copy the **pooled connection string**. It looks like:
   `postgresql://USER:PASSWORD@HOST.neon.tech/DBNAME?sslmode=require`
4. Save this — it's your `DATABASE_URL`.

The app's first database migration automatically enables the Postgres
extensions it needs (`citext`, `vector`, `pgcrypto`) — Neon supports all three,
no manual setup required.

## 2. Redis — Upstash

1. Sign up at [upstash.com](https://upstash.com) (free).
2. Create a Redis database (any region).
3. Copy the **`rediss://` connection string** (the TLS one, not the REST API URL).
4. Save this — it's your `REDIS_URL`.

## 3. File storage — Cloudflare R2

1. Sign up / log into [Cloudflare](https://dash.cloudflare.com) (free).
2. Go to **R2 Object Storage** → Create bucket. Name it `pixel-academy`.
3. Go to **R2 → Manage API tokens** → create a token with read/write access to
   that bucket. Save the **Access Key ID** and **Secret Access Key**.
4. Note your **Account ID** (shown on the R2 overview page) — your S3 endpoint is:
   `https://ACCOUNT_ID.r2.cloudflarestorage.com`

## 4. Backend API — Render

1. Push this repo to GitHub if it isn't already (`git remote add origin ...`,
   `git push -u origin main`).
2. Sign up at [render.com](https://render.com) (free, GitHub login is easiest).
3. **New +** → **Blueprint** → connect your GitHub repo. Render detects
   `render.yaml` at the repo root and proposes the `pixel-academy-api` service.
4. Before deploying, Render will prompt you to fill in the env vars marked
   blank in `render.yaml`. Use `apps/backend/.env.production.example` as your
   reference for every value:
   - `DATABASE_URL` → from step 1
   - `REDIS_URL` → from step 2
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` → run `openssl rand -base64 48`
     locally twice, once for each (they must differ)
   - `WEB_ORIGIN` → your future live frontend URL, e.g. `https://yourdomain.com`
     (you can update this after step 5 once you know the final domain)
   - `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` → from step 3
   - `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` → your real admin login;
     change the password immediately after first login
5. Deploy. Render will install, build, run `prisma migrate deploy` (creating
   all tables), and start the API. Watch the build logs — if `DATABASE_URL` or
   secrets are wrong, it fails fast and tells you which.
6. Once live, note the service URL, e.g. `https://pixel-academy-api.onrender.com`.
   Visit `<that-url>/health` — you should see `{"status":"ok",...}`.
7. **Seed initial data** (roles, permissions, your admin user): in the Render
   dashboard, open the service's **Shell** tab and run:
   ```
   npm run db:seed -w @pixel/backend
   ```

## 5. Frontend — Cloudflare Pages

1. In the Cloudflare dashboard: **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git** → select this repo.
2. Build settings:
   - **Root directory**: `apps/web`
   - **Build command**: `npm install --prefix ../.. && npm run build:shared --prefix ../.. && npm run build`
   - **Build output directory**: `dist`
3. Add an environment variable (Production): `VITE_API_URL` = your Render API
   URL from step 4.6 (e.g. `https://pixel-academy-api.onrender.com`).
4. Deploy. Cloudflare gives you a `*.pages.dev` URL first — confirm the app
   loads and you can log in with your seed admin credentials.

## 6. Point your domain at it

You only need DNS changes — no hosting transfer.

1. **Frontend** (`yourdomain.com`): in Cloudflare Pages, go to the project →
   **Custom domains** → add your domain. If your domain's nameservers are
   already on Cloudflare, this is one click. If not, Cloudflare gives you a
   CNAME record to add at your current DNS provider (wherever you bought the
   domain) — add it there.
2. **Backend** (optional custom subdomain, e.g. `api.yourdomain.com`): in
   Render, go to the service → **Settings** → **Custom Domains** → add
   `api.yourdomain.com`, then add the CNAME record Render shows you at your
   DNS provider.
3. Update `WEB_ORIGIN` on Render (step 4.4) to your final `https://yourdomain.com`
   if you didn't know it yet, and `VITE_API_URL` on Cloudflare Pages to
   `https://api.yourdomain.com` if you set up the custom API subdomain. Redeploy
   both after changing.
4. DNS propagation: usually minutes, sometimes up to ~24h.

---

## After it's live

- **Log in** with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` and change the
  password immediately (Users page → your own profile, once that flow exists,
  or via the API).
- **Keep secrets out of git** — `.env.production.example` is a template only;
  never commit real secrets.
- **Cold starts**: if the free Render tier's sleep/wake delay becomes a
  problem, upgrading just that one service to Render's paid tier ($7/mo)
  removes it — nothing else changes.
