import {
  getCurriculumProgress,
  getTotalCurriculumProgress,
} from "./curriculum";
import { getAcademyYear } from "./academy";

function getQuestBaselineKey(objective) {
  if (objective.type === "progressSinceQuestActivation") {
    return objective.progressKey;
  }
  if (objective.type === "lessonAttendanceSinceQuestActivation") {
    return `lessonAttendancesByCurriculumYear:${objective.curriculumYear}`;
  }
  return null;
}

function getQuestActivityValue(objective, player) {
  if (objective.type === "progressSinceQuestActivation") {
    return player.progress[objective.progressKey] || 0;
  }
  if (objective.type === "lessonAttendanceSinceQuestActivation") {
    return (
      player.progress.lessonAttendancesByCurriculumYear?.[
        objective.curriculumYear
      ] || 0
    );
  }
  return 0;
}

function getQuestBaselineEntries(objective, player) {
  const baselineKey = getQuestBaselineKey(objective);
  if (baselineKey) {
    return [[baselineKey, getQuestActivityValue(objective, player)]];
  }
  if (objective.type === "distinctProgressSinceQuestActivation") {
    const progressByType = player.progress[objective.progressKey] || {};
    return objective.progressTypes.map((progressType) => [
      `${objective.progressKey}:${progressType}`,
      progressByType[progressType] || 0,
    ]);
  }
  return [];
}

function getObjectiveProgress(objective, player, questId) {
  if (objective.type === "curriculumProgress") {
    if (objective.lessonId) {
      return getCurriculumProgress(player, objective.lessonId);
    }
    return getTotalCurriculumProgress(player);
  }

  if (objective.type === "knownSpell") {
    return player.knownSpells.includes(objective.spellId) ? 1 : 0;
  }
  if (objective.type === "curriculumMilestoneCount") {
    return objective.lessonIds.filter(
      (lessonId) =>
        getCurriculumProgress(player, lessonId) >= objective.requiredProgress,
    ).length;
  }
  if (objective.type === "preparedSpell") {
    return objective.spellIds.some((spellId) =>
      player.preparedSpells.includes(spellId),
    )
      ? 1
      : 0;
  }
  if (
    objective.type === "progressSinceQuestActivation" ||
    objective.type === "lessonAttendanceSinceQuestActivation"
  ) {
    const baselineKey = getQuestBaselineKey(objective);
    const current = getQuestActivityValue(objective, player);
    const baseline = player.questBaselines?.[questId]?.[baselineKey];
    if (!Number.isFinite(baseline) || baseline < 0) return 0;
    return Math.max(0, current - baseline);
  }
  if (objective.type === "distinctProgressSinceQuestActivation") {
    const progressByType = player.progress[objective.progressKey] || {};
    const baselines = player.questBaselines?.[questId] || {};
    return objective.progressTypes.filter((progressType) => {
      const baseline = baselines[`${objective.progressKey}:${progressType}`];
      if (!Number.isFinite(baseline) || baseline < 0) return false;
      return (progressByType[progressType] || 0) > baseline;
    }).length;
  }
  if (objective.type === "minimumBaseStat") {
    return player.stats[objective.stat] || 0;
  }
  if (objective.type === "minimumLevel") return player.level;
  if (objective.type === "examVictory") {
    return player.completedMilestones.includes(
      objective.examId || objective.milestoneId,
    )
      ? 1
      : 0;
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
  const examObjective = quest.objectives.find(
    (objective) => objective.type === "examVictory",
  );
  return (
    isQuestUnlocked(quest, player) &&
    Boolean(examObjective) &&
    quest.objectives
      .filter(
        (objective) => objective.type === "minimumLevel",
      )
      .every(
        (objective) =>
          getObjectiveProgress(objective, player, quest.id) >=
          objective.required,
      ) &&
    !player.completedMilestones.includes(
      examObjective.examId || examObjective.milestoneId,
    )
  );
}

function getQuestExamId(quest) {
  const objective = quest.objectives.find(
    (candidate) => candidate.type === "examVictory",
  );
  return objective?.examId || objective?.milestoneId || null;
}

export {
  getQuestActivityValue,
  getQuestBaselineEntries,
  getQuestBaselineKey,
  getObjectiveProgress,
  getQuestProgress,
  getQuestStatus,
  isQuestUnlocked,
  isExamReady,
  getQuestExamId,
};
