export const DAYS = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];

export const CLASS_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

export const SUBJECT_COLORS = [
  "#4f6ef7", "#7c3aed", "#db2777", "#ea580c",
  "#16a34a", "#0891b2", "#ca8a04", "#dc2626",
  "#9333ea", "#059669", "#d97706", "#0284c7",
  "#be123c", "#0f766e", "#65a30d", "#c2410c",
  "#4338ca", "#0369a1", "#a21caf", "#15803d"
];

export const ROOM_TYPES = ["Oddiy", "IT xona", "Laboratoriya", "Sport zal"];

export const STANDARD_SUBJECTS = [
  // ——— Til va adabiyot ———
  { name: "Ona tili", weeklyHours: 4, type: "Oddiy" },
  { name: "Ona tili va o'qish savodxonligi", weeklyHours: 4, type: "Oddiy" },
  { name: "O'qish savodxonligi", weeklyHours: 2, type: "Oddiy" },
  { name: "Adabiyot", weeklyHours: 2, type: "Oddiy" },
  { name: "Badiiy adabiyot", weeklyHours: 1, type: "Oddiy" },
  { name: "Ifodali o'qish", weeklyHours: 1, type: "Oddiy" },
  { name: "Sinfdan tashqari o'qish", weeklyHours: 1, type: "Oddiy" },
  { name: "Alifbe", weeklyHours: 4, type: "Oddiy" },
  { name: "Yozuv", weeklyHours: 2, type: "Oddiy" },
  { name: "Husnixat", weeklyHours: 1, type: "Oddiy" },
  { name: "Nutq o'stirish", weeklyHours: 1, type: "Oddiy" },
  { name: "O'zbek tili", weeklyHours: 2, type: "Oddiy" },
  { name: "Ingliz tili", weeklyHours: 4, type: "Guruhli" },
  { name: "Rus tili", weeklyHours: 2, type: "Guruhli" },

  // ——— Matematika ———
  { name: "Matematika", weeklyHours: 5, type: "Oddiy" },
  { name: "Algebra", weeklyHours: 3, type: "Oddiy" },
  { name: "Geometriya", weeklyHours: 2, type: "Oddiy" },
  { name: "Mental arifmetika", weeklyHours: 1, type: "Oddiy" },
  { name: "Mnemonika", weeklyHours: 1, type: "Oddiy" },
  { name: "Matematika-fizika", weeklyHours: 2, type: "Oddiy" },
  { name: "Matematika-ingliz tili", weeklyHours: 2, type: "Oddiy" },

  // ——— Tabiiy fanlar ———
  { name: "Tabiatshunoslik", weeklyHours: 1, type: "Oddiy" },
  { name: "Tabiiy fan (Science)", weeklyHours: 2, type: "Oddiy" },
  { name: "Biologiya", weeklyHours: 2, type: "Oddiy" },
  { name: "Kimyo", weeklyHours: 2, type: "Oddiy", allowDouble: true },
  { name: "Fizika", weeklyHours: 2, type: "Oddiy", allowDouble: true },
  { name: "Kimyo-biologiya", weeklyHours: 2, type: "Oddiy" },
  { name: "Astranomiya", weeklyHours: 1, type: "Oddiy" },
  { name: "Geografiya", weeklyHours: 2, type: "Oddiy" },

  // ——— Ijtimoiy fanlar ———
  { name: "Tarix", weeklyHours: 2, type: "Oddiy" },
  { name: "O'zbekiston tarixi", weeklyHours: 2, type: "Oddiy" },
  { name: "Jahon tarixi", weeklyHours: 2, type: "Oddiy" },
  { name: "Tarixdan hikoyalar", weeklyHours: 1, type: "Oddiy" },
  { name: "Huquq", weeklyHours: 1, type: "Oddiy" },
  { name: "Davlat va huquq asoslari", weeklyHours: 1, type: "Oddiy" },
  { name: "Iqtisodiy bilim asoslari", weeklyHours: 1, type: "Oddiy" },
  { name: "Tadbirkorlik asoslari", weeklyHours: 1, type: "Oddiy" },
  { name: "Tarbiya", weeklyHours: 1, type: "Oddiy" },
  { name: "Kelajak soati", weeklyHours: 1, type: "Oddiy" },
  { name: "Tanqidiy fikrlash", weeklyHours: 1, type: "Oddiy" },

  // ——— Texnologiya va IT ———
  { name: "Informatika", weeklyHours: 2, type: "Guruhli", allowDouble: true },
  { name: "Informatika va axborot texnologiyalari", weeklyHours: 2, type: "Guruhli", allowDouble: true },
  { name: "Texnologiya", weeklyHours: 1, type: "Oddiy" },
  { name: "Chizmachilik", weeklyHours: 1, type: "Oddiy" },

  // ——— San'at, sport va boshqalar ———
  { name: "Tasviriy san'at", weeklyHours: 1, type: "Oddiy" },
  { name: "Musiqa", weeklyHours: 1, type: "Oddiy" },
  { name: "Musiqa madaniyati", weeklyHours: 1, type: "Oddiy" },
  { name: "Jismoniy tarbiya", weeklyHours: 2, type: "Oddiy", allowDouble: true },
  { name: "Chaqiruvga qadar boshlang'ich tayyorgarlik", weeklyHours: 1, type: "Oddiy" },
  { name: "Boshlang'ich ta'lim", weeklyHours: 2, type: "Oddiy" },
  { name: "Tanlov fanlari", weeklyHours: 1, type: "Oddiy" },
];

// ——— Rus tilida o'qitiladigan sinflar uchun standart fanlar ———
export const STANDARD_SUBJECTS_RU = [
  // ——— Язык и литература ———
  { name: "Русский язык", weeklyHours: 4, type: "Oddiy" },
  { name: "Русский язык и грамотность чтения", weeklyHours: 4, type: "Oddiy" },
  { name: "Грамотность чтения", weeklyHours: 2, type: "Oddiy" },
  { name: "Литература", weeklyHours: 2, type: "Oddiy" },
  { name: "Художественная литература", weeklyHours: 1, type: "Oddiy" },
  { name: "Выразительное чтение", weeklyHours: 1, type: "Oddiy" },
  { name: "Внеклассное чтение", weeklyHours: 1, type: "Oddiy" },
  { name: "Азбука", weeklyHours: 4, type: "Oddiy" },
  { name: "Письмо", weeklyHours: 2, type: "Oddiy" },
  { name: "Чистописание", weeklyHours: 1, type: "Oddiy" },
  { name: "Развитие речи", weeklyHours: 1, type: "Oddiy" },
  { name: "Узбекский язык", weeklyHours: 2, type: "Oddiy" },
  { name: "Английский язык", weeklyHours: 4, type: "Guruhli" },

  // ——— Математика ———
  { name: "Математика", weeklyHours: 5, type: "Oddiy" },
  { name: "Алгебра", weeklyHours: 3, type: "Oddiy" },
  { name: "Геометрия", weeklyHours: 2, type: "Oddiy" },
  { name: "Ментальная арифметика", weeklyHours: 1, type: "Oddiy" },
  { name: "Мнемоника", weeklyHours: 1, type: "Oddiy" },
  { name: "Математика-физика", weeklyHours: 2, type: "Oddiy" },
  { name: "Математика-английский язык", weeklyHours: 2, type: "Oddiy" },

  // ——— Естественные науки ———
  { name: "Природоведение", weeklyHours: 1, type: "Oddiy" },
  { name: "Естествознание (Science)", weeklyHours: 2, type: "Oddiy" },
  { name: "Биология", weeklyHours: 2, type: "Oddiy" },
  { name: "Химия", weeklyHours: 2, type: "Oddiy", allowDouble: true },
  { name: "Физика", weeklyHours: 2, type: "Oddiy", allowDouble: true },
  { name: "Химия-биология", weeklyHours: 2, type: "Oddiy" },
  { name: "Астрономия", weeklyHours: 1, type: "Oddiy" },
  { name: "География", weeklyHours: 2, type: "Oddiy" },

  // ——— Общественные науки ———
  { name: "История", weeklyHours: 2, type: "Oddiy" },
  { name: "История Узбекистана", weeklyHours: 2, type: "Oddiy" },
  { name: "Всемирная история", weeklyHours: 2, type: "Oddiy" },
  { name: "Рассказы по истории", weeklyHours: 1, type: "Oddiy" },
  { name: "Право", weeklyHours: 1, type: "Oddiy" },
  { name: "Основы государства и права", weeklyHours: 1, type: "Oddiy" },
  { name: "Основы экономических знаний", weeklyHours: 1, type: "Oddiy" },
  { name: "Основы предпринимательства", weeklyHours: 1, type: "Oddiy" },
  { name: "Воспитание", weeklyHours: 1, type: "Oddiy" },
  { name: "Час будущего", weeklyHours: 1, type: "Oddiy" },
  { name: "Критическое мышление", weeklyHours: 1, type: "Oddiy" },

  // ——— Технологии и ИТ ———
  { name: "Информатика", weeklyHours: 2, type: "Guruhli", allowDouble: true },
  { name: "Информатика и информационные технологии", weeklyHours: 2, type: "Guruhli", allowDouble: true },
  { name: "Технология", weeklyHours: 1, type: "Oddiy" },
  { name: "Черчение", weeklyHours: 1, type: "Oddiy" },

  // ——— Искусство, спорт и прочее ———
  { name: "Изобразительное искусство", weeklyHours: 1, type: "Oddiy" },
  { name: "Музыка", weeklyHours: 1, type: "Oddiy" },
  { name: "Музыкальная культура", weeklyHours: 1, type: "Oddiy" },
  { name: "Физическая культура", weeklyHours: 2, type: "Oddiy", allowDouble: true },
  { name: "Начальная допризывная подготовка", weeklyHours: 1, type: "Oddiy" },
  { name: "Начальное образование", weeklyHours: 2, type: "Oddiy" },
  { name: "Предметы по выбору", weeklyHours: 1, type: "Oddiy" },
];

// ——— Ta'lim tillari (sinf sozlamasi va fanlarni filtrlash uchun) ———
export const EDU_LANGS = [
  { key: "uz", label: "O'zbek tili", icon: "🇺🇿" },
  { key: "ru", label: "Rus tili",    icon: "🇷🇺" },
];

export const PRIMARY_SUBJECT_NAMES = [
  "Ona tili", "Matematika", "Ingliz tili", "Rus tili", "Jismoniy tarbiya",
  "Tasviriy san'at", "Musiqa", "Texnologiya", "Tarbiya"
];

export const MIDDLE_SUBJECT_NAMES = [
  "Ona tili", "Adabiyot", "Matematika", "Ingliz tili", "Rus tili", "Tarix",
  "Geografiya", "Biologiya", "Jismoniy tarbiya", "Tasviriy san'at", "Musiqa", "Texnologiya", "Tarbiya", "Informatika"
];

export const HIGH_SUBJECT_NAMES = [
  "Ona tili", "Adabiyot", "Algebra", "Geometriya", "Ingliz tili", "Rus tili", "Tarix",
  "Geografiya", "Biologiya", "Kimyo", "Fizika", "Informatika", "Jismoniy tarbiya", "Tarbiya", "Huquq", "Chaqiruvga qadar boshlang'ich tayyorgarlik"
];

// ——— Rus sinflari uchun bosqichga mos fan nomlari ———
export const PRIMARY_SUBJECT_NAMES_RU = [
  "Русский язык", "Математика", "Английский язык", "Узбекский язык", "Физическая культура",
  "Изобразительное искусство", "Музыка", "Технология", "Воспитание"
];

export const MIDDLE_SUBJECT_NAMES_RU = [
  "Русский язык", "Литература", "Математика", "Английский язык", "Узбекский язык", "История",
  "География", "Биология", "Физическая культура", "Изобразительное искусство", "Музыка", "Технология", "Воспитание", "Информатика"
];

export const HIGH_SUBJECT_NAMES_RU = [
  "Русский язык", "Литература", "Алгебра", "Геометрия", "Английский язык", "Узбекский язык", "История",
  "География", "Биология", "Химия", "Физика", "Информатика", "Физическая культура", "Воспитание", "Право", "Начальная допризывная подготовка"
];

// ——— Vaqt turlari: har biri o'z belgisi va rangi bilan (LunchGroups + Schedule ishlatadi) ———
export const TIME_TYPES = [
  { key: "obed",     label: "Obed",         icon: "🍽️", color: "#d97706", bg: "#fef3c7", grad: "linear-gradient(135deg,#f59e0b,#d97706)" },
  { key: "tanaffus", label: "Tanaffus",     icon: "☕",  color: "#059669", bg: "#d1fae5", grad: "linear-gradient(135deg,#34d399,#059669)" },
  { key: "uyqu",     label: "Uyqu vaqti",   icon: "😴",  color: "#4f46e5", bg: "#e0e7ff", grad: "linear-gradient(135deg,#818cf8,#4f46e5)" },
  { key: "sanat",    label: "San'at vaqti", icon: "🎨",  color: "#db2777", bg: "#fce7f3", grad: "linear-gradient(135deg,#f472b6,#db2777)" },
  { key: "boshqa",   label: "Boshqa",       icon: "⏰",  color: "#475569", bg: "#f1f5f9", grad: "linear-gradient(135deg,#94a3b8,#475569)" },
];

// Eski (type maydonisiz) guruhlar uchun nomdan turni aniqlash
export function typeOfGroup(g) {
  if (g?.type) return TIME_TYPES.find((t) => t.key === g.type) || TIME_TYPES[0];
  const n = String(g?.name || "").toLowerCase();
  if (n.includes("uyqu")) return TIME_TYPES[2];
  if (n.includes("tanaffus")) return TIME_TYPES[1];
  if (n.includes("san'at") || n.includes("sanat") || n.includes("san`at")) return TIME_TYPES[3];
  if (n.includes("obed")) return TIME_TYPES[0];
  return TIME_TYPES[0];
}