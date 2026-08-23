function getObjectiveProgress(objective, player) {
  if (objective.type === "lessonAttendance") {
    return player.lessonProgress[objective.lessonId] || 0;
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

export { getObjectiveProgress, getQuestProgress };