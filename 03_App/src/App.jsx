import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { clearCache, loadVideos, readCache, removeVideo, saveVideo } from './data.js'
import { supabase } from './supabase.js'
import Login from './components/Login.jsx'
import Landing from './components/Landing.jsx'
import Feed from './components/Feed.jsx'
import Edit from './components/Edit.jsx'
import InstallBanner from './components/InstallBanner.jsx'

// Cross-fade + slide between screens using the View Transitions API.
// Browsers without it just swap instantly.
function transition(dir, update) {
  if (!document.startViewTransition) return update()
  document.documentElement.dataset.nav = dir
  const t = document.startViewTransition(() => flushSync(update))
  t.finished.finally(() => delete document.documentElement.dataset.nav)
}

// Opening a card sends the user to TikTok, and the phone may reload this page when they come
// back. Remember where they were (screen, filters, scroll) for a while so they land there again.
const NAV_KEY = 'tiktok-finds:nav'
const NAV_MS = 12 * 60 * 60 * 1000

function readNav() {
  try {
    const n = JSON.parse(localStorage.getItem(NAV_KEY))
    return n && Date.now() - n.at < NAV_MS ? n : {}
  } catch {
    return {}
  }
}

export default function App() {
  const [nav] = useState(readNav)
  const restoreScroll = useRef(nav.screen === 'feed' ? nav.scrollY ?? 0 : null)
  const [signedIn, setSignedIn] = useState(null) // null while the saved session is checked
  // Start from the saved list so the app opens offline; it is refreshed once signed in.
  const [videos, setVideos] = useState(() => readCache() ?? [])
  const [status, setStatus] = useState(() => (readCache() ? 'ready' : 'loading'))
  const [screen, setScreen] = useState(nav.screen === 'feed' ? 'feed' : 'landing')
  const [kind, setKind] = useState(nav.kind ?? 'recipe')
  const [sheet, setSheet] = useState(false)
  const [query, setQuery] = useState(nav.query ?? '')
  const [meals, setMeals] = useState(nav.meals ?? [])
  const [cuisines, setCuisines] = useState(nav.cuisines ?? [])
  const [asc, setAsc] = useState(nav.asc ?? false)
  const [editing, setEditing] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const navRef = useRef({})
  useEffect(() => { navRef.current = { screen, kind, query, meals, cuisines, asc } })

  useEffect(() => {
    let timer
    const save = () => {
      try {
        const n = navRef.current
        localStorage.setItem(NAV_KEY, JSON.stringify({ ...n, scrollY: n.screen === 'feed' ? window.scrollY : 0, at: Date.now() }))
      } catch { /* storage unavailable */ }
    }
    const onScroll = () => { clearTimeout(timer); timer = setTimeout(save, 150) }
    const onHide = () => { if (document.visibilityState === 'hidden') save() }
    save()
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', save)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', save)
    }
  }, [screen, kind, query, meals, cuisines, asc])

  // A restored feed needs a landing entry under it, so the back gesture still goes home.
  useEffect(() => {
    if (nav.screen !== 'feed') return
    if (history.state?.v === 'sheet' || history.state?.v === 'edit') history.replaceState({ v: 'feed' }, '')
    else if (history.state?.v !== 'feed') {
      history.replaceState({ v: 'landing' }, '')
      history.pushState({ v: 'feed' }, '')
    }
  }, [nav.screen])

  const feedVisible = signedIn && status === 'ready' && screen === 'feed'
  useEffect(() => {
    if (!feedVisible || restoreScroll.current == null) return
    const y = restoreScroll.current
    restoreScroll.current = null
    requestAnimationFrame(() => window.scrollTo(0, y))
  }, [feedVisible])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)))
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setSignedIn(Boolean(session))
      if (event === 'SIGNED_OUT') { clearCache(); setVideos([]); setStatus('loading') }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!signedIn) return
    loadVideos().then(
      (v) => { setVideos(v); setStatus('ready') },
      () => setStatus((s) => (s === 'ready' ? s : 'error')),
    )
  }, [signedIn])

  // Keep the phone's back gesture meaningful: sheet -> feed -> landing.
  useEffect(() => {
    const onPop = (e) => {
      const v = e.state?.v
      setSheet(v === 'sheet')
      if (v !== 'edit') setEditing(null)
      if (v === 'feed' || v === 'sheet' || v === 'edit') {
        setScreen('feed')
      } else {
        transition('back', () => {
          setScreen('landing')
          setMeals([]); setCuisines([]); setQuery('')
        })
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const openFeed = useCallback((k) => {
    history.pushState({ v: 'feed' }, '')
    transition('forward', () => {
      setKind(k); setMeals([]); setCuisines([]); setQuery(''); setScreen('feed')
    })
  }, [])
  const goHome = useCallback(() => history.back(), [])
  const openSheet = useCallback(() => { history.pushState({ v: 'sheet' }, ''); setSheet(true) }, [])
  const closeSheet = useCallback(() => history.back(), [])
  const openEdit = useCallback((video) => { history.pushState({ v: 'edit' }, ''); setEditing(video) }, [])
  const closeEdit = useCallback(() => history.back(), [])
  const say = useCallback((text, undo) => {
    clearTimeout(toastTimer.current)
    setToast({ text, undo })
    toastTimer.current = setTimeout(() => setToast(null), 6000)
  }, [])
  const replaceVideo = (next) => setVideos((vs) => vs.map((v) => (v.id === next.id ? next : v)))
  const saveEdit = async (patch, before) => {
    const next = await saveVideo(editing, patch)
    replaceVideo(next)
    closeEdit()
    say(`Saved “${next.title}”.`, async () => {
      try { replaceVideo(await saveVideo(next, before)); say('Undone.') } catch { say('Could not undo that.') }
    })
  }
  const removeEdit = async () => {
    const video = editing
    await removeVideo(video)
    setVideos((vs) => vs.filter((v) => v.id !== video.id))
    closeEdit()
    say('Removed from the catalogue.')
  }
  const clearAll = useCallback(() => { setMeals([]); setCuisines([]); setQuery('') }, [])

  const counts = useMemo(() => ({
    recipe: videos.filter((v) => v.kind === 'recipe').length,
    restaurant: videos.filter((v) => v.kind === 'restaurant').length,
  }), [videos])

  if (signedIn === null) return <main className="center" />
  if (!signedIn) return <Login />

  if (status === 'error') {
    return (
      <main className="center">
        <h1 className="h1">No luck.</h1>
        <p className="muted">Couldn't load the catalogue. Check your connection and try again.</p>
      </main>
    )
  }

  return (
    <>
      <InstallBanner />
      {screen === 'landing' ? (
    <Landing counts={counts} loading={status === 'loading'} onPick={openFeed} onSignOut={() => supabase.auth.signOut()} />
  ) : (
    <Feed
      kind={kind}
      videos={videos}
      query={query} setQuery={setQuery}
      meals={meals} setMeals={setMeals}
      cuisines={cuisines} setCuisines={setCuisines}
      asc={asc} toggleSort={() => setAsc((a) => !a)}
      sheet={sheet} openSheet={openSheet} closeSheet={closeSheet}
      clearAll={clearAll} goHome={goHome} onEdit={openEdit}
    />
  )}
      {editing && (
        <Edit
          key={editing.id}
          video={editing}
          videos={videos}
          onSave={saveEdit}
          onRemove={removeEdit}
          onClose={closeEdit}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="toast__text">{toast.text}</span>
          {toast.undo && <button className="link-btn" onClick={() => { const u = toast.undo; setToast(null); u() }}>Undo</button>}
        </div>
      )}
    </>
  )
}
