import { getQuestProgress } from "../utils/quests";
import "./QuestsPage.css";

function QuestsPage({ player, quests, onClaimQuestReward }) {
  return (
    <section className="page quests-page">
      <p className="eyebrow">Az akadémia küldetései</p>
      <h2>Feladatok</h2>
      <p className="lead">Rövid célok, amelyek végigvezetnek az első héten.</p>
      <div className="quest-list">
        {quests.map((quest) => {
          const progress = getQuestProgress(quest, player);
          const claimed = player.claimedQuests.includes(quest.id);

          return (
            <article className="parchment-panel quest" key={quest.id}>
              <div className="quest-heading">
                <div>
                  <p className="eyebrow">Iskolai feladat</p>
                  <h3>{quest.name}</h3>
                </div>
                <strong>
                  Haladás: {progress.completedObjectives} /{" "}
                  {quest.objectives.length}
                </strong>
              </div>
              <p>{quest.description}</p>
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
                {claimed ? (
                  <button className="button" type="button" disabled>
                    Jutalom átvéve
                  </button>
                ) : (
                  <button
                    className="button"
                    type="button"
                    onClick={() => onClaimQuestReward(quest)}
                    disabled={!progress.isComplete}
                  >
                    Jutalom átvétele
                  </button>
                )}
              </div>
              {progress.isComplete && !claimed && (
                <p className="quest-complete">A feladat teljesítve.</p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default QuestsPage;
