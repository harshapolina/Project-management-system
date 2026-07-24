# Cubic

Premium dark-themed project management for interior design & construction firms.

**Stack:** React (Vite) + Tailwind · Express · MongoDB · JWT · Socket.IO

## Monorepo

```
/client   React app (Vite + Tailwind + React Query + Zustand)
/server   Express API (Mongoose + JWT + Socket.IO)
```

## Setup

```bash
npm run install:all
```

1. Copy `.env.example` → `server/.env` and set `MONGODB_URI`
2. Seed demo data:

```bash
npm run seed
```

3. Start both apps:

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:5000  
- UI Kit (review design system): http://localhost:5173/ui-kit  

## Demo logins

Password for all: `demo1234`

| Role | Email |
|------|-------|
| Admin | aanya@cubic.studio |
| Project Manager | rohan@cubic.studio |
| Designer | maya@cubic.studio |
| Site Supervisor | vikram@cubic.studio |
| Client | priya@client.com |

## Deploy (Vercel + Render)

Full checklist: **[DEPLOY.md](DEPLOY.md)**

- Frontend → **Vercel** (`client/`, set `VITE_API_URL`)
- API → **Render** (`server/`, set `MONGODB_URI`, `CLIENT_URL`, JWT secrets)
- Database → **MongoDB Atlas**

After Vercel gives you a URL, set Render `CLIENT_URL` to that URL and redeploy the API once (CORS).

## Current progress

- [x] Monorepo scaffold
- [x] Design system + shared UI library
- [x] Auth (login / register / forgot password / onboarding)
- [x] Home / My Work (real API + optimistic task toggle)
- [x] Spaces, Projects, Board/List, BOQ, Files, Channels, Inbox
- [x] Deploy configs (Vercel + Render)
