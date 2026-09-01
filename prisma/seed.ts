import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = ["sprint", "mile", "medium", "long", "dirt"] as const;
const FANO: [number, number, number][] = [
  [0, 1, 3],
  [1, 2, 4],
  [2, 3, 5],
  [3, 4, 6],
  [4, 5, 0],
  [5, 6, 1],
  [6, 0, 2],
];

const TEAMS: { id: string; name: string; shortName: string; tagline: string; color: string; group: string; groupSlot: number }[] = [
  { id: "carrot-club", name: "Carrot Club", shortName: "Carrot", tagline: "Snack first, win second.", color: "#e07a5f", group: "A", groupSlot: 0 },
  { id: "peach-parade", name: "Peach Parade", shortName: "Peach", tagline: "Soft steps, loud finishes.", color: "#f2a7c3", group: "A", groupSlot: 1 },
  { id: "ribbon-racers", name: "Ribbon Racers", shortName: "Ribbon", tagline: "Tied together.", color: "#d6456c", group: "A", groupSlot: 2 },
  { id: "moonlit-mochi", name: "Moonlit Mochi", shortName: "Mochi", tagline: "Chewy late kick.", color: "#7c6bb0", group: "A", groupSlot: 3 },
  { id: "honey-hares", name: "Honey Hares", shortName: "Honey", tagline: "Sticky on the lead.", color: "#e0a100", group: "A", groupSlot: 4 },
  { id: "daisy-dash", name: "Daisy Dash", shortName: "Daisy", tagline: "Picnic pace.", color: "#7cb342", group: "A", groupSlot: 5 },
  { id: "cotton-candy", name: "Cotton Candy", shortName: "Cotton", tagline: "Looks fluffy. Isn't.", color: "#ef9a9a", group: "A", groupSlot: 6 },
  { id: "tea-time", name: "Tea Time", shortName: "Tea", tagline: "One lump or two lengths.", color: "#8d6e63", group: "B", groupSlot: 0 },
  { id: "starlight-stables", name: "Starlight Stables", shortName: "Starlight", tagline: "Wish on a photo finish.", color: "#5c6bc0", group: "B", groupSlot: 1 },
  { id: "jam-session", name: "Jam Session", shortName: "Jam", tagline: "Improvised corners.", color: "#c62828", group: "B", groupSlot: 2 },
  { id: "cloud-nine", name: "Cloud Nine", shortName: "Cloud", tagline: "Front running daydreams.", color: "#90caf9", group: "B", groupSlot: 3 },
  { id: "biscuit-brigade", name: "Biscuit Brigade", shortName: "Biscuit", tagline: "Crumbs on the turf.", color: "#c9a227", group: "B", groupSlot: 4 },
  { id: "lavender-lane", name: "Lavender Lane", shortName: "Lavender", tagline: "Calm until the last 200.", color: "#9575cd", group: "B", groupSlot: 5 },
  { id: "soda-pop", name: "Soda Pop", shortName: "Soda", tagline: "Fizz in the final straight.", color: "#26c6da", group: "B", groupSlot: 6 },
  { id: "maple-manor", name: "Maple Manor", shortName: "Maple", tagline: "Warm, then suddenly fast.", color: "#d84315", group: "C", groupSlot: 0 },
  { id: "puff-pastry", name: "Puff Pastry", shortName: "Puff", tagline: "Layers of late speed.", color: "#ffcc80", group: "C", groupSlot: 1 },
  { id: "rainy-ribbon", name: "Rainy Ribbon", shortName: "Rainy", tagline: "Wet track specialists.", color: "#546e7a", group: "C", groupSlot: 2 },
  { id: "sunflower-sprint", name: "Sunflower Sprint", shortName: "Sunflower", tagline: "Always facing the lead.", color: "#f9a825", group: "C", groupSlot: 3 },
  { id: "cocoa-corner", name: "Cocoa Corner", shortName: "Cocoa", tagline: "Bitter when it counts.", color: "#6d4c41", group: "C", groupSlot: 4 },
  { id: "bubble-bath", name: "Bubble Bath", shortName: "Bubble", tagline: "Relax. Then explode.", color: "#4dd0e1", group: "C", groupSlot: 5 },
  { id: "lucky-lotus", name: "Lucky Lotus", shortName: "Lotus", tagline: "Soft luck, hard numbers.", color: "#ec407a", group: "C", groupSlot: 6 },
];

const UMA_NAMES = [
  "Special Week",
  "Silence Suzuka",
  "Tokai Teio",
  "Oguri Cap",
  "Gold Ship",
  "Mejiro McQueen",
  "Symboli Rudolf",
  "Taiki Shuttle",
  "Grass Wonder",
  "Hishi Amazon",
  "Sakura Bakushin O",
  "Super Creek",
  "Smart Falcon",
  "Nice Nature",
  "King Halo",
  "El Condor Pasa",
  "T.M. Opera O",
  "Narita Brian",
  "Rice Shower",
  "Mihono Bourbon",
  "Winning Ticket",
  "Narita Taishin",
  "Seiun Sky",
  "Tamamo Cross",
  "Haru Urara",
];

const SPRITE_IDS = [
  "100101", "100201", "100301", "100401", "100501", "100601", "100701", "100801", "100901", "101001",
  "101101", "101201", "101701", "103801", "104101", "105001", "106001", "100702", "100402", "103802",
];

const SKILLS = [
  "Professor of Curvature",
  "Homestretch Haste",
  "Let's Pump Some Iron!",
  "Corner Adept",
  "Straightaway Adept",
  "Nimble Navigator",
  "Prepared to Pass",
  "It's On!",
];

const STYLES = ["front", "pace", "late", "end"] as const;

async function main() {
  await prisma.placement.deleteMany();
  await prisma.race.deleteMany();
  await prisma.matchTeam.deleteMany();
  await prisma.match.deleteMany();
  await prisma.umaEntry.deleteMany();
  await prisma.team.deleteMany();
  await prisma.overlayState.deleteMany();

  for (const team of TEAMS) {
    await prisma.team.create({ data: { ...team, kind: "main" } });
    let n = 0;
    for (const category of CATEGORIES) {
      for (const slot of [0, 1, 2]) {
        const idx = (TEAMS.indexOf(team) * 15 + n) % UMA_NAMES.length;
        const sprite = SPRITE_IDS[(TEAMS.indexOf(team) + n) % SPRITE_IDS.length];
        const popularBoost = n % 11 === 0 ? SPRITE_IDS[0] : sprite;
        await prisma.umaEntry.create({
          data: {
            teamId: team.id,
            category,
            slot,
            trainer: `${team.shortName} ${slot + 1}`,
            umaName: UMA_NAMES[idx],
            spriteId: popularBoost,
            rating: ["UG", "UG1", "SS+", "SS"][n % 4],
            style: STYLES[n % STYLES.length],
            aptTerrain: n % 3 === 0 ? "S" : "A",
            aptDistance: n % 4 === 0 ? "S" : "A",
            aptStyle: "A",
            speed: 1100 + (n % 9) * 20,
            stamina: 500 + (n % 7) * 40,
            power: 1000 + (n % 8) * 15,
            guts: 400 + (n % 6) * 30,
            wisdom: 900 + (n % 5) * 25,
            skillsJson: JSON.stringify(SKILLS.slice(0, 3 + (n % 4))),
          },
        });
        n += 1;
      }
    }
  }

  for (const group of ["A", "B", "C"]) {
    const members = TEAMS.filter((t) => t.group === group);
    for (let i = 0; i < FANO.length; i++) {
      const id = `group-${group.toLowerCase()}-${i + 1}`;
      await prisma.match.create({
        data: {
          id,
          stage: "group",
          group,
          day: i < 5 ? 1 : 2,
          sortOrder: (group.charCodeAt(0) - 65) * 10 + i + 1,
          label: `Group ${group} Match ${i + 1}`,
          teams: {
            create: FANO[i].map((memberIndex, slot) => ({
              slot,
              teamId: members[memberIndex].id,
            })),
          },
          races: {
            create: CATEGORIES.map((category) => ({ category })),
          },
        },
      });
    }
  }

  const knockout = [
    { id: "qf-1", stage: "qf", label: "Quarter Final 1", sortOrder: 40 },
    { id: "qf-2", stage: "qf", label: "Quarter Final 2", sortOrder: 41 },
    { id: "qf-3", stage: "qf", label: "Quarter Final 3", sortOrder: 42 },
    { id: "semi-1", stage: "semi", label: "Semi Final 1", sortOrder: 50 },
    { id: "semi-2", stage: "semi", label: "Semi Final 2", sortOrder: 51 },
    { id: "semi-3", stage: "semi", label: "Semi Final 3", sortOrder: 52 },
    { id: "gf-1", stage: "gf", label: "Grand Final — Set 1", sortOrder: 60, setNumber: 1 },
    { id: "gf-2", stage: "gf", label: "Grand Final — Set 2", sortOrder: 61, setNumber: 2 },
  ];
  for (const row of knockout) {
    await prisma.match.create({
      data: {
        id: row.id,
        stage: row.stage,
        day: 2,
        sortOrder: row.sortOrder,
        label: row.label,
        setNumber: "setNumber" in row ? row.setNumber : null,
        teams: { create: [0, 1, 2].map((slot) => ({ slot, teamId: null })) },
        races: { create: CATEGORIES.map((category) => ({ category })) },
      },
    });
  }

  await prisma.overlayState.create({
    data: { id: "default", activeMatchId: "group-a-1", activeCategory: "sprint", view: "matchup", visible: true },
  });

  const playInColors = ["#7a5c52", "#c9a227", "#4a8a62", "#5c6bc0", "#b05c4a"];
  for (let i = 0; i < 5; i++) {
    const id = `play-in-${i + 1}`;
    await prisma.team.create({
      data: {
        id,
        name: `Play-in ${i + 1}`,
        shortName: `PI${i + 1}`,
        tagline: "Second-club play-in",
        color: playInColors[i],
        kind: "playin",
      },
    });
    for (const category of CATEGORIES) {
      for (const slot of [0, 1, 2]) {
        await prisma.umaEntry.create({
          data: { teamId: id, category, slot, trainer: "", umaName: "TBD", spriteId: "" },
        });
      }
    }
  }

  console.log("Seeded 21 teams, 5 play-ins, group matches, and knockout shell.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
