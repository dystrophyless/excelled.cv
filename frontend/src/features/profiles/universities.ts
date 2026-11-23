/*
 * Universities of Kazakhstan for the university search (onboarding step 2 and Edit profile).
 * Neutral on purpose: alphabetical, no "popular" subset, no ranking. Any name that is not here can be used as typed
 * (the API stores university as free text, 2–120 characters).
 *
 * Compiled by the ui-designer (003-profiles round 4) from public sources: broad but NOT checked against the official
 * accreditation registry. Curate it here (frontend constant); if it needs updates without a release, move it to
 * GET /api/catalog → `universities: [{ name, city, aliases }]` — the Views only need the same shape.
 *
 * `aliases`: short names and abbreviations people type (KBTU, NU, ENU…). UniversityField passes them to the kit
 * Combobox as option `keywords`, so they find their university.
 */

export type University = { name: string; city: string; aliases?: string[] };

const LIST: University[] = [
  { name: "Abai Kazakh National Pedagogical University", city: "Almaty", aliases: ["KazNPU", "Abai University"] },
  { name: "Abai Myrzakhmetov Kokshetau University", city: "Kokshetau" },
  { name: "Ablai Khan Kazakh University of International Relations and World Languages", city: "Almaty", aliases: ["KazUIRWL", "Ablai Khan University"] },
  { name: "Akhmet Baitursynov Kostanay Regional University", city: "Kostanay", aliases: ["KRU"] },
  { name: "Al-Farabi Kazakh National University", city: "Almaty", aliases: ["KazNU", "Al-Farabi", "KazGU"] },
  { name: "Alikhan Bokeikhan University", city: "Semey" },
  { name: "Almaty Management University", city: "Almaty", aliases: ["AlmaU"] },
  { name: "Almaty Technological University", city: "Almaty", aliases: ["ATU"] },
  { name: "Almaty University of Power Engineering and Telecommunications", city: "Almaty", aliases: ["AUPET", "AUES"] },
  { name: "Asfendiyarov Kazakh National Medical University", city: "Almaty", aliases: ["KazNMU"] },
  { name: "Astana International University", city: "Astana", aliases: ["AIU"] },
  { name: "Astana IT University", city: "Astana", aliases: ["AITU"] },
  { name: "Astana Medical University", city: "Astana", aliases: ["AMU"] },
  { name: "Atyrau University of Oil and Gas", city: "Atyrau", aliases: ["AUOG"] },
  { name: "Baishev University", city: "Aktobe" },
  { name: "Bolashak University", city: "Kyzylorda" },
  { name: "Buketov Karaganda University", city: "Karaganda", aliases: ["KarU", "KarGU", "Buketov"] },
  { name: "Caspian University", city: "Almaty" },
  { name: "Central Asian University", city: "Almaty", aliases: ["CAU"] },
  { name: "Coventry University Kazakhstan", city: "Astana" },
  { name: "D. Serikbayev East Kazakhstan Technical University", city: "Oskemen", aliases: ["EKTU"] },
  { name: "De Montfort University Kazakhstan", city: "Almaty", aliases: ["DMU"] },
  { name: "Esil University", city: "Astana" },
  { name: "Eurasian Technological University", city: "Almaty", aliases: ["ETU"] },
  { name: "Innovative University of Eurasia", city: "Pavlodar", aliases: ["InEU"] },
  { name: "International Educational Corporation", city: "Almaty", aliases: ["KazGASA", "IEC"] },
  { name: "International Information Technology University", city: "Almaty", aliases: ["IITU", "MUIT"] },
  { name: "Kazakh Academy of Sport and Tourism", city: "Almaty", aliases: ["KazAST"] },
  { name: "Kazakh Academy of Transport and Communications", city: "Almaty", aliases: ["KazATC"] },
  { name: "Kazakh National Agrarian Research University", city: "Almaty", aliases: ["KazNARU", "KazNAU"] },
  { name: "Kazakh National Conservatory named after Kurmangazy", city: "Almaty" },
  { name: "Kazakh National University of Arts", city: "Astana", aliases: ["KazNUA"] },
  { name: "Kazakh National Women's Teacher Training University", city: "Almaty", aliases: ["KazNWTTU"] },
  { name: "Kazakh University of Economics, Finance and International Trade", city: "Astana", aliases: ["KUEFIT"] },
  { name: "Kazakh University of Technology and Business", city: "Astana", aliases: ["KazUTB"] },
  { name: "Kazakh-American University", city: "Almaty", aliases: ["KAU"] },
  { name: "Kazakh-British Technical University", city: "Almaty", aliases: ["KBTU"] },
  { name: "Kazakh-German University", city: "Almaty", aliases: ["DKU", "KGU"] },
  { name: "Kazakh-Russian Medical University", city: "Almaty", aliases: ["KRMU"] },
  { name: "Kazakhstan Medical University KSPH", city: "Almaty", aliases: ["KSPH"] },
  { name: "Karaganda Industrial University", city: "Temirtau" },
  { name: "Karaganda Medical University", city: "Karaganda", aliases: ["KMU"] },
  { name: "Karaganda Technical University", city: "Karaganda", aliases: ["KarTU", "KSTU"] },
  { name: "Karaganda University of Kazpotrebsoyuz", city: "Karaganda" },
  { name: "Khoja Akhmet Yassawi International Kazakh-Turkish University", city: "Turkistan", aliases: ["Yassawi University"] },
  { name: "Kh. Dosmukhamedov Atyrau University", city: "Atyrau" },
  { name: "KIMEP University", city: "Almaty", aliases: ["KIMEP"] },
  { name: "Korkyt Ata Kyzylorda University", city: "Kyzylorda" },
  { name: "Kostanay Engineering and Economics University", city: "Kostanay" },
  { name: "Kunaev University", city: "Almaty" },
  { name: "K. Zhubanov Aktobe Regional University", city: "Aktobe", aliases: ["ARU"] },
  { name: "L.N. Gumilyov Eurasian National University", city: "Astana", aliases: ["ENU", "Gumilyov"] },
  { name: "M. Auezov South Kazakhstan University", city: "Shymkent", aliases: ["SKU", "Auezov"] },
  { name: "M. Kh. Dulaty Taraz University", city: "Taraz", aliases: ["Dulaty"] },
  { name: "M. Utemisov West Kazakhstan University", city: "Oral", aliases: ["WKU"] },
  { name: "Manash Kozybayev North Kazakhstan University", city: "Petropavl", aliases: ["NKU"] },
  { name: "Maqsut Narikbayev University", city: "Astana", aliases: ["MNU"] },
  { name: "Margulan University", city: "Pavlodar" },
  { name: "Narxoz University", city: "Almaty", aliases: ["Narxoz"] },
  { name: "Nazarbayev University", city: "Astana", aliases: ["NU"] },
  { name: "O. A. Baikonurov Zhezkazgan University", city: "Zhezkazgan" },
  { name: "Rudny Industrial University", city: "Rudny" },
  { name: "S. Amanzholov East Kazakhstan University", city: "Oskemen", aliases: ["EKU"] },
  { name: "S. Seifullin Kazakh Agrotechnical Research University", city: "Astana", aliases: ["KATU", "Seifullin"] },
  { name: "Satbayev University", city: "Almaty", aliases: ["KazNRTU", "KazNTU", "Satbayev"] },
  { name: "Semey Medical University", city: "Semey" },
  { name: "Sh. Ualikhanov Kokshetau University", city: "Kokshetau" },
  { name: "Shakarim University", city: "Semey" },
  { name: "Shymkent University", city: "Shymkent" },
  { name: "Silkway International University", city: "Shymkent" },
  { name: "South Kazakhstan Medical Academy", city: "Shymkent", aliases: ["SKMA"] },
  { name: "South Kazakhstan Pedagogical University", city: "Shymkent" },
  { name: "Suleyman Demirel University", city: "Kaskelen", aliases: ["SDU"] },
  { name: "T. Zhurgenov Kazakh National Academy of Arts", city: "Almaty" },
  { name: "Toraighyrov University", city: "Pavlodar", aliases: ["PSU"] },
  { name: "Turan University", city: "Almaty" },
  { name: "Turan-Astana University", city: "Astana" },
  { name: "University of International Business", city: "Almaty", aliases: ["UIB"] },
  { name: "West Kazakhstan Marat Ospanov Medical University", city: "Aktobe", aliases: ["WKMU"] },
  { name: "Yessenov University", city: "Aktau", aliases: ["Caspian University of Technology and Engineering"] },
  { name: "Zhangir Khan West Kazakhstan Agrarian-Technical University", city: "Oral" },
  { name: "Zhetysu University", city: "Taldykorgan", aliases: ["Zhansugurov"] },
];

/** Alphabetical by name (case- and punctuation-insensitive). */
export const UNIVERSITIES: University[] = [...LIST].sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));

export const UNIVERSITY_NAMES = UNIVERSITIES.map((u) => u.name);

/** The listed university with this exact name (case-insensitive), or undefined for a typed one. */
export const findUniversity = (name: string) => {
  const n = name.trim().toLowerCase();
  return n ? UNIVERSITIES.find((u) => u.name.toLowerCase() === n) : undefined;
};

/* Majors / fields of study: same rule — alphabetical, broad, no highlighted subset; anything else is used as typed. */
export const MAJORS: string[] = [
  "Accounting and Audit", "Agronomy", "Applied Mathematics", "Architecture", "Automation and Control", "Biology",
  "Biotechnology", "Business Administration", "Chemical Engineering", "Chemistry", "Civil Engineering", "Computer Engineering",
  "Computer Science", "Cybersecurity", "Data Science", "Design", "Ecology", "Economics", "Electrical Engineering", "Finance",
  "Foreign Languages", "Geology", "History", "Hospitality and Tourism", "Information Systems", "International Relations",
  "Journalism", "Law", "Logistics", "Management", "Marketing", "Mathematics", "Mechanical Engineering", "Medicine", "Nursing",
  "Oil and Gas Engineering", "Pedagogy", "Pharmacy", "Physics", "Psychology", "Public Administration", "Software Engineering",
  "Sociology", "Statistics", "Translation Studies",
].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
