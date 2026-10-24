const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const Search = ({ size = 18 }) => (
  <svg {...base} width={size} height={size}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
)
export const Sliders = ({ size = 20 }) => (
  <svg {...base} width={size} height={size}>
    <path d="M3 6h11M18 6h3M3 12h5M12 12h9M3 18h13M20 18h1" />
    <circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" />
  </svg>
)
export const ArrowDown = ({ size = 18 }) => (
  <svg {...base} width={size} height={size}><path d="M12 5v14M6 13l6 6 6-6" /></svg>
)
export const ArrowUp = ({ size = 18 }) => (
  <svg {...base} width={size} height={size}><path d="M12 19V5M6 11l6-6 6 6" /></svg>
)
export const ArrowRight = ({ size = 28 }) => (
  <svg {...base} width={size} height={size} strokeWidth="2.5"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)
export const Back = ({ size = 24 }) => (
  <svg {...base} width={size} height={size}><path d="m15 6-6 6 6 6" /></svg>
)
export const Close = ({ size = 14, stroke = 2 }) => (
  <svg {...base} width={size} height={size} strokeWidth={stroke}><path d="M6 6l12 12M18 6 6 18" /></svg>
)
export const Play = ({ size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
)
export const NoResults = ({ size = 40 }) => (
  <svg {...base} width={size} height={size}>
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8.5 8.5l5 5M13.5 8.5l-5 5" />
  </svg>
)
export const Chevron = ({ size = 20 }) => (
  <svg {...base} width={size} height={size}><path d="m9 6 6 6-6 6" /></svg>
)
export const Check = ({ size = 16 }) => (
  <svg {...base} width={size} height={size} strokeWidth="3"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
)
export const Plus = ({ size = 22 }) => (
  <svg {...base} width={size} height={size}><path d="M12 5v14M5 12h14" /></svg>
)
export const Info = ({ size = 20 }) => (
  <svg {...base} width={size} height={size}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
)
export const Pencil = ({ size = 16 }) => (
  <svg {...base} width={size} height={size}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
)
