const MAX_IMPLEMENTED_ACADEMY_YEAR = 4;
const ACADEMY_YEAR_COMPLETION_MILESTONES = [
  { year: 1, milestone: "first-year-complete" },
  { year: 2, milestone: "second-year-complete" },
  { year: 3, milestone: "third-year-complete" },
];

function clampAcademyYear(year) {
  return Math.min(
    MAX_IMPLEMENTED_ACADEMY_YEAR,
    Math.max(1, Number(year) || 1),
  );
}

function getCompletedAcademyYears(player) {
  const completedMilestones = player.completedMilestones || [];
  return ACADEMY_YEAR_COMPLETION_MILESTONES.filter(({ milestone }) =>
    completedMilestones.includes(milestone),
  ).map(({ year }) => year);
}

function getAcademyYear(player) {
  const completedYears = getCompletedAcademyYears(player);
  const earnedYear =
    completedYears.length > 0 ? Math.max(...completedYears) + 1 : 1;
  return clampAcademyYear(earnedYear);
}

function meetsAcademyYearRequirement(player, requiredAcademyYear = 1) {
  return getAcademyYear(player) >= requiredAcademyYear;
}

function formatAcademyYear(year) {
  return ["I.", "II.", "III.", "IV.", "V."][year - 1] || `${year}.`;
}

export {
  MAX_IMPLEMENTED_ACADEMY_YEAR,
  clampAcademyYear,
  formatAcademyYear,
  getAcademyYear,
  getCompletedAcademyYears,
  meetsAcademyYearRequirement,
};
