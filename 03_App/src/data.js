import Papa from 'papaparse'

// Meal types in the data are grouped into three friendly pills. The exact value stays on the card.
export const MEAL_GROUPS = {
  Mains: ['dinner', 'lunch'],
  'Light bites': ['breakfast', 'snack', 'side'],
  Sweet: ['dessert', 'baking'],
}

export const CUISINE_GROUPS = {
  Asian: ['Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Indian', 'Pakistani'],
  'Italian & Med': ['Italian', 'Greek', 'Mediterranean', 'Spanish', 'French'],
  'Middle Eastern': ['Middle Eastern', 'Turkish', 'Lebanese'],
  Americas: ['American', 'Mexican', 'Caribbean'],
  'Fusion & other': ['Fusion', 'British', 'Other'],
}

function invert(groups) {
  const out = {}
  for (const [group, values] of Object.entries(groups)) {
    for (const v of values) out[v.toLowerCase()] = group
  }
  return out
}
const MEAL_OF = invert(MEAL_GROUPS)
const CUISINE_OF = invert(CUISINE_GROUPS)

const KINDS = { 'food recipe': 'recipe', restaurant: 'restaurant' }

function cap(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function toVideo(row) {
  const kind = KINDS[row.category]
  if (!kind) return null
  const dish = (row.dish || '').trim()
  const venues = (row.venue_name || '').split(';').map((v) => v.trim()).filter(Boolean)
  const dietary = (row.dietary || '').split(';').map((d) => d.trim()).filter(Boolean)
  const fallback = (row.caption || '').replace(/#\S+/g, '').trim().slice(0, 48)

  let title
  const tags = []
  if (kind === 'recipe') {
    title = cap(dish || fallback || 'Untitled recipe')
    if (row.cuisine) tags.push(row.cuisine)
    if (row.meal_type) tags.push(row.meal_type)
    tags.push(...dietary)
  } else {
    title = venues[0] || cap(dish || fallback || 'Food joint')
    if (row.cuisine) tags.push(row.cuisine)
    if (venues.length && dish) tags.push(dish)
    if (venues.length > 1) tags.push(`+${venues.length - 1} more`)
  }

  const date = row.posted_at ? new Date(row.posted_at) : null
  return {
    id: row.video_id,
    kind,
    url: row.canonical_url,
    title,
    place: row.location || '',
    tags: tags.slice(0, 3),
    time: date && !Number.isNaN(date.getTime()) ? date.getTime() : 0,
    mealGroup: MEAL_OF[(row.meal_type || '').toLowerCase()] || '',
    cuisineGroup: CUISINE_OF[(row.cuisine || '').toLowerCase()] || '',
    thumb: `${import.meta.env.BASE_URL}thumbs/${row.video_id}.jpg`,
    haystack: [
      row.caption, row.hashtags, row.dish, row.cuisine, row.meal_type,
      row.venue_name, row.location, row.dietary, row.reason, kind,
    ].join(' ').toLowerCase(),
  }
}

export async function loadVideos() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/videos.csv`)
  if (!res.ok) throw new Error(`Could not load data (${res.status})`)
  const text = (await res.text()).replace(/^﻿/, '')
  const { data } = Papa.parse(text, { header: true, skipEmptyLines: true })
  return data.map(toVideo).filter(Boolean)
}

export function filterVideos(videos, { kind, meals, cuisines, query, asc }) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
  const out = videos.filter((v) => {
    if (v.kind !== kind) return false
    if (kind === 'recipe' && meals.length && !meals.includes(v.mealGroup)) return false
    if (cuisines.length && !cuisines.includes(v.cuisineGroup)) return false
    return tokens.every((t) => v.haystack.includes(t))
  })
  out.sort((a, b) => (asc ? a.time - b.time : b.time - a.time))
  return out
}

export function formatDate(time) {
  if (!time) return ''
  return new Date(time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
