import { useState } from 'react'
import { supabase } from '../supabase.js'

// Email one-time code: ask for the email, then the 6-digit code from the message.
// Only invited accounts exist, so shouldCreateUser stays off.
export default function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function sendCode(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    })
    setBusy(false)
    if (err) setError('Could not send a code to that email.')
    else setStep('code')
  }

  async function verify(e) {
    e.preventDefault()
    setBusy(true); setError('')
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'email',
    })
    setBusy(false)
    if (err) setError('That code did not work. Check it or ask for a new one.')
  }

  return (
    <main className="center login">
      <h1 className="h1">TikTok Finds</h1>
      {step === 'email' ? (
        <form onSubmit={sendCode} className="login__form">
          <p className="muted">Sign in with your email. We'll send you a code.</p>
          <input
            className="login__input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            aria-label="Email"
            autoComplete="email"
            required
          />
          <button className="login__btn" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
        </form>
      ) : (
        <form onSubmit={verify} className="login__form">
          <p className="muted">Enter the code we sent to {email.trim()}.</p>
          <input
            className="login__input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            aria-label="Code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
          <button className="login__btn" disabled={busy}>{busy ? 'Checking…' : 'Sign in'}</button>
          <button type="button" className="login__link" onClick={() => { setStep('email'); setCode(''); setError('') }}>
            Use a different email
          </button>
        </form>
      )}
      {error && <p className="login__error" role="alert">{error}</p>}
    </main>
  )
}
