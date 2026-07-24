# Deploy Cubic — Vercel (frontend) + Render (API)

This guide assumes the repo is on GitHub and MongoDB Atlas is already set up.

## 1. Prepare the repo

Push the latest code (including `client/vercel.json` and `render.yaml`) to GitHub.

## 2. Deploy the API on Render

1. Go to [https://dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**.
2. Connect your GitHub repo.
3. Settings:
   - **Root Directory:** `server`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add environment variables:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas URI (same as local) |
| `JWT_ACCESS_SECRET` | long random string (32+ chars) |
| `JWT_REFRESH_SECRET` | long random string (32+ chars) |
| `JWT_ACCESS_EXPIRES` | `15m` |
| `JWT_REFRESH_EXPIRES` | `7d` |
| `CLIENT_URL` | temporary: `http://localhost:5173` — **update after Vercel** |

5. Deploy. Copy the public URL, e.g. `https://cubic-api-xxxx.onrender.com`.
6. Open `https://cubic-api-xxxx.onrender.com/api/health` — should return `{ "ok": true, ... }`.

Optional: use **Blueprint** with the repo’s `render.yaml` (still set `MONGODB_URI` and `CLIENT_URL` manually).

### Atlas network

In MongoDB Atlas → **Network Access**, allow `0.0.0.0/0` (demo) or Render’s outbound IPs so the API can connect.

## 3. Deploy the frontend on Vercel

1. Go to [https://vercel.com](https://vercel.com) → **Add New Project** → import the same GitHub repo.
2. Settings:
   - **Root Directory:** `client`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Environment variables:

| Key | Value |
|-----|--------|
| `VITE_API_URL` | `/api` (recommended — Vercel proxies to Render, avoids CORS) |
| `VITE_GOOGLE_CLIENT_ID` | optional |

> Alternative: set `VITE_API_URL` to `https://cubic-project-management-system.onrender.com/api` and keep Render `CLIENT_URL` = your Vercel URL.

`client/vercel.json` already proxies `/api`, `/uploads`, and `/socket.io` to Render.

4. Deploy. Copy the Vercel URL, e.g. `https://cubic-xxxx.vercel.app`.

## 4. Sync CORS (`CLIENT_URL`)

1. Render → your service → **Environment**
2. Set `CLIENT_URL` to your Vercel URL exactly (no trailing slash):
   ```
   https://cubic-xxxx.vercel.app
   ```
   Multiple origins (preview + production):
   ```
   https://cubic-xxxx.vercel.app,https://cubic-xxxx-git-main-team.vercel.app
   ```
3. **Manual Deploy** → clear cache optional → redeploy the API.

Without this step, the browser will block API calls (CORS).

## 5. Google Calendar (optional)

In Google Cloud Console → OAuth Web client:

- **Authorized JavaScript origins:** your Vercel URL
- **Authorized redirect URIs:** `https://cubic-api-xxxx.onrender.com/api/calendar/google/callback`

Match `GOOGLE_*` env vars on Render.

## 6. Smoke test

- [ ] Open Vercel URL → register / login
- [ ] Create a space + project + task
- [ ] Upload a file under **Files** (thumbnail should load from Render `/uploads`)
- [ ] Send an inbox / channel message
- [ ] Hard refresh — session still works

## Important: uploads on Render

Uploaded files live on the Render instance disk. On the **free** plan that disk is **ephemeral** — files can disappear after a redeploy. Fine for demos; for production later, move to Cloudinary or S3.

## Free-tier cold starts

Render free services sleep after idle. The first request after sleep can take ~30–60s. Keep the tab open or upgrade if you need always-on.

## Local vs production URLs

| | Local | Production |
|--|--------|------------|
| App | `http://localhost:5173` | `https://….vercel.app` |
| API | `http://localhost:5000/api` | `https://….onrender.com/api` |
| Uploads | proxied via Vite | `https://….onrender.com/uploads/…` |
