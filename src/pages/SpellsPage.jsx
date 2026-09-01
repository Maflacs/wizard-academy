import { useEffect, useState } from "react";
import "./SpellsPage.css";
import { getEffectiveMaxMana } from "../utils/playerStats";
import { formatAcademyYear, getAcademyYear } from "../utils/academy";
import { getCurriculumProgress, isSpellCurrentlyEligible } from "../utils/curriculum";
import {
  getSpellDependency,
  getSpellQuickStats,
  getSpellRole,
  spellRoleLabels,
} from "../utils/spellPresentation";

const roleFilters = [
  { id: "all", label: "Összes" },
  ...Object.entries(spellRoleLabels).map(([id, label]) => ({ id, label })),
];

function QuickStats({ spell, spells }) {
  return (
    <div className="spell-quick-stats">
      {getSpellQuickStats(spell, spells).map((stat) => (
        <span key={stat.id}>{stat.label}</span>
      ))}
    </div>
  );
}

function PreparedSpellSummary({ spell, spells }) {
  return (
    <>
      <span className="prepared-spell-role">
        {spellRoleLabels[getSpellRole(spell)]}
      </span>
      <strong>{spell.name}</strong>
      <span className="prepared-spell-summary">
        {getSpellQuickStats(spell, spells).map((stat) => stat.label).join(" · ")}
      </span>
    </>
  );
}

function SpellDetails({ spell, spells }) {
  const dependency = getSpellDependency(spell, spells);
  const conversionExamples = dependency?.sourceEffect?.charges
    ? Array.from(
        { length: dependency.sourceEffect.charges + 1 },
        (_, index) => dependency.sourceEffect.charges - index,
      )
    : [];
  return (
    <div className="spell-expanded-details">
      <dl className="spell-details">
        <div><dt>Manaigény</dt><dd>{spell.manaCost}</dd></div>
        {spell.basePower !== undefined && <div><dt>Alapsebzés</dt><dd>{spell.basePower}</dd></div>}
        {spell.shieldAmount !== undefined && <div><dt>Pajzs ereje</dt><dd>{spell.shieldAmount}</dd></div>}
        {spell.healAmount !== undefined && <div><dt>Gyógyítás</dt><dd>{spell.healAmount}</dd></div>}
        {spell.critChanceBonus !== undefined && <div><dt>Kritikus bónusz</dt><dd>+{spell.critChanceBonus}%</dd></div>}
        {spell.effect?.trigger === "playerDamagingAttack" && <div><dt>{spell.effect.name}</dt><dd>+{spell.effect.magnitude}% · {spell.effect.charges} támadás</dd></div>}
        {spell.effect?.damage !== undefined && <div><dt>{spell.effect.name}</dt><dd>{spell.effect.damage} sebzés · {spell.effect.charges} alkalom</dd></div>}
        {spell.effect?.trigger === "enemyDamagingAttack" && <div><dt>{spell.effect.name}</dt><dd>-{spell.effect.magnitude}% · {spell.effect.charges} támadás</dd></div>}
        {spell.effectInteraction?.mode === "consume-all-for-damage" && <div><dt>Sebezhető átalakítása</dt><dd>+{spell.effectInteraction.damageBonusPerCharge}% / hátralévő alkalom</dd></div>}
        {spell.effectInteraction?.mode === "consume-all-damage-ticks" && <div><dt>Mérgezett átalakítása</dt><dd>Hátralévő hatások azonnal</dd></div>}
        {spell.effectInteraction?.mode === "consume-all-for-shield" && <div><dt>Alappajzs</dt><dd>{spell.effectInteraction.baseShieldAmount}</dd></div>}
        {spell.effectInteraction?.mode === "consume-all-for-shield" && <div><dt>{spell.effectInteraction.effectName}</dt><dd>+{spell.effectInteraction.shieldPerCharge} pajzs / alkalom</dd></div>}
        {spell.intentInteraction?.mode === "damage-multiplier" && <div><dt>Védekező szándék</dt><dd>+{spell.intentInteraction.magnitude}% sebzés</dd></div>}
        {spell.intentInteraction?.mode === "heal" && <div><dt>Támadó szándék</dt><dd>+{spell.intentInteraction.healAmount} életerő</dd></div>}
        {spell.intentInteraction?.mode === "shield-bonus" && <div><dt>Erős támadás</dt><dd>+{spell.intentInteraction.shieldBonus} pajzs</dd></div>}
        <div><dt>Szükséges szint</dt><dd>{spell.requiredLevel}</dd></div>
      </dl>
      {spell.type === "shield" && !spell.effectInteraction && (
        <div className="spell-mechanics">
          <p><strong>Időtartam:</strong> amíg a pajzs el nem fogy.</p>
          <p><strong>Sebzésfelfogás:</strong> a Védelem után fennmaradó sebzést fogja fel.</p>
          <p><strong>Halmozódás:</strong> nem.</p>
          <p><strong>Újravarázslás:</strong> legfeljebb a varázslat teljes pajzserősségéig állítja helyre.</p>
        </div>
      )}
      {spell.effect?.trigger === "playerDamagingAttack" && (
        <p className="spell-mechanics">
          A találat után az ellenfél a következő {spell.effect.charges} sebző
          támadásból {spell.effect.magnitude}%-kal több sebzést kap.
        </p>
      )}
      {spell.effect?.damage !== undefined && (
        <p className="spell-mechanics">
          A következő {spell.effect.charges} sebző ellenséges akció előtt{" "}
          {spell.effect.damage} sebzést okoz; ezt az ellenséges pajzs felfoghatja.
        </p>
      )}
      {spell.effect?.trigger === "enemyDamagingAttack" && (
        <p className="spell-mechanics">
          A Védelem után {spell.effect.magnitude}%-kal csökkenti a következő{" "}
          {spell.effect.charges} ellenséges támadás sebzését, még a pajzs előtt.
        </p>
      )}
      {spell.effectInteraction?.mode === "consume-all-for-damage" && (
        <p className="spell-mechanics">
          Sebezhető célpont ellen a megmaradt Sebezhető alkalmakat
          felhasználja, és alkalmanként +
          {spell.effectInteraction.damageBonusPerCharge}% sebzést okoz. Nem
          kapja meg emellett a Sebezhető szokásos sebzésbónuszát.
        </p>
      )}
      {spell.effectInteraction?.mode === "consume-all-damage-ticks" && (
        <p className="spell-mechanics">
          A normál találat után az összes megmaradt Mérgezett alkalmat azonnal
          aktiválja. A méreg változatlan sebzést okoz, amelyet az ellenséges
          pajzs továbbra is felfoghat.
        </p>
      )}
      {spell.effectInteraction?.mode === "consume-all-for-shield" && (
        <div className="spell-mechanics">
          {dependency && (
            <p>
              A {dependency.effectName} hatást a {dependency.sourceSpell.name}{" "}
              hozza létre; ez az {spell.name} opcionális erősítése.
            </p>
          )}
          <p>
            Az {spell.name} önmagában {spell.effectInteraction.baseShieldAmount}{" "}
            pajzserőt biztosít.
          </p>
          <p>
            Ha aktív {spell.effectInteraction.effectName} hatásod van, az
            {spell.name} felhasználja annak összes hátralévő alkalmát, és
            alkalmanként további {spell.effectInteraction.shieldPerCharge}{" "}
            pajzserőt ad.
          </p>
          {conversionExamples.length > 0 && (
            <p>
              Példák: {conversionExamples.map(
                (charges) =>
                  `${charges} alkalom → ${spell.effectInteraction.baseShieldAmount + charges * spell.effectInteraction.shieldPerCharge} pajzs`,
              ).join(" · ")}
            </p>
          )}
          <p><strong>Halmozódás:</strong> nem; gyengébb pajzs nem írhat felül erősebbet.</p>
        </div>
      )}
      {spell.type === "attack" && spell.healAmount !== undefined && (
        <p className="spell-mechanics">A találat a feltüntetett értékkel gyógyít, de nem emeli az életerőt a maximum fölé.</p>
      )}
      {spell.intentInteraction?.mode === "damage-multiplier" && (
        <p className="spell-mechanics">
          Ha az ellenfél következő szándéka Védekező mágia, az {spell.name}{" "}
          +{spell.intentInteraction.magnitude}% sebzést okoz.
        </p>
      )}
      {spell.intentInteraction?.mode === "heal" && (
        <p className="spell-mechanics">
          Ha az ellenfél támadásra készül, a {spell.name} legfeljebb{" "}
          {spell.intentInteraction.healAmount} életerőt állít helyre.
        </p>
      )}
      {spell.intentInteraction?.mode === "shield-bonus" && (
        <p className="spell-mechanics">
          Erős támadás előtt a pajzs ereje {spell.shieldAmount}-ról{" "}
          {spell.shieldAmount + spell.intentInteraction.shieldBonus}-ra nő.
        </p>
      )}
    </div>
  );
}

function FilterTabs({ label, options, value, onChange }) {
  return (
    <div className="spell-filter-group">
      <p className="eyebrow">{label}</p>
      <div className="spell-filter-tabs">
        {options.map((option) => (
          <button
            className={`text-button spell-filter ${value === option.id ? "active" : ""}`}
            type="button"
            key={option.id}
            onClick={() => onChange(option.id)}
            aria-pressed={value === option.id}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SpellsPage({ knownSpells, preparedSpells, spells, lessons, items, player, onUpdatePreparedSpells }) {
  const [message, setMessage] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [expandedSpells, setExpandedSpells] = useState(new Set());
  const [replacementSpellId, setReplacementSpellId] = useState(null);
  const maxMana = getEffectiveMaxMana(player, items);
  const academyYear = getAcademyYear(player);
  const curriculumUnlocks = lessons.flatMap((lesson) =>
    (lesson.spellUnlocks || []).map((unlock) => ({ ...unlock, lessonId: lesson.id })),
  );
  const curriculumSpellIds = new Set(curriculumUnlocks.map((unlock) => unlock.spellId));
  const availableSpells = spells
    .map((spell, originalIndex) => ({ spell, originalIndex }))
    .filter(({ spell }) => knownSpells.includes(spell.id) || curriculumSpellIds.has(spell.id))
    .sort((first, second) => {
      const firstUnlock = curriculumUnlocks.find((unlock) => unlock.spellId === first.spell.id);
      const secondUnlock = curriculumUnlocks.find((unlock) => unlock.spellId === second.spell.id);
      return (
        (first.spell.requiredAcademyYear ?? 1) - (second.spell.requiredAcademyYear ?? 1) ||
        (firstUnlock?.requiredProgress ?? Number.MAX_SAFE_INTEGER) - (secondUnlock?.requiredProgress ?? Number.MAX_SAFE_INTEGER) ||
        first.originalIndex - second.originalIndex
      );
    })
    .map(({ spell }) => spell);
  const yearOptions = [
    { id: "all", label: "Összes" },
    ...[...new Set(availableSpells.map((spell) => spell.requiredAcademyYear ?? 1))]
      .sort((a, b) => a - b)
      .map((year) => ({ id: String(year), label: formatAcademyYear(year) })),
  ];
  const filteredSpells = availableSpells.filter(
    (spell) =>
      (roleFilter === "all" || getSpellRole(spell) === roleFilter) &&
      (yearFilter === "all" || (spell.requiredAcademyYear ?? 1) === Number(yearFilter)),
  );
  const missingPreparedDependencies = preparedSpells.flatMap((spellId) => {
    const spell = spells.find((candidate) => candidate.id === spellId);
    if (!spell) return [];
    const dependency = getSpellDependency(spell, spells);
    if (
      !dependency ||
      spell.effectInteraction.effectOptional ||
      preparedSpells.includes(dependency.sourceSpell.id)
    ) {
      return [];
    }
    return [{ spell, dependency }];
  });

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

  function requestPrepareSpell(spellId) {
    if (
      preparedSpells.length >= 3 &&
      !preparedSpells.includes(spellId)
    ) {
      setReplacementSpellId(spellId);
      setMessage("");
      return;
    }
    updatePreparedSpell(spellId, true);
  }

  function replacePreparedSpell(preparedSpellId) {
    if (!replacementSpellId) return;
    if (
      onUpdatePreparedSpells(
        replacementSpellId,
        true,
        preparedSpellId,
      )
    ) {
      setReplacementSpellId(null);
    }
  }

  function toggleDetails(spellId) {
    setExpandedSpells((current) => {
      const next = new Set(current);
      if (next.has(spellId)) next.delete(spellId);
      else next.add(spellId);
      return next;
    });
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
        {replacementSpellId && (
          <div className="replacement-message" role="status">
            <p>
              Válaszd ki, melyik bekészített varázslat helyére kerüljön az új
              varázslat.
            </p>
            <button
              className="text-button"
              type="button"
              onClick={() => setReplacementSpellId(null)}
            >
              Mégse
            </button>
          </div>
        )}
        <div className="prepared-spell-slots">
          {preparedSpells.map((spellId) => {
            const spell = spells.find((candidate) => candidate.id === spellId);
            if (!spell) return null;
            return replacementSpellId ? (
              <button
                className="prepared-spell-slot replacement-target"
                type="button"
                key={spell.id}
                onClick={() => replacePreparedSpell(spell.id)}
                aria-label={`${spell.name} lecserélése`}
              >
                <PreparedSpellSummary spell={spell} spells={spells} />
                <span className="replacement-target-label">Ezt cserélem le</span>
              </button>
            ) : (
              <article className="prepared-spell-slot" key={spell.id}>
                <PreparedSpellSummary spell={spell} spells={spells} />
                <button className="text-button" type="button" onClick={() => updatePreparedSpell(spell.id, false)}>Kiveszem</button>
              </article>
            );
          })}
        </div>
        {missingPreparedDependencies.map(({ spell, dependency }) => (
          <p className="spellbook-message" role="status" key={spell.id}>
            A {spell.name} használatához {dependency.effectName} szükséges,
            amelyet a {dependency.sourceSpell.name} hoz létre. A{" "}
            {dependency.sourceSpell.name} jelenleg nincs bekészítve.
          </p>
        ))}
      </div>
      <div className="parchment-panel spell-filters">
        <FilterTabs label="Típus" options={roleFilters} value={roleFilter} onChange={setRoleFilter} />
        <FilterTabs label="Évfolyam" options={yearOptions} value={yearFilter} onChange={setYearFilter} />
      </div>
      {filteredSpells.length === 0 ? (
        <p className="spellbook-empty">Nincs ilyen varázslat a kiválasztott évfolyamon.</p>
      ) : (
        <div className="spell-list">
          {filteredSpells.map((spell) => {
            const unlock = curriculumUnlocks.find((candidate) => candidate.spellId === spell.id);
            const curriculumProgress = unlock ? getCurriculumProgress(player, unlock.lessonId) : null;
            const isKnown = knownSpells.includes(spell.id);
            const eligible = isSpellCurrentlyEligible(player, spell, academyYear);
            const prepared = preparedSpells.includes(spell.id);
            const canPrepare = isKnown && eligible;
            const expanded = expandedSpells.has(spell.id);
            const missingProgress = unlock && curriculumProgress < unlock.requiredProgress;
            const missingLevel = player.level < (spell.requiredLevel ?? 1);
            const missingYear = academyYear < (spell.requiredAcademyYear ?? 1);
            return (
              <article className={`parchment-panel spell-card ${isKnown ? "spell-known" : "spell-locked"} ${replacementSpellId === spell.id ? "replacement-source" : ""}`} key={spell.id}>
                <div className="spell-card-heading">
                  <div><p className="eyebrow">{spellRoleLabels[getSpellRole(spell)]}</p><h3>{spell.name}</h3></div>
                  <div className="spell-state"><strong>{isKnown ? "Megtanulva" : "Zárolva"}</strong>{prepared && <span>Bekészítve</span>}</div>
                </div>
                <p className="spell-description">{spell.description}</p>
                <QuickStats spell={spell} spells={spells} />
                <p className="spell-year">{formatAcademyYear(spell.requiredAcademyYear ?? 1)} évfolyam</p>
                {replacementSpellId === spell.id && (
                  <p className="replacement-source-label">
                    Ezt a varázslatot szeretnéd bekészíteni
                  </p>
                )}
                {!isKnown && (missingProgress || missingLevel || missingYear) && (
                  <div className="spell-requirements">
                    {missingProgress && <p>Tanulmányi haladás: {curriculumProgress} / {unlock.requiredProgress}</p>}
                    {missingLevel && <p>Szükséges szint: {spell.requiredLevel} — jelenlegi: {player.level}</p>}
                    {missingYear && <p>Szükséges évfolyam: {formatAcademyYear(spell.requiredAcademyYear)} — jelenlegi: {formatAcademyYear(academyYear)}</p>}
                  </div>
                )}
                {isKnown && !eligible && (
                  <div className="spell-requirements">
                    {missingLevel && <p>Szükséges szint: {spell.requiredLevel} — jelenlegi: {player.level}</p>}
                    {missingYear && <p>Szükséges évfolyam: {formatAcademyYear(spell.requiredAcademyYear)} — jelenlegi: {formatAcademyYear(academyYear)}</p>}
                  </div>
                )}
                <button className="text-button spell-details-toggle" type="button" onClick={() => toggleDetails(spell.id)} aria-expanded={expanded}>Részletek {expanded ? "▴" : "▾"}</button>
                {expanded && <SpellDetails spell={spell} spells={spells} />}
                <div className="spell-card-action">
                  {!canPrepare ? (
                    <button className="button" type="button" disabled>Zárolva</button>
                  ) : prepared ? (
                    <button className="text-button" type="button" onClick={() => updatePreparedSpell(spell.id, false)}>Kiveszem</button>
                  ) : (
                    <button className="button" type="button" onClick={() => requestPrepareSpell(spell.id)}>Bekészítem</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {message && <p className="spellbook-message" role="status" aria-live="polite">{message}</p>}
    </section>
  );
}

export default SpellsPage;
