import { useNavigate } from "react-router-dom";
import { getQuestProgress, getQuestStatus, isExamReady } from "../utils/quests";
import { getAcademyYear } from "../utils/academy";
import "./QuestsPage.css";

function QuestsPage({ player, quests, onClaimQuestReward, isResting }) {
  const navigate = useNavigate();
  const academyYear = getAcademyYear(player);

  return (
    <section className="page quests-page">
      <p className="eyebrow">Az akadémia küldetései</p>
      <h2>Feladatok</h2>
      <p className="lead">
        Rövid célok, amelyek végigvezetnek az akadémia első évén.
      </p>
      {academyYear >= 2 && (
        <p className="academy-complete">I. évfolyam teljesítve</p>
      )}
      <div className="quest-list">
        {quests.map((quest) => {
          const progress = getQuestProgress(quest, player);
          const status = getQuestStatus(quest, player);
          const isExamQuest = quest.objectives.some(
            (objective) => objective.type === "examVictory",
          );
          const levelRequirement = quest.objectives.find(
            (objective) => objective.type === "minimumLevel",
          );

          return (
            <article
              className={`parchment-panel quest quest-${status}`}
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
                      Szükséges szint: {levelRequirement.required} · Jelenlegi
                      szint: {player.level}
                      {player.level < levelRequirement.required &&
                        ` · A vizsgához legalább ${levelRequirement.required}. szint szükséges.`}
                    </p>
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
                          <span>{objective.description}</span>
                          <strong>
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
                        onClick={() => navigate("/duel?exam=first-exam")}
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
        })}
      </div>
    </section>
  );
}

export default QuestsPage;
