import { useEffect, useState } from "react";
import "./SpellsPage.css";
import { getMaxManaForLevel } from "../utils/playerProgression";
import { formatAcademyYear } from "../utils/academy";

const spellTypeLabels = {
  attack: "Támadó",
  shield: "Pajzs",
  heal: "Gyógyító",
  utility: "Segédmágia",
};

function SpellsPage({
  knownSpells,
  preparedSpells,
  spells,
  player,
  onUpdatePreparedSpells,
}) {
  const [message, setMessage] = useState("");
  const maxMana = getMaxManaForLevel(player.level);
  const learnedSpells = knownSpells
    .map((spellId) => spells.find((spell) => spell.id === spellId))
    .filter((spell) => spell);

  useEffect(() => {
    if (!message) return undefined;
    const timeoutId = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timeoutId);
  }, [message]);

  function updatePreparedSpell(spellId, shouldPrepare) {
    if (!onUpdatePreparedSpells(spellId, shouldPrepare) && shouldPrepare) {
      setMessage("Legfeljebb 3 varázslatot készíthetsz be.");
    }
  }

  return (
    <section className="page spells-page">
      <p className="eyebrow">Az akadémia varázsarchívuma</p>
      <h2>Varázskönyv</h2>
      <p className="lead">Az elsajátított varázslatok és azok titkai.</p>
      <p className="spell-mana">Mana párbajban: {maxMana}</p>
      <div className="parchment-panel prepared-spells-panel">
        <p className="eyebrow">Bekészített varázsigék</p>
        <p>Legfeljebb 3 varázsigét használhatsz a párbajokban.</p>
        <div className="prepared-spell-slots">
          {preparedSpells.map((spellId) => {
            const spell = spells.find((candidate) => candidate.id === spellId);
            return spell ? (
              <span className="prepared-spell-slot" key={spell.id}>
                {spell.name}
                <button
                  className="text-button"
                  type="button"
                  onClick={() => updatePreparedSpell(spell.id, false)}
                >
                  Kiveszem
                </button>
              </span>
            ) : null;
          })}
        </div>
      </div>
      {learnedSpells.length === 0 ? (
        <p className="spellbook-empty">
          Még egyetlen varázslatot sem sajátítottál el.
        </p>
      ) : (
        <div className="spell-list">
          {learnedSpells.map((spell) => (
            <article className="parchment-panel spell-card" key={spell.id}>
              <p className="eyebrow">{spellTypeLabels[spell.type]}</p>
              <h3>{spell.name}</h3>
              <p>{spell.description}</p>
              <dl className="spell-details">
                <div>
                  <dt>Típus</dt>
                  <dd>{spellTypeLabels[spell.type]}</dd>
                </div>
                {spell.requiredAcademyYear > 1 && (
                  <div>
                    <dt>Évfolyam</dt>
                    <dd>{formatAcademyYear(spell.requiredAcademyYear)}</dd>
                  </div>
                )}
                <div>
                  <dt>Manaigény</dt>
                  <dd>{spell.manaCost}</dd>
                </div>
                {spell.basePower !== undefined && (
                  <div>
                    <dt>Alapsebzés</dt>
                    <dd>{spell.basePower}</dd>
                  </div>
                )}
                {spell.shieldAmount !== undefined && (
                  <div>
                    <dt>Pajzs ereje</dt>
                    <dd>{spell.shieldAmount}</dd>
                  </div>
                )}
                {spell.healAmount !== undefined && (
                  <div>
                    <dt>Gyógyítás</dt>
                    <dd>{spell.healAmount}</dd>
                  </div>
                )}
                <div>
                  <dt>Szükséges szint</dt>
                  <dd>{spell.requiredLevel}</dd>
                </div>
              </dl>
              {spell.type === "shield" && (
                <div className="shield-mechanics">
                  <p>
                    <strong>Időtartam:</strong> amíg a pajzs el nem fogy.
                  </p>
                  <p>
                    <strong>Sebzésfelfogás:</strong> a Védelem után fennmaradó
                    sebzést fogja fel.
                  </p>
                  <p>
                    <strong>Halmozódás:</strong> nem.
                  </p>
                  <p>
                    <strong>Újravarázslás:</strong> a sérült pajzsot legfeljebb
                    a varázslat teljes pajzserősségéig tölti vissza.
                  </p>
                </div>
              )}
              {spell.type === "attack" && spell.healAmount !== undefined && (
                <div className="spell-mechanics">
                  <p>
                    A varázslat támadáskor a feltüntetett értékkel gyógyít, de
                    az életerőt nem emelheti a maximum fölé.
                  </p>
                </div>
              )}
              {preparedSpells.includes(spell.id) ? (
                <button
                  className="text-button"
                  type="button"
                  onClick={() => updatePreparedSpell(spell.id, false)}
                >
                  Kiveszem
                </button>
              ) : (
                <button
                  className="button"
                  type="button"
                  onClick={() => updatePreparedSpell(spell.id, true)}
                  disabled={preparedSpells.length >= 3}
                >
                  Bekészítem
                </button>
              )}
            </article>
          ))}
        </div>
      )}
      {message && (
        <p className="spellbook-message" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  );
}

export default SpellsPage;
