import { useState } from "react";
import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import "./App.css";

const lessons = [
  { name: "Bűbájtan", teacher: "Harangszó professzor", level: "Kezdő" },
  { name: "Növénybűvészet", teacher: "Zöldág mesternő", level: "Kezdő" },
  { name: "Mágikus védelem", teacher: "Tövis mester", level: "Haladó" },
];

function Layout({ children }) {
  // Keep navigation declarative so each game area has its own shareable route.
  return (
    <div className="game-shell">
      <header className="site-header">
        <div className="crest" aria-hidden="true">
          W
        </div>
        <div>
          <p className="eyebrow">Az Arkanum Krónikája</p>
          <h1>Csillagtorony Akadémia</h1>
        </div>
        <nav aria-label="Fő navigáció">
          <NavLink to="/" end>
            Iskola
          </NavLink>
          <NavLink to="/character">Karakter</NavLink>
          <NavLink to="/lessons">Órák</NavLink>
          <NavLink to="/shop">Bolt</NavLink>
        </nav>
      </header>
      <main>{children}</main>
      <footer>Alapítva 1372-ben · Gyertyafénynél, szorgalmas tanulással</footer>
    </div>
  );
}

function Home() {
  return (
    <section className="page home-page">
      <p className="eyebrow">I. szemeszter · Az iskola kapui kitárultak</p>
      <h2>Üdvözlünk, tanonc!</h2>
      <p className="lead">
        Megérkezett a leveled. A Vadhajtás Akadémia az öreg tölgyfaajtón túl vár
        rád.
      </p>
      <div className="notice parchment-panel">
        <div>
          <p className="eyebrow">Mai hír az akadémiáról</p>
          <h3>Alkonyatkor megszólal a könyvtár harangja</h3>
          <p>
            Az első órád előtt jelentkezz a nyugati toronynál. Hozz tintát,
            biztos kezet és legalább egy megválaszolatlan kérdést.
          </p>
        </div>
        <NavLink className="button" to="/lessons">
          Órák megtekintése
        </NavLink>
      </div>
      <div className="quick-links">
        <NavLink to="/character" className="quick-link">
          <span>✦</span>
          <strong>A karaktered</strong>
          <small>Tekintsd meg varázskönyvedet és rangodat</small>
        </NavLink>
        <NavLink to="/shop" className="quick-link">
          <span>◈</span>
          <strong>Patika és ritkaságok</strong>
          <small>Költsd el nehezen szerzett érméidet</small>
        </NavLink>
      </div>
    </section>
  );
}

function Character() {
  const [name, setName] = useState(
    () => localStorage.getItem("wizard-name") || "Névtelen tanonc",
  );
  function saveName(event) {
    event.preventDefault();
    // Keep the apprentice name between visits without introducing a backend.
    const savedName = name.trim() || "Névtelen tanonc";
    localStorage.setItem("wizard-name", savedName);
    setName(savedName);
  }
  return (
    <section className="page">
      <p className="eyebrow">A játékos nyilvántartása</p>
      <h2>Karakter</h2>
      <div className="two-column">
        <div className="parchment-panel character-sheet">
          <p className="eyebrow">Tanoncadatlap</p>
          <form onSubmit={saveName}>
            <label htmlFor="wizard-name">Név</label>
            <input
              id="wizard-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button className="button" type="submit">
              Név mentése
            </button>
          </form>
          <dl className="stats">
            <div>
              <dt>Rend</dt>
              <dd>Még nincs kijelölve</dd>
            </div>
            <div>
              <dt>Szint</dt>
              <dd>1</dd>
            </div>
            <div>
              <dt>Arany</dt>
              <dd>25 korona</dd>
            </div>
          </dl>
        </div>
        <div className="parchment-panel spellbook">
          <p className="eyebrow">Ismert varázsigék</p>
          <h3>Varázskönyv</h3>
          <ul>
            <li>✧ Fénygyújtás</li>
            <li>✧ Forrasztó bűbáj</li>
            <li>✧ Suttogó szél</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function Lessons() {
  return (
    <section className="page">
      <p className="eyebrow">Az akadémia órarendje</p>
      <h2>Órák</h2>
      <p className="lead">
        Válassz egy tantárgyat, és szerezd meg a helyed a tudósok között.
      </p>
      <div className="lesson-list">
        {lessons.map((lesson) => (
          <article className="lesson parchment-panel" key={lesson.name}>
            <div>
              <p className="eyebrow">{lesson.level}</p>
              <h3>{lesson.name}</h3>
              <p>{lesson.teacher}</p>
            </div>
            <button className="button" type="button">
              Részt veszek
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function Shop() {
  const items = [
    {
      mark: "☽",
      name: "Holdfényes tinta",
      description: "Olyan jegyzetekhez, amelyeket a nappal nem láthat.",
      price: "8 korona",
    },
    {
      mark: "♢",
      name: "Tölgyfa pálca",
      description: "Szívós, türelmes, és kissé önfejű.",
      price: "20 korona",
    },
    {
      mark: "✹",
      name: "Összpontosító elixír",
      description: "Egy teljes, zavartalan óra palackba zárva.",
      price: "12 korona",
    },
  ];
  return (
    <section className="page">
      <p className="eyebrow">A Görbe Piac</p>
      <h2>Bolt</h2>
      <p className="lead">Hasznos holmik veszélyes tanulmányokhoz.</p>
      <div className="shop-grid">
        {items.map((item) => (
          <article className="parchment-panel item" key={item.name}>
            <span className="item-mark">{item.mark}</span>
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <strong>{item.price}</strong>
            <button className="button" type="button">
              Megvásárolom
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/character" element={<Character />} />
          <Route path="/lessons" element={<Lessons />} />
          <Route path="/shop" element={<Shop />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
