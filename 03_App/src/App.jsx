import { useCallback, useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import { clearCache, loadVideos, readCache } from './data.js'
import { supabase } from './supabase.js'
import Login from './components/Login.jsx'
import Landing from './components/Landing.jsx'
import Feed from './components/Feed.jsx'
import InstallBanner from './components/InstallBanner.jsx'

// Cross-fade + slide between screens using the View Transitions API.
// Browsers without it just swap instantly.
function transition(dir, update) {
  if (!document.startViewTransition) return update()
  document.documentElement.dataset.nav = dir
  const t = document.startViewTransition(() => flushSync(update))
  t.finished.finally(() => delete document.documentElement.dataset.nav)
}

export default function App() {
  const [signedIn, setSignedIn] = useState(null) // null while the saved session is checked
  // Start from the saved list so the app opens offline; it is refreshed once signed in.
  const [videos, setVideos] = useState(() => readCache() ?? [])
  const [status, setStatus] = useState(() => (readCache() ? 'ready' : 'loading'))
  const [screen, setScreen] = useState('landing')
  const [kind, setKind] = useState('recipe')
  const [sheet, setSheet] = useState(false)
  const [query, setQuery] = useState('')
  const [meals, setMeals] = useState([])
  const [cuisines, setCuisines] = useState([])
  const [asc, setAsc] = useState(false)

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
      if (v === 'feed' || v === 'sheet') {
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
      clearAll={clearAll} goHome={goHome}
    />
  )}
    </>
  )
}
