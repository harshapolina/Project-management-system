import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { api, useAuthStore } from '../lib/api'
import { Button, Card, Input, Select, toast } from '../components/ui'

const ROLES = [
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'designer', label: 'Designer' },
  { value: 'site_supervisor', label: 'Site Supervisor' },
  { value: 'admin', label: 'Admin / Owner' },
]

const TOUR = [
  {
    title: 'Your whole studio, one canvas',
    body: 'Track leads, BOQs, site progress, and finance without hopping tools.',
  },
  {
    title: 'Projects with real stages',
    body: 'Design → Planning → Procurement → Execution → Handover — built in from day one.',
  },
  {
    title: 'Clients see polish, not margins',
    body: 'A beautiful client portal for approvals and updates — costs stay internal.',
  },
]

export function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [role, setRole] = useState('project_manager')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const finish = async () => {
    setLoading(true)
    try {
      const data = await api('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          role,
          title: title || undefined,
          onboardingCompleted: true,
        }),
      })
      setUser(data.user)
      toast('You’re all set', { type: 'success' })
      navigate(
        role === 'site_supervisor'
          ? '/mobile'
          : ['admin', 'owner', 'hr'].includes(role)
            ? '/admin'
            : '/projects',
      )
    } catch (err) {
      toast(err.message, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <Card className="w-full max-w-lg overflow-hidden" padding={false}>
        <div className="h-1.5 bg-border">
          <div
            className="h-full bg-accent transition-all duration-200"
            style={{ width: `${((step + 1) / 5) * 100}%` }}
          />
        </div>
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.18 }}
            >
              {step === 0 && (
                <>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Welcome, {user?.name?.split(' ')[0] || 'there'}
                  </h1>
                  <p className="mt-2 text-sm text-secondary">
                    Let’s set up your profile so EPM feels like home.
                  </p>
                  <div className="mt-6">
                    <Input
                      label="Your title"
                      placeholder="e.g. Senior Project Manager"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                </>
              )}
              {step === 1 && (
                <>
                  <h1 className="text-2xl font-semibold tracking-tight">What’s your role?</h1>
                  <p className="mt-2 text-sm text-secondary">
                    We’ll tailor your home screen and permissions.
                  </p>
                  <div className="mt-6">
                    <Select
                      label="Role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      options={ROLES}
                    />
                  </div>
                </>
              )}
              {step >= 2 && (
                <>
                  <p className="text-xs font-medium text-accent mb-2">
                    Tip {step - 1} of 3
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight">
                    {TOUR[step - 2].title}
                  </h1>
                  <p className="mt-3 text-sm text-secondary leading-relaxed">
                    {TOUR[step - 2].body}
                  </p>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-8 flex justify-between gap-3">
            <Button
              variant="ghost"
              disabled={step === 0}
              onClick={() => setStep((s) => s - 1)}
            >
              Back
            </Button>
            {step < 4 ? (
              <Button onClick={() => setStep((s) => s + 1)}>Continue</Button>
            ) : (
              <Button onClick={finish} loading={loading}>
                Enter EPM
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
