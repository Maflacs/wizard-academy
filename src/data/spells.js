// Static spell definitions stay outside player state; players only store their spell IDs.
const spells = [
  {
    id: "spark-bolt",
    name: "Szikralöket",
    description: "Egy sűrű szikraköteg, amely eltalálja a kijelölt célpontot.",
    manaCost: 8,
    basePower: 12,
    requiredLevel: 1,
    type: "attack",
  },
  {
    id: "protective-shell",
    name: "Védőburok",
    description: "Rövid időre mágikus pajzsot von a varázsló köré.",
    manaCost: 10,
    basePower: 10,
    requiredLevel: 1,
    type: "defense",
  },
  {
    id: "glow-orb",
    name: "Fénygömb",
    description: "Lebegő fénygömböt idéz, amely bevilágítja a sötét folyosókat.",
    manaCost: 5,
    requiredLevel: 1,
    type: "utility",
  },
];

export default spells;
