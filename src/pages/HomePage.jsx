import { NavLink } from "react-router-dom";
import "./HomePage.css";

function HomePage() {
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

export default HomePage;
