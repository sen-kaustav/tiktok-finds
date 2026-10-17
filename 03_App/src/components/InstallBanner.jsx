import { useEffect, useState } from 'react'

const DISMISS_KEY = 'install-dismissed'

const readDismissed = () => {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

// Small "Install" bar at the top, shown when Chrome says the app can be installed.
export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null)

  useEffect(() => {
    if (readDismissed()) return
    const onPrompt = (e) => { e.preventDefault(); setPrompt(e) }
    const onInstalled = () => setPrompt(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (!prompt) return null

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* private mode */ }
    setPrompt(null)
  }
  const install = async () => {
    prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
  }

  return (
    <div className="install" role="region" aria-label="Install app">
      <img className="install__icon" src={`${import.meta.env.BASE_URL}pwa-192.png`} alt="" width="32" height="32" />
      <span className="install__text">Install TikTok Finds</span>
      <button className="install__btn" onClick={install}>Install</button>
      <button className="install__close" onClick={dismiss} aria-label="Dismiss">×</button>
    </div>
  )
}
