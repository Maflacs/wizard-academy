import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getQuestExamId,
  getQuestProgress,
  getQuestStatus,
  isExamReady,
} from "../utils/quests";
import {
  formatAcademyYear,
  getAcademyYear,
  getCompletedAcademyYears,
} from "../utils/academy";
import "./QuestsPage.css";

function getQuestAcademyYear(quest) {
  return quest.academyYear ?? 1;
}

function QuestsPage({ player, quests, enemies, onClaimQuestReward, isResting }) {
  const navigate = useNavigate();
  const academyYear = getAcademyYear(player);
  const [expandedQuests, setExpandedQuests] = useState(new Set());
  const [expandedYears, setExpandedYears] = useState(new Set());
  const completedYears = getCompletedAcademyYears(player);
  const currentQuests = completedYears.includes(academyYear)
    ? []
    : quests.filter(
        (quest) => getQuestAcademyYear(quest) === academyYear,
      );

  function toggleYear(year) {
    setExpandedYears((current) => {
      const next = new Set(current);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }

  function renderQuest(quest, isArchived = false) {
    const progress = getQuestProgress(quest, player);
    const status = getQuestStatus(quest, player);
    const isExamQuest = quest.objectives.some(
      (objective) => objective.type === "examVictory",
    );
    const examId = getQuestExamId(quest);
    const examOpponent = enemies.find((enemy) => enemy.examId === examId);
    const specialMechanic = examOpponent?.specialMechanic;
    const levelRequirement = quest.objectives.find(
      (objective) => objective.type === "minimumLevel",
    );
    const canCollapse = isArchived || status === "claimed";
    const isExpanded = !canCollapse || expandedQuests.has(quest.id);
    function toggleQuest() {
      setExpandedQuests((current) => {
        const next = new Set(current);
        if (next.has(quest.id)) next.delete(quest.id);
        else next.add(quest.id);
        return next;
      });
    }

    return (
      <article
        className={`parchment-panel quest quest-${status} ${isArchived ? "quest-archived" : ""} ${isExpanded ? "quest-expanded" : "quest-collapsed"}`}
        key={quest.id}
      >
        <div className="quest-heading">
          <div>
            <p className="eyebrow">Iskolai feladat</p>
            <h3>{quest.name}</h3>
          </div>
          <strong className="quest-status">
            {status === "locked"
              ? "Zárolva"
              : status === "claimed"
                ? "Teljesítve ✓"
                : status === "complete"
                  ? "Teljesítve"
                  : "Aktív"}
          </strong>
          {canCollapse && (
            <button
              className="text-button quest-toggle"
              type="button"
              onClick={toggleQuest}
              aria-expanded={isExpanded}
              aria-label={`${quest.name} ${isExpanded ? "összecsukása" : "kibontása"}`}
            >
              {isArchived ? (isExpanded ? "▾" : "▸") : isExpanded ? "Összecsukom" : "Megnézem"}
            </button>
          )}
        </div>
        {status === "locked" ? (
          <p className="quest-locked">
            Az előző akadémiai feladat teljesítése szükséges.
          </p>
        ) : (
          <>
            <p>{quest.description}</p>
            {isExamQuest && levelRequirement && (
              <p className="quest-requirement">
                Szükséges szint: {levelRequirement.required} · Jelenlegi szint:{" "}
                {player.level}
                {player.level < levelRequirement.required &&
                  ` · ${levelRequirement.required}. szint szükséges a záróvizsgához.`}
              </p>
            )}
            {isExamQuest && specialMechanic && (
              <aside className="quest-special-rule">
                <p className="eyebrow">{specialMechanic.title}</p>
                <p>
                  {specialMechanic.description} Pajzs ereje:{" "}
                  {specialMechanic.shieldAmount}.
                </p>
                <p>{specialMechanic.basicAttackNote}</p>
              </aside>
            )}
            <ul className="quest-objectives">
              {progress.objectives.map((objective) => {
                const complete = objective.current >= objective.required;
                return (
                  <li
                    className={complete ? "completed" : ""}
                    key={objective.id}
                  >
                    <span className="objective-mark" aria-hidden="true">
                      {complete ? "✓" : "○"}
                    </span>
                    <span className="quest-objective-copy">
                      <span>{objective.description}</span>
                      {objective.helperLines && (
                        <small className="quest-objective-help">
                          {objective.helperLines.map((line) => (
                            <span key={line}>{line}</span>
                          ))}
                        </small>
                      )}
                    </span>
                    <strong>
                      {objective.progressLabel && `${objective.progressLabel}: `}
                      {objective.current} / {objective.required}
                    </strong>
                  </li>
                );
              })}
            </ul>
            <div className="quest-footer">
              <div>
                <p className="eyebrow">Jutalom</p>
                <p>
                  +{quest.rewards.xp} XP · +{quest.rewards.gold} korona
                </p>
              </div>
              {status === "claimed" ? (
                <button className="button" type="button" disabled>
                  Jutalom átvéve
                </button>
              ) : isExamQuest && status === "active" ? (
                <button
                  className="button"
                  type="button"
                  onClick={() => navigate(`/duel?exam=${examId}`)}
                  disabled={isResting || !isExamReady(quest, player)}
                >
                  {isExamReady(quest, player)
                    ? "Vizsga megkezdése"
                    : "A vizsga még nem áll készen"}
                </button>
              ) : (
                <button
                  className="button"
                  type="button"
                  onClick={() => onClaimQuestReward(quest)}
                  disabled={isResting || status !== "complete"}
                >
                  Jutalom átvétele
                </button>
              )}
            </div>
            {status === "complete" && (
              <p className="quest-complete">A feladat teljesítve.</p>
            )}
          </>
        )}
      </article>
    );
  }

  return (
    <section className="page quests-page">
      <p className="eyebrow">Az akadémia küldetései</p>
      <h2>Feladatok</h2>
      <p className="lead">
        Rövid célok, amelyek végigvezetnek az akadémiai éveken.
      </p>
      {completedYears.map((year) => {
        const isExpanded = expandedYears.has(year);
        const yearQuests = quests.filter(
          (quest) => getQuestAcademyYear(quest) === year,
        );

        return (
          <section className="academy-complete" key={year}>
            <button
              className="text-button academy-complete-toggle"
              type="button"
              onClick={() => toggleYear(year)}
              aria-expanded={isExpanded}
            >
              {formatAcademyYear(year)} évfolyam teljesítve{" "}
              {isExpanded ? "▾" : "▸"}
            </button>
            {isExpanded && (
              <div className="quest-list academy-complete-quests">
                {yearQuests.map((quest) => renderQuest(quest, true))}
              </div>
            )}
          </section>
        );
      })}
      {currentQuests.length > 0 && (
        <h3 className="current-academy-year">
          {formatAcademyYear(academyYear)} évfolyam
        </h3>
      )}
      <div className="quest-list">
        {currentQuests.map((quest) => renderQuest(quest))}
      </div>
    </section>
  );
}

export default QuestsPage;
