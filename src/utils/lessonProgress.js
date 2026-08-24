function migrateLessonProgress(lessonProgress = {}) {
  return Object.fromEntries(
    Object.entries(lessonProgress).map(([lessonId, attendance]) => {
      if (typeof attendance === "number") {
        return [lessonId, { 1: attendance }];
      }

      return [lessonId, { ...attendance }];
    }),
  );
}

function getLessonAttendance(player, lessonId, academyYear) {
  return player.lessonProgress?.[lessonId]?.[academyYear] || 0;
}

function getTotalLessonAttendance(player, academyYear) {
  return Object.keys(player.lessonProgress || {}).reduce(
    (total, lessonId) =>
      total + getLessonAttendance(player, lessonId, academyYear),
    0,
  );
}

function incrementLessonAttendance(player, lessonId, academyYear) {
  const currentAttendance = getLessonAttendance(
    player,
    lessonId,
    academyYear,
  );

  return {
    ...player.lessonProgress,
    [lessonId]: {
      ...player.lessonProgress?.[lessonId],
      [academyYear]: currentAttendance + 1,
    },
  };
}

export {
  getLessonAttendance,
  getTotalLessonAttendance,
  incrementLessonAttendance,
  migrateLessonProgress,
};
