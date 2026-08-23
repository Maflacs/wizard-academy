import { useEffect, useState } from "react";
import { getMaxHealthForLevel } from "../utils/playerProgression";
import {
  getHealthRegenerationAmount,
  getHealthRegenerationInterval,
} from "../utils/health";
import "./InfirmaryPage.css";

function formatCountdown(seconds) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function formatInterval(milliseconds) {
  const totalSeconds = Math.round(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function InfirmaryPage({
  player,
  energyStatus,
  healthStatus,
  onTreatPlayer,
  getTreatmentCost,
  onStartResting,
  onStopResting,
}) {
  const [message, setMessage] = useState("");
  const maxHealth = getMaxHealthForLevel(player.level);
  const missingHealth = Math.max(0, maxHealth - player.health);
  const treatmentCost = getTreatmentCost(player);
  const healthHealing = getHealthRegenerationAmount(maxHealth);
  const normalHealingInterval = formatInterval(getHealthRegenerationInterval());
  const restingHealingInterval = formatInterval(
    getHealthRegenerationInterval(true),
  );

  useEffect(() => {
    if (!message) return undefined;
    const timeoutId = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timeoutId);
  }, [message]);

  function treatPlayer() {
    if (onTreatPlayer()) {
      setMessage("Az ellátás befejeződött. Életerőd teljesen helyreállt.");
    }
  }

  function startResting() {
    if (onStartResting()) {
      setMessage("Ágynyugalom kezdődött. Életerőd gyorsabban regenerálódik.");
    }
  }

  function stopResting() {
    onStopResting();
    setMessage("Felébredtél az ágynyugalomból.");
  }

  return (
    <section className="page infirmary-page">
      <p className="eyebrow">Az akadémia gyógyító szárnya</p>
      <h2>Gyengélkedő</h2>
      <p className="lead">
        Pihend ki a párbajok sebeit, és készülj fel a következő próbára.
      </p>
      <div className="infirmary-grid">
        <div className="parchment-panel recovery-panel">
          <p className="eyebrow">Életerő</p>
          <h3>
            {player.health} / {maxHealth}
          </h3>
          {missingHealth === 0 ? (
            <p>Életerőd teljesen feltöltődött.</p>
          ) : (
            <>
              <p>Automatikus gyógyulás: +{healthHealing} életerő / 10 perc</p>
              <p>
                Következő gyógyulás: {formatCountdown(healthStatus.countdown)}
              </p>
            </>
          )}
        </div>
        <div className="parchment-panel recovery-panel">
          <p className="eyebrow">Energia</p>
          <h3>
            {player.energy} / {player.maxEnergy}
          </h3>
          <p>
            {energyStatus.countdown
              ? `Következő energia: ${energyStatus.countdown}`
              : "Az energiád teljesen feltöltődött."}
          </p>
        </div>
      </div>
      <div className="parchment-panel rest-panel">
        <p className="eyebrow">Ágynyugalom</p>
        {player.isResting ? (
          <>
            <h3>A karaktered jelenleg a Gyengélkedőn pihen.</h3>
            <p>
              Életerő: {player.health} / {maxHealth}
            </p>
            <p>
              Automatikus gyógyulás: +{healthHealing} életerő /{" "}
              {restingHealingInterval}
            </p>
            <p>
              Következő gyógyulás: {formatCountdown(healthStatus.countdown)}
            </p>
            <button className="button" type="button" onClick={stopResting}>
              Felkelek
            </button>
          </>
        ) : missingHealth > 0 ? (
          <>
            <h3>Gyorsabb felépülés</h3>
            <p>
              Az ágynyugalom alatt életerőd négyszer gyorsabban regenerálódik,
              de addig nem végezhetsz más tevékenységet.
            </p>
            <p>
              Normál regeneráció: +{healthHealing} életerő /{" "}
              {normalHealingInterval}
            </p>
            <p>
              Ágynyugalom: +{healthHealing} életerő / {restingHealingInterval}
            </p>
            <button className="button" type="button" onClick={startResting}>
              Befekszem
            </button>
          </>
        ) : (
          <p>Életerőd teljesen feltöltődött.</p>
        )}
      </div>
      {missingHealth > 0 && (
        <div className="parchment-panel treatment-panel">
          <p className="eyebrow">Gyógyítói ellátás</p>
          <h3>Azonnali ellátás</h3>
          <p>Hiányzó életerő: {missingHealth}</p>
          <p>Kezelés költsége: {treatmentCost} korona</p>
          {player.gold < treatmentCost && (
            <p className="treatment-hint">
              Nincs nálad elég arany a kezeléshez.
            </p>
          )}
          <button
            className="button"
            type="button"
            onClick={treatPlayer}
            disabled={player.gold < treatmentCost}
          >
            Teljes gyógyítás
          </button>
        </div>
      )}
      {message && (
        <p className="infirmary-message" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </section>
  );
}

export default InfirmaryPage;
