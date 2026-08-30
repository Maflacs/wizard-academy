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
import {
  getQuestBaselineEntries,
  getQuestExamId,
  getQuestProgress,
  isExamReady,
  isQuestUnlocked,
} from "./utils/quests";
import {
  MAX_IMPLEMENTED_ACADEMY_YEAR,
  formatAcademyYear,
  getAcademyYear,
} from "./utils/academy";
import getStatUpgradeCost from "./utils/statUpgrades";
import {
  advanceCurriculumProgress,
  curriculumProgressVersion,
  isSpellCurrentlyEligible,
  migrateCurriculumProgress,
  reconcileCurriculumSpells,
} from "./utils/curriculum";
import { getItemSellPrice, isItemSellable } from "./utils/items";

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
  curriculumProgress: {},
  curriculumProgressVersion,
  progress: {
    duelWins: 0,
    comboExecutions: 0,
    comboExecutionsByType: {
      rune: 0,
      venom: 0,
      defense: 0,
    },
    itemsPurchased: 0,
    statUpgrades: 0,
    lessonAttendances: 0,
    lessonAttendancesByCurriculumYear: {},
  },
  claimedQuests: [],
  completedMilestones: [],
  questBaselines: {},
};

const energyRegenerationInterval = 5 * 60 * 1000;
const obsoleteSpellIds = new Set(["protective-shell"]);

function captureUnlockedQuestBaselines(player) {
  const questBaselines = { ...(player.questBaselines || {}) };
  let changed = false;

  quests.forEach((quest) => {
    if (!isQuestUnlocked(quest, player)) return;
    const baselineEntries = quest.objectives.flatMap((objective) =>
      getQuestBaselineEntries(objective, player),
    );
    if (baselineEntries.length === 0) return;

    const existingBaseline = questBaselines[quest.id] || {};
    const missingEntries = baselineEntries.filter(
      ([baselineKey]) =>
        !Number.isFinite(existingBaseline[baselineKey]) ||
        existingBaseline[baselineKey] < 0,
    );
    if (missingEntries.length === 0) return;

    questBaselines[quest.id] = {
      ...existingBaseline,
      ...Object.fromEntries(missingEntries),
    };
    changed = true;
  });

  return changed ? { ...player, questBaselines } : player;
}

function reconcilePlayerCurriculum(player) {
  return reconcileCurriculumSpells(
    player,
    lessons,
    spells,
    getAcademyYear(player),
  );
}

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
      lessonProgress: _legacyLessonProgress,
      ...savedFields
    } = savedData;
    const knownSpells = (
      Array.isArray(savedData.knownSpells)
        ? savedData.knownSpells
        : initialPlayer.knownSpells
    ).filter((spellId) => !obsoleteSpellIds.has(spellId));
    const preparedSpells = (
      Array.isArray(savedData.preparedSpells)
        ? savedData.preparedSpells
        : knownSpells
    )
      .filter((spellId) => knownSpells.includes(spellId))
      .slice(0, 3);
    const claimedQuests = Array.isArray(savedData.claimedQuests)
      ? savedData.claimedQuests
      : initialPlayer.claimedQuests;
    let completedMilestones = Array.isArray(savedData.completedMilestones)
      ? savedData.completedMilestones
      : initialPlayer.completedMilestones;
    quests.forEach((quest) => {
      if (
        quest.yearCompletionMilestone &&
        claimedQuests.includes(quest.id) &&
        completedMilestones.includes(getQuestExamId(quest)) &&
        !completedMilestones.includes(quest.yearCompletionMilestone)
      ) {
        completedMilestones = [
          ...completedMilestones,
          quest.yearCompletionMilestone,
        ];
      }
    });
    let player = {
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
      knownSpells,
      preparedSpells,
      curriculumProgress: migrateCurriculumProgress(
        savedData,
        getAcademyYear({ completedMilestones }),
      ),
      curriculumProgressVersion,
      progress: {
        ...initialPlayer.progress,
        ...savedData.progress,
        comboExecutionsByType: {
          ...initialPlayer.progress.comboExecutionsByType,
          ...savedData.progress?.comboExecutionsByType,
        },
        lessonAttendancesByCurriculumYear: {
          ...initialPlayer.progress.lessonAttendancesByCurriculumYear,
          ...savedData.progress?.lessonAttendancesByCurriculumYear,
        },
      },
      claimedQuests,
      completedMilestones,
      questBaselines: savedData.questBaselines || initialPlayer.questBaselines,
    };
    player.preparedSpells = player.preparedSpells.filter((spellId) =>
      isSpellCurrentlyEligible(
        player,
        spells.find((spell) => spell.id === spellId),
        getAcademyYear(player),
      ),
    );
    player = reconcilePlayerCurriculum(player).player;
    const updatedPlayer = updateHealth(
      updateEnergy(
        captureUnlockedQuestBaselines(player),
        Date.now(),
      ),
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
  const playerRef = useRef(player);
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
    playerRef.current = nextPlayer;
    localStorage.setItem("player-state", JSON.stringify(nextPlayer));
    setPlayer(nextPlayer);
  }

  useEffect(() => {
    playerRef.current = player;
  }, [player]);

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
    if (getAcademyYear(player) < (item.requiredAcademyYear ?? 1)) {
      notify("Ezt a tárgyat még nem vásárolhatod meg ezen az évfolyamon.", "error");
      return;
    }
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

  function sellItem(item) {
    if (blockWhileResting()) return null;
    const catalogItem = items.find((candidate) => candidate.id === item.id);
    const inventoryItem = player.inventory.find(
      (candidate) => candidate.itemId === item.id,
    );
    const isEquipped = Object.values(player.equipment).includes(item.id);
    if (
      !catalogItem ||
      !inventoryItem ||
      inventoryItem.quantity < 1 ||
      !isItemSellable(catalogItem) ||
      isEquipped
    ) {
      return null;
    }

    const sellPrice = getItemSellPrice(catalogItem);
    const inventory = player.inventory
      .map((candidate) =>
        candidate.itemId === item.id
          ? { ...candidate, quantity: candidate.quantity - 1 }
          : candidate,
      )
      .filter((candidate) => candidate.quantity > 0);
    persistPlayer({
      ...player,
      gold: player.gold + sellPrice,
      inventory,
    });
    return { sellPrice };
  }

  function equipItem(item) {
    if (blockWhileResting()) return;
    const ownsItem = player.inventory.some(
      (inventoryItem) =>
        inventoryItem.itemId === item.id && inventoryItem.quantity > 0,
    );
    if (
      item.type !== "equipment" ||
      !ownsItem ||
      getAcademyYear(player) < (item.requiredAcademyYear ?? 1)
    ) {
      notify("Ezt a tárgyat nem szerelheted fel.", "error");
      return;
    }

    persistPlayer({
      ...player,
      equipment: { ...player.equipment, [item.slot]: item.id },
    });
    notify(`${item.name} felszerelve.`, "success");
  }

  function updatePreparedSpells(spellId, shouldPrepare, replaceSpellId = null) {
    if (!player.knownSpells.includes(spellId)) return false;
    const spell = spells.find((candidate) => candidate.id === spellId);
    if (
      !spell ||
      !isSpellCurrentlyEligible(player, spell, getAcademyYear(player))
    )
      return false;
    const preparedSpells = shouldPrepare
      ? player.preparedSpells.includes(spellId)
        ? player.preparedSpells
        : replaceSpellId && player.preparedSpells.includes(replaceSpellId)
          ? player.preparedSpells.map((preparedSpellId) =>
              preparedSpellId === replaceSpellId ? spellId : preparedSpellId,
            )
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

    // Capture a newly active activity objective before this attendance changes it.
    const playerWithBaselines = captureUnlockedQuestBaselines(player);
    const progression = processExperience(playerWithBaselines, lesson.xpReward);
    const { leveledUp, newLevel: _newLevel, ...progressionState } = progression;
    const academyYear = getAcademyYear(playerWithBaselines);
    const curriculum = advanceCurriculumProgress(
      playerWithBaselines,
      lesson.id,
      academyYear,
    );
    const progressedPlayer = {
      ...playerWithBaselines,
      ...progressionState,
      energy: leveledUp
        ? playerWithBaselines.maxEnergy
        : playerWithBaselines.energy - lesson.energyCost,
      lastEnergyUpdate:
        leveledUp ||
        playerWithBaselines.energy >= playerWithBaselines.maxEnergy
          ? Date.now()
          : playerWithBaselines.lastEnergyUpdate,
      curriculumProgress: curriculum.curriculumProgress,
      curriculumProgressVersion,
      progress: {
        ...playerWithBaselines.progress,
        lessonAttendances:
          (playerWithBaselines.progress.lessonAttendances || 0) + 1,
        lessonAttendancesByCurriculumYear: {
          ...playerWithBaselines.progress.lessonAttendancesByCurriculumYear,
          [curriculum.curriculumYear]:
            (playerWithBaselines.progress
              .lessonAttendancesByCurriculumYear?.[
              curriculum.curriculumYear
            ] || 0) + 1,
        },
      },
    };
    const { player: nextPlayer, learnedSpellIds } =
      reconcilePlayerCurriculum(progressedPlayer);
    persistPlayer(nextPlayer);
    const learnedSpells = learnedSpellIds
      .map((spellId) => spells.find((spell) => spell.id === spellId))
      .filter((spell) => spell);
    const learnedMessage =
      learnedSpells.length > 0
        ? ` Új varázslatot sajátítottál el: ${learnedSpells.map((spell) => spell.name).join(", ")}!`
        : "";
    const levelLockedUnlock = (lesson.spellUnlocks || []).find((unlock) => {
      const spell = spells.find((candidate) => candidate.id === unlock.spellId);
      return (
        curriculum.progress >= unlock.requiredProgress &&
        !nextPlayer.knownSpells.includes(unlock.spellId) &&
        nextPlayer.level < (unlock.requiredLevel ?? spell?.requiredLevel ?? 1)
      );
    });
    const lockedSpell = levelLockedUnlock
      ? spells.find((spell) => spell.id === levelLockedUnlock.spellId)
      : null;
    const progressMessage = curriculum.advanced
      ? ` ${lesson.name} tanulmányi haladás: ${curriculum.progress} / ${curriculum.cap}.`
      : " Az évfolyam tananyagát már teljesítetted. A gyakorlásért továbbra is tapasztalatot szereztél.";
    const levelLockMessage = levelLockedUnlock
      ? ` Elérted a ${lockedSpell?.name} tanulmányi követelményét, de még nem vagy elég tapasztalt az elsajátításához. Szükséges szint: ${levelLockedUnlock.requiredLevel}.`
      : "";
    if (!progression.leveledUp) {
      notify(
        `${lesson.name}: sikeresen teljesítetted az órát. +${lesson.xpReward} XP.${progressMessage}${learnedMessage}${levelLockMessage}`,
        "success",
      );
    } else {
      notifyLevelUp(
        progression,
        `${progressMessage}${learnedMessage}${levelLockMessage}`,
      );
    }
  }

  function awardDuelRewards(enemy, remainingHealth) {
    // Initialize a missing active baseline from the pre-victory counter.
    const playerWithBaselines = captureUnlockedQuestBaselines(playerRef.current);
    const progression = processExperience(
      { ...playerWithBaselines, health: remainingHealth },
      enemy.xpReward,
    );
    const { leveledUp, newLevel: _newLevel, ...progressionState } = progression;

    // Rewards are persisted centrally so the duel page only controls temporary combat state.
    const reconciled = reconcilePlayerCurriculum({
      ...playerWithBaselines,
      ...progressionState,
      gold: playerWithBaselines.gold + enemy.goldReward,
      lastHealthUpdate: Date.now(),
      progress: {
        ...playerWithBaselines.progress,
        duelWins: playerWithBaselines.progress.duelWins + 1,
      },
    });
    persistPlayer(reconciled.player);
    const learnedMessage = reconciled.learnedSpellIds.length
      ? ` Új varázslatot sajátítottál el: ${reconciled.learnedSpellIds
          .map((spellId) => spells.find((spell) => spell.id === spellId)?.name)
          .filter(Boolean)
          .join(", ")}.`
      : "";
    notifyLevelUp(progression, learnedMessage);
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
    const completesAcademyYear = Boolean(quest.yearCompletionMilestone);
    const completedMilestones =
      completesAcademyYear &&
      !player.completedMilestones.includes(quest.yearCompletionMilestone)
        ? [...player.completedMilestones, quest.yearCompletionMilestone]
        : player.completedMilestones;
    const reconciled = reconcilePlayerCurriculum({
      ...player,
      ...progressionState,
      gold: player.gold + quest.rewards.gold,
      claimedQuests: [...player.claimedQuests, quest.id],
      completedMilestones,
    });
    const nextPlayer = captureUnlockedQuestBaselines(reconciled.player);
    persistPlayer(nextPlayer);
    const learnedMessage = reconciled.learnedSpellIds.length
      ? ` Új varázslatot sajátítottál el: ${reconciled.learnedSpellIds
          .map((spellId) => spells.find((spell) => spell.id === spellId)?.name)
          .filter(Boolean)
          .join(", ")}.`
      : "";
    notifyLevelUp(progression, learnedMessage);
    if (completesAcademyYear) {
      const completedYear = quest.academyYear ?? 1;
      notify(
        completedYear < MAX_IMPLEMENTED_ACADEMY_YEAR
          ? `Teljesítetted a ${formatAcademyYear(completedYear)} évfolyamot! Megnyílt előtted a ${formatAcademyYear(completedYear + 1)} évfolyam.${learnedMessage}`
          : `Teljesítetted a ${formatAcademyYear(completedYear)} évfolyamot! Az akadémia jelenlegi tananyagának végére értél.${learnedMessage}`,
        "yearUp",
      );
    }
  }

  function recordComboExecution(comboType) {
    if (!comboType) return;
    // Capture newly active quest baselines before advancing lifetime counters.
    const playerWithBaselines = captureUnlockedQuestBaselines(playerRef.current);
    const comboExecutionsByType =
      playerWithBaselines.progress.comboExecutionsByType || {};
    persistPlayer({
      ...playerWithBaselines,
      progress: {
        ...playerWithBaselines.progress,
        comboExecutions:
          (playerWithBaselines.progress.comboExecutions || 0) + 1,
        comboExecutionsByType: {
          ...comboExecutionsByType,
          [comboType]: (comboExecutionsByType[comboType] || 0) + 1,
        },
      },
    });
  }

  function completeExam(examId, remainingHealth) {
    const examQuest = quests.find((quest) =>
      getQuestExamId(quest) === examId,
    );
    if (
      !examQuest ||
      player.completedMilestones.includes(examId) ||
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
        examId,
      ],
    });
    return true;
  }

  function persistDuelHealth(remainingHealth) {
    const currentPlayer = playerRef.current;
    persistPlayer({
      ...currentPlayer,
      health: Math.min(
        getMaxHealthForLevel(currentPlayer.level),
        remainingHealth,
      ),
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
  function isExamAvailable(examId) {
    const examQuest = quests.find((quest) => getQuestExamId(quest) === examId);
    return examQuest ? isExamReady(examQuest, player) : false;
  }
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
                lessons={lessons}
                items={items}
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
                onSellItem={sellItem}
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
                onComboExecuted={recordComboExecution}
                isResting={player.isResting}
                isExamAvailable={isExamAvailable}
              />
            }
          />
          <Route
            path="/quests"
            element={
              <QuestsPage
                player={player}
                quests={quests}
                enemies={enemies}
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
