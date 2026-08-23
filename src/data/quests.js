const quests = [
  {
    id: "first-week",
    name: "Az első napok",
    description: "Ismerkedj meg a Sorsliget Akadémia mindennapjaival.",
    objectives: [
      {
        id: "attend-charms",
        type: "lessonAttendance",
        required: 1,
        description: "Vegyél részt egy órán",
      },
      {
        id: "win-duels",
        type: "duelWins",
        required: 1,
        description: "Győzz egy párbajban",
      },
      {
        id: "buy-item",
        type: "itemsPurchased",
        required: 1,
        description: "Vásárolj egy tárgyat",
      },
      {
        id: "upgrade-stat",
        type: "statUpgrades",
        required: 1,
        description: "Fejleszd valamelyik képességedet",
      },
    ],
    rewards: {
      xp: 100,
      gold: 75,
    },
  },
  {
    id: "first-spell",
    prerequisiteQuestId: "first-week",
    name: "Az első komoly varázsige",
    description: "A gyakorlás meghozza gyümölcsét. Sajátíts el egy új harci varázsigét.",
    objectives: [
      {
        id: "attend-charms-three-times",
        type: "lessonAttendance",
        lessonId: "charms",
        required: 3,
        description: "Vegyél részt három Bűbájtan órán",
      },
      {
        id: "know-wind-blade",
        type: "knownSpell",
        spellId: "wind-blade",
        required: 1,
        description: "Tanuld meg a Szélpenge varázsigét",
      },
      {
        id: "win-three-duels",
        type: "duelWins",
        required: 3,
        description: "Győzz összesen három párbajban",
      },
    ],
    rewards: { xp: 150, gold: 100 },
  },
  {
    id: "defensive-basics",
    prerequisiteQuestId: "first-spell",
    name: "Védelmi alapok",
    description: "A jó mágus nemcsak támadni tud. Tanuld meg megóvni magad.",
    objectives: [
      {
        id: "attend-defense-three-times",
        type: "lessonAttendance",
        lessonId: "defensive-magic",
        required: 3,
        description: "Vegyél részt három Mágikus védelem órán",
      },
      {
        id: "know-guardian-shield",
        type: "knownSpell",
        spellId: "guardian-shield",
        required: 1,
        description: "Tanuld meg az Őrzőpajzs varázsigét",
      },
      {
        id: "raise-defense",
        type: "minimumBaseStat",
        stat: "defense",
        required: 6,
        description: "Emeld a Védelem alapértékét legalább 6-ra",
      },
      {
        id: "win-five-duels",
        type: "duelWins",
        required: 5,
        description: "Győzz összesen öt párbajban",
      },
    ],
    rewards: { xp: 200, gold: 150 },
  },
  {
    id: "first-exam",
    prerequisiteQuestId: "defensive-basics",
    name: "Az első vizsga",
    description: "Elérkezett az idő, hogy bizonyítsd, mit tanultál.",
    objectives: [
      {
        id: "reach-exam-level",
        type: "minimumLevel",
        required: 5,
        description: "Érd el legalább az 5. szintet",
      },
      {
        id: "win-first-exam",
        type: "examVictory",
        milestoneId: "first-exam",
        required: 1,
        description: "Győzd le az Akadémia Őrszellemét",
      },
    ],
    rewards: { xp: 300, gold: 250 },
    milestoneId: "first-exam",
  },
];

export default quests;