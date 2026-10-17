import { useEffect, useRef } from 'react'
import { CUISINE_GROUPS, MEAL_GROUPS } from '../data.js'
import { Close } from '../icons.jsx'

function Pills({ groups, groupKey, videos, selected, setSelected }) {
  const toggle = (g) =>
    setSelected((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))
  return (
    <div className="pills">
      {Object.keys(groups).map((g) => {
        const on = selected.includes(g)
        const n = videos.filter((v) => v[groupKey] === g).length
        return (
          <button key={g} className="pill" aria-pressed={on} onClick={() => toggle(g)}>
            <span>{g}</span><span className="pill__n">{n}</span>
          </button>
        )
      })}
    </div>
  )
}

export default function FilterSheet({
  kind, videos, resultCount, meals, setMeals, cuisines, setCuisines, clearAll, onClose,
}) {
  const isRecipe = kind === 'recipe'
  const kindVideos = videos.filter((v) => v.kind === kind)
  const closeRef = useRef(null)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-wrap">
      <div className="scrim" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label="Filters">
        <div className="sheet__handle" />
        <div className="sheet__head">
          <div>
            <h2 className="sheet__title">{isRecipe ? 'Narrow it down' : 'Fancy anything?'}</h2>
            <span className="caption muted">Pick as many as you like.</span>
          </div>
          <button ref={closeRef} className="icon-btn icon-btn--bare" onClick={onClose} aria-label="Close filters">
            <Close size={24} />
          </button>
        </div>

        {isRecipe && (
          <div className="sheet__section">
            <div className="label muted">What kind of meal?</div>
            <Pills groups={MEAL_GROUPS} groupKey="mealGroup" videos={kindVideos} selected={meals} setSelected={setMeals} />
            <div className="caption muted">
              Mains: dinner, lunch. Light bites: breakfast, snack, side. Sweet: dessert, baking.
            </div>
          </div>
        )}

        <div className="sheet__section">
          <div className="label muted">Which cuisine?</div>
          <Pills groups={CUISINE_GROUPS} groupKey="cuisineGroup" videos={kindVideos} selected={cuisines} setSelected={setCuisines} />
        </div>

        <div className="sheet__foot">
          <button className="btn btn--ghost" onClick={clearAll}>Clear all</button>
          <button className="btn btn--primary grow" onClick={onClose}>
            Show {resultCount} {resultCount === 1 ? 'find' : 'finds'}
          </button>
        </div>
      </section>
    </div>
  )
}
