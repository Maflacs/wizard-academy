const curriculumProgressVersion = 1;

function getCurriculumCap(academyYear) {
  return Math.max(1, academyYear) * 6;
}

function getSubjectCurriculumYear(progress, academyYear) {
  const unlockedYear = Math.max(1, academyYear);
  if (progress >= getCurriculumCap(unlockedYear)) return unlockedYear;
  return Math.min(unlockedYear, Math.floor(Math.max(0, progress) / 6) + 1);
}

function getCurriculumProgress(player, lessonId) {
  return player.curriculumProgress?.[lessonId] || 0;
}

function getTotalCurriculumProgress(player) {
  return Object.values(player.curriculumProgress || {}).reduce(
    (total, progress) => total + progress,
    0,
  );
}

function advanceCurriculumProgress(player, lessonId, academyYear) {
  const current = getCurriculumProgress(player, lessonId);
  const cap = getCurriculumCap(academyYear);
  const curriculumYear = getSubjectCurriculumYear(current, academyYear);
  const next = Math.min(cap, current + 1);
  return {
    lessonId,
    curriculumYear,
    curriculumProgress: {
      ...player.curriculumProgress,
      [lessonId]: next,
    },
    previousProgress: current,
    progress: next,
    cap,
    advanced: next > current,
  };
}

function canLearnCurriculumSpell(
  player,
  unlock,
  spell,
  lessonId,
  academyYear,
) {
  return (
    Boolean(spell) &&
    getCurriculumProgress(player, lessonId) >= unlock.requiredProgress &&
    player.level >= (unlock.requiredLevel ?? spell.requiredLevel ?? 1) &&
    academyYear >=
      (unlock.requiredAcademyYear ?? spell.requiredAcademyYear ?? 1)
  );
}

function reconcileCurriculumProgressWithKnownSpells(
  player,
  lessons,
  academyYear,
) {
  const cap = getCurriculumCap(academyYear);
  const curriculumProgress = lessons.reduce((progressByLesson, lesson) => {
    const highestKnownMilestone = (lesson.spellUnlocks || []).reduce(
      (highest, unlock) =>
        player.knownSpells.includes(unlock.spellId)
          ? Math.max(highest, unlock.requiredProgress)
          : highest,
      0,
    );
    const currentProgress = getCurriculumProgress(player, lesson.id);
    return {
      ...progressByLesson,
      [lesson.id]: Math.min(
        cap,
        Math.max(currentProgress, highestKnownMilestone),
      ),
    };
  }, { ...player.curriculumProgress });

  return { ...player, curriculumProgress };
}

function reconcileCurriculumSpells(player, lessons, spells, academyYear) {
  const reconciledPlayer = reconcileCurriculumProgressWithKnownSpells(
    player,
    lessons,
    academyYear,
  );
  const learnedSpellIds = [
    ...new Set(
      lessons.flatMap((lesson) =>
        (lesson.spellUnlocks || [])
          .filter((unlock) => {
            const spell = spells.find(
              (candidate) => candidate.id === unlock.spellId,
            );
            return (
              !reconciledPlayer.knownSpells.includes(unlock.spellId) &&
              canLearnCurriculumSpell(
                reconciledPlayer,
                unlock,
                spell,
                lesson.id,
                academyYear,
              )
            );
          })
          .map((unlock) => unlock.spellId),
      ),
    ),
  ];
  return {
    player:
      learnedSpellIds.length > 0
        ? {
            ...reconciledPlayer,
            knownSpells: [
              ...reconciledPlayer.knownSpells,
              ...learnedSpellIds,
            ],
          }
        : reconciledPlayer,
    learnedSpellIds,
  };
}

function migrateCurriculumProgress(savedData, academyYear) {
  const cap = getCurriculumCap(academyYear);
  if (
    savedData.curriculumProgressVersion >= curriculumProgressVersion &&
    savedData.curriculumProgress &&
    typeof savedData.curriculumProgress === "object"
  ) {
    return Object.fromEntries(
      Object.entries(savedData.curriculumProgress).map(([lessonId, progress]) => [
        lessonId,
        Math.min(cap, Math.max(0, Number(progress) || 0)),
      ]),
    );
  }

  return Object.fromEntries(
    Object.entries(savedData.lessonProgress || {}).map(
      ([lessonId, attendance]) => {
        const yearlyAttendance =
          typeof attendance === "number" ? { 1: attendance } : attendance || {};
        const cumulative = Object.values(yearlyAttendance).reduce(
          (total, yearlyValue) =>
            total + Math.min(6, Math.max(0, Number(yearlyValue) || 0)),
          0,
        );
        return [lessonId, Math.min(cap, cumulative)];
      },
    ),
  );
}

function isSpellCurrentlyEligible(player, spell, academyYear) {
  return (
    Boolean(spell) &&
    player.level >= (spell.requiredLevel ?? 1) &&
    academyYear >= (spell.requiredAcademyYear ?? 1)
  );
}

export {
  advanceCurriculumProgress,
  canLearnCurriculumSpell,
  curriculumProgressVersion,
  getCurriculumCap,
  getCurriculumProgress,
  getSubjectCurriculumYear,
  getTotalCurriculumProgress,
  isSpellCurrentlyEligible,
  migrateCurriculumProgress,
  reconcileCurriculumProgressWithKnownSpells,
  reconcileCurriculumSpells,
};
