import { memo, useRef, useState } from 'react'
import { formatDate } from '../data.js'
import { Play } from '../icons.jsx'

const HOLD_MS = 550

function Card({ video, onEdit }) {
  const [broken, setBroken] = useState(false)
  const [pressing, setPressing] = useState(false)
  const t = useRef({})
  const meta = [video.place, formatDate(video.time)].filter(Boolean).join(' · ')

  const cancel = () => {
    clearTimeout(t.current.show)
    clearTimeout(t.current.hold)
    t.current.active = false
    setPressing(false)
  }
  const start = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    t.current = { x: e.clientX, y: e.clientY, active: true, fired: false }
    t.current.show = setTimeout(() => setPressing(true), 180)
    t.current.hold = setTimeout(() => {
      t.current.fired = true
      cancel()
      navigator.vibrate?.(15)
      onEdit(video)
    }, HOLD_MS)
  }
  const move = (e) => {
    if (t.current.active && Math.hypot(e.clientX - t.current.x, e.clientY - t.current.y) > 10) cancel()
  }
  const click = (e) => {
    if (t.current.fired) { e.preventDefault(); t.current.fired = false }
  }

  return (
    <a
      className={`card ${pressing ? 'card--press' : ''}`}
      href={video.url}
      target="_blank"
      rel="noreferrer"
      draggable={false}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onPointerLeave={cancel}
      onClick={click}
      onContextMenu={(e) => { if (t.current.active || t.current.fired) e.preventDefault() }}
    >
      <div className="thumb">
        {!broken && (
          <img src={video.thumb} alt="" draggable={false} loading="lazy" decoding="async" onError={() => setBroken(true)} />
        )}
        {broken && <span className="thumb__play"><Play /></span>}
      </div>
      <div className="card__title">{video.title}</div>
      <div className="card__meta">{meta}</div>
      <div className="tags">
        {video.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
      </div>
    </a>
  )
}

export default memo(Card)
