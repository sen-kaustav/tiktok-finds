import { supabase } from './supabase.js'

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

function toVideo(row, thumbUrls) {
  const kind = KINDS[row.category]
  if (!kind) return null
  const dish = (row.dish || '').trim()
  const venues = row.venue_names || []
  const dietary = row.dietary || []
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
    thumb: (row.thumb_path && thumbUrls[row.thumb_path]) || '',
    haystack: [
      row.caption, row.hashtags, row.dish, row.cuisine, row.meal_type,
      venues.join(' '), row.location, dietary.join(' '), row.reason, kind,
    ].join(' ').toLowerCase(),
  }
}

// Signed thumbnail URLs last a week. The service worker caches the images without the
// token (see vite.config.js), so cached images stay valid after the URL itself expires.
const SIGNED_SECONDS = 7 * 24 * 60 * 60
const CACHE_KEY = 'tiktok-finds:catalogue:v1'

export function readCache() {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY))
    return cached ? cached.rows.map((r) => toVideo(r, cached.thumbUrls)).filter(Boolean) : null
  } catch {
    return null
  }
}

export function clearCache() {
  try { localStorage.removeItem(CACHE_KEY) } catch { /* storage unavailable */ }
}

export async function loadVideos() {
  const { data: rows, error } = await supabase
    .from('videos')
    .select('video_id,canonical_url,posted_at,caption,hashtags,category,cuisine,meal_type,dish,location,venue_names,dietary,reason,thumb_path')
    .range(0, 4999)
  if (error) throw error

  const paths = rows.map((r) => r.thumb_path).filter(Boolean)
  const thumbUrls = {}
  if (paths.length) {
    const { data: signed, error: signError } = await supabase.storage.from('thumbs').createSignedUrls(paths, SIGNED_SECONDS)
    if (signError) throw signError
    for (const s of signed) if (s.signedUrl) thumbUrls[s.path] = s.signedUrl
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rows, thumbUrls }))
  } catch { /* storage full or unavailable: the app still works online */ }
  return rows.map((r) => toVideo(r, thumbUrls)).filter(Boolean)
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
