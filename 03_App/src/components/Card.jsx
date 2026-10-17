import { memo, useState } from 'react'
import { formatDate } from '../data.js'
import { Play } from '../icons.jsx'

function Card({ video }) {
  const [broken, setBroken] = useState(false)
  const meta = [video.place, formatDate(video.time)].filter(Boolean).join(' · ')
  return (
    <a className="card" href={video.url} target="_blank" rel="noreferrer">
      <div className="thumb">
        {!broken && (
          <img src={video.thumb} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} />
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
