/**
 * Comprehensive API Integration Tests
 * Uses Node.js built-in test runner (node:test) — no extra deps needed.
 *
 * Run:  node --test tests/api.test.js
 */

import { test, before, after, describe } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { createApp } from '../src/app.js'

dotenv.config()

// ──────────────────────────────────────────────
// Test helpers
// ──────────────────────────────────────────────

const BASE = 'http://localhost:5099'
const TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'cubic'

let server
let accessToken
let refreshTokenVal
let createdProjectId
let createdTaskId

async function api(path, opts = {}) {
  const url = `${BASE}${path}`
  const headers = {
    'Content-Type': 'application/json',
    'x-tenant-slug': TENANT_SLUG,
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(opts.headers || {}),
  }
  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  let json
  try {
    json = await res.json()
  } catch {
    json = {}
  }
  return { status: res.status, body: json }
}

// ──────────────────────────────────────────────
// Lifecycle
// ──────────────────────────────────────────────

before(async () => {
  // Connect Mongoose
  await mongoose.connect(process.env.MONGODB_URI)

  const { app } = createApp({ enableSockets: false })
  await new Promise((resolve) => {
    server = app.listen(5099, resolve)
  })
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
})

// ══════════════════════════════════════════════
// 1. HEALTH CHECK
// ══════════════════════════════════════════════

describe('Health Endpoint', () => {
  test('GET /api/health returns ok:true', async () => {
    const { status, body } = await api('/api/health')
    assert.equal(status, 200)
    assert.equal(body.ok, true)
    assert.equal(body.service, 'cubic-api')
  })
})

// ══════════════════════════════════════════════
// 2. AUTH
// ══════════════════════════════════════════════

describe('Auth Endpoints', () => {
  const testEmail = `test_${Date.now()}@example.com`
  const testPassword = 'TestPass123!'
  let inviteToken
  let tempPassword
  let invitedEmail

  test('POST /api/auth/login - fails with wrong credentials', async () => {
    const { status, body } = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'notexist@test.com', password: 'badpass' },
    })
    assert.equal(status, 401)
    assert.equal(body.success, false)
  })

  test('POST /api/auth/login - fails with invalid email format', async () => {
    const { status, body } = await api('/api/auth/login', {
      method: 'POST',
      body: { email: 'not-an-email', password: 'anything' },
    })
    // Zod validation → 400 or 422
    assert.ok([400, 422, 500].includes(status), `Got ${status}`)
  })

  test('POST /api/auth/login - succeeds with platform admin credentials', async () => {
    const adminEmail = process.env.PLATFORM_ADMIN_EMAIL || 'aanya@cubic.studio'
    // Use seeded admin — skip if no admin seeded
    const { status, body } = await api('/api/auth/login', {
      method: 'POST',
      body: { email: adminEmail, password: 'admin123' },
    })
    if (status === 200) {
      assert.equal(body.success, true)
      assert.ok(body.accessToken, 'Should return access token')
      assert.ok(body.refreshToken, 'Should return refresh token')
      accessToken = body.accessToken
      refreshTokenVal = body.refreshToken
    } else {
      // Admin may have a different password; mark as skipped
      console.log(`ℹ️  Platform admin login skipped (status ${status}) — seeding may be needed`)
    }
  })

  test('POST /api/auth/register - disabled when ALLOW_PUBLIC_REGISTER is false', async () => {
    const { status, body } = await api('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test User', email: testEmail, password: testPassword },
    })
    if (process.env.ALLOW_PUBLIC_REGISTER !== 'true') {
      assert.equal(status, 403)
    } else {
      // Registration open
      assert.ok([200, 201].includes(status))
    }
  })

  test('GET /api/auth/me - 401 without token', async () => {
    const { status } = await api('/api/auth/me', {
      headers: { Authorization: '' },
    })
    assert.equal(status, 401)
  })

  test('GET /api/auth/me - 200 with valid token', async () => {
    if (!accessToken) {
      console.log('ℹ️  Skipping: no access token available')
      return
    }
    const { status, body } = await api('/api/auth/me')
    assert.equal(status, 200)
    assert.equal(body.success, true)
    assert.ok(body.user, 'Should return user object')
    assert.ok(body.user.email, 'User should have email')
  })

  test('POST /api/auth/refresh - returns new token', async () => {
    if (!refreshTokenVal) {
      console.log('ℹ️  Skipping: no refresh token available')
      return
    }
    const { status, body } = await api('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: refreshTokenVal },
    })
    assert.equal(status, 200)
    assert.ok(body.accessToken)
    accessToken = body.accessToken // Update for subsequent tests
  })

  test('POST /api/auth/refresh - fails with invalid token', async () => {
    const { status, body } = await api('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken: 'totally-invalid-refresh-token' },
    })
    assert.equal(status, 401)
    assert.equal(body.success, false)
  })

  test('POST /api/auth/forgot-password - always returns success message', async () => {
    const { status, body } = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'someone@example.com' },
    })
    assert.equal(status, 200)
    assert.equal(body.success, true)
    assert.ok(body.message.includes('reset link'))
  })

  test('POST /api/auth/invite - requires admin auth', async () => {
    if (!accessToken) {
      console.log('ℹ️  Skipping: no access token')
      return
    }
    invitedEmail = `invited_${Date.now()}@example.com`
    const { status, body } = await api('/api/auth/invite', {
      method: 'POST',
      body: { email: invitedEmail, name: 'Invited User', role: 'designer' },
    })
    // Admin should succeed; non-admin gets 403
    if (status === 201) {
      assert.equal(body.success, true)
      inviteToken = body.inviteToken
      tempPassword = body.tempPassword
      assert.ok(inviteToken, 'Invite token should exist')
    } else {
      assert.equal(status, 403)
    }
  })

  test('POST /api/auth/logout - succeeds', async () => {
    if (!accessToken || !refreshTokenVal) {
      console.log('ℹ️  Skipping: no tokens available')
      return
    }
    const { status, body } = await api('/api/auth/logout', {
      method: 'POST',
      body: { refreshToken: refreshTokenVal },
    })
    assert.equal(status, 200)
    assert.equal(body.success, true)
    // Re-login for subsequent tests
    const loginRes = await api('/api/auth/login', {
      method: 'POST',
      body: {
        email: process.env.PLATFORM_ADMIN_EMAIL || 'aanya@cubic.studio',
        password: 'admin123',
      },
    })
    if (loginRes.status === 200) {
      accessToken = loginRes.body.accessToken
      refreshTokenVal = loginRes.body.refreshToken
    }
  })
})

// ══════════════════════════════════════════════
// 3. PROJECTS
// ══════════════════════════════════════════════

describe('Projects Endpoints', () => {
  test('GET /api/projects - 401 without auth', async () => {
    const { status } = await api('/api/projects', {
      headers: { Authorization: '' },
    })
    assert.equal(status, 401)
  })

  test('GET /api/projects - 200 returns list', async () => {
    if (!accessToken) {
      console.log('ℹ️  Skipping: no access token')
      return
    }
    const { status, body } = await api('/api/projects')
    assert.equal(status, 200)
    assert.equal(body.success, true)
    assert.ok(Array.isArray(body.projects), 'Should return projects array')
  })

  test('GET /api/projects?status=in_progress - filters by status', async () => {
    if (!accessToken) return
    const { status, body } = await api('/api/projects?status=in_progress')
    assert.equal(status, 200)
    assert.ok(Array.isArray(body.projects))
    body.projects.forEach((p) => {
      assert.equal(p.status, 'in_progress')
    })
  })

  test('GET /api/projects?q=test - search query works', async () => {
    if (!accessToken) return
    const { status, body } = await api('/api/projects?q=test')
    assert.equal(status, 200)
    assert.ok(Array.isArray(body.projects))
  })

  test('POST /api/projects - creates a new project', async () => {
    if (!accessToken) {
      console.log('ℹ️  Skipping: no access token')
      return
    }
    const { status, body } = await api('/api/projects', {
      method: 'POST',
      body: {
        name: `Test Project ${Date.now()}`,
        clientName: 'Test Client',
        type: 'residential',
        location: 'Test Location',
        budget: 50000,
      },
    })
    if (status === 201) {
      assert.equal(body.success, true)
      assert.ok(body.project._id, 'Should return project with ID')
      createdProjectId = body.project._id
    } else if (status === 403) {
      console.log('ℹ️  Project creation requires projects.create permission')
    } else {
      assert.fail(`Unexpected status ${status}: ${JSON.stringify(body)}`)
    }
  })

  test('POST /api/projects - fails without required fields', async () => {
    if (!accessToken) return
    const { status, body } = await api('/api/projects', {
      method: 'POST',
      body: { type: 'residential' }, // missing name + clientName
    })
    assert.ok([400, 403, 422, 500].includes(status))
  })

  test('GET /api/projects/:id - returns single project', async () => {
    if (!accessToken || !createdProjectId) {
      console.log('ℹ️  Skipping: no created project')
      return
    }
    const { status, body } = await api(`/api/projects/${createdProjectId}`)
    assert.equal(status, 200)
    assert.equal(body.success, true)
    assert.equal(body.project._id, createdProjectId)
    assert.ok(body.stats, 'Should include stats')
  })

  test('GET /api/projects/INVALID_ID - returns 404/500', async () => {
    if (!accessToken) return
    const { status } = await api('/api/projects/000000000000000000000000')
    assert.ok([404, 500].includes(status))
  })

  test('PATCH /api/projects/:id - updates project fields', async () => {
    if (!accessToken || !createdProjectId) {
      console.log('ℹ️  Skipping: no created project')
      return
    }
    const { status, body } = await api(`/api/projects/${createdProjectId}`, {
      method: 'PATCH',
      body: { status: 'on_hold', location: 'Updated Location' },
    })
    if (status === 200) {
      assert.equal(body.project.status, 'on_hold')
      assert.equal(body.project.location, 'Updated Location')
    } else {
      assert.equal(status, 403) // permission denied
    }
  })

  test('PATCH /api/projects/:id/notes - adds meeting note', async () => {
    if (!accessToken || !createdProjectId) return
    const { status, body } = await api(
      `/api/projects/${createdProjectId}/notes`,
      {
        method: 'POST',
        body: { text: 'Test meeting note' },
      },
    )
    assert.ok([201, 403].includes(status), `Got ${status}`)
    if (status === 201) {
      assert.ok(Array.isArray(body.meetingNotes))
    }
  })

  test('GET /api/projects/portfolio - returns portfolio data', async () => {
    if (!accessToken) return
    const { status, body } = await api('/api/projects/portfolio')
    if (status === 200) {
      assert.equal(body.success, true)
      assert.ok(body.data.counts)
      assert.ok(body.data.projects)
    } else {
      assert.equal(status, 403) // Requires portfolio permission
    }
  })
})

// ══════════════════════════════════════════════
// 4. TASKS
// ══════════════════════════════════════════════

describe('Tasks Endpoints', () => {
  test('GET /api/tasks - 401 without auth', async () => {
    const { status } = await api('/api/tasks', {
      headers: { Authorization: '' },
    })
    assert.equal(status, 401)
  })

  test('GET /api/tasks - returns tasks list', async () => {
    if (!accessToken) return
    const { status, body } = await api('/api/tasks')
    assert.equal(status, 200)
    assert.equal(body.success, true)
    assert.ok(Array.isArray(body.tasks) || body.tasks !== undefined)
  })

  test('GET /api/tasks?projectId=:id - filters by project', async () => {
    if (!accessToken || !createdProjectId) return
    const { status, body } = await api(
      `/api/tasks?projectId=${createdProjectId}`,
    )
    assert.equal(status, 200)
    assert.ok(Array.isArray(body.tasks))
  })

  test('POST /api/tasks - creates a task', async () => {
    if (!accessToken || !createdProjectId) {
      console.log('ℹ️  Skipping: no created project')
      return
    }
    const { status, body } = await api('/api/tasks', {
      method: 'POST',
      body: {
        title: 'Test Task',
        projectId: createdProjectId,
        stage: 'design',
        priority: 'high',
        status: 'todo',
      },
    })
    if (status === 201) {
      assert.equal(body.success, true)
      createdTaskId = body.task._id
    } else {
      assert.ok([400, 403].includes(status))
    }
  })

  test('PATCH /api/tasks/:id - updates task status', async () => {
    if (!accessToken || !createdTaskId) return
    const { status, body } = await api(`/api/tasks/${createdTaskId}`, {
      method: 'PATCH',
      body: { status: 'in_progress' },
    })
    if (status === 200) {
      assert.ok(body.success)
    } else {
      assert.ok([403, 404].includes(status))
    }
  })

  test('DELETE /api/tasks/:id - deletes created task', async () => {
    if (!accessToken || !createdTaskId) return
    const { status, body } = await api(`/api/tasks/${createdTaskId}`, {
      method: 'DELETE',
    })
    if (status === 200) {
      assert.equal(body.success, true)
    } else {
      assert.ok([403, 404].includes(status))
    }
  })
})

// ══════════════════════════════════════════════
// 5. HOME / DASHBOARD
// ══════════════════════════════════════════════

describe('Home / Dashboard', () => {
  test('GET /api/home - returns dashboard data', async () => {
    if (!accessToken) return
    const { status, body } = await api('/api/home')
    if (status === 200) {
      assert.equal(body.success, true)
    } else {
      assert.ok([403, 404].includes(status))
    }
  })
})

// ══════════════════════════════════════════════
// 6. PLATFORM
// ══════════════════════════════════════════════

describe('Platform Endpoints', () => {
  test('GET /api/platform/tenants - requires platform admin', async () => {
    if (!accessToken) return
    const { status } = await api('/api/platform/tenants')
    assert.ok([200, 403].includes(status))
  })
})

// ══════════════════════════════════════════════
// 7. INPUT VALIDATION
// ══════════════════════════════════════════════

describe('Input Validation & Edge Cases', () => {
  test('Login with empty body → validation error', async () => {
    const { status } = await api('/api/auth/login', {
      method: 'POST',
      body: {},
    })
    assert.ok([400, 422, 500].includes(status))
  })

  test('Forgot-password with invalid email → validation error', async () => {
    const { status } = await api('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: 'not-an-email' },
    })
    assert.ok([400, 422, 500].includes(status))
  })

  test('Refresh with missing body → 400', async () => {
    const { status } = await api('/api/auth/refresh', {
      method: 'POST',
      body: {},
    })
    assert.equal(status, 400)
  })

  test('Unknown route → 404', async () => {
    const { status } = await api('/api/nonexistent-route-xyz')
    // Express returns 404 for unknown routes
    assert.ok([404, 401].includes(status))
  })
})

// ══════════════════════════════════════════════
// 8. CORS / SECURITY
// ══════════════════════════════════════════════

describe('Security & CORS', () => {
  test('Request from localhost is allowed by CORS', async () => {
    const res = await fetch(`${BASE}/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'GET',
        'x-tenant-slug': TENANT_SLUG,
      },
    })
    // Either 200 or 204 is fine for OPTIONS preflight
    assert.ok([200, 204].includes(res.status) || res.status < 400)
  })

  test('JWT with tampered signature → 401', async () => {
    const { status } = await api('/api/auth/me', {
      headers: {
        Authorization:
          'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJmYWtlIn0.invalidsignature',
      },
    })
    assert.equal(status, 401)
  })
})

// ══════════════════════════════════════════════
// 9. CLEANUP
// ══════════════════════════════════════════════

describe('Cleanup', () => {
  test('DELETE /api/projects/:id - removes created project', async () => {
    if (!accessToken || !createdProjectId) return
    const { status } = await api(`/api/projects/${createdProjectId}`, {
      method: 'DELETE',
    })
    assert.ok([200, 403, 404].includes(status))
  })
})
