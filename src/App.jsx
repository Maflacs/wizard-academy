import { useEffect, useRef, useState } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
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
import QuestsPage from "./pages/QuestsPage";
import InfirmaryPage from "./pages/InfirmaryPage";
import quests from "./data/quests";
import { processExperience } from "./utils/leveling";
import { getMaxHealthForLevel } from "./utils/playerProgression";
import {
  getHealthCountdown,
  getInstantTreatmentCost,
  changeRestingState,
  updateHealth,
} from "./utils/health";
import { getQuestProgress, isExamReady, isQuestUnlocked } from "./utils/quests";
import { getAcademyYear } from "./utils/academy";
import getStatUpgradeCost from "./utils/statUpgrades";

const initialPlayer = {
  name: "Névtelen tanonc",
  level: 1,
  xp: 0,
  gold: 25,
  energy: 100,
  maxEnergy: 100,
  health: 140,
  lastHealthUpdate: Date.now(),
  isResting: false,
  knownSpells: ["spark-bolt"],
  preparedSpells: ["spark-bolt"],
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
  lessonProgress: {},
  progress: {
    duelWins: 0,
    itemsPurchased: 0,
    statUpgrades: 0,
  },
  claimedQuests: [],
  completedMilestones: [],
};

const energyRegenerationInterval = 5 * 60 * 1000;

function loadPlayer() {
  // Loading one complete object keeps the localStorage contract easy to inspect.
  const savedPlayer = localStorage.getItem("player-state");
  if (savedPlayer) {
    const savedData = JSON.parse(savedPlayer);
    // Drop obsolete mana regeneration fields while preserving all gameplay progress.
    const {
      mana: _mana,
      maxMana: _maxMana,
      lastManaUpdate: _lastManaUpdate,
      ...savedFields
    } = savedData;
    const player = {
      ...initialPlayer,
      ...savedFields,
      maxHealth: getMaxHealthForLevel(savedData.level || initialPlayer.level),
      stats: { ...initialPlayer.stats, ...savedData.stats },
      equipment: { ...initialPlayer.equipment, ...savedData.equipment },
      health: Math.min(
        savedData.health ??
          getMaxHealthForLevel(savedData.level || initialPlayer.level),
        getMaxHealthForLevel(savedData.level || initialPlayer.level),
      ),
      lastEnergyUpdate: savedData.lastEnergyUpdate || Date.now(),
      lastHealthUpdate:
        savedData.health >=
        getMaxHealthForLevel(savedData.level || initialPlayer.level)
          ? Date.now()
          : savedData.lastHealthUpdate || Date.now(),
      isResting: savedData.isResting === true,
      knownSpells: savedData.knownSpells || initialPlayer.knownSpells,
      preparedSpells: Array.isArray(savedData.preparedSpells)
        ? savedData.preparedSpells
            .filter((spellId) =>
              (savedData.knownSpells || initialPlayer.knownSpells).includes(
                spellId,
              ),
            )
            .slice(0, 3)
        : (savedData.knownSpells || initialPlayer.knownSpells).slice(0, 3),
      lessonProgress: {
        ...initialPlayer.lessonProgress,
        ...savedData.lessonProgress,
      },
      progress: { ...initialPlayer.progress, ...savedData.progress },
      claimedQuests: Array.isArray(savedData.claimedQuests)
        ? savedData.claimedQuests
        : initialPlayer.claimedQuests,
      completedMilestones: Array.isArray(savedData.completedMilestones)
        ? savedData.completedMilestones
        : initialPlayer.completedMilestones,
    };
    if (
      player.claimedQuests.includes("first-exam") &&
      player.completedMilestones.includes("first-exam") &&
      !player.completedMilestones.includes("first-year-complete")
    ) {
      player.completedMilestones = [
        ...player.completedMilestones,
        "first-year-complete",
      ];
    }
    const updatedPlayer = updateHealth(
      updateEnergy(player, Date.now()),
      Date.now(),
    );
    localStorage.setItem("player-state", JSON.stringify(updatedPlayer));
    return updatedPlayer;
  }

  const player = {
    ...initialPlayer,
    name: localStorage.getItem("wizard-name") || initialPlayer.name,
  };
  const updatedPlayer = updateHealth(
    updateEnergy(player, Date.now()),
    Date.now(),
  );
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
  const [notification, setNotification] = useState(null);
  const notificationId = useRef(0);
  const [currentTime, setCurrentTime] = useState(Date.now);

  function notify(message, type = "info") {
    notificationId.current += 1;
    setNotification({
      id: notificationId.current,
      type,
      message,
      onDismiss: () => setNotification(null),
    });
  }

  function notifyLevelUp(progression, suffix = "") {
    if (!progression.leveledUp) return;
    notify(
      `Szintet léptél! Elérted a(z) ${progression.newLevel}. szintet. Életerőd és energiád teljesen feltöltődött.${suffix}`,
      "levelUp",
    );
  }

  function blockWhileResting() {
    if (!player.isResting) return false;
    notify(
      "A karaktered a Gyengélkedőn pihen. Előbb keltsd fel, hogy folytathasd.",
      "info",
    );
    return true;
  }

  function persistPlayer(nextPlayer) {
    localStorage.setItem("player-state", JSON.stringify(nextPlayer));
    setPlayer(nextPlayer);
  }

  useEffect(() => {
    // The one-second timer updates the UI; timestamps still decide when energy is granted.
    const timerId = setInterval(() => {
      const time = Date.now();
      setCurrentTime(time);
      setPlayer((currentPlayer) => {
        const updatedPlayer = updateHealth(
          updateEnergy(currentPlayer, time),
          time,
        );
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
    if (blockWhileResting()) return;
    if (player.gold < item.price) {
      notify("Nincs elegendő aranyad ehhez a tárgyhoz.", "error");
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
      progress: {
        ...player.progress,
        itemsPurchased: player.progress.itemsPurchased + 1,
      },
    });
    notify(`${item.name} bekerült a táskádba.`, "success");
  }

  function equipItem(item) {
    if (blockWhileResting()) return;
    const ownsItem = player.inventory.some(
      (inventoryItem) =>
        inventoryItem.itemId === item.id && inventoryItem.quantity > 0,
    );
    if (item.type !== "equipment" || !ownsItem) {
      notify("Ezt a tárgyat nem szerelheted fel.", "error");
      return;
    }

    persistPlayer({
      ...player,
      equipment: { ...player.equipment, [item.slot]: item.id },
    });
    notify(`${item.name} felszerelve.`, "success");
  }

  function updatePreparedSpells(spellId, shouldPrepare) {
    if (!player.knownSpells.includes(spellId)) return false;
    const preparedSpells = shouldPrepare
      ? player.preparedSpells.includes(spellId)
        ? player.preparedSpells
        : player.preparedSpells.length >= 3
          ? null
          : [...player.preparedSpells, spellId]
      : player.preparedSpells.filter(
          (preparedSpellId) => preparedSpellId !== spellId,
        );
    if (!preparedSpells) return false;
    persistPlayer({ ...player, preparedSpells });
    return true;
  }

  function upgradeStat(stat) {
    if (blockWhileResting()) return false;
    if (!Object.hasOwn(player.stats, stat)) {
      return false;
    }

    const currentBaseStat = player.stats[stat];
    const upgradeCost = getStatUpgradeCost(currentBaseStat);
    if (player.gold < upgradeCost) {
      notify("Nincs elegendő aranyad ehhez a fejlesztéshez.", "error");
      return false;
    }

    persistPlayer({
      ...player,
      gold: player.gold - upgradeCost,
      stats: {
        ...player.stats,
        [stat]: currentBaseStat + 1,
      },
      progress: {
        ...player.progress,
        statUpgrades: player.progress.statUpgrades + 1,
      },
    });
    return true;
  }

  function unequipItem(slot) {
    if (blockWhileResting()) return;
    persistPlayer({
      ...player,
      equipment: { ...player.equipment, [slot]: null },
    });
    notify("A tárgyat levetted.", "success");
  }

  function attendLesson(lesson) {
    if (blockWhileResting()) return;
    if (player.energy < lesson.energyCost) {
      notify("Nincs elegendő energiád ehhez az órához.", "error");
      return;
    }

    const progression = processExperience(player, lesson.xpReward);
    const { leveledUp, newLevel: _newLevel, ...progressionState } = progression;
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
      ...progressionState,
      energy: leveledUp ? player.maxEnergy : player.energy - lesson.energyCost,
      lastEnergyUpdate:
        leveledUp || player.energy >= player.maxEnergy
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
    if (!progression.leveledUp) {
      notify(
        `${lesson.name}: sikeresen teljesítetted az órát. +${lesson.xpReward} XP.${learnedMessage}`,
        "success",
      );
    } else {
      notifyLevelUp(progression, learnedMessage);
    }
  }

  function awardDuelRewards(enemy, remainingHealth) {
    const progression = processExperience(
      { ...player, health: remainingHealth },
      enemy.xpReward,
    );
    const { leveledUp, newLevel: _newLevel, ...progressionState } = progression;

    // Rewards are persisted centrally so the duel page only controls temporary combat state.
    persistPlayer({
      ...player,
      ...progressionState,
      gold: player.gold + enemy.goldReward,
      lastHealthUpdate: Date.now(),
      progress: {
        ...player.progress,
        duelWins: player.progress.duelWins + 1,
      },
    });
    notifyLevelUp(progression);
    return {
      leveledUp,
      newLevel: progression.newLevel,
    };
  }

  function claimQuestReward(quest) {
    if (blockWhileResting()) return;
    if (
      player.claimedQuests.includes(quest.id) ||
      !isQuestUnlocked(quest, player) ||
      !getQuestProgress(quest, player).isComplete
    ) {
      return;
    }

    const progression = processExperience(player, quest.rewards.xp);
    const {
      leveledUp: _leveledUp,
      newLevel: _newLevel,
      ...progressionState
    } = progression;

    // The claimed ID is persisted with the reward so it can only be paid once.
    const completesFirstYear = quest.id === "first-exam";
    const completedMilestones =
      completesFirstYear &&
      !player.completedMilestones.includes("first-year-complete")
        ? [...player.completedMilestones, "first-year-complete"]
        : player.completedMilestones;
    persistPlayer({
      ...player,
      ...progressionState,
      gold: player.gold + quest.rewards.gold,
      claimedQuests: [...player.claimedQuests, quest.id],
      completedMilestones,
    });
    notifyLevelUp(progression);
    if (completesFirstYear) {
      notify(
        "Teljesítetted az I. évfolyamot! Megnyílt előtted a II. évfolyam.",
        "yearUp",
      );
    }
  }

  function completeExam(remainingHealth) {
    const examQuest = quests.find((quest) =>
      quest.objectives.some((objective) => objective.type === "examVictory"),
    );
    if (
      !examQuest ||
      player.completedMilestones.includes(examQuest.milestoneId) ||
      !isExamReady(examQuest, player)
    ) {
      return false;
    }

    // Persist the milestone once so exam victories cannot farm normal rewards.
    persistPlayer({
      ...player,
      health: Math.min(getMaxHealthForLevel(player.level), remainingHealth),
      lastHealthUpdate: Date.now(),
      completedMilestones: [
        ...player.completedMilestones,
        examQuest.milestoneId,
      ],
    });
    return true;
  }

  function persistDuelHealth(remainingHealth) {
    persistPlayer({
      ...player,
      health: Math.min(getMaxHealthForLevel(player.level), remainingHealth),
      lastHealthUpdate: Date.now(),
    });
  }

  function treatPlayer() {
    const maxHealth = getMaxHealthForLevel(player.level);
    const missingHealth = Math.max(0, maxHealth - player.health);
    if (missingHealth === 0) return false;

    const treatmentCost = getInstantTreatmentCost(player);
    if (player.gold < treatmentCost) return false;

    persistPlayer({
      ...player,
      gold: player.gold - treatmentCost,
      health: maxHealth,
      lastHealthUpdate: Date.now(),
      isResting: false,
    });
    return true;
  }

  function startResting() {
    if (blockWhileResting()) return false;
    if (player.health >= getMaxHealthForLevel(player.level)) return false;
    persistPlayer(changeRestingState(player, true, Date.now()));
    return true;
  }

  function stopResting() {
    const nextPlayer = changeRestingState(player, false, Date.now());
    persistPlayer(nextPlayer);
    return true;
  }

  const energyCountdown = getEnergyCountdown(player, currentTime);
  const energyStatus = {
    countdown:
      energyCountdown === null ? null : formatCountdown(energyCountdown),
  };
  const healthStatus = {
    countdown: getHealthCountdown(player, currentTime),
  };
  const examQuest = quests.find((quest) => quest.id === "first-exam");
  return (
    <HashRouter>
      <Layout notification={notification}>
        <Routes>
          <Route path="/" element={<HomePage player={player} />} />
          <Route
            path="/character"
            element={
              <CharacterPage
                player={player}
                items={items}
                onSaveName={saveName}
                onEquipItem={equipItem}
                onUnequipItem={unequipItem}
                onUpgradeStat={upgradeStat}
                energyStatus={energyStatus}
                isResting={player.isResting}
                academyYear={getAcademyYear(player)}
              />
            }
          />
          <Route
            path="/lessons"
            element={
              <LessonsPage
                lessons={lessons}
                player={player}
                onAttendLesson={attendLesson}
                energyStatus={energyStatus}
                isResting={player.isResting}
              />
            }
          />
          <Route
            path="/spells"
            element={
              <SpellsPage
                knownSpells={player.knownSpells}
                preparedSpells={player.preparedSpells}
                spells={spells}
                player={player}
                onUpdatePreparedSpells={updatePreparedSpells}
              />
            }
          />
          <Route
            path="/shop"
            element={
              <ShopPage
                player={player}
                onPurchaseItem={purchaseItem}
                isResting={player.isResting}
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
                onExamVictory={completeExam}
                onDuelEnd={persistDuelHealth}
                isResting={player.isResting}
                examReady={examQuest ? isExamReady(examQuest, player) : false}
              />
            }
          />
          <Route
            path="/quests"
            element={
              <QuestsPage
                player={player}
                quests={quests}
                onClaimQuestReward={claimQuestReward}
                isResting={player.isResting}
              />
            }
          />
          <Route
            path="/infirmary"
            element={
              <InfirmaryPage
                player={player}
                energyStatus={energyStatus}
                healthStatus={healthStatus}
                onTreatPlayer={treatPlayer}
                onStartResting={startResting}
                onStopResting={stopResting}
                getTreatmentCost={getInstantTreatmentCost}
              />
            }
          />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;
