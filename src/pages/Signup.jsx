import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { TrendingUp, Shield, BarChart3 } from 'lucide-react'

const Signup = () => {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    setIsSubmitting(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[42%] xl:w-[46%] flex-col justify-between bg-gray-950 p-12 relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-teal-600/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full bg-teal-500/8 blur-3xl" />
        </div>

        <div className="relative">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-9 h-9 bg-teal-500 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-sm font-black text-white tracking-tight">FT</span>
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">Finance Tracker</span>
          </div>

          {/* Hero text */}
          <h1 className="text-4xl font-bold text-white leading-snug mb-4">
            Your household<br />
            finances, <span className="text-teal-400">clarified.</span>
          </h1>
          <p className="text-gray-400 text-base leading-relaxed max-w-xs">
            Track spending, categorize transactions, and get a clear picture of your household budget — month after month.
          </p>
        </div>

        {/* Feature highlights */}
        <div className="relative space-y-4">
          {[
            { icon: TrendingUp,  label: 'Income & expense tracking', sub: 'Full visibility across transaction types' },
            { icon: BarChart3,   label: 'Spending analytics',        sub: 'Category breakdowns with visual charts'  },
            { icon: Shield,      label: 'Secure & private',          sub: 'Your data stays yours, always'           },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                <Icon size={15} className="text-teal-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/90">{label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center items-center bg-slate-50 px-6 py-12 sm:px-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
            <span className="text-xs font-black text-white">FT</span>
          </div>
          <span className="font-semibold text-gray-900 text-base">Finance Tracker</span>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Create your account</h2>
            <p className="text-sm text-gray-500 mt-1">Start tracking your household finances</p>
          </div>

          {error && (
            <div className="error-banner mb-5" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="fullName">Full name</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
                placeholder="Alex Morgan"
                autoComplete="name"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                autoComplete="new-password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full mt-2 py-2.5 text-sm"
            >
              {isSubmitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-sm text-gray-500 mt-6 text-center">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup
