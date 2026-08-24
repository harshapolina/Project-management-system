# Cubic — UI Stitch Guide

Stitch / design-generation reference for the **Cubic** product UI (interior design & construction project management). Use this file to regenerate screens, flows, and components with consistent colors, layout, and navigation.

**Brand language source:** [`DESIGN.md`](./DESIGN.md) (emerald-on-white / near-black system)  
**Live tokens:** `client/src/index.css`  
**Routes:** `client/src/App.jsx`  
**Nav:** `client/src/components/layout/AppShell.jsx`

---

## 1. Product overview

Cubic is a **multi-tenant SaaS workspace** for studios running projects, BOQs, site updates, materials, revenue, and people.

| Surface | Tech | Default URL |
|---------|------|-------------|
| Web app | React + Vite + Tailwind | `http://localhost:5173` |
| API | Express + MongoDB | `http://localhost:5050` |
| Mobile | Expo / React Native | `http://localhost:8081` |
| Platform admin | Separate shell | `/platform/*` |

**Visual DNA (for generators):**
- Single chromatic accent: emerald green `#3ecf8e`
- Light theme default: soft grey canvas `#f4f4f5`, white surfaces `#ffffff`, near-black text `#18181b`
- Dark theme: near-black canvas `#0f0f0f`, raised surfaces `#181818` / `#1f1f1f`
- Primary CTA: filled emerald with **dark text** `#171717` (not white)
- Font: **Inter** (400 / 500 / 600 / 700)
- Radii: 6–12px (technical, not pill buttons)
- Chrome: left sidebar + top bar; content in padded main canvas

---

## 2. Color hex codes (canonical)

### 2.1 Brand & accent

| Token | Hex / value | Use |
|-------|-------------|-----|
| Emerald primary | `#3ecf8e` | CTA fill, tab underline, in-progress status, create button |
| Emerald deep / hover (light) | `#24b47e` | Hover / pressed CTA, completed status (light) |
| Emerald soft | `#4ade80` | Soft chart / accent (rare) |
| Emerald hover (dark) | `#34d399` | Dark-theme CTA hover, completed status (dark) |
| On primary (CTA text) | `#171717` | Text/icons on emerald buttons |
| Nav active wash (light) | `#ecfdf5` | Active sidebar item background |
| Nav active wash (dark) | `rgba(62, 207, 142, 0.12)` | Active sidebar item background |
| Nav active text (dark) | `#ecfdf5` | Active nav label on dark |

### 2.2 Light theme surfaces

| Token | Hex | Use |
|-------|-----|-----|
| Canvas | `#f4f4f5` | Main content background |
| Surface | `#ffffff` | Cards, panels, sidebar, top bar |
| Surface raised / muted | `#f4f4f5` | Nested panels, input chrome |
| Active / selected row | `#e4e4e7` | Pressed / selected chrome |
| Rail / sidebar | `#ffffff` | Left navigation |
| Shell hover | `#f4f4f5` | Nav / toolbar hover |
| Shell border | `#e4e4e7` | Dividers |
| Shell input | `#f4f4f5` | Search field bg |
| Border subtle | `#e4e4e7` | Default 1px borders |
| Border stronger | `#d4d4d8` | Emphasized borders |
| Scrollbar | `#d4d4d8` | Track thumb |
| Scrollbar hover | `#a1a1aa` | Thumb hover |

### 2.3 Light theme text

| Token | Hex | Use |
|-------|-----|-----|
| Text primary | `#18181b` | Headings, body |
| Text soft | `#3f3f46` | Strong secondary |
| Text secondary / shell | `#71717a` | Labels, muted nav |
| Text muted | `#a1a1aa` | Placeholders, meta |
| Create / CTA foreground | `#171717` | On emerald |

### 2.4 Dark theme surfaces

| Token | Hex / value | Use |
|-------|-------------|-----|
| Canvas | `#0f0f0f` | Main background |
| Surface / card | `#181818` | Panels, rows |
| Surface raised | `#1f1f1f` | Elevated panels, inputs |
| Active | `#262626` | Selected chrome |
| Muted | `#151515` | Recessed areas |
| Rail / sidebar | `#0c0c0c` | Left chrome |
| Border | `rgba(255,255,255,0.055)` | Hairlines |
| Border light | `rgba(255,255,255,0.08)` | Stronger hairlines |
| Shell hover | `rgba(255,255,255,0.06)` | Hover wash |
| Scrollbar | `#2a2a2a` / `#404040` | Track / hover |

### 2.5 Dark theme text

| Token | Hex | Use |
|-------|-----|-----|
| Text primary | `#f5f5f5` | Headings, body |
| Text soft | `#d4d4d4` | Strong secondary |
| Text secondary | `#a3a3a3` | Labels |
| Text muted | `#737373` | Meta / disabled |

### 2.6 Status colors

| Status | Light | Dark |
|--------|-------|------|
| Not started | `#a1a1aa` | `#737373` |
| In progress | `#3ecf8e` | `#3ecf8e` |
| On hold | `#eab308` | `#eab308` |
| Completed | `#24b47e` | `#34d399` |
| Delayed / danger | `#ef4444` | `#f87171` |

### 2.7 DESIGN.md marketing accents (charts / logos only — not system chrome)

| Name | Hex |
|------|-----|
| Accent purple | `#6b01c2` |
| Accent violet | `#644fc1` |
| Accent yellow | `#ffdb13` |
| Accent tomato | `#ff2201` |
| Accent pink | `#c7007e` |
| Accent indigo | `#054cff` |
| Accent crimson | `#e2005a` |
| Marketing ink | `#171717` |
| Marketing canvas | `#ffffff` |
| Marketing canvas soft | `#fafafa` |
| Marketing night | `#1c1c1c` |
| Hairline | `#dfdfdf` |
| Ink mute | `#707070` |

### 2.8 Stitch prompt color block (copy-paste)

```
Primary: #3ECF8E
Primary hover: #24B47E
CTA text on primary: #171717
Light canvas: #F4F4F5
Light surface: #FFFFFF
Light text: #18181B
Light muted text: #71717A
Light border: #E4E4E7
Dark canvas: #0F0F0F
Dark surface: #181818
Dark raised: #1F1F1F
Dark text: #F5F5F5
Success/complete: #24B47E
Warning/hold: #EAB308
Danger/delayed: #EF4444
Active nav wash: #ECFDF5
```

---

## 3. Typography & shape

| Role | Font | Size | Weight |
|------|------|------|--------|
| App body | Inter | 14px | 400 |
| UI label / button | Inter | 13–14px | 500 |
| Section title | Inter | 18–22px | 500–600 |
| Page title | Inter | 22–28px | 600 |
| Marketing display | Inter (Circular-like) | 36–64px | 500 |
| Letter spacing | — | body `-0.01em`; display tighter | |

| Radius | Value | Use |
|--------|-------|-----|
| xs | 4px | Chips, tight inputs |
| sm | 6px | Buttons, inputs (signature) |
| md | 8px | Small cards |
| lg | 12px | Cards, panels |
| xl | 16px | Modals |
| full | 9999px | Avatars only — not primary buttons |

---

## 4. App chrome (every authenticated page)

### Layout anatomy

```
┌────────────┬──────────────────────────────────────────┐
│  SIDEBAR   │  TOP BAR  (search · create · bell · user) │
│  logo      ├──────────────────────────────────────────┤
│  primary   │                                          │
│  nav       │           MAIN CANVAS (#f4f4f5)          │
│  items     │           padded content / PagePad        │
│            │                                          │
│  settings  │                                          │
│  theme     │                                          │
└────────────┴──────────────────────────────────────────┘
```

**Sidebar primary nav (capability-gated):**

| Label | Route | Capability |
|-------|-------|------------|
| Company | `/company-admin` | `companyAdmin` |
| Dashboard | `/portfolio` | `portfolio` |
| Projects | `/projects` | `projects` |
| New enquiries | `/leads` | `leads` |
| My work | `/?view=assigned` | `myWork` |
| BOQ / Quotes | `/boq` | `boq` |
| Materials | `/procurement` | `procurement` |
| Revenue | `/finance` | `finance` |
| Billing | `/billing` | `finance` |
| Inventory | `/inventory` | `inventory` |
| Site updates | `/site-feed` | `siteFeed` |
| Reports | `/reports` | `reports` |
| Impact Points | `/impact` | `impact` |

**Global chrome actions:** Global search (`⌘/Ctrl+K`), Create (project / space), Invite, Notifications → `/inbox`, Theme toggle, Settings, Logout.

**Stitch note:** Sidebar white (`#ffffff`) on light; active item `#ecfdf5` wash + dark label. Emerald only on Create CTA and active indicators.

---

## 5. Auth & entry flows

```mermaid
flowchart TD
  A[Visit app] --> B{/login or /platform/login}
  B -->|Staff/Company| C[Login: workspace + email + password]
  B -->|Platform| D[Platform login]
  C --> E{mustChangePassword?}
  E -->|yes| F[/settings]
  E -->|no| G{onboardingCompleted?}
  G -->|no| H[/onboarding]
  G -->|yes| I[homePathForUser]
  I -->|owner/admin| J[/company-admin]
  I -->|hr| K[/admin]
  I -->|site_supervisor| L[/mobile]
  I -->|platform admin only| M[/platform]
  I -->|everyone else| N[/ My work HomePage]
  D --> M
```

### Pages

| Route | Page | UI stitch brief |
|-------|------|-----------------|
| `/login` | Landing + login | Marketing white canvas, emerald CTA, workspace slug + email + password form. Sections: hero, features, why, pricing anchors. |
| `/register` | Register | Same chrome as auth; fields for new workspace / user. |
| `/forgot-password` | Forgot password | Minimal form; email → reset messaging. |
| `/platform/login` | Platform login | Darker / admin-leaning login for Editco platform admins. |
| `/onboarding` | Onboarding | Multi-step welcome; profile / prefs; completes → role home. |

**Guest-only:** logged-in users hitting `/login` redirect to role home.

---

## 6. Page-by-page stitch map (tenant app)

### 6.1 Home / My work — `/` and `/?view=assigned`

- **Purpose:** Personal work hub — assigned tasks, today’s focus, quick jump into projects.
- **Layout:** Full-width canvas under shell; filter chips / view toggle (`assigned`, etc.).
- **Key UI:** Task rows/cards, status pills (hex above), progress, open task → project tasks panel.
- **Flow:** My work → open task → `/projects/:id/tasks` (optional task deep-link).

### 6.2 Inbox — `/inbox` (`?tab=primary`)

- **Purpose:** Notifications + messages center (channels collapsed into inbox).
- **Layout:** List + detail / tabs (primary, etc.).
- **Flow:** Bell icon → Inbox → open entity (project / task / site).

### 6.3 Assigned comments — `/assigned-comments`

- **Purpose:** Comments assigned to the current user.
- **Layout:** List of comment threads with project context links.

### 6.4 Company admin — `/company-admin`

- **Who:** `owner`, `admin`.
- **Purpose:** Company ops dashboard — KPIs, shortcuts into inventory / people / projects.
- **Layout:** Metric cards on canvas, quick links, dense tables.
- **Flow:** Login (admin) → Company → drill to Inventory / People / Projects.

### 6.5 Dashboard (Portfolio) — `/portfolio`

- **Purpose:** Studio-level portfolio health across projects.
- **Layout:** Summary cards, project grid/list, stage badges, filters.
- **Flow:** Dashboard → project card → `/projects/:id/overview`.

### 6.6 Projects list — `/projects`

- **Purpose:** All accessible projects; create project (capability).
- **Layout:** Toolbar (search, filters, Create) + grid/list of project cards.
- **Flow:** Create project modal → open workspace `/projects/:id/overview`.

### 6.7 Project workspace — `/projects/:id/*`

Shared shell: breadcrumb + project title + horizontal **pills/tabs**.

| Tab | Route | Label | Content stitch |
|-----|-------|-------|----------------|
| overview | `.../overview` | Home | Project summary, stage, health, activity snapshot |
| tasks | `.../tasks` | Tasks | List/board of tasks; detail side panel; timer |
| procurement | `.../procurement` | Materials | Project-scoped materials / procurement |
| site | `.../site` | Site | Site updates, photos, feed for this project |
| notes | `.../notes` | Notes | Meeting notes |
| files | `.../files` | Drawings | File / drawing library |
| team | `.../team` | Team | Members, roles, invite (manage capability) |

**Redirects:** `board`, `gantt`, `calendar` → tasks; `activity` → overview; `boq` → `/boq/:projectId`.

**Flow:** Projects → Overview → Tasks → open TaskDetailPanel → update status / assign / timer.

### 6.8 New enquiries (Leads) — `/leads`

- **Purpose:** Lead / enquiry pipeline for new work.
- **Layout:** Kanban or table of leads; status columns; create / edit drawers.
- **Flow:** Lead won → convert / link to project (ops flow).

### 6.9 BOQ / Quotes — `/boq`, `/boq/:projectId`

- **Purpose:** Bill of quantities and quotations (top-level module).
- **Layout:** Project picker + spreadsheet-like BOQ lines, totals, quote actions.
- **Flow:** Project or BOQ nav → select project → edit lines → export / share quote.

### 6.10 Materials — `/procurement`

- **Purpose:** Company materials / procurement workspace.
- **Layout:** Catalog / requests / status tables; emerald primary actions.
- **Related:** Project tab Materials for project-scoped view.

### 6.11 Revenue (Finance) — `/finance`

- **Purpose:** Money in / out, revenue tracking for the studio.
- **Layout:** Summary KPIs, transaction tables, filters by project / period.

### 6.12 Billing — `/billing`

- **Purpose:** Invoices / billing documents tied to finance capability.
- **Layout:** Invoice list, status chips, create / send actions.

### 6.13 Inventory — `/inventory`, `/inventory/movements`

- **Who:** Company admins.
- **Purpose:** Stock levels and stock movements.
- **Layout:** Stock table; movements ledger on secondary route.
- **Flow:** Inventory → Movements → adjust stock.

### 6.14 Site updates — `/site-feed`

- **Purpose:** Cross-project site photo / update feed.
- **Layout:** Feed cards with images, captions, project tags; compose update.
- **Related:** Project Site tab; Mobile supervisor page.

### 6.15 Reports — `/reports`

- **Purpose:** Aggregated reporting (portfolio capability).
- **Layout:** Charts + tables; date range filters; export affordances.
- **Colors:** Emerald series + greys; status colors for delayed / complete.

### 6.16 Impact Points — `/impact`

- **Purpose:** Gamified leaderboard / points for team contribution.
- **Layout:** Ranked list, point totals, period filters, trophy accent.

### 6.17 People / Admin — `/admin`

- **Who:** admin, owner, hr (+ people capability).
- **Purpose:** Directory, invites, role / permission toggles.
- **Layout:** People table, invite modal, access toggles grouped (Projects / Tasks / Modules / Company).

### 6.18 Settings — `/settings`

- **Purpose:** Profile, password change, preferences, theme.
- **Flow:** Forced here when `mustChangePassword`.

### 6.19 Mobile supervisor (web) — `/mobile`

- **Who:** site supervisors (capability `mobile` / site).
- **Purpose:** Field-friendly site update UI in the web shell.
- **Layout:** Large touch targets, camera / upload first, reduced chrome density.

---

## 7. Platform admin (Editco) — `/platform/*`

Separate **PlatformShell** (not tenant AppShell).

| Route | Page |
|-------|------|
| `/platform` | Overview KPIs |
| `/platform/companies` | Tenant companies CRUD / control panel |
| `/platform/subscriptions` | Plans & subscriptions |
| `/platform/users` | Cross-tenant users |
| `/platform/features` | Feature flags / plans |
| `/platform/settings` | Platform settings |

**Stitch:** Same emerald accent; denser admin tables; companies panel includes invite + reset password.

---

## 8. Mobile app (Expo) stitch notes

| Area | Notes |
|------|-------|
| Auth | Workspace + email + password aligned with web |
| Tabs | Home / projects / more — capability aware |
| API | `EXPO_PUBLIC_API_URL` or LAN/`localhost:5050` via `mobile/src/constants/env.ts` |
| Theme | Match web light tokens; emerald `#3ecf8e` CTA with dark label |

---

## 9. End-to-end user flows (for generation)

### Flow A — Company admin day start
1. `/login` (workspace `cubic`, admin email)  
2. Land `/company-admin`  
3. Check KPIs → `/portfolio`  
4. Open project → Overview → Tasks  
5. `/inbox` for notifications  

### Flow B — Designer / PM execution
1. Login → `/` My work  
2. Complete assigned task  
3. Open `/projects/:id/files` for drawings  
4. Post `/site-feed` or project Site update  

### Flow C — Lead → quote → project
1. `/leads` create enquiry  
2. `/boq/:projectId` build quote  
3. `/projects` manage delivery  
4. `/finance` + `/billing` record payment  

### Flow D — Site supervisor field
1. Login → `/mobile` (or Expo app)  
2. Capture site photo → feed  
3. Update task status if assigned  

### Flow E — Platform operator
1. `/platform/login`  
2. `/platform/companies` → open company control  
3. Manage seats / features / users  

---

## 10. Component stitch recipes

### Primary button
- bg `#3ecf8e`, text `#171717`, radius `6px`, padding `8px 16px`, font 14/500  
- hover `#24b47e`

### Secondary button
- bg `#ffffff`, text `#18181b`, border `#d4d4d8`, radius `6px`

### Card / panel
- bg `#ffffff`, border `#e4e4e7`, radius `12px`, padding `16–32px`, on canvas `#f4f4f5`

### Input
- bg `#f4f4f5` or white, border `#e4e4e7`, radius `6px`, text `#18181b`, placeholder `#a1a1aa`

### Status pill
- Not started grey · In progress emerald · On hold `#eab308` · Done deep emerald · Delayed `#ef4444`  
- Micro type 12px, radius full, padding `2px 8px`

### Modal
- Overlay dark translucent; panel white (or `#181818` dark), radius `16px`, primary emerald confirm

---

## 11. Role → default home (quick reference)

| Role | Home path |
|------|-----------|
| owner / admin | `/company-admin` |
| hr | `/admin` |
| site_supervisor | `/mobile` |
| platform admin (non-tenant admin) | `/platform` |
| project_manager / designer / client / vendor | `/` (My work) |
| must change password | `/settings` |
| onboarding incomplete | `/onboarding` |

---

## 12. Generator prompt template (Google Stitch / AI UI)

Use this block when asking a model to generate a screen:

```
Product: Cubic — project management for interior design & construction.
Theme: light (default). Font: Inter.
Colors: canvas #F4F4F5, surface #FFFFFF, text #18181B, muted #71717A,
border #E4E4E7, primary #3ECF8E, primary-hover #24B47E, CTA text #171717,
active-nav #ECFDF5, danger #EF4444, warning #EAB308.
Layout: left sidebar + top bar + padded main. Button radius 6px, cards 12px.
Do NOT use purple as primary. Do NOT put white text on green buttons.
Page: [PAGE NAME] · Route: [ROUTE] · Role: [ROLE]
Include: [key widgets from section 6]
Flow context: [which flow A–E]
```

---

## 13. File map (implementation)

| Concern | Path |
|---------|------|
| CSS tokens | `client/src/index.css` |
| Brand DESIGN.md | `DESIGN.md` |
| Routes | `client/src/App.jsx` |
| Sidebar | `client/src/components/layout/AppShell.jsx` |
| Platform nav | `client/src/components/layout/PlatformShell.jsx` |
| Capabilities | `client/src/lib/roles.js` |
| Landing / login | `client/src/pages/auth/LandingLoginPage.jsx` |
| Project tabs | `client/src/pages/project/ProjectWorkspace.jsx` |

---

*Generated as the Stitch / UI generation source of truth for Cubic. Prefer live CSS tokens if this doc and `index.css` ever diverge.*
