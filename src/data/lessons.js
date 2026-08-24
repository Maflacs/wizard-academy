const lessons = [
  {
    id: "charms",
    name: "Bűbájtan",
    teacher: "Harangszó professzor",
    level: "Kezdő",
    energyCost: 20,
    xpReward: 35,
    spellUnlocks: [
      { spellId: "wind-blade", requiredProgress: 3, requiredLevel: 1, requiredAcademyYear: 1 },
      { spellId: "force-pulse", requiredProgress: 6, requiredLevel: 1, requiredAcademyYear: 1 },
      { spellId: "rune-lance", requiredProgress: 9, requiredLevel: 5, requiredAcademyYear: 2 },
      { spellId: "crystal-echo", requiredProgress: 12, requiredLevel: 6, requiredAcademyYear: 2 },
      { spellId: "rune-fracture", requiredProgress: 15, requiredLevel: 11, requiredAcademyYear: 3 },
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
      { spellId: "biting-vine", requiredProgress: 3, requiredLevel: 1, requiredAcademyYear: 1 },
      { spellId: "thorn-root", requiredProgress: 6, requiredLevel: 1, requiredAcademyYear: 1 },
      { spellId: "draining-vine", requiredProgress: 9, requiredLevel: 5, requiredAcademyYear: 2 },
      { spellId: "vital-bloom", requiredProgress: 12, requiredLevel: 6, requiredAcademyYear: 2 },
      { spellId: "venom-vine", requiredProgress: 15, requiredLevel: 11, requiredAcademyYear: 3 },
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
      { spellId: "guardian-shield", requiredProgress: 3, requiredLevel: 1, requiredAcademyYear: 1 },
      { spellId: "healing-light", requiredProgress: 6, requiredLevel: 1, requiredAcademyYear: 1 },
      { spellId: "reinforced-ward", requiredProgress: 9, requiredLevel: 5, requiredAcademyYear: 2 },
      { spellId: "unyielding-circle", requiredProgress: 12, requiredLevel: 6, requiredAcademyYear: 2 },
      { spellId: "dampening-circle", requiredProgress: 15, requiredLevel: 11, requiredAcademyYear: 3 },
    ],
  },
];

export default lessons;
