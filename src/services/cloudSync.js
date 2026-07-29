// =====================================================================
//  EDUJADVAL.UZ — BULUT SINXRONIZATSIYASI
//
//  Vazifasi: maktab ma'lumotlarini (sinflar, o'qituvchilar, jadval...)
//  Supabase'dagi `schools` jadvalida saqlash, shunda foydalanuvchi
//  ISTALGAN QURILMADAN kirsa ma'lumoti joyida turadi.
//
//  ARXITEKTURA: localStorage — kesh, Supabase — asosiy manba.
//  - Kirishda: bulutdan tortiladi -> localStorage'ga yoziladi
//  - O'zgarishda: localStorage darhol yoziladi + 2.5s debounce bilan
//    butun blob bulutga yuboriladi
//  - Internet uzilsa: ilova localStorage'da ishlashda davom etadi,
//    aloqa tiklangach keyingi o'zgarishda hammasi yuboriladi
// =====================================================================
import { supabase } from "./supabaseClient";
import { loadData, saveData, loadUserData, saveUserData } from "./storageService";

// Sinxronlanadigan kalitlar — App.jsx dagi saveUserData kalitlari bilan bir xil
const SYNC_KEYS = [
  "settings",
  "classes",
  "subjects",
  "teachers",
  "classSubjects",
  "rooms",
  "timeslots",
  "lunchGroups",
  "shifts",
  "schedule",
];

// Har bir kalitning bo'sh qiymati (obyekt yoki massiv)
const EMPTY = {
  settings: {},
  classes: [],
  subjects: [],
  teachers: [],
  classSubjects: {},
  rooms: [],
  timeslots: [],
  lunchGroups: [],
  shifts: [],
  schedule: {},
};

const DEMO_EMAIL = "demo@edujadval.uz";

// Oxirgi muvaffaqiyatli yuborish vaqti (mahalliy)
function metaKey(userId) {
  return `sync_meta_${userId}`;
}
function getMeta(userId) {
  return loadData(metaKey(userId), { lastPush: 0, lastPull: 0 });
}
function setMeta(userId, patch) {
  saveData(metaKey(userId), { ...getMeta(userId), ...patch });
}

// ---------------------------------------------------------------------
//  Mahalliy ma'lumotlarni bitta obyektga yig'ish
// ---------------------------------------------------------------------
function collectLocal(userId) {
  const blob = {};
  for (const k of SYNC_KEYS) {
    blob[k] = loadUserData(userId, k, EMPTY[k]);
  }
  return blob;
}

// Ma'lumot bormi yoki bo'shmi?
function isEmptyBlob(blob) {
  if (!blob) return true;
  const c = blob.classes, t = blob.teachers, s = blob.subjects;
  return !(c?.length || t?.length || s?.length);
}

// ---------------------------------------------------------------------
//  BULUTDAN TORTISH
// ---------------------------------------------------------------------
export async function pullFromCloud(userId) {
  const { data, error } = await supabase
    .from("schools")
    .select("data, updated_at")
    .eq("owner_id", userId)
    .maybeSingle();

  if (error) return { ok: false, reason: "error", message: error.message };
  if (!data) return { ok: false, reason: "empty" };

  const blob = data.data || {};
  for (const k of SYNC_KEYS) {
    if (Object.prototype.hasOwnProperty.call(blob, k)) {
      saveUserData(userId, k, blob[k]);
    }
  }
  setMeta(userId, { lastPull: Date.now(), lastPush: Date.now() });
  return { ok: true, updatedAt: data.updated_at, empty: isEmptyBlob(blob) };
}

// ---------------------------------------------------------------------
//  BULUTGA YUBORISH
// ---------------------------------------------------------------------
export async function pushToCloud(userId) {
  if (!userId) return { ok: false, reason: "no-user" };

  const blob = collectLocal(userId);
  const { error } = await supabase
    .from("schools")
    .upsert({ owner_id: userId, data: blob }, { onConflict: "owner_id" });

  if (error) return { ok: false, reason: "error", message: error.message };

  setMeta(userId, { lastPush: Date.now() });
  return { ok: true };
}

// ---------------------------------------------------------------------
//  DEBOUNCE — tez-tez o'zgarishda serverni bombardimon qilmaslik uchun
// ---------------------------------------------------------------------
let pushTimer = null;
let pendingUserId = null;

export function schedulePush(userId, delay = 2500) {
  if (!userId) return;
  pendingUserId = userId;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const uid = pendingUserId;
    pendingUserId = null;
    if (uid) pushToCloud(uid).catch(() => {});
  }, delay);
}

// Kutilayotgan yuborishni darhol bajarish (chiqishdan/yopishdan oldin)
export async function flushPush() {
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  const uid = pendingUserId;
  pendingUserId = null;
  if (uid) return pushToCloud(uid);
  return { ok: true, reason: "nothing-pending" };
}

// Yuborilmagan o'zgarish bormi?
export function hasPendingPush() {
  return pushTimer !== null;
}

// ---------------------------------------------------------------------
//  KIRISHDA SINXRONIZATSIYA
//  Qaror mantiqi:
//   - Bulut bo'sh, mahalliy to'la  -> mahalliyni bulutga yuboramiz
//     (birinchi marta bulutga o'tayotgan eski foydalanuvchi)
//   - Bulut to'la                  -> bulutdan tortamiz
//     (yangi qurilmadan kirgan foydalanuvchi)
//   - Ikkalasi ham bo'sh           -> hech nima qilmaymiz
// ---------------------------------------------------------------------
export async function syncOnLogin(user) {
  if (!user?.id) return { action: "skip", reason: "no-user" };

  // Demo hisob bulutga yozilmaydi — demo ma'lumotlari mahalliy qoladi
  if (user.email === DEMO_EMAIL) return { action: "skip", reason: "demo" };

  const localBlob = collectLocal(user.id);
  const localHasData = !isEmptyBlob(localBlob);

  try {
    const pulled = await pullFromCloud(user.id);

    // Bulutda ma'lumot bor va bo'sh emas -> tortdik, tamom
    if (pulled.ok && !pulled.empty) {
      return { action: "pulled", updatedAt: pulled.updatedAt };
    }

    // Bulut bo'sh, lekin bu qurilmada ma'lumot bor -> yuboramiz
    if (localHasData) {
      // pullFromCloud bo'sh blobni localStorage ustiga yozgan bo'lishi
      // mumkin — shuning uchun avval saqlab qo'ygan nusxani tiklaymiz
      if (pulled.ok) {
        for (const k of SYNC_KEYS) saveUserData(user.id, k, localBlob[k]);
      }
      const res = await pushToCloud(user.id);
      return { action: res.ok ? "pushed" : "push-failed", message: res.message };
    }

    return { action: "empty" };
  } catch (e) {
    // Internet yo'q — mahalliy ma'lumot bilan davom etamiz
    return { action: "offline", message: String(e) };
  }
}

// ---------------------------------------------------------------------
//  Foydalanuvchi chiqqanda mahalliy nusxani tozalash (ixtiyoriy)
//  Umumiy kompyuterda ishlatilsa foydali.
// ---------------------------------------------------------------------
export function clearLocalCopy(userId) {
  if (!userId) return;
  for (const k of SYNC_KEYS) saveUserData(userId, k, EMPTY[k]);
}

export { SYNC_KEYS };