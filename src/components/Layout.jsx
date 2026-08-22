import { NavLink } from "react-router-dom";
import "./Layout.css";

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

export default Layout;
