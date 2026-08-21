import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { api } from '../../lib/api'
import { Button, Card, Select, toast } from '../../components/ui'
import { usePlatformTenants } from '../../lib/platformApi'
import { TENANT_FEATURE_KEYS } from '../../lib/tenantFeatures'
import { PLAN_FEATURE_PRESETS, PLAN_SEAT_DEFAULTS } from '../../lib/planPresets'

export function PlatformFeaturesPage() {
  const qc = useQueryClient()
  const { data } = usePlatformTenants()
  const tenants = data?.tenants || []
  const [selectedTenant, setSelectedTenant] = useState('')
  const [selectedPlan, setSelectedPlan] = useState('pro')

  const applyPlan = useMutation({
    mutationFn: ({ tenantId, plan }) =>
      api(`/platform/tenants/${tenantId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          subscriptionPlan: plan,
          seatLimit: PLAN_SEAT_DEFAULTS[plan],
          features: PLAN_FEATURE_PRESETS[plan],
        }),
      }),
    onSuccess: () => {
      toast('Plan applied to company', { type: 'success' })
      qc.invalidateQueries({ queryKey: ['platform-tenants'] })
    },
    onError: (e) => toast(e.message, { type: 'error' }),
  })

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight text-primary">Feature plans</h1>
        <p className="mt-1 text-sm text-secondary">
          Define what each subscription tier includes, then apply a plan to any company in one click.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {(['starter', 'pro', 'enterprise']).map((plan) => (
          <Card key={plan} variant="light" className="space-y-3">
            <p className="text-lg font-semibold capitalize text-primary">{plan}</p>
            <p className="text-xs text-secondary">{PLAN_SEAT_DEFAULTS[plan]} seats default</p>
            <ul className="space-y-1.5 text-sm">
              {TENANT_FEATURE_KEYS.map(({ key, label }) => {
                const on = PLAN_FEATURE_PRESETS[plan][key]
                return (
                  <li key={key} className={`flex items-center gap-2 ${on ? 'text-primary' : 'text-secondary'}`}>
                    <Check className={`h-3.5 w-3.5 ${on ? 'text-[#10b981]' : 'opacity-30'}`} />
                    {label}
                  </li>
                )
              })}
            </ul>
          </Card>
        ))}
      </div>

      <Card variant="light" className="space-y-4">
        <p className="font-semibold text-primary">Apply plan to a company</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Company"
            light
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            options={[
              { value: '', label: 'Select company…' },
              ...tenants.map((t) => ({ value: t._id, label: `${t.name} (${t.slug})` })),
            ]}
          />
          <Select
            label="Plan to apply"
            light
            value={selectedPlan}
            onChange={(e) => setSelectedPlan(e.target.value)}
            options={[
              { value: 'starter', label: 'Starter' },
              { value: 'pro', label: 'Pro' },
              { value: 'enterprise', label: 'Enterprise' },
            ]}
          />
        </div>
        <Button
          disabled={!selectedTenant}
          loading={applyPlan.isPending}
          onClick={() =>
            applyPlan.mutate({ tenantId: selectedTenant, plan: selectedPlan })
          }
        >
          Apply plan & features
        </Button>
        <p className="text-xs text-secondary">
          This updates the company&apos;s subscription plan, seat limit, and enabled modules. You can
          still fine-tune individual features under Companies.
        </p>
      </Card>
    </div>
  )
}
