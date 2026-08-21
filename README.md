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
2. Seed demo data (wipes DB — local only):

```bash
cd server && npm run seed
```

Or **upsert mock credentials + sample data** without wiping (safe for Atlas):

```bash
cd server && npm run seed:mocks
```

3. Start both apps:

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:5000  
- UI Kit (review design system): http://localhost:5173/ui-kit  

## Demo logins

Workspace slug: `cubic`

| Role | Email | Password |
|------|-------|----------|
| Company Admin (login page) | admin@cubic.demo | Company@Admin123 |
| Employee / PM (login page) | employee@cubic.demo | Employee@Demo123 |
| Owner | owner@cubic.demo | Company@Owner123 |
| HR | hr@cubic.demo | Company@HR123 |
| Designer | maya@cubic.studio | demo1234 |
| Site Supervisor | vikram@cubic.studio | demo1234 |
| Client | priya@client.com | demo1234 |
| Platform Admin | editcomedia@gmail.com | DTH@editco |

## Deploy (Vercel)

Full checklist: **[DEPLOY.md](DEPLOY.md)**

- Frontend → **Vercel** (`client/`, `VITE_API_URL=/api`)
- API → **Vercel** (`server/`, set `MONGODB_URI`, `CLIENT_URL`, JWT secrets)
- Database → **MongoDB Atlas**

API production URL: `https://project-management-system-msmw.vercel.app`

## Current progress

- [x] Monorepo scaffold
- [x] Design system + shared UI library
- [x] Auth (login / register / forgot password / onboarding)
- [x] Home / My Work (real API + optimistic task toggle)
- [x] Spaces, Projects, Board/List, BOQ, Files, Channels, Inbox
- [x] Deploy configs (Vercel frontend + API)
