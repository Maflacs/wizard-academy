import { useState } from 'react'
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom'
import './App.css'

const lessons = [
  { name: 'Charms', teacher: 'Professor Bellwether', level: 'Beginner' },
  { name: 'Herbology', teacher: 'Mistress Greenbriar', level: 'Beginner' },
  { name: 'Defensive Magic', teacher: 'Master Thorn', level: 'Intermediate' },
]

function Layout({ children }) {
  return <div className="game-shell">
    <header className="site-header">
      <div className="crest" aria-hidden="true">W</div>
      <div><p className="eyebrow">The Arcane Register</p><h1>Wyrdwood Academy</h1></div>
      <nav aria-label="Main navigation">
        <NavLink to="/" end>School</NavLink><NavLink to="/character">Character</NavLink>
        <NavLink to="/lessons">Lessons</NavLink><NavLink to="/shop">Shop</NavLink>
      </nav>
    </header>
    <main>{children}</main>
    <footer>Est. 1372 · By candlelight and careful study</footer>
  </div>
}

function Home() {
  return <section className="page home-page">
    <p className="eyebrow">Term I · The school gates are open</p><h2>Welcome, apprentice.</h2>
    <p className="lead">Your letter has arrived. Wyrdwood Academy awaits beyond the old oak door.</p>
    <div className="notice parchment-panel"><div><p className="eyebrow">Today at the academy</p><h3>The library bell rings at dusk</h3><p>Report to the west tower before your first lesson. Bring ink, a steady hand, and one unanswered question.</p></div><NavLink className="button" to="/lessons">View lessons</NavLink></div>
    <div className="quick-links"><NavLink to="/character" className="quick-link"><span>✦</span><strong>Your character</strong><small>View your spellbook and standing</small></NavLink><NavLink to="/shop" className="quick-link"><span>◈</span><strong>Apothecary &amp; curios</strong><small>Spend your hard-earned coins</small></NavLink></div>
  </section>
}

function Character() {
  const [name, setName] = useState(() => localStorage.getItem('wizard-name') || 'Unnamed Apprentice')
  function saveName(event) { event.preventDefault(); const savedName = name.trim() || 'Unnamed Apprentice'; localStorage.setItem('wizard-name', savedName); setName(savedName) }
  return <section className="page"><p className="eyebrow">The player ledger</p><h2>Character</h2><div className="two-column">
    <div className="parchment-panel character-sheet"><p className="eyebrow">Apprentice profile</p><form onSubmit={saveName}><label htmlFor="wizard-name">Name</label><input id="wizard-name" value={name} onChange={(event) => setName(event.target.value)} /><button className="button" type="submit">Save name</button></form><dl className="stats"><div><dt>House</dt><dd>Unassigned</dd></div><div><dt>Level</dt><dd>1</dd></div><div><dt>Gold</dt><dd>25 crowns</dd></div></dl></div>
    <div className="parchment-panel spellbook"><p className="eyebrow">Known incantations</p><h3>Spellbook</h3><ul><li>✧ Lumos</li><li>✧ Mending Charm</li><li>✧ Whisperwind</li></ul></div>
  </div></section>
}

function Lessons() {
  return <section className="page"><p className="eyebrow">The academy timetable</p><h2>Lessons</h2><p className="lead">Choose a discipline and earn your place among the scholars.</p><div className="lesson-list">{lessons.map((lesson) => <article className="lesson parchment-panel" key={lesson.name}><div><p className="eyebrow">{lesson.level}</p><h3>{lesson.name}</h3><p>{lesson.teacher}</p></div><button className="button" type="button">Attend</button></article>)}</div></section>
}

function Shop() {
  const items = [{ mark: '☽', name: 'Moonlit Ink', description: 'For notes that must not be read by daylight.', price: '8 crowns' }, { mark: '♢', name: 'Oak Wand', description: 'Sturdy, patient, and slightly opinionated.', price: '20 crowns' }, { mark: '✹', name: 'Focus Elixir', description: 'One careful hour in a bottle.', price: '12 crowns' }]
  return <section className="page"><p className="eyebrow">The crooked market</p><h2>Shop</h2><p className="lead">Useful things for dangerous studies.</p><div className="shop-grid">{items.map((item) => <article className="parchment-panel item" key={item.name}><span className="item-mark">{item.mark}</span><h3>{item.name}</h3><p>{item.description}</p><strong>{item.price}</strong><button className="button" type="button">Purchase</button></article>)}</div></section>
}

function App() {
  return <BrowserRouter><Layout><Routes><Route path="/" element={<Home />} /><Route path="/character" element={<Character />} /><Route path="/lessons" element={<Lessons />} /><Route path="/shop" element={<Shop />} /></Routes></Layout></BrowserRouter>
}

export default App
