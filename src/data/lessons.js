const lessons = [
  {
    id: "charms",
    name: "Bűbájtan",
    teacher: "Harangszó professzor",
    level: "Kezdő",
    energyCost: 20,
    xpReward: 35,
    spellUnlocks: [
      { spellId: "wind-blade", academicYear: 1, requiredAttendances: 3 },
      { spellId: "force-pulse", academicYear: 1, requiredAttendances: 6 },
      { spellId: "rune-lance", academicYear: 2, requiredAttendances: 3 },
    ],
  },
  {
    id: "herbology",
    name: "Növénybűvészet",
    teacher: "Zöldág mesternő",
    level: "Kezdő",
    energyCost: 15,
    xpReward: 25,
    spellUnlocks: [
      { spellId: "biting-vine", academicYear: 1, requiredAttendances: 3 },
      { spellId: "thorn-root", academicYear: 1, requiredAttendances: 6 },
      { spellId: "draining-vine", academicYear: 2, requiredAttendances: 3 },
    ],
  },
  {
    id: "defensive-magic",
    name: "Mágikus védelem",
    teacher: "Tövis mester",
    level: "Haladó",
    energyCost: 30,
    xpReward: 50,
    spellUnlocks: [
      { spellId: "guardian-shield", academicYear: 1, requiredAttendances: 3 },
      { spellId: "healing-light", academicYear: 1, requiredAttendances: 6 },
      {
        spellId: "reinforced-ward",
        academicYear: 2,
        requiredAttendances: 3,
      },
    ],
  },
];

export default lessons;
