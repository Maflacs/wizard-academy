import { useState } from "react";
import "./CharacterPage.css";

function CharacterPage({ player, onSaveName }) {
  const [name, setName] = useState(player.name);

  function saveName(event) {
    event.preventDefault();
    const savedName = name.trim() || "Névtelen tanonc";
    onSaveName(savedName);
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
              <dd>{player.level}</dd>
            </div>
            <div>
              <dt>Tapasztalat</dt>
              <dd>{player.xp} XP</dd>
            </div>
            <div>
              <dt>Arany</dt>
              <dd>{player.gold} korona</dd>
            </div>
            <div>
              <dt>Energia</dt>
              <dd>
                {player.energy} / {player.maxEnergy}
              </dd>
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

export default CharacterPage;
