import "./LessonsPage.css";

function LessonsPage({
  lessons,
  player,
  message,
  onAttendLesson,
  energyStatus,
}) {
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
      {message && <p className="game-message">{message}</p>}
    </section>
  );
}

export default LessonsPage;
