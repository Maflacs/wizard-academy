import "./SpellsPage.css";

const spellTypeLabels = {
  attack: "Támadó",
  defense: "Védekező",
  utility: "Hasznosító",
};

function SpellsPage({ knownSpells, spells, player, manaStatus }) {
  const learnedSpells = knownSpells
    .map((spellId) => spells.find((spell) => spell.id === spellId))
    .filter((spell) => spell);

  return (
    <section className="page spells-page">
      <p className="eyebrow">Az akadémia varázsarchívuma</p>
      <h2>Varázskönyv</h2>
      <p className="lead">Az elsajátított varázslatok és azok titkai.</p>
      <p className="spell-mana">
        Mana: {player.mana} / {player.maxMana}
        {manaStatus.countdown
          ? ` · Következő mana: ${manaStatus.countdown}`
          : " · A manád teljesen feltöltődött."}
      </p>
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
                  <dt>Manaigény</dt>
                  <dd>{spell.manaCost}</dd>
                </div>
                {spell.basePower !== undefined && (
                  <div>
                    <dt>Alaperő</dt>
                    <dd>{spell.basePower}</dd>
                  </div>
                )}
                <div>
                  <dt>Szükséges szint</dt>
                  <dd>{spell.requiredLevel}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default SpellsPage;
