import { useState } from "react";
import "./LessonsPage.css";
import spells from "../data/spells";
import { formatAcademyYear, getAcademyYear } from "../utils/academy";
import {
  getCurriculumCap,
  getCurriculumProgress,
  getSubjectCurriculumYear,
} from "../utils/curriculum";

function LessonsPage({
  lessons,
  player,
  onAttendLesson,
  energyStatus,
  isResting,
}) {
  const academyYear = getAcademyYear(player);
  const [expandedLearnedSpells, setExpandedLearnedSpells] = useState(
    new Set(),
  );

  function toggleLearnedSpells(lessonId) {
    setExpandedLearnedSpells((current) => {
      const next = new Set(current);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  }

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
              {(() => {
                const progress = getCurriculumProgress(player, lesson.id);
                const cap = getCurriculumCap(academyYear);
                const curriculumYear = getSubjectCurriculumYear(
                  progress,
                  academyYear,
                );
                return (
                  <p className="eyebrow">
                    {progress >= cap
                      ? `${formatAcademyYear(curriculumYear)} évfolyam tananyaga teljesítve`
                      : `${formatAcademyYear(curriculumYear)} évfolyamos tananyag`}
                  </p>
                );
              })()}
              <h3>{lesson.name}</h3>
              <p>{lesson.teacher}</p>
              <p className="lesson-reward">
                Energiaköltség: {lesson.energyCost} · Jutalom: {lesson.xpReward}{" "}
                XP
              </p>
              {(() => {
                const curriculumProgress = getCurriculumProgress(
                  player,
                  lesson.id,
                );
                const curriculumCap = getCurriculumCap(academyYear);
                const unlocks = lesson.spellUnlocks || [];
                const nextUnlock = unlocks.find(
                  (unlock) => !player.knownSpells.includes(unlock.spellId),
                );
                const nextSpell = nextUnlock
                  ? spells.find((spell) => spell.id === nextUnlock.spellId)
                  : null;
                const learnedUnlocks = unlocks.filter((unlock) =>
                  player.knownSpells.includes(unlock.spellId),
                );
                const learnedExpanded = expandedLearnedSpells.has(lesson.id);
                const atCurriculumCap = curriculumProgress >= curriculumCap;
                return (
                  <div className="lesson-progression">
                    <p className="curriculum-progress-label">
                      Tanulmányi haladás: {curriculumProgress} / {curriculumCap}
                    </p>
                    <div
                      className="curriculum-progress-track"
                      aria-hidden="true"
                    >
                      <span
                        style={{
                          width: `${Math.min(100, (curriculumProgress / curriculumCap) * 100)}%`,
                        }}
                      />
                    </div>
                    {atCurriculumCap && (
                      <p className="curriculum-cap-message">
                        Az évfolyam tananyagát teljesítetted.
                      </p>
                    )}
                    {nextUnlock ? (
                      <div className="next-curriculum">
                        <p className="eyebrow">Következő</p>
                        <p className="next-spell">
                          <strong>{nextSpell?.name}</strong> — {nextUnlock.requiredProgress}
                        </p>
                        {player.level < nextUnlock.requiredLevel && (
                          <p className="curriculum-warning">
                            Még nem vagy elég tapasztalt az elsajátításához.
                            Szükséges szint: {nextUnlock.requiredLevel}.
                          </p>
                        )}
                        {academyYear < nextUnlock.requiredAcademyYear && (
                          <p className="curriculum-warning">
                            Ehhez a tananyaghoz előbb el kell érned a{" "}
                            {formatAcademyYear(nextUnlock.requiredAcademyYear)}{" "}
                            évfolyamot.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p>
                        Ehhez az évfolyamhoz jelenleg nincs további
                        megtanulható varázsige ebből a tantárgyból.
                      </p>
                    )}
                    {learnedUnlocks.length > 0 && (
                      <div className="learned-curriculum">
                        <button
                          className="text-button learned-curriculum-toggle"
                          type="button"
                          onClick={() => toggleLearnedSpells(lesson.id)}
                          aria-expanded={learnedExpanded}
                        >
                          Megtanult varázslatok ({learnedUnlocks.length}){" "}
                          {learnedExpanded ? "▾" : "▸"}
                        </button>
                        {learnedExpanded && (
                          <div className="learned-curriculum-list">
                            {learnedUnlocks.map((unlock) => {
                        const learnedSpell = spells.find(
                          (spell) => spell.id === unlock.spellId,
                        );
                        return (
                          <p key={unlock.spellId}>
                            ✓ {learnedSpell?.name} —{" "}
                            {unlock.requiredProgress}
                          </p>
                        );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <button
              className="button"
              type="button"
              onClick={() => onAttendLesson(lesson)}
              disabled={isResting || player.energy < lesson.energyCost}
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
