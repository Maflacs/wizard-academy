const lessons = [
  {
    id: "charms",
    name: "Bűbájtan",
    teacher: "Harangszó professzor",
    level: "Kezdő",
    energyCost: 20,
    xpReward: 35,
    spellUnlocks: [
      { spellId: "wind-blade", requiredAttendances: 3 },
      { spellId: "force-pulse", requiredAttendances: 6 },
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
      { spellId: "biting-vine", requiredAttendances: 3 },
      { spellId: "thorn-root", requiredAttendances: 6 },
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
      { spellId: "guardian-shield", requiredAttendances: 3 },
      { spellId: "healing-light", requiredAttendances: 6 },
    ],
  },
];

export default lessons;
