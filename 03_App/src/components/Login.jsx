import { useState } from 'react'
import { supabase } from '../supabase.js'

const PENDING_KEY = 'tiktok-finds:login'
const PENDING_MS = 30 * 60 * 1000

// Opening the mail app can make the phone reload this page. Remember the email and the
// "enter the code" step for a while so the reload lands back on the code box.
function readPending() {
  try {
    const p = JSON.parse(sessionStorage.getItem(PENDING_KEY))
    return p && Date.now() - p.at < PENDING_MS ? p : null
  } catch {
    return null
  }
}
function savePending(email) {
  try {
    if (email) sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email, at: Date.now() }))
    else sessionStorage.removeItem(PENDING_KEY)
  } catch { /* storage unavailable */ }
}

// Email one-time code: ask for the email, then the one-time code from the message.
// Only invited accounts exist, so shouldCreateUser stays off.
export default function Login() {
  const [pending] = useState(readPending)
  const [email, setEmail] = useState(pending?.email ?? '')
  const [code, setCode] = useState('')
  const [step, setStep] = useState(pending ? 'code' : 'email')
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
    else { savePending(email.trim()); setStep('code') }
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
    else savePending(null)
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
          <button type="button" className="login__link" onClick={() => { savePending(null); setStep('email'); setCode(''); setError('') }}>
            Use a different email
          </button>
        </form>
      )}
      {error && <p className="login__error" role="alert">{error}</p>}
    </main>
  )
}
