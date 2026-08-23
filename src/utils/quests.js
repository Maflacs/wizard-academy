function getObjectiveProgress(objective, player) {
  if (objective.type === "lessonAttendance") {
    if (objective.lessonId) {
      return player.lessonProgress[objective.lessonId] || 0;
    }
    return Object.values(player.lessonProgress).reduce(
      (total, attendance) => total + attendance,
      0,
    );
  }

  if (objective.type === "knownSpell") {
    return player.knownSpells.includes(objective.spellId) ? 1 : 0;
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
      getObjectiveProgress(objective, player),
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
    !quest.prerequisiteQuestId ||
    player.claimedQuests.includes(quest.prerequisiteQuestId)
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
          getObjectiveProgress(objective, player) >= objective.required,
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