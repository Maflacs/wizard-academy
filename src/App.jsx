import { useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import lessons from "./data/lessons";
import CharacterPage from "./pages/CharacterPage";
import HomePage from "./pages/HomePage";
import LessonsPage from "./pages/LessonsPage";
import ShopPage from "./pages/ShopPage";

const initialPlayer = {
  name: "Névtelen tanonc",
  level: 1,
  xp: 0,
  gold: 25,
  energy: 100,
  maxEnergy: 100,
};

function loadPlayer() {
  // Loading one complete object keeps the localStorage contract easy to inspect.
  const savedPlayer = localStorage.getItem("player-state");
  if (savedPlayer) {
    return { ...initialPlayer, ...JSON.parse(savedPlayer) };
  }

  return {
    ...initialPlayer,
    name: localStorage.getItem("wizard-name") || initialPlayer.name,
  };
}

function App() {
  const [player, setPlayer] = useState(loadPlayer);
  const [message, setMessage] = useState("");

  function persistPlayer(nextPlayer) {
    localStorage.setItem("player-state", JSON.stringify(nextPlayer));
    setPlayer(nextPlayer);
  }

  function saveName(name) {
    persistPlayer({ ...player, name });
    localStorage.setItem("wizard-name", name);
  }

  function attendLesson(lesson) {
    if (player.energy < lesson.energyCost) {
      setMessage("Nincs elegendő energiád ehhez az órához.");
      return;
    }

    let nextLevel = player.level;
    let nextXp = player.xp + lesson.xpReward;
    while (nextXp >= 100) {
      nextXp -= 100;
      nextLevel += 1;
    }

    // XP rolls over after each level instead of accumulating past the threshold.
    const leveledUp = nextLevel > player.level;
    const nextPlayer = {
      ...player,
      energy: player.energy - lesson.energyCost,
      level: nextLevel,
      xp: nextXp,
    };
    persistPlayer(nextPlayer);
    setMessage(
      leveledUp
        ? `Szintlépés! Elérted a(z) ${nextLevel}. szintet.`
        : `${lesson.name}: sikeresen teljesítetted az órát. +${lesson.xpReward} XP`,
    );
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/character"
            element={<CharacterPage player={player} onSaveName={saveName} />}
          />
          <Route
            path="/lessons"
            element={
              <LessonsPage
                lessons={lessons}
                player={player}
                message={message}
                onAttendLesson={attendLesson}
              />
            }
          />
          <Route path="/shop" element={<ShopPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
