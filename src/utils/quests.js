import {
  getLessonAttendance,
  getTotalLessonAttendance,
} from "./lessonProgress";
import { getAcademyYear } from "./academy";

function getObjectiveProgress(objective, player, questId) {
  if (objective.type === "lessonAttendance") {
    const academicYear = objective.academicYear ?? 1;
    if (objective.lessonId) {
      return getLessonAttendance(player, objective.lessonId, academicYear);
    }
    return getTotalLessonAttendance(player, academicYear);
  }

  if (objective.type === "knownSpell") {
    return player.knownSpells.includes(objective.spellId) ? 1 : 0;
  }
  if (objective.type === "preparedSpell") {
    return objective.spellIds.some((spellId) =>
      player.preparedSpells.includes(spellId),
    )
      ? 1
      : 0;
  }
  if (objective.type === "progressSinceQuestActivation") {
    const current = player.progress[objective.progressKey] || 0;
    const baseline = player.questBaselines?.[questId]?.[objective.progressKey];
    if (!Number.isFinite(baseline) || baseline < 0) return 0;
    return Math.max(0, current - baseline);
  }
  if (objective.type === "minimumBaseStat") {
    return player.stats[objective.stat] || 0;
  }
  if (objective.type === "minimumLevel") return player.level;
  if (objective.type === "examVictory") {
    return player.completedMilestones.includes(objective.milestoneId) ? 1 : 0;
  }

  return player.progress[objective.type] || 0;
}

function getQuestProgress(quest, player) {
  const objectives = quest.objectives.map((objective) => ({
    ...objective,
    current: Math.min(
      objective.required,
      getObjectiveProgress(objective, player, quest.id),
    ),
  }));
  const completedObjectives = objectives.filter(
    (objective) => objective.current >= objective.required,
  ).length;

  return {
    objectives,
    completedObjectives,
    isComplete: completedObjectives === objectives.length,
  };
}

function isQuestUnlocked(quest, player) {
  return (
    getAcademyYear(player) >= (quest.academyYear ?? 1) &&
    (!quest.prerequisiteQuestId ||
      player.claimedQuests.includes(quest.prerequisiteQuestId))
  );
}

function getQuestStatus(quest, player) {
  if (!isQuestUnlocked(quest, player)) return "locked";
  if (player.claimedQuests.includes(quest.id)) return "claimed";
  if (getQuestProgress(quest, player).isComplete) return "complete";
  return "active";
}

function isExamReady(quest, player) {
  return (
    isQuestUnlocked(quest, player) &&
    quest.objectives.some((objective) => objective.type === "examVictory") &&
    quest.objectives
      .filter(
        (objective) => objective.type === "minimumLevel",
      )
      .every(
        (objective) =>
          getObjectiveProgress(objective, player, quest.id) >=
          objective.required,
      ) &&
    !player.completedMilestones.includes("first-exam")
  );
}

export {
  getObjectiveProgress,
  getQuestProgress,
  getQuestStatus,
  isQuestUnlocked,
  isExamReady,
};
