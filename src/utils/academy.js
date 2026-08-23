const ACADEMY_YEAR_MILESTONES = [
  { year: 2, milestone: "first-year-complete" },
];

function getAcademyYear(player) {
  return (
    [...ACADEMY_YEAR_MILESTONES]
      .reverse()
      .find(({ milestone }) => player.completedMilestones.includes(milestone))
      ?.year || 1
  );
}

function meetsAcademyYearRequirement(player, requiredAcademyYear = 1) {
  return getAcademyYear(player) >= requiredAcademyYear;
}

function formatAcademyYear(year) {
  return ["I.", "II.", "III.", "IV.", "V."][year - 1] || `${year}.`;
}

export { formatAcademyYear, getAcademyYear, meetsAcademyYearRequirement };