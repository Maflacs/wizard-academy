import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import enemies from "./data/enemies";
import items from "./data/items";
import lessons from "./data/lessons";
import spells from "./data/spells";
import CharacterPage from "./pages/CharacterPage";
import HomePage from "./pages/HomePage";
import LessonsPage from "./pages/LessonsPage";
import ShopPage from "./pages/ShopPage";
import SpellsPage from "./pages/SpellsPage";
import DuelPage from "./pages/DuelPage";
import { getXpRequiredForLevel } from "./utils/leveling";
import {
  getMaxHealthForLevel,
  getMaxManaForLevel,
} from "./utils/playerProgression";
import getStatUpgradeCost from "./utils/statUpgrades";

const initialPlayer = {
  name: "Névtelen tanonc",
  level: 1,
  xp: 0,
  gold: 25,
  energy: 100,
  maxEnergy: 100,
  health: 100,
  maxHealth: 100,
  mana: 50,
  maxMana: 50,
  knownSpells: ["spark-bolt"],
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
  lastManaUpdate: Date.now(),
  lessonProgress: {},
};

const energyRegenerationInterval = 5 * 60 * 1000;
const manaRegenerationInterval = 60 * 1000;

function loadPlayer() {
  // Loading one complete object keeps the localStorage contract easy to inspect.
  const savedPlayer = localStorage.getItem("player-state");
  if (savedPlayer) {
    const savedData = JSON.parse(savedPlayer);
    const player = {
      ...initialPlayer,
      ...savedData,
      maxHealth: getMaxHealthForLevel(savedData.level || initialPlayer.level),
      maxMana: getMaxManaForLevel(savedData.level || initialPlayer.level),
      stats: { ...initialPlayer.stats, ...savedData.stats },
      equipment: { ...initialPlayer.equipment, ...savedData.equipment },
      health: Math.min(
        savedData.health ?? initialPlayer.health,
        getMaxHealthForLevel(savedData.level || initialPlayer.level),
      ),
      mana: Math.min(
        savedData.mana ?? initialPlayer.mana,
        getMaxManaForLevel(savedData.level || initialPlayer.level),
      ),
      lastEnergyUpdate: savedData.lastEnergyUpdate || Date.now(),
      lastManaUpdate: savedData.lastManaUpdate || Date.now(),
      knownSpells: savedData.knownSpells || initialPlayer.knownSpells,
      lessonProgress: {
        ...initialPlayer.lessonProgress,
        ...savedData.lessonProgress,
      },
    };
    const updatedPlayer = updateEnergy(player, Date.now());
    const updatedManaPlayer = updateMana(updatedPlayer, Date.now());
    localStorage.setItem("player-state", JSON.stringify(updatedManaPlayer));
    return updatedManaPlayer;
  }

  const player = {
    ...initialPlayer,
    name: localStorage.getItem("wizard-name") || initialPlayer.name,
  };
  const updatedPlayer = updateEnergy(player, Date.now());
  const updatedManaPlayer = updateMana(updatedPlayer, Date.now());
  localStorage.setItem("player-state", JSON.stringify(updatedManaPlayer));
  return updatedManaPlayer;
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

function updateMana(player, currentTime) {
  if (player.mana >= player.maxMana) {
    return player;
  }

  const elapsedTime = currentTime - player.lastManaUpdate;
  const regeneratedMana = Math.floor(elapsedTime / manaRegenerationInterval);
  if (regeneratedMana < 1) {
    return player;
  }

  const mana = Math.min(player.maxMana, player.mana + regeneratedMana);
  return {
    ...player,
    mana,
    // Completed intervals advance the timestamp and preserve any partial minute.
    lastManaUpdate:
      mana >= player.maxMana
        ? currentTime
        : player.lastManaUpdate + regeneratedMana * manaRegenerationInterval,
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

function getManaCountdown(player, currentTime) {
  if (player.mana >= player.maxMana) {
    return null;
  }

  const elapsedTime = currentTime - player.lastManaUpdate;
  return Math.ceil(
    (manaRegenerationInterval - (elapsedTime % manaRegenerationInterval)) /
      1000,
  );
}

function App() {
  const [player, setPlayer] = useState(loadPlayer);
  const [message, setMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(Date.now);

  function persistPlayer(nextPlayer) {
    localStorage.setItem("player-state", JSON.stringify(nextPlayer));
    setPlayer(nextPlayer);
  }

  function getLevelProgression(nextLevel, nextXp) {
    const previousMaxMana = getMaxManaForLevel(player.level);
    const nextMaxMana = getMaxManaForLevel(nextLevel);
    const manaIncrease = nextMaxMana - previousMaxMana;
    return {
      level: nextLevel,
      xp: nextXp,
      maxHealth: getMaxHealthForLevel(nextLevel),
      maxMana: nextMaxMana,
      mana: Math.min(nextMaxMana, player.mana + manaIncrease),
      health: Math.min(getMaxHealthForLevel(nextLevel), player.health),
    };
  }

  useEffect(() => {
    // The one-second timer updates the UI; timestamps still decide when mana or energy is granted.
    const timerId = setInterval(() => {
      const time = Date.now();
      setCurrentTime(time);
      setPlayer((currentPlayer) => {
        const updatedPlayer = updateEnergy(currentPlayer, time);
        const updatedManaPlayer = updateMana(updatedPlayer, time);
        if (updatedManaPlayer !== currentPlayer) {
          localStorage.setItem(
            "player-state",
            JSON.stringify(updatedManaPlayer),
          );
        }
        return updatedManaPlayer;
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

  function upgradeStat(stat) {
    if (!Object.hasOwn(player.stats, stat)) {
      return;
    }

    const currentBaseStat = player.stats[stat];
    const upgradeCost = getStatUpgradeCost(currentBaseStat);
    if (player.gold < upgradeCost) {
      setMessage("Nincs elegendő aranyad ehhez a fejlesztéshez.");
      return;
    }

    persistPlayer({
      ...player,
      gold: player.gold - upgradeCost,
      stats: {
        ...player.stats,
        [stat]: currentBaseStat + 1,
      },
    });
    setMessage("A képességed egy ponttal megerősödött.");
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
    while (nextXp >= getXpRequiredForLevel(nextLevel)) {
      nextXp -= getXpRequiredForLevel(nextLevel);
      nextLevel += 1;
    }

    // XP rolls over after each level instead of accumulating past the threshold.
    const leveledUp = nextLevel > player.level;
    const attendanceCount = (player.lessonProgress[lesson.id] || 0) + 1;
    const learnedSpellIds = (lesson.spellUnlocks || [])
      .filter(
        (unlock) =>
          unlock.requiredAttendances === attendanceCount &&
          !player.knownSpells.includes(unlock.spellId),
      )
      .map((unlock) => unlock.spellId);
    const nextPlayer = {
      ...player,
      energy: player.energy - lesson.energyCost,
      ...getLevelProgression(nextLevel, nextXp),
      lastEnergyUpdate:
        player.energy >= player.maxEnergy
          ? Date.now()
          : player.lastEnergyUpdate,
      lessonProgress: {
        ...player.lessonProgress,
        [lesson.id]: attendanceCount,
      },
      knownSpells: [...player.knownSpells, ...learnedSpellIds],
    };
    persistPlayer(nextPlayer);
    const learnedSpells = learnedSpellIds
      .map((spellId) => spells.find((spell) => spell.id === spellId))
      .filter((spell) => spell);
    const learnedMessage =
      learnedSpells.length > 0
        ? ` Új varázsigét tanultál: ${learnedSpells.map((spell) => spell.name).join(", ")}!`
        : "";
    setMessage(
      leveledUp
        ? `Szintlépés! Elérted a(z) ${nextLevel}. szintet.${learnedMessage}`
        : `${lesson.name}: sikeresen teljesítetted az órát. +${lesson.xpReward} XP.${learnedMessage}`,
    );
  }

  function awardDuelRewards(enemy) {
    let nextLevel = player.level;
    let nextXp = player.xp + enemy.xpReward;
    while (nextXp >= getXpRequiredForLevel(nextLevel)) {
      nextXp -= getXpRequiredForLevel(nextLevel);
      nextLevel += 1;
    }

    // Rewards are persisted centrally so the duel page only controls temporary combat state.
    persistPlayer({
      ...player,
      ...getLevelProgression(nextLevel, nextXp),
      gold: player.gold + enemy.goldReward,
    });
    return {
      leveledUp: nextLevel > player.level,
      newLevel: nextLevel,
    };
  }

  const energyCountdown = getEnergyCountdown(player, currentTime);
  const manaCountdown = getManaCountdown(player, currentTime);
  const energyStatus = {
    countdown:
      energyCountdown === null ? null : formatCountdown(energyCountdown),
  };
  const manaStatus = {
    countdown: manaCountdown === null ? null : formatCountdown(manaCountdown),
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
                onUpgradeStat={upgradeStat}
                energyStatus={energyStatus}
                manaStatus={manaStatus}
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
            path="/spells"
            element={
              <SpellsPage
                knownSpells={player.knownSpells}
                spells={spells}
                player={player}
                manaStatus={manaStatus}
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
          <Route
            path="/duel"
            element={
              <DuelPage
                player={player}
                items={items}
                spells={spells}
                enemies={enemies}
                onAwardRewards={awardDuelRewards}
              />
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
