import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '../../lib/api'
import { Button, Input, toast } from '../../components/ui'

export { LoginPage } from './LandingLoginPage'

export function RegisterPage() {
  return (
    <AuthShell
      title="Invite only"
      subtitle="Workspaces are created by Editco. Ask your admin for a login."
    >
      <p className="text-sm leading-relaxed text-secondary">
        Self-serve registration is off. Your company admin invites you from
        Settings, or Editco provisions a workspace from Platform Admin.
      </p>
      <Link
        to="/login"
        className="mt-6 inline-flex text-sm font-medium text-accent hover:text-accent-hover"
      >
        ← Back to EPM home
      </Link>
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(z.object({ email: z.string().email() })),
  })

  const onSubmit = async (values) => {
    setLoading(true)
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(values),
      })
      setSent(true)
      toast('Check your email for reset instructions', { type: 'success' })
    } catch (err) {
      toast(err.message, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Reset password"
      subtitle="We’ll send a reset link if that email is on EPM."
    >
      {sent ? (
        <div className="space-y-4">
          <p className="text-sm text-secondary">
            If an account exists for that email, you’ll get a reset link shortly.
          </p>
          <Link to="/login">
            <Button variant="secondary" className="w-full">
              Back to home
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Button type="submit" className="w-full" loading={loading} size="lg">
            Send reset link
          </Button>
          <Link
            to="/login"
            className="block text-center text-xs text-secondary hover:text-accent"
          >
            Cancel
          </Link>
        </form>
      )}
    </AuthShell>
  )
}

function AuthShell({ title, subtitle, children }) {
  return (
    <div
      className="flex min-h-[100dvh] items-center justify-center bg-[#F5F7FB] px-5 py-16 text-[#0F172A]"
      style={{ fontFamily: 'var(--font-landing)' }}
    >
      <div className="w-full max-w-md rounded-[24px] border border-slate-100 bg-white p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] md:p-10">
        <Link to="/login" className="mb-8 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[#0F172A] text-[12px] font-bold text-accent">
            E
          </span>
          <span className="text-[16px] font-semibold">EPM</span>
        </Link>
        <h1 className="text-[26px] font-bold tracking-tight">{title}</h1>
        <p className="mt-2 mb-8 text-[14px] text-slate-500">{subtitle}</p>
        {children}
      </div>
    </div>
  )
}
