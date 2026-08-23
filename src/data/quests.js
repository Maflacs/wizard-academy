const quests = [
  {
    id: "first-week",
    name: "Az első hét",
    description: "Ismerkedj meg a Csillagtorony Akadémia életével.",
    objectives: [
      {
        id: "attend-charms",
        type: "lessonAttendance",
        lessonId: "charms",
        required: 1,
        description: "Vegyél részt egy Bűbájtan órán",
      },
      {
        id: "win-duels",
        type: "duelWins",
        required: 2,
        description: "Győzz két párbajban",
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
];

export default quests;