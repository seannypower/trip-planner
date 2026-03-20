// Run with: node populate.js
// Wipes itinerary-vancouver and seeds it with Vancouver trip activities + schedule

const { initializeApp, getApps, getApp } = require("firebase/app");
const { getDatabase, ref, set } = require("firebase/database");
const { getAuth, signInAnonymously } = require("firebase/auth");

const firebaseConfig = {
  apiKey: "AIzaSyAaD0SfuCz1YOeFl2wiXfOBQerLAGgOxfY",
  authDomain: "itinerary-planner-f85a6.firebaseapp.com",
  databaseURL: "https://itinerary-planner-f85a6-default-rtdb.firebaseio.com",
  projectId: "itinerary-planner-f85a6",
  storageBucket: "itinerary-planner-f85a6.firebasestorage.app",
  messagingSenderId: "750098443744",
  appId: "1:750098443724:web:50639a06b6f66d098f8169",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const database = getDatabase(app);
const auth = getAuth(app);

// Day indices:
// 0 = Sep 8 (Tue)  — Seattle arrival
// 1 = Sep 9 (Wed)  — Train to Vancouver, arrival afternoon
// 2 = Sep 10 (Thu) — Sea to Sky full day
// 3 = Sep 11 (Fri) — City immersion day
// 4 = Sep 12 (Sat) — Gastown/Chinatown + departure
// 5 = Sep 13 (Sun) — Buffer, likely unused

const activities = [

  // ── DAY 0: Tuesday Sep 8 — Seattle ────────────────────────────────────────
  {
    id: "1001",
    name: "Flight BNA → SEA (Southwest)",
    duration: 175,
    area: "Travel",
    type: "Other",
    description: "Nonstop. With companion pass ~$180-194/person effective. Book late May–July 2026.",
    url: "https://www.southwest.com",
    scheduledDay: 0,
    scheduledTime: "17:30",
  },
  {
    id: "1002",
    name: "Check in — Seattle hotel",
    duration: 30,
    area: "Seattle",
    type: "Other",
    description: "Overnight near SEA or downtown. Need to book — budget ~$100-150/night.",
    url: "",
    scheduledDay: 0,
    scheduledTime: "21:00",
  },

  // ── DAY 1: Wednesday Sep 9 — Train + Arrival ──────────────────────────────
  {
    id: "1003",
    name: "Amtrak Cascades — SEA → Vancouver",
    duration: 270,
    area: "Travel",
    type: "Other",
    description: "Scenic Puget Sound route. Customs on the train. ~$40-65 OW. Book ahead.",
    url: "https://www.amtrak.com/cascades-train",
    scheduledDay: 1,
    scheduledTime: "08:00",
  },
  {
    id: "1004",
    name: "Check in — Vancouver hotel/Airbnb",
    duration: 30,
    area: "Downtown Vancouver",
    type: "Other",
    description: "Gastown or downtown for walkability. Not booked yet.",
    url: "",
    scheduledDay: 1,
    scheduledTime: "13:30",
  },
  {
    id: "1005",
    name: "Gastown photo walkabout",
    duration: 120,
    area: "Gastown",
    type: "Outdoor",
    description: "Cobblestones, steam clock, moody architecture. First impression of the city. Golden hour timing.",
    url: "https://www.gastown.org",
    scheduledDay: 1,
    scheduledTime: "15:00",
  },
  {
    id: "1012",
    name: "Nicer dinner #1",
    duration: 120,
    area: "Gastown",
    type: "Food",
    description: "Welcome-to-Vancouver dinner. Gastown area has great spots — research TBD. ~$80-100/person.",
    url: "",
    scheduledDay: 1,
    scheduledTime: "18:00",
  },

  // ── DAY 2: Thursday Sep 10 — Sea to Sky ───────────────────────────────────
  {
    id: "1011",
    name: "Sea to Sky Highway / Squamish day trip",
    duration: 480,
    area: "Squamish",
    type: "Outdoor",
    description: "Early start. Shannon Falls, Stawamus Chief, stunning landscape photography. Needs car — ties to transport decision.",
    url: "https://www.hellobc.com/sea-to-sky-highway",
    scheduledDay: 2,
    scheduledTime: "07:30",
  },
  {
    id: "1008",
    name: "English Bay beach — sunset",
    duration: 90,
    area: "West End",
    type: "Outdoor",
    description: "On the way back in from Sea to Sky. Faces west over water — one of the best urban sunsets on the continent.",
    url: "",
    scheduledDay: 2,
    scheduledTime: "18:30",
  },

  // ── DAY 3: Friday Sep 11 — City immersion ─────────────────────────────────
  {
    id: "1009",
    name: "Stanley Park half-day",
    duration: 180,
    area: "Stanley Park",
    type: "Outdoor",
    description: "Transit-accessible. Seawall, totem poles, forest. Morning light hits the water well.",
    url: "https://vancouver.ca/parks-recreation-culture/stanley-park.aspx",
    scheduledDay: 3,
    scheduledTime: "09:00",
  },
  {
    id: "1007",
    name: "Granville Island",
    duration: 180,
    area: "Granville Island",
    type: "Culture",
    description: "Public market lunch, artisan shops, waterfront. Plan to eat here — the market food vendors are worth it.",
    url: "https://granvilleisland.com",
    scheduledDay: 3,
    scheduledTime: "12:30",
  },
  {
    id: "1010",
    name: "False Creek waterfront walk",
    duration: 90,
    area: "False Creek",
    type: "Outdoor",
    description: "Natural walk back from Granville Island along the seawall. Connects to downtown.",
    url: "",
    scheduledDay: 3,
    scheduledTime: "15:30",
  },
  {
    id: "1016",
    name: "Cannabis dispensary + walkabout",
    duration: 90,
    area: "Granville Island",
    type: "Entertainment",
    description: "Legal in BC. Post-walk wind-down. Granville Island area or False Creek seawall. Gummy recommended over smoking for walking.",
    url: "",
    scheduledDay: 3,
    scheduledTime: "17:30",
  },
  {
    id: "1013",
    name: "Nicer dinner #2",
    duration: 120,
    area: "Downtown Vancouver",
    type: "Food",
    description: "Second nicer meal — Pacific Rim leaning. Downtown or Yaletown. Research TBD.",
    url: "",
    scheduledDay: 3,
    scheduledTime: "19:30",
  },

  // ── DAY 4: Saturday Sep 12 — Gastown/Chinatown + Departure ───────────────
  {
    id: "1015",
    name: "Anamorphic lens session",
    duration: 180,
    area: "Gastown",
    type: "Outdoor",
    description: "Rent one lens (~$40-70 split), shoot same locations, edit each other's footage later. Gastown cobblestones + architecture = perfect backdrop.",
    url: "",
    scheduledDay: 4,
    scheduledTime: "09:00",
  },
  {
    id: "1006",
    name: "Chinatown exploration",
    duration: 90,
    area: "Chinatown",
    type: "Culture",
    description: "Right next to Gastown — easy walk. Dr. Sun Yat-Sen garden. One of North America's largest Chinatowns.",
    url: "",
    scheduledDay: 4,
    scheduledTime: "12:30",
  },
  {
    id: "1014",
    name: "Hole-in-the-wall lunch",
    duration: 60,
    area: "Chinatown",
    type: "Food",
    description: "Ramen, dim sum, bao — Chinatown is the right place for this. Budget ~$15-25/person.",
    url: "",
    scheduledDay: 4,
    scheduledTime: "14:30",
  },
  {
    id: "1017",
    name: "Head to YVR",
    duration: 60,
    area: "Travel",
    type: "Other",
    description: "SkyTrain from downtown ~25min. Budget 2.5-3hrs before departure for cross-border flight. Adjust based on actual flight time.",
    url: "",
    scheduledDay: 4,
    scheduledTime: "16:00",
  },
  {
    id: "1018",
    name: "Flight YVR → BNA",
    duration: 270,
    area: "Travel",
    type: "Other",
    description: "Air Canada or WestJet direct. ~$200-280/person. Placeholder time — book late May–July 2026.",
    url: "",
    scheduledDay: 4,
    scheduledTime: "19:00",
  },

  // ── DAY 5: Sunday Sep 13 — Buffer (likely empty) ──────────────────────────
  // Nothing scheduled — exists as overflow if departure slips to Sunday morning
];

const tripConfig = {
  tripName: "Vancouver Sept 2026",
  startDate: "2026-09-08",
  numDays: 6,
};

async function populate() {
  await signInAnonymously(auth);

  const activitiesObject = {};
  activities.forEach((a) => {
    activitiesObject[a.id] = a;
  });

  const itineraryRef = ref(database, "itinerary-vancouver");
  await set(itineraryRef, {
    activities: activitiesObject,
    snapInterval: 15,
    tripConfig,
    lastUpdated: new Date().toISOString(),
  });

  console.log(`✅ Done. Wrote ${activities.length} activities to itinerary-vancouver.`);

  // Summary
  console.log("\n📅 Schedule overview:");
  const byDay = {};
  activities.forEach(a => {
    if (a.scheduledDay !== null) {
      if (!byDay[a.scheduledDay]) byDay[a.scheduledDay] = [];
      byDay[a.scheduledDay].push(`  ${a.scheduledTime} — ${a.name} (${a.duration}min)`);
    }
  });
  const dayLabels = ["Sep 8 Tue (Seattle)", "Sep 9 Wed (Arrival)", "Sep 10 Thu (Sea to Sky)", "Sep 11 Fri (City)", "Sep 12 Sat (Departure)", "Sep 13 Sun (Buffer)"];
  Object.keys(byDay).sort().forEach(d => {
    console.log(`\nDay ${d}: ${dayLabels[d]}`);
    byDay[d].sort().forEach(l => console.log(l));
  });

  process.exit(0);
}

populate().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
