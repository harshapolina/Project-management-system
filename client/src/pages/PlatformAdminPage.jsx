import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus, Users } from 'lucide-react'
import { api, useAuthStore } from '../lib/api'
import { InviteDetailsModal } from '../components/layout/GlobalChrome'
import { Button, Card, Input, Select, toast } from '../components/ui'

export function PlatformAdminPage() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['platform-tenants'],
    queryFn: () => api('/platform/tenants'),
    enabled: !!user?.isPlatformAdmin,
  })

  const [form, setForm] = useState({
    name: '',
    slug: '',
    seatLimit: 30,
    adminName: '',
    adminEmail: '',
  })
  const [invite, setInvite] = useState({
    tenantId: '',
    name: '',
    email: '',
    role: 'project_manager',
  })
  const [details, setDetails] = useState(null)

  const createTenant = useMutation({
    mutationFn: () =>
      api('/platform/tenants', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          seatLimit: Number(form.seatLimit) || 30,
          slug: form.slug.trim().toLowerCase(),
        }),
      }),
    onSuccess: (res) => {
      toast('Workspace created', { type: 'success' })
      setDetails({
        workspace: res.tenant.slug,
        email: res.admin.email,
        tempPassword: res.tempPassword,
        loginUrl: window.location.origin + '/login',
      })
      setForm({
        name: '',
        slug: '',
        seatLimit: 30,
        adminName: '',
        adminEmail: '',
      })
      qc.invalidateQueries({ queryKey: ['platform-tenants'] })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  const inviteUser = useMutation({
    mutationFn: () =>
      api(`/platform/tenants/${invite.tenantId}/users`, {
        method: 'POST',
        body: JSON.stringify({
          name: invite.name,
          email: invite.email,
          role: invite.role,
        }),
      }),
    onSuccess: (res) => {
      toast('User added', { type: 'success' })
      setDetails({
        workspace: data?.tenants?.find((t) => t._id === invite.tenantId)?.slug,
        email: res.user.email,
        tempPassword: res.tempPassword,
        loginUrl: window.location.origin + '/login',
      })
      setInvite((s) => ({ ...s, name: '', email: '' }))
      qc.invalidateQueries({ queryKey: ['platform-tenants'] })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  if (!user?.isPlatformAdmin) {
    return <Navigate to="/" replace />
  }

  const tenants = data?.tenants || []
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="mb-1 text-sm text-secondary">EPM · Editco platform</p>
        <h1 className="text-[28px] font-semibold tracking-tight">
          Workspaces
        </h1>
        <p className="mt-1 text-sm text-secondary">
          Create companies and provision their first workspace users.
        </p>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Building2 className="h-4 w-4" />
          New workspace
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Company name"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          />
          <Input
            label="Slug (subdomain)"
            placeholder="acme"
            value={form.slug}
            onChange={(e) =>
              setForm((s) => ({
                ...s,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
              }))
            }
          />
          <Input
            label="Seat limit"
            type="number"
            value={form.seatLimit}
            onChange={(e) =>
              setForm((s) => ({ ...s, seatLimit: e.target.value }))
            }
          />
          <Input
            label="First admin name"
            value={form.adminName}
            onChange={(e) =>
              setForm((s) => ({ ...s, adminName: e.target.value }))
            }
          />
          <Input
            label="First admin email"
            type="email"
            className="sm:col-span-2"
            value={form.adminEmail}
            onChange={(e) =>
              setForm((s) => ({ ...s, adminEmail: e.target.value }))
            }
          />
        </div>
        <Button
          onClick={() => createTenant.mutate()}
          loading={createTenant.isPending}
          disabled={!form.name || !form.slug || !form.adminName || !form.adminEmail}
        >
          <Plus className="mr-1 h-4 w-4" />
          Create workspace
        </Button>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Users className="h-4 w-4" />
          Add user to workspace
        </div>
        <Select
          label="Workspace"
          value={invite.tenantId}
          onChange={(e) =>
            setInvite((s) => ({ ...s, tenantId: e.target.value }))
          }
          options={[
            { value: '', label: 'Select…' },
            ...tenants.map((t) => ({
              value: t._id,
              label: `${t.name} (${t.slug})`,
            })),
          ]}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Name"
            value={invite.name}
            onChange={(e) => setInvite((s) => ({ ...s, name: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={invite.email}
            onChange={(e) =>
              setInvite((s) => ({ ...s, email: e.target.value }))
            }
          />
          <Select
            label="Role"
            value={invite.role}
            onChange={(e) => setInvite((s) => ({ ...s, role: e.target.value }))}
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'owner', label: 'Owner' },
              { value: 'project_manager', label: 'Project manager' },
              { value: 'designer', label: 'Designer' },
              { value: 'site_supervisor', label: 'Site supervisor' },
              { value: 'client', label: 'Client' },
              { value: 'vendor', label: 'Vendor' },
            ]}
          />
        </div>
        <Button
          onClick={() => inviteUser.mutate()}
          loading={inviteUser.isPending}
          disabled={!invite.tenantId || !invite.name || !invite.email}
        >
          Add user
        </Button>
      </Card>

      <Card className="space-y-2">
        <p className="font-semibold">All workspaces</p>
        {isLoading && (
          <p className="text-sm text-secondary">Loading…</p>
        )}
        <ul className="divide-y divide-border">
          {tenants.map((t) => (
            <li
              key={t._id}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-secondary">
                  {t.slug} · {t.status} · {t.seatsUsed ?? 0}/{t.seatLimit} seats
                </p>
              </div>
            </li>
          ))}
          {!isLoading && tenants.length === 0 && (
            <li className="py-2 text-sm text-secondary">No tenants yet</li>
          )}
        </ul>
      </Card>

      <InviteDetailsModal
        open={!!details}
        details={details}
        onClose={() => setDetails(null)}
      />
    </div>
  )
}
