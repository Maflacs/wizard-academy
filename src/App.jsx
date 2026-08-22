import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import items from "./data/items";
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
  inventory: [],
  stats: {
    magicPower: 5,
    defense: 5,
    focus: 5,
  },
  equipment: {
    wand: null,
    robe: null,
    amulet: null,
  },
  lastEnergyUpdate: Date.now(),
};

const energyRegenerationInterval = 5 * 60 * 1000;

function loadPlayer() {
  // Loading one complete object keeps the localStorage contract easy to inspect.
  const savedPlayer = localStorage.getItem("player-state");
  if (savedPlayer) {
    const savedData = JSON.parse(savedPlayer);
    const player = {
      ...initialPlayer,
      ...savedData,
      stats: { ...initialPlayer.stats, ...savedData.stats },
      equipment: { ...initialPlayer.equipment, ...savedData.equipment },
      lastEnergyUpdate: savedData.lastEnergyUpdate || Date.now(),
    };
    const updatedPlayer = updateEnergy(player, Date.now());
    localStorage.setItem("player-state", JSON.stringify(updatedPlayer));
    return updatedPlayer;
  }

  const player = {
    ...initialPlayer,
    name: localStorage.getItem("wizard-name") || initialPlayer.name,
  };
  const updatedPlayer = updateEnergy(player, Date.now());
  localStorage.setItem("player-state", JSON.stringify(updatedPlayer));
  return updatedPlayer;
}

function updateEnergy(player, currentTime) {
  if (player.energy >= player.maxEnergy) {
    return player;
  }

  const elapsedTime = currentTime - player.lastEnergyUpdate;
  const regeneratedEnergy = Math.floor(
    elapsedTime / energyRegenerationInterval,
  );
  if (regeneratedEnergy < 1) {
    return player;
  }

  const energy = Math.min(player.maxEnergy, player.energy + regeneratedEnergy);
  return {
    ...player,
    energy,
    // Advancing by completed intervals preserves partial progress to the next point.
    lastEnergyUpdate:
      energy >= player.maxEnergy
        ? currentTime
        : player.lastEnergyUpdate +
          regeneratedEnergy * energyRegenerationInterval,
  };
}

function getEnergyCountdown(player, currentTime) {
  if (player.energy >= player.maxEnergy) {
    return null;
  }

  const elapsedTime = currentTime - player.lastEnergyUpdate;
  return Math.ceil(
    (energyRegenerationInterval - (elapsedTime % energyRegenerationInterval)) /
      1000,
  );
}

function formatCountdown(seconds) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function App() {
  const [player, setPlayer] = useState(loadPlayer);
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now);

  function persistPlayer(nextPlayer) {
    localStorage.setItem("player-state", JSON.stringify(nextPlayer));
    setPlayer(nextPlayer);
  }

  useEffect(() => {
    // The one-second timer animates the countdown; timestamps still decide when energy is granted.
    const timerId = setInterval(() => {
      const time = Date.now();
      setCurrentTime(time);
      setPlayer((currentPlayer) => {
        const updatedPlayer = updateEnergy(currentPlayer, time);
        if (updatedPlayer !== currentPlayer) {
          localStorage.setItem("player-state", JSON.stringify(updatedPlayer));
        }
        return updatedPlayer;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, []);

  function saveName(name) {
    persistPlayer({ ...player, name });
    localStorage.setItem("wizard-name", name);
  }

  function purchaseItem(item) {
    if (player.gold < item.price) {
      setMessage("Nincs elegendő aranyad ehhez a tárgyhoz.");
      return;
    }

    // Store only item IDs and quantities so static item details remain in data files.
    const existingItem = player.inventory.find(
      (inventoryItem) => inventoryItem.itemId === item.id,
    );
    const nextInventory = existingItem
      ? player.inventory.map((inventoryItem) =>
          inventoryItem.itemId === item.id
            ? { ...inventoryItem, quantity: inventoryItem.quantity + 1 }
            : inventoryItem,
        )
      : [...player.inventory, { itemId: item.id, quantity: 1 }];

    persistPlayer({
      ...player,
      gold: player.gold - item.price,
      inventory: nextInventory,
    });
    setMessage(`${item.name} bekerült a táskádba.`);
  }

  function equipItem(item) {
    const ownsItem = player.inventory.some(
      (inventoryItem) =>
        inventoryItem.itemId === item.id && inventoryItem.quantity > 0,
    );
    if (item.type !== "equipment" || !ownsItem) {
      setMessage("Ezt a tárgyat nem szerelheted fel.");
      return;
    }

    persistPlayer({
      ...player,
      equipment: { ...player.equipment, [item.slot]: item.id },
    });
    setMessage(`${item.name} felszerelve.`);
  }

  function unequipItem(slot) {
    persistPlayer({
      ...player,
      equipment: { ...player.equipment, [slot]: null },
    });
    setMessage("A tárgyat levetted.");
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
      lastEnergyUpdate:
        player.energy >= player.maxEnergy
          ? Date.now()
          : player.lastEnergyUpdate,
    };
    persistPlayer(nextPlayer);
    setMessage(
      leveledUp
        ? `Szintlépés! Elérted a(z) ${nextLevel}. szintet.`
        : `${lesson.name}: sikeresen teljesítetted az órát. +${lesson.xpReward} XP`,
    );
  }

  const energyCountdown = getEnergyCountdown(player, currentTime);
  const energyStatus = {
    countdown:
      energyCountdown === null ? null : formatCountdown(energyCountdown),
  };

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/character"
            element={
              <CharacterPage
                player={player}
                items={items}
                onSaveName={saveName}
                message={message}
                onEquipItem={equipItem}
                onUnequipItem={unequipItem}
                energyStatus={energyStatus}
              />
            }
          />
          <Route
            path="/lessons"
            element={
              <LessonsPage
                lessons={lessons}
                player={player}
                message={message}
                onAttendLesson={attendLesson}
                energyStatus={energyStatus}
              />
            }
          />
          <Route
            path="/shop"
            element={
              <ShopPage
                player={player}
                message={message}
                onPurchaseItem={purchaseItem}
              />
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
