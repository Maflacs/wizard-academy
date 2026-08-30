const quests = [
  {
    id: "first-week",
    name: "Az első napok",
    description: "Ismerkedj meg a Sorsliget Akadémia mindennapjaival.",
    objectives: [
      {
        id: "attend-charms",
        type: "curriculumProgress",
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
        type: "curriculumProgress",
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
        type: "curriculumProgress",
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
    academyYear: 1,
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
        examId: "first-exam",
        milestoneId: "first-exam",
        required: 1,
        description: "Győzd le az Akadémia Őrszellemét",
      },
    ],
    rewards: { xp: 300, gold: 250 },
    milestoneId: "first-exam",
    yearCompletionMilestone: "first-year-complete",
  },
  {
    id: "new-year-new-challenges",
    academyYear: 2,
    name: "Új tanév, új kihívások",
    description:
      "Lépj be a második évfolyam tanrendjébe, és tedd próbára új tudásodat.",
    objectives: [
      {
        id: "attend-any-year-two-lesson",
        type: "lessonAttendanceSinceQuestActivation",
        curriculumYear: 2,
        required: 1,
        description: "Vegyél részt egy II. évfolyamos órán",
      },
      {
        id: "win-new-year-two-duel",
        type: "progressSinceQuestActivation",
        progressKey: "duelWins",
        required: 1,
        description: "Győzz egy új párbajban a II. évfolyamon",
      },
    ],
    rewards: { xp: 125, gold: 100 },
  },
  {
    id: "three-new-paths",
    academyYear: 2,
    prerequisiteQuestId: "new-year-new-challenges",
    name: "Három új út",
    description:
      "Mélyítsd el tudásodat mindhárom tantárgyban, és sajátítsd el az új tananyagot.",
    objectives: [
      {
        id: "year-two-charms-three-times",
        type: "curriculumProgress",
        lessonId: "charms",
        required: 9,
        description: "Érd el a 9-es Bűbájtan tanulmányi haladást",
      },
      {
        id: "year-two-herbology-three-times",
        type: "curriculumProgress",
        lessonId: "herbology",
        required: 9,
        description: "Érd el a 9-es Növénybűvészet tanulmányi haladást",
      },
      {
        id: "year-two-defense-three-times",
        type: "curriculumProgress",
        lessonId: "defensive-magic",
        required: 9,
        description: "Érd el a 9-es Mágikus védelem tanulmányi haladást",
      },
      {
        id: "know-rune-lance",
        type: "knownSpell",
        spellId: "rune-lance",
        required: 1,
        description: "Tanuld meg a Rúnalándzsa varázsigét",
      },
      {
        id: "know-draining-vine",
        type: "knownSpell",
        spellId: "draining-vine",
        required: 1,
        description: "Tanuld meg az Életszívó inda varázsigét",
      },
      {
        id: "know-reinforced-ward",
        type: "knownSpell",
        spellId: "reinforced-ward",
        required: 1,
        description: "Tanuld meg a Megerősített őrzés varázsigét",
      },
    ],
    rewards: { xp: 200, gold: 150 },
  },
  {
    id: "deliberate-preparation",
    academyYear: 2,
    prerequisiteQuestId: "three-new-paths",
    name: "Tudatos felkészülés",
    description:
      "Állíts össze tudatos varázslatkészletet, majd bizonyíts vele a párbajteremben.",
    objectives: [
      {
        id: "prepare-year-two-spell",
        type: "preparedSpell",
        spellIds: ["rune-lance", "draining-vine", "reinforced-ward"],
        required: 1,
        description: "Készíts be legalább egy II. évfolyamos varázsigét",
      },
      {
        id: "win-three-duels-after-activation",
        type: "progressSinceQuestActivation",
        progressKey: "duelWins",
        required: 3,
        description: "Győzz három új párbajban a feladat megnyílása után",
      },
    ],
    rewards: { xp: 250, gold: 200 },
  },
  {
    id: "chosen-path",
    academyYear: 2,
    prerequisiteQuestId: "deliberate-preparation",
    name: "Választott út",
    description:
      "Mélyítsd el tudásodat abban a két mágikus ágban, amely leginkább illik hozzád.",
    objectives: [
      {
        id: "deepen-two-subjects",
        type: "curriculumMilestoneCount",
        lessonIds: ["charms", "herbology", "defensive-magic"],
        requiredProgress: 12,
        required: 2,
        description:
          "Mélyítsd el legalább két tantárgy tananyagát a 12-es szintig",
      },
    ],
    rewards: { xp: 300, gold: 225 },
  },
  {
    id: "year-two-trial",
    academyYear: 2,
    prerequisiteQuestId: "chosen-path",
    name: "Próbatétel",
    description:
      "Készítsd be választott haladó varázslatodat, és bizonyíts vele a párbajteremben.",
    objectives: [
      {
        id: "prepare-advanced-year-two-spell",
        type: "preparedSpell",
        spellIds: ["crystal-echo", "vital-bloom", "unyielding-circle"],
        required: 1,
        description: "Készíts be legalább egy haladó II. évfolyamos varázsigét",
      },
      {
        id: "win-three-new-trial-duels",
        type: "progressSinceQuestActivation",
        progressKey: "duelWins",
        required: 3,
        description: "Győzz három új normál párbajban a feladat megnyílása után",
      },
    ],
    rewards: { xp: 350, gold: 275 },
  },
  {
    id: "second-exam",
    academyYear: 2,
    prerequisiteQuestId: "year-two-trial",
    name: "A második vizsga",
    description:
      "Bizonyítsd a Rúnakör Őre előtt, hogy készen állsz a második évfolyam lezárására.",
    objectives: [
      {
        id: "reach-second-exam-level",
        type: "minimumLevel",
        required: 10,
        description: "Érd el legalább a 10. szintet",
      },
      {
        id: "win-second-exam",
        type: "examVictory",
        examId: "second-exam",
        milestoneId: "second-exam",
        required: 1,
        description: "Győzd le a Rúnakör Őrét",
      },
    ],
    rewards: { xp: 450, gold: 350 },
    milestoneId: "second-exam",
    yearCompletionMilestone: "second-year-complete",
  },
  {
    id: "new-magic-trail",
    academyYear: 3,
    name: "Új mágia nyomában",
    description:
      "Fedezd fel a tartós mágikus hatások alapjait, és próbáld ki választott új varázslatodat párbajban.",
    objectives: [
      {
        id: "attend-any-year-three-lesson",
        type: "lessonAttendanceSinceQuestActivation",
        curriculumYear: 3,
        required: 1,
        description: "Vegyél részt egy III. évfolyamos órán",
      },
      {
        id: "prepare-year-three-spell",
        type: "preparedSpell",
        spellIds: ["rune-fracture", "venom-vine", "dampening-circle"],
        required: 1,
        description: "Készíts be legalább egy III. évfolyamos varázsigét",
      },
      {
        id: "win-new-year-three-duel",
        type: "progressSinceQuestActivation",
        progressKey: "duelWins",
        required: 1,
        description: "Győzz egy új normál párbajban a feladat megnyílása után",
      },
    ],
    rewards: { xp: 200, gold: 150 },
  },
  {
    id: "interwoven-magic",
    academyYear: 3,
    prerequisiteQuestId: "new-magic-trail",
    name: "Az összefonódó mágia",
    description:
      "Az igazán fejlett mágia nem elszigetelt varázslatokból, hanem egymásra épülő hatásokból születik.",
    objectives: [
      {
        id: "complete-two-year-three-subjects",
        type: "curriculumMilestoneCount",
        lessonIds: ["charms", "herbology", "defensive-magic"],
        requiredProgress: 18,
        required: 2,
        description:
          "Teljesítsd a III. évfolyam tananyagát legalább 2 tantárgyból",
      },
      {
        id: "prepare-year-three-combo-spell",
        type: "preparedSpell",
        spellIds: ["rune-detonation", "venom-harvest", "guardian-bastion"],
        required: 1,
        description:
          "Készíts be legalább egy összetett III. évfolyamos varázslatot",
      },
      {
        id: "win-three-new-combo-duels",
        type: "progressSinceQuestActivation",
        progressKey: "duelWins",
        required: 3,
        description: "Győzz három új normál párbajban a feladat megnyílása után",
      },
    ],
    rewards: { xp: 400, gold: 300 },
  },
  {
    id: "magic-in-harmony",
    academyYear: 3,
    prerequisiteQuestId: "interwoven-magic",
    name: "A mágia összhangja",
    description:
      "A fejlett varázslatok ereje nem önmagukban, hanem megfelelő előkészítésükben és időzítésükben rejlik. Bizonyítsd, hogy többféle mágikus összhangot is képes vagy uralni.",
    objectives: [
      {
        id: "execute-four-year-three-combos",
        type: "progressSinceQuestActivation",
        progressKey: "comboExecutions",
        required: 4,
        progressLabel: "Kombók",
        description:
          "Hajts végre 4 sikeres III. évfolyamos összetett kombinációt",
        helperLines: [
          "Számító kombinációk:",
          "Rúnatörés → Rúnakisülés",
          "Méreginda → Méregszüret",
          "Csillapító kör → Őrzőbástya",
        ],
      },
      {
        id: "use-two-year-three-combo-types",
        type: "distinctProgressSinceQuestActivation",
        progressKey: "comboExecutionsByType",
        progressTypes: ["rune", "venom", "defense"],
        required: 2,
        progressLabel: "Különböző kombinációk",
        description:
          "Használj legalább 2 különböző kombinációt a fentiek közül",
      },
      {
        id: "win-three-new-harmony-duels",
        type: "progressSinceQuestActivation",
        progressKey: "duelWins",
        required: 3,
        progressLabel: "Győzelmek",
        description:
          "Győzz 3 új normál párbajban a feladat megnyílása után",
      },
    ],
    rewards: { xp: 300, gold: 225 },
  },
  {
    id: "third-exam",
    academyYear: 3,
    prerequisiteQuestId: "magic-in-harmony",
    name: "Az alkalmazkodás próbája",
    description:
      "A III. évfolyam zárópróbáján nem elég az erő. Bizonyítanod kell, hogy képes vagy változtatni a varázslataidon, mielőtt ellenfeled kiismeri a mintáidat.",
    objectives: [
      {
        id: "reach-third-exam-level",
        type: "minimumLevel",
        required: 15,
        description: "Érd el legalább a 15. szintet",
      },
      {
        id: "win-third-exam",
        type: "examVictory",
        examId: "third-exam",
        milestoneId: "third-exam",
        required: 1,
        description:
          "Győzd le Serent, a Rezonanciaőrt a III. évfolyam záróvizsgáján",
      },
    ],
    rewards: { xp: 650, gold: 500 },
    milestoneId: "third-exam",
    yearCompletionMilestone: "third-year-complete",
  },
];

export default quests;
