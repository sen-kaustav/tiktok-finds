import { useDeferredValue, useMemo } from 'react'
import Card from './Card.jsx'
import FilterSheet from './FilterSheet.jsx'
import { filterVideos } from '../data.js'
import { ArrowDown, ArrowUp, Back, Close, NoResults, Search, Sliders } from '../icons.jsx'

export default function Feed({
  kind, videos, query, setQuery, meals, setMeals, cuisines, setCuisines,
  asc, toggleSort, sheet, openSheet, closeSheet, clearAll, goHome, onEdit,
}) {
  const isRecipe = kind === 'recipe'
  // Typing stays instant; the grid catches up a beat later.
  const deferredQuery = useDeferredValue(query)
  const results = useMemo(
    () => filterVideos(videos, { kind, meals, cuisines, query: deferredQuery, asc }),
    [videos, kind, meals, cuisines, deferredQuery, asc],
  )

  const activeMeals = isRecipe ? meals : []
  const filterCount = activeMeals.length + cuisines.length + (query.trim() ? 1 : 0)
  const noun = isRecipe ? ['recipe', 'recipes'] : ['spot', 'spots']

  const chips = [
    ...activeMeals.map((m) => ({ key: `m-${m}`, label: m, remove: () => setMeals((c) => c.filter((x) => x !== m)) })),
    ...cuisines.map((c) => ({ key: `c-${c}`, label: c, remove: () => setCuisines((cur) => cur.filter((x) => x !== c)) })),
    ...(query.trim() ? [{ key: 'q', label: `“${query.trim()}”`, remove: () => setQuery(''), quiet: true }] : []),
  ]

  return (
    <div className={`feed ${isRecipe ? 'feed--recipe' : 'feed--joint'}`}>
      <header className="topbar">
        <div className="topbar__row">
          <button
            className="sort-btn"
            onClick={toggleSort}
            aria-label={asc ? 'Sorted oldest first. Switch to newest first' : 'Sorted newest first. Switch to oldest first'}
          >
            {asc ? <ArrowUp /> : <ArrowDown />}
            <span>{asc ? 'Oldest' : 'Newest'}</span>
          </button>
          <label className="search">
            <Search />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isRecipe ? 'Search recipes' : 'Search places'}
              aria-label="Search finds"
              enterKeyHint="search"
              autoComplete="off"
              autoCorrect="off"
            />
          </label>
          <button className="icon-btn" onClick={openSheet} aria-label="Open filters">
            <Sliders />
            {filterCount > 0 && <span className="count">{filterCount}</span>}
          </button>
        </div>

        <div className="topbar__title">
          <button className="icon-btn icon-btn--bare back" onClick={goHome} aria-label="Back to start">
            <Back />
          </button>
          <h2 className="h2">{isRecipe ? 'Recipes' : 'Food joints'}</h2>
          <span className="caption muted" aria-live="polite">
            {results.length} {results.length === 1 ? noun[0] : noun[1]}
          </span>
        </div>

        {chips.length > 0 && (
          <div className="chips">
            {chips.map((c) => (
              <button
                key={c.key}
                className={`chip ${c.quiet ? 'chip--quiet' : ''}`}
                onClick={c.remove}
                aria-label={`Remove ${c.label}`}
              >
                <span>{c.label}</span><Close />
              </button>
            ))}
            <button className="link-btn" onClick={clearAll}>Clear all</button>
          </div>
        )}
      </header>

      {results.length > 0 ? (
        <main className="grid">
          {results.map((v) => <Card key={v.id} video={v} onEdit={onEdit} />)}
        </main>
      ) : (
        <main className="empty">
          <div className="empty__icon"><NoResults /></div>
          <h2 className="h1">No luck.</h2>
          <p className="muted">Nothing matches that combo. Try fewer filters?</p>
          <button className="btn btn--primary" onClick={clearAll}>Clear all filters</button>
        </main>
      )}

      {sheet && (
        <FilterSheet
          kind={kind}
          videos={videos}
          resultCount={results.length}
          meals={meals} setMeals={setMeals}
          cuisines={cuisines} setCuisines={setCuisines}
          clearAll={clearAll}
          onClose={closeSheet}
        />
      )}
    </div>
  )
}
