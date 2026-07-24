import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api, useAuthStore } from '../../lib/api'
import { Button, Input, Card, toast } from '../../components/ui'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: 'rohan@cubic.studio', password: 'demo1234' },
  })

  const onSubmit = async (values) => {
    setLoading(true)
    try {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      })
      setAuth({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      toast('Welcome back', { type: 'success' })
      if (data.user.role === 'site_supervisor') {
        navigate('/mobile')
      } else if (!data.user.onboardingCompleted) {
        navigate('/onboarding')
      } else {
        navigate('/')
      }
    } catch (err) {
      toast(err.message || 'Login failed', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to Cubic — your studio command center."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-xs text-secondary hover:text-accent transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" loading={loading} size="lg">
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-secondary">
        New to Cubic?{' '}
        <Link to="/register" className="text-accent hover:text-accent-hover font-medium">
          Create an account
        </Link>
      </p>
      <p className="mt-3 text-center text-[11px] text-secondary/80">
        Demo: rohan@cubic.studio / demo1234
      </p>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)

  const regSchema = z
    .object({
      name: z.string().min(2, 'Name is required'),
      email: z.string().email(),
      password: z.string().min(6, 'At least 6 characters'),
      confirm: z.string(),
    })
    .refine((d) => d.password === d.confirm, {
      message: 'Passwords do not match',
      path: ['confirm'],
    })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(regSchema) })

  const onSubmit = async (values) => {
    setLoading(true)
    try {
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      })
      setAuth({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
      toast('Account created', { type: 'success' })
      navigate('/onboarding')
    } catch (err) {
      toast(err.message || 'Registration failed', { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Start running projects the Cubic way.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Full name" error={errors.name?.message} {...register('name')} />
        <Input
          label="Email"
          type="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Password"
          type="password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm password"
          type="password"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        <Button type="submit" className="w-full" loading={loading} size="lg">
          Continue
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-secondary">
        Already have an account?{' '}
        <Link to="/login" className="text-accent hover:text-accent-hover font-medium">
          Sign in
        </Link>
      </p>
    </AuthLayout>
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
    <AuthLayout
      title="Reset password"
      subtitle="We’ll send a reset link if that email is on Cubic."
    >
      {sent ? (
        <div className="text-center space-y-4">
          <p className="text-sm text-secondary">
            If an account exists for that email, you’ll get a reset link shortly.
          </p>
          <Link to="/login">
            <Button variant="secondary" className="w-full">
              Back to sign in
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
        </form>
      )}
    </AuthLayout>
  )
}

function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-canvas flex">
      <div className="hidden lg:flex w-[46%] relative overflow-hidden border-r border-border">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              'url(https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=80)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-canvas/70 to-transparent" />
        <div className="relative mt-auto p-10">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-accent text-[#0E0E10] font-bold">
            C
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">Cubic</h1>
          <p className="mt-2 max-w-sm text-sm text-secondary">
            Lead to handover — one premium workspace for interior design & construction.
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md" variant="raised">
          <div className="mb-6 lg:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-[#0E0E10] font-bold text-sm">
              C
            </div>
            <span className="font-semibold">Cubic</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-1.5 mb-6 text-sm text-secondary">{subtitle}</p>
          {children}
        </Card>
      </div>
    </div>
  )
}
