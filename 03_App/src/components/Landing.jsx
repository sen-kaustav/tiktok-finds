import { ArrowRight } from '../icons.jsx';

export default function Landing({ counts, loading, onPick, onSignOut }) {
  return (
    <main className="landing">
      <div className="brand">
        <img
          className="brand__logo"
          src={`${import.meta.env.BASE_URL}favicon.svg`}
          alt=""
        />
        TikTok Finds
      </div>
      <h1 className="display">What are you looking for today?</h1>
      <p className="muted">
        Easily filter and search through your shared TikTok videos.
      </p>
      <div className="grow" />
      <button className="big big--recipe" onClick={() => onPick('recipe')}>
        <span className="big__text">
          <span className="big__title">Explore recipes</span>
          <span className="big__sub">
            {loading ? 'Loading…' : `${counts.recipe} things to cook`}
          </span>
        </span>
        <ArrowRight />
      </button>
      <button className="big big--joint" onClick={() => onPick('restaurant')}>
        <span className="big__text">
          <span className="big__title">Food joints</span>
          <span className="big__sub">
            {loading ? 'Loading…' : `${counts.restaurant} places to eat`}
          </span>
        </span>
        <ArrowRight />
      </button>
      <button className="signout" onClick={onSignOut}>Sign out</button>
    </main>
  );
}
