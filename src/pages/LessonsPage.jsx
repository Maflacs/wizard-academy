import "./LessonsPage.css";
import spells from "../data/spells";

function LessonsPage({ lessons, player, onAttendLesson, energyStatus }) {
  return (
    <section className="page">
      <p className="eyebrow">Az akadémia órarendje</p>
      <h2>Órák</h2>
      <p className="lead">
        Válassz egy tantárgyat, és szerezd meg a helyed a tudósok között.
      </p>
      <p className="lesson-energy">
        Energia: {player.energy} / {player.maxEnergy}
        {energyStatus.countdown
          ? ` · Következő energia: ${energyStatus.countdown}`
          : " · Az energiád teljesen feltöltődött."}
      </p>
      <div className="lesson-list">
        {lessons.map((lesson) => (
          <article className="lesson parchment-panel" key={lesson.id}>
            <div>
              <p className="eyebrow">{lesson.level}</p>
              <h3>{lesson.name}</h3>
              <p>{lesson.teacher}</p>
              <p className="lesson-reward">
                Energiaköltség: {lesson.energyCost} · Jutalom: {lesson.xpReward}{" "}
                XP
              </p>
              {(() => {
                const attendanceCount = player.lessonProgress[lesson.id] || 0;
                const unlocks = lesson.spellUnlocks || [];
                const nextUnlock = unlocks.find(
                  (unlock) => !player.knownSpells.includes(unlock.spellId),
                );
                const nextSpell = nextUnlock
                  ? spells.find((spell) => spell.id === nextUnlock.spellId)
                  : null;
                return (
                  <div className="lesson-progression">
                    {nextUnlock ? (
                      <>
                        <p>
                          Tanulmányi haladás: {attendanceCount} /{" "}
                          {nextUnlock.requiredAttendances}
                        </p>
                        <p>
                          Következő megtanulható varázsige: {nextSpell?.name}
                        </p>
                      </>
                    ) : (
                      <p>
                        Minden jelenlegi varázsigét megtanultál ebből a
                        tantárgyból.
                      </p>
                    )}
                    {unlocks
                      .filter((unlock) =>
                        player.knownSpells.includes(unlock.spellId),
                      )
                      .map((unlock) => {
                        const learnedSpell = spells.find(
                          (spell) => spell.id === unlock.spellId,
                        );
                        return (
                          <p key={unlock.spellId}>{learnedSpell?.name} ✓</p>
                        );
                      })}
                  </div>
                );
              })()}
            </div>
            <button
              className="button"
              type="button"
              onClick={() => onAttendLesson(lesson)}
              disabled={player.energy < lesson.energyCost}
            >
              Részt veszek
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default LessonsPage;
