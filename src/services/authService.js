// =====================================================================
//  EDUJADVAL.UZ — Auth xizmati (Supabase Auth + profiles jadvali)
//
//  MUHIM O'ZGARISH: hisoblar endi localStorage'da EMAS — Supabase'da.
//  - Parollar serverda xeshlanib saqlanadi (bexatar)
//  - Ro'yxatdan o'tish/kirish istalgan qurilmadan ishlaydi
//  - Superadmin obunani o'z kompyuteridan yoqadi — mijozda darhol ochiladi
//
//  Sessiya kesh: profil ma'lumotlari localStorage'da keshlanadi, shu
//  sababli getCurrentUser() va checkSubscription() SINXRON qolgan —
//  App.jsx va boshqa sahifalar o'zgarishsiz ishlayveradi.
// =====================================================================
import { loadData, saveData, removeData } from "./storageService";
import { checkAndRegisterDevice } from "./deviceLock";
import { supabase } from "./supabaseClient";

const SESSION_KEY = "auth_current_user";
const DEMO_EMAIL = "demo@edujadval.uz";

// Foydalanuvchi ko'radigan unikal ID: EDU-XXXXXX
function genUid() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `EDU-${s}`;
}

// ---------------------------------------------------------------------
//  Profil (serverdagi qator) -> ilova ishlatadigan user obyekti
// ---------------------------------------------------------------------
function profileToUser(p) {
  if (!p) return null;
  return {
    id: p.id,
    uid: p.uid,
    name: p.name || "",
    email: p.email || "",
    role: p.role || "user",
    status: p.status || "active",
    schoolName: p.school_name || "",
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
    subscription: {
      status: p.sub_status || "unpaid",
      plan: p.sub_plan || null,
      activatedAt: p.sub_activated_at ? new Date(p.sub_activated_at).getTime() : null,
      expiresAt: p.sub_expires_at ? new Date(p.sub_expires_at).getTime() : null,
    },
  };
}

async function fetchOwnProfile(authUserId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUserId)
    .single();
  if (error || !data) return null;
  return profileToUser(data);
}

// ---------------------------------------------------------------------
//  Sessiya keshi (sinxron o'qish uchun)
// ---------------------------------------------------------------------
export function getCurrentUser() {
  return loadData(SESSION_KEY, null);
}

export function setCurrentUser(user) {
  const safeUser = user ? { ...user, password: undefined } : null;
  saveData(SESSION_KEY, safeUser);
  return safeUser;
}

export function logout() {
  removeData(SESSION_KEY);
  // Supabase sessiyasini ham yopamiz (kutmasdan — UI bloklanmasin)
  supabase.auth.signOut().catch(() => {});
}

// ---------------------------------------------------------------------
//  QURILMA CHEKLOVI: superadmin va demo hisob ozod
// ---------------------------------------------------------------------
function isDeviceLockExempt(user) {
  return user.role === "superadmin" || user.email === DEMO_EMAIL;
}

// ---------------------------------------------------------------------
//  KIRISH
// ---------------------------------------------------------------------
export async function login(email, password) {
  const normalized = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error) {
    if (/invalid login credentials/i.test(error.message)) {
      throw new Error("Email yoki parol noto'g'ri");
    }
    if (/fetch|network/i.test(error.message)) {
      throw new Error("Server bilan aloqa yo'q. Internetni tekshiring.");
    }
    throw new Error(error.message);
  }

  const user = await fetchOwnProfile(data.user.id);
  if (!user) {
    await supabase.auth.signOut();
    throw new Error("Profil topilmadi. Admin bilan bog'laning.");
  }

  if (user.status === "blocked") {
    await supabase.auth.signOut();
    throw new Error("Bu foydalanuvchi bloklangan");
  }

  // Qurilma tekshiruvi (1 profil = 1 qurilma)
  if (!isDeviceLockExempt(user)) {
    const deviceCheck = await checkAndRegisterDevice(user.uid || user.id);
    if (deviceCheck.status === "locked") {
      await supabase.auth.signOut();
      const err = new Error(deviceCheck.message);
      err.code = "DEVICE_LOCKED";
      err.uid = user.uid || user.id;
      err.deviceName = deviceCheck.deviceName;
      throw err;
    }
    if (deviceCheck.status === "offline" || deviceCheck.status === "error") {
      await supabase.auth.signOut();
      throw new Error(deviceCheck.message);
    }
  }

  return setCurrentUser(user);
}

// ---------------------------------------------------------------------
//  RO'YXATDAN O'TISH (endi async!)
// ---------------------------------------------------------------------
export async function registerUser({ name, email, password, schoolName }) {
  const normalized = email.trim().toLowerCase();

  if (!name.trim()) throw new Error("Ism kiriting");
  if (!normalized.includes("@")) throw new Error("Email noto'g'ri");
  if (password.length < 6) throw new Error("Parol kamida 6 ta belgi bo'lsin");

  const { error } = await supabase.auth.signUp({
    email: normalized,
    password,
    options: {
      data: {
        name: name.trim(),
        school_name: schoolName?.trim() || "Maktab",
        uid: genUid(),
      },
    },
  });

  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      throw new Error("Bu email oldin ro'yxatdan o'tgan");
    }
    if (/fetch|network/i.test(error.message)) {
      throw new Error("Server bilan aloqa yo'q. Internetni tekshiring.");
    }
    throw new Error(error.message);
  }

  // signUp avtomatik kirg'izib qo'yadi — eski oqim saqlansin
  // ("Ro'yxatdan o'tdingiz, endi login qiling")
  await supabase.auth.signOut();
  return true;
}

// ---------------------------------------------------------------------
//  SESSIYANI YANGILASH (App yuklanganda fonda chaqiriladi)
//  Natija: yangilangan user yoki null (sessiya tugagan/blok)
// ---------------------------------------------------------------------
export async function refreshCurrentUser() {
  const cached = getCurrentUser();
  if (!cached) return null;

  const { data } = await supabase.auth.getSession();
  if (!data?.session) {
    // Supabase sessiyasi tugagan — chiqib ketamiz
    removeData(SESSION_KEY);
    return null;
  }

  const fresh = await fetchOwnProfile(data.session.user.id);
  if (!fresh) return cached; // server vaqtincha javob bermasa — keshda davom

  if (fresh.status === "blocked") {
    logout();
    return null;
  }

  return setCurrentUser(fresh);
}

// ---------------------------------------------------------------------
//  OBUNA HOLATI (sinxron — keshdagi profil asosida)
// ---------------------------------------------------------------------
const DAY_MS = 24 * 60 * 60 * 1000;

export function checkSubscription(user) {
  if (!user) return { blocked: true, status: "unpaid", expiresAt: null, daysLeft: 0 };
  if (user.role === "superadmin") {
    return { blocked: false, status: "active", expiresAt: null, daysLeft: Infinity, uid: user.uid };
  }

  const sub = user.subscription || { status: "unpaid", expiresAt: null };
  let status = sub.status;
  if (status === "active" && sub.expiresAt && Date.now() > sub.expiresAt) {
    status = "expired";
  }

  const daysLeft =
    status === "active"
      ? sub.expiresAt
        ? Math.max(0, Math.ceil((sub.expiresAt - Date.now()) / DAY_MS))
        : Infinity
      : 0;

  return { blocked: status !== "active", status, expiresAt: sub.expiresAt, daysLeft, uid: user.uid };
}

// Obunani serverdan qayta o'qib, keshni yangilaydi.
// Subscription sahifasidagi "Tekshirish" tugmasi uchun.
export async function refreshSubscription() {
  const fresh = await refreshCurrentUser();
  return checkSubscription(fresh || getCurrentUser());
}

// ---------------------------------------------------------------------
//  O'Z PROFILINI TAHRIRLASH
//  - ism/maktab: profiles jadvalida
//  - email/parol: Supabase Auth orqali
// ---------------------------------------------------------------------
export async function updateOwnProfile({ name, schoolName, email, password }) {
  const cached = getCurrentUser();
  if (!cached) throw new Error("Avval tizimga kiring");

  // 1) Ism va maktab
  const { error: pErr } = await supabase
    .from("profiles")
    .update({ name: name.trim(), school_name: (schoolName || "").trim() })
    .eq("id", cached.id);
  if (pErr) throw new Error("Profilni saqlashda xato: " + pErr.message);

  // 2) Email / parol (kiritilgan bo'lsa)
  const authPatch = {};
  const newEmail = email?.trim().toLowerCase();
  if (newEmail && newEmail !== cached.email) authPatch.email = newEmail;
  if (password) {
    if (password.length < 6) throw new Error("Parol kamida 6 ta belgi bo'lsin");
    authPatch.password = password;
  }
  if (Object.keys(authPatch).length) {
    const { error: aErr } = await supabase.auth.updateUser(authPatch);
    if (aErr) {
      if (/already registered|already exists/i.test(aErr.message)) {
        throw new Error("Bu email boshqa foydalanuvchida bor");
      }
      throw new Error(aErr.message);
    }
    // Email profiles jadvalida ham yangilanadi
    if (authPatch.email) {
      await supabase.from("profiles").update({ email: authPatch.email }).eq("id", cached.id);
    }
  }

  return refreshCurrentUser();
}

// =====================================================================
//  SUPERADMIN FUNKSIYALARI (barchasi serverda tekshiriladi)
// =====================================================================

export async function fetchAllUsers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw new Error("Foydalanuvchilarni yuklashda xato: " + error.message);
  return (data || []).map(profileToUser);
}

export async function activateSubscription(userId, days) {
  const { error } = await supabase.rpc("admin_set_subscription", { target: userId, days });
  if (error) throw new Error(error.message);
}

export async function deactivateSubscription(userId) {
  const { error } = await supabase.rpc("admin_revoke_subscription", { target: userId });
  if (error) throw new Error(error.message);
}

export async function adminSetStatus(userId, status) {
  const { error } = await supabase.rpc("admin_set_status", { target: userId, new_status: status });
  if (error) throw new Error(error.message);
}

export async function adminSetRole(userId, role) {
  const { error } = await supabase.rpc("admin_set_role", { target: userId, new_role: role });
  if (error) throw new Error(error.message);
}

export async function adminUpdateProfile(userId, name, schoolName) {
  const { error } = await supabase.rpc("admin_update_profile", {
    target: userId, new_name: name.trim(), new_school: (schoolName || "").trim(),
  });
  if (error) throw new Error(error.message);
}

export async function adminDeleteUser(userId) {
  const { error } = await supabase.rpc("admin_delete_user", { target: userId });
  if (error) throw new Error(error.message);
}

export async function adminCreateUser({ name, email, password, schoolName, role = "user" }) {
  const { error } = await supabase.rpc("admin_create_user", {
    p_email: email.trim().toLowerCase(),
    p_password: password,
    p_name: name.trim(),
    p_school: schoolName?.trim() || "Maktab",
    p_role: role,
  });
  if (error) throw new Error(error.message);
}
