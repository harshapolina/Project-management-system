import { useAuthStore } from '../../lib/api'
import { Card } from '../../components/ui'

export function PlatformSettingsPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-[#0f172a]">Settings</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Platform administrator account and system information.
        </p>
      </div>

      <Card variant="light" className="space-y-3">
        <p className="font-semibold text-[#0f172a]">Your platform account</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[#64748b]">Name</dt>
            <dd className="font-medium text-[#0f172a]">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-[#64748b]">Email</dt>
            <dd className="font-medium text-[#0f172a]">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-[#64748b]">Role</dt>
            <dd className="font-medium text-[#0f172a]">Platform administrator</dd>
          </div>
          <div>
            <dt className="text-[#64748b]">Access</dt>
            <dd className="font-medium text-[#0f172a]">All companies on EPM</dd>
          </div>
        </dl>
      </Card>

      <Card variant="light" className="space-y-3">
        <p className="font-semibold text-[#0f172a]">Login URLs</p>
        <ul className="space-y-2 text-sm text-[#64748b]">
          <li>
            <span className="font-medium text-[#0f172a]">Platform admin: </span>
            <code className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[#2563eb]">/platform/login</code>
          </li>
          <li>
            <span className="font-medium text-[#0f172a]">Company workspaces: </span>
            <code className="rounded bg-[#f1f5f9] px-1.5 py-0.5 text-[#2563eb]">/login</code>
          </li>
        </ul>
      </Card>

      <Card variant="light" className="space-y-2">
        <p className="font-semibold text-[#0f172a]">How it works</p>
        <p className="text-sm leading-relaxed text-[#64748b]">
          You are the single Editco platform admin. Each company (e.g. Cubic) is an isolated workspace.
          You create credentials for their admins — they never get platform access. Use Companies to
          manage users and features, Subscriptions to cancel or reactivate billing, and Feature plans
          to apply Starter / Pro / Enterprise bundles.
        </p>
      </Card>
    </div>
  )
}
