import { useEffect, useMemo, useRef, useState } from 'react'
import { CUISINE_GROUPS, MEAL_GROUPS, toVideo } from '../data.js'
import { Back, Check, Chevron, Info, Play, Plus, Close } from '../icons.jsx'

const DEFAULT_DIETARY = ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'halal', 'pescatarian']

const CATEGORIES = [
  { value: 'food recipe', label: 'Recipe', sub: 'Something to cook at home', dot: 'var(--tangerine)' },
  { value: 'restaurant', label: 'Restaurant', sub: 'A place to go and eat', dot: 'var(--mint)' },
  { value: 'other', label: 'Other', sub: 'Not food we want to keep', dot: 'var(--line-strong)' },
]
const CATEGORY_LABEL = { 'food recipe': 'Recipe', restaurant: 'Restaurant', other: 'Other' }

const FIELDS = {
  cuisine: { label: 'Cuisine', mode: 'single', groups: CUISINE_GROUPS, search: 'Search cuisines' },
  meal_type: { label: 'Meal type', mode: 'single', groups: MEAL_GROUPS },
  dietary: { label: 'Dietary tags', mode: 'multi', sub: 'Pick as many as you like.', custom: 'Add your own tag' },
  location: { label: 'Location', mode: 'single', custom: 'Add a place', search: 'Search places' },
  venue_names: { label: 'Venues', mode: 'multi', sub: 'Pick as many as you like.', custom: 'Add a venue' },
  dish: { label: 'What to order', mode: 'single', custom: 'Add a dish' },
}
const ORDER = {
  'food recipe': ['cuisine', 'meal_type', 'dietary', 'location'],
  restaurant: ['cuisine', 'venue_names', 'dish', 'location'],
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function fromRow(row) {
  return {
    category: row.category,
    cuisine: row.cuisine || '',
    meal_type: row.meal_type || '',
    dietary: row.dietary || [],
    location: row.location || '',
    venue_names: row.venue_names || [],
    dish: row.dish || '',
  }
}
const toDb = (v) => (v === '' ? null : v)

function show(key, value) {
  if (Array.isArray(value)) return value.length ? value.map(cap).join(', ') : 'None'
  return value ? cap(value) : 'Not set'
}

function Mark({ multi, on }) {
  return <span className={`mark ${multi ? 'mark--box' : ''} ${on ? 'mark--on' : ''}`}>{on && <Check />}</span>
}

function Picker({ field, value, suggestions, onChange, onDone }) {
  const f = FIELDS[field]
  const multi = f.mode === 'multi'
  const [q, setQ] = useState('')
  const [custom, setCustom] = useState('')
  const picked = multi ? value : value ? [value] : []

  const groups = useMemo(() => {
    const base = f.groups
      ? Object.entries(f.groups).map(([title, items]) => ({ title, items }))
      : [{ title: '', items: suggestions }]
    const known = new Set(base.flatMap((g) => g.items.map((i) => i.toLowerCase())))
    const extra = picked.filter((p) => !known.has(p.toLowerCase()))
    const all = extra.length ? [{ title: f.groups ? 'Yours' : '', items: extra }, ...base] : base
    const needle = q.trim().toLowerCase()
    return all
      .map((g) => ({ ...g, items: g.items.filter((i) => i.toLowerCase().includes(needle)) }))
      .filter((g) => g.items.length)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f, suggestions, q, value])

  const toggle = (item) => {
    if (multi) onChange(picked.includes(item) ? picked.filter((p) => p !== item) : [...picked, item])
    else onChange(picked[0] === item ? '' : item)
  }
  const addCustom = (e) => {
    e.preventDefault()
    const t = custom.trim()
    if (!t) return
    if (multi) { if (!picked.includes(t)) onChange([...picked, t]) } else onChange(t)
    setCustom('')
  }

  return (
    <>
      <div className="edit__scroll">
        {f.search && (
          <label className="search edit__search">
            <input
              type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={f.search} aria-label={f.search} autoComplete="off"
            />
          </label>
        )}
        {multi && picked.length > 0 && (
          <div className="edit__sec">
            <div className="label muted">Selected</div>
            <div className="chips edit__chips">
              {picked.map((p) => (
                <button key={p} className="chip" onClick={() => toggle(p)} aria-label={`Remove ${p}`}>
                  <span>{p}</span><Close />
                </button>
              ))}
            </div>
          </div>
        )}
        {groups.map((g) => (
          <div className="edit__sec" key={g.title || 'all'}>
            {g.title && <div className="label muted">{g.title}</div>}
            <div className="list">
              {g.items.map((item) => {
                const on = picked.includes(item)
                return (
                  <button key={item} className="row" aria-pressed={on} onClick={() => toggle(item)}>
                    <span className="row__value">{cap(item)}</span>
                    <Mark multi={multi} on={on} />
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="muted caption">Nothing matches. Add your own below.</p>}
        {f.custom && (
          <form className="list" onSubmit={addCustom}>
            <div className="row row--add">
              <input
                className="row__input" value={custom} onChange={(e) => setCustom(e.target.value)}
                placeholder={f.custom} aria-label={f.custom} autoComplete="off"
              />
              <button type="submit" className="icon-btn icon-btn--bare edit__add" aria-label="Add" disabled={!custom.trim()}>
                <Plus />
              </button>
            </div>
          </form>
        )}
      </div>
      <div className="edit__foot">
        <button className="btn btn--tile grow" onClick={onDone}>Done</button>
      </div>
    </>
  )
}

function CategoryPicker({ value, onChange, onDone }) {
  return (
    <>
      <div className="edit__scroll">
        <div className="list">
          {CATEGORIES.map((c) => (
            <button key={c.value} className="row row--tall" aria-pressed={value === c.value} onClick={() => onChange(c.value)}>
              <span className="dot" style={{ background: c.dot }} />
              <span className="row__text"><span className="row__value">{c.label}</span><span className="caption muted">{c.sub}</span></span>
              <Mark on={value === c.value} />
            </button>
          ))}
        </div>
        <div className="note">
          <Info />
          <p className="caption">
            Pick Other and this find leaves the catalogue once you save. Switching between Recipe and Restaurant changes which details it asks for.
          </p>
        </div>
      </div>
      <div className="edit__foot">
        <button className="btn btn--tile grow" onClick={onDone}>Done</button>
      </div>
    </>
  )
}

export default function Edit({ video, videos, onSave, onRemove, onClose }) {
  const orig = useMemo(() => fromRow(video.row), [video])
  const [draft, setDraft] = useState(orig)
  const [page, setPage] = useState(null)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const scrollTop = useRef(null)

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const changedKeys = Object.keys(orig).filter((k) => !same(draft[k], orig[k]))
  const dirty = changedKeys.length > 0
  const isOther = draft.category === 'other'
  const joint = draft.category === 'restaurant'

  const suggestions = useMemo(() => {
    const uniq = (xs) => [...new Set(xs.filter(Boolean))].sort((a, b) => a.localeCompare(b))
    return {
      dietary: uniq([...DEFAULT_DIETARY, ...videos.flatMap((v) => v.row.dietary || [])]),
      location: uniq(videos.map((v) => v.row.location)),
      venue_names: uniq(videos.flatMap((v) => v.row.venue_names || [])).slice(0, 40),
      dish: [],
    }
  }, [videos])

  const preview = toVideo({ ...video.row, ...Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, toDb(v)])) }, {}) || video

  const attemptClose = () => (dirty ? setConfirm(true) : onClose())

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return
      if (confirm) setConfirm(false)
      else if (page) setPage(null)
      else attemptClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  useEffect(() => { scrollTop.current?.scrollTo(0, 0) }, [page])

  async function save() {
    setBusy(true)
    setErr('')
    try {
      if (isOther) await onRemove()
      else {
        const patch = {}
        for (const k of changedKeys) patch[k] = toDb(draft[k])
        await onSave(patch, Object.fromEntries(changedKeys.map((k) => [k, toDb(orig[k])])))
      }
    } catch {
      setErr("Couldn't save that. Check your connection and try again.")
      setBusy(false)
    }
  }

  const fields = ORDER[isOther ? video.row.category : draft.category]
  const title = page === 'category' ? 'Category' : page ? FIELDS[page].label : 'Edit find'

  return (
    <div className={`edit ${joint ? 'edit--joint' : 'edit--recipe'}`} role="dialog" aria-modal="true" aria-label={title}>
      <header className="edit__top">
        {page && (
          <button className="edit__crumb" onClick={() => setPage(null)} aria-label="Back to edit find">
            <span className="icon-btn icon-btn--bare"><Back /></span>
            <span className="label muted">Edit find</span>
          </button>
        )}
        <h1 className="h1">{title}</h1>
        <p className="caption muted">
          {page === 'category' ? 'What kind of find is this?'
            : page ? (FIELDS[page].sub || '')
              : 'Tap a row to change it. Nothing sticks until you save.'}
        </p>
      </header>

      {page === 'category' && (
        <CategoryPicker value={draft.category} onChange={(v) => set('category', v)} onDone={() => setPage(null)} />
      )}
      {page && page !== 'category' && (
        <Picker
          key={page}
          field={page}
          value={draft[page]}
          suggestions={suggestions[page] || []}
          onChange={(v) => set(page, v)}
          onDone={() => setPage(null)}
        />
      )}

      {!page && (
        <>
          <div className="edit__scroll" ref={scrollTop}>
            <div className="prev">
              <div className="prev__thumb">
                {video.thumb ? <img src={video.thumb} alt="" /> : <Play size={22} />}
              </div>
              <div className="prev__col">
                <div className="card__title">{preview.title}</div>
                <div className="card__meta">{preview.place}</div>
                <div className="tags">{preview.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>
              </div>
            </div>

            <div className="edit__sec">
              <div className="label muted">What is it?</div>
              <div className="list">
                <button className="row" onClick={() => setPage('category')}>
                  <span className="row__text">
                    <span className="caption muted">Category</span>
                    <span className={`badge ${isOther ? 'badge--quiet' : joint ? 'badge--joint' : ''}`}>{CATEGORY_LABEL[draft.category]}</span>
                  </span>
                  {changedKeys.includes('category') && <span className="edited">Edited</span>}
                  <span className="chev"><Chevron /></span>
                </button>
              </div>
            </div>

            {!isOther && (
              <div className="edit__sec">
                <div className="label muted">The details</div>
                <div className="list">
                  {fields.map((k) => (
                    <button key={k} className="row" onClick={() => setPage(k)}>
                      <span className="row__text">
                        <span className="caption muted">{FIELDS[k].label}</span>
                        <span className={`row__value ${draft[k].length ? '' : 'row__value--off'}`}>{show(k, draft[k])}</span>
                      </span>
                      {changedKeys.includes(k) && <span className="edited">Edited</span>}
                      <span className="chev"><Chevron /></span>
                    </button>
                  ))}
                </div>
                <p className="caption muted">
                  {dirty ? `${changedKeys.length} ${changedKeys.length === 1 ? 'change' : 'changes'} so far.` : 'No changes yet.'}
                </p>
              </div>
            )}
            {isOther && (
              <div className="note"><Info /><p className="caption">Saving removes this find from the catalogue.</p></div>
            )}
            {err && <p className="edit__err" role="alert">{err}</p>}
          </div>
          <div className="edit__foot">
            <button className="btn btn--ghost" onClick={attemptClose}>Discard</button>
            <button className="btn btn--tile grow" disabled={!dirty || busy} onClick={save}>
              {isOther ? 'Remove from catalogue' : busy ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </>
      )}

      {confirm && (
        <div className="sheet-wrap">
          <div className="scrim" onClick={() => setConfirm(false)} />
          <section className="sheet" role="dialog" aria-modal="true" aria-label="Discard changes">
            <div className="sheet__handle" />
            <div>
              <h2 className="sheet__title">Bin your changes?</h2>
              <span className="caption muted">This find goes back to how it was. Nothing is saved.</span>
            </div>
            <div className="diff">
              {changedKeys.map((k) => (
                <div className="diff__row" key={k}>
                  <span className="label muted">{k === 'category' ? 'Category' : FIELDS[k].label}</span>
                  <span className="diff__was">{k === 'category' ? CATEGORY_LABEL[orig[k]] : show(k, orig[k])}</span>
                  <span className="muted">→</span>
                  <b>{k === 'category' ? CATEGORY_LABEL[draft[k]] : show(k, draft[k])}</b>
                </div>
              ))}
            </div>
            <div className="sheet__foot">
              <button className="btn btn--ghost" onClick={onClose}>Discard</button>
              <button className="btn btn--tile grow" onClick={() => setConfirm(false)}>Keep editing</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
