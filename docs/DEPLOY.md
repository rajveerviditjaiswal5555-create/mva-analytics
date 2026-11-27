# Getting a public HTTPS link (with MVA in the name)

The project includes ready-to-use deployment files. Deploying to Render gives you:

```
https://mva-analytics.onrender.com
```

A valid HTTPS certificate is issued automatically, so there is no "Your connection is not private" warning.

## Prerequisites

- **Git** — install with `winget install --id Git.Git` if `git --version` fails.
- A free **GitHub** account.
- A free **Render** account (sign up with GitHub at https://render.com).

## Steps

1. Create an empty GitHub repository named `mva-analytics`.

2. In this project folder:
   ```powershell
   git init
   git add .
   git commit -m "Macro Vision Academy Analytics Platform"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/mva-analytics.git
   git push -u origin main
   ```

3. In Render: **New + → Blueprint** → choose the `mva-analytics` repository → **Apply**.
   `render.yaml` defines the service name (`mva-analytics`), the Dockerfile build, the health check, the `ALLOWED_ORIGINS` value, and a free **PostgreSQL database** (`mva-db`) whose connection string is injected as `DATABASE_URL`.

4. Wait for the build (about 5 minutes). Open `https://mva-analytics.onrender.com`.

5. Log in with a real account you create in the Admin Panel. **Change the default demo passwords before going public.**

## Deploying from the command line

Create `render-deploy.env` in the project root (it is gitignored):
```
RENDER_API_KEY=rnd_...
RENDER_SERVICE_ID=srv_...
```
Then run:
```powershell
.\scripts\deploy_render.ps1 -Wait
```
It triggers a deploy and polls until the service is live. The Render API key is created in Render → Account Settings → API Keys; the service ID is in the dashboard URL (`.../web/srv_XXXX`).

## Troubleshooting "Blueprint file render.yaml not found on main branch"

This means your GitHub repository does **not** contain `render.yaml`. The file exists in the project folder, but it was never pushed. Check:

1. Open your repository on github.com → make sure `render.yaml` is listed at the root.
2. Make sure the branch shown in Render is exactly `main` (`git branch -M main`).
3. Make sure you created the GitHub repository **empty** (no README, license or `.gitignore`), otherwise the first push is rejected.
4. Make sure you ran the commands **inside this project folder**, not in a parent folder.

Easiest fix — run the helper script from this folder:
```powershell
.\deploy.ps1 https://github.com/YOUR-USERNAME/mva-analytics.git
```
It initialises Git, commits everything, sets `main`, adds the remote and pushes. If a push is rejected because the repo already has a README, delete that repo and recreate it completely empty, then run the script again.

## Useful page links once deployed

```
https://mva-analytics.onrender.com/#/dashboard
https://mva-analytics.onrender.com/#/geography
https://mva-analytics.onrender.com/#/forecast
https://mva-analytics.onrender.com/#/simulator
https://mva-analytics.onrender.com/#/admin
```

## Hardening before real use

1. **Change default passwords** — log in as `superadmin`, go to **Admin → Users**, create your real accounts, then disable/delete the four demo users.
2. **`SECRET_KEY`** — `render.yaml` uses `generateValue: true`, so a random secret is created automatically. You can override it with your own long random string in Render → Environment.
3. **AI assistant** — add `AI_API_KEY` in Render → Environment (the value is marked `sync: false` in `render.yaml`, so it is never stored in Git). `AI_BASE_URL` defaults to Groq and `AI_MODEL` to `qwen/qwen3.8-27b`. The key is only used server-side; the browser never sees it.
4. **Security headers** — `backend/main.py` adds CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` and HSTS on HTTPS automatically.
5. **Revoke deployment tokens** — delete any Personal Access Token from https://github.com/settings/tokens after deployment. Also rotate the Groq key if it was ever pasted into a chat or shared.

## Always-on and custom domain

- **Always-on:** in `render.yaml` change `plan: free` → `plan: starter` and push, or change the plan in the Render dashboard. The free tier sleeps after ~15 minutes idle.
- **Custom domain:** buy a domain (e.g. `analytics.yourschool.in`), then in Render → your service → **Settings → Custom Domain → Add Custom Domain**, enter the hostname, and add the CNAME record your registrar asks for. Render issues a free SSL certificate automatically. Update `ALLOWED_ORIGINS` in Render → Environment to include `https://analytics.yourschool.in`.

## Notes

- **Free tier sleeps** after ~15 minutes of inactivity; the first request after sleep can take 20–30 seconds. Upgrade to a paid plan for always-on.
- **Data persistence:** the blueprint provisions a free Postgres database and injects `DATABASE_URL`, so official uploads survive redeploys. If your service was created before this change, add a Postgres database in Render manually and set `DATABASE_URL` in Environment, then redeploy. Without it, the SQLite file inside the container is ephemeral and demo data regenerates.
- To use your own purchased domain (e.g. `mva.yourschool.in`), add it under Render → *Settings → Custom Domain* and add the CNAME record your registrar asks for. Render issues a new certificate automatically.
- Alternative host: Railway detects `railway.json`/`Procfile` and uses the same `$PORT` start command, giving `https://mva-analytics.up.railway.app`.

## Why tunnels were not used

Quick tunnel services (localtunnel, localhost.run) can give a name containing MVA, but they depend on outbound SSH/HTTPS access from the development machine and their free subdomains are unstable. A real host gives a permanent, reliable URL.
