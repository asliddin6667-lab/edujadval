// =====================================================================
//  EDUJADVAL.UZ — TUMAN (DISTRICT) XIZMATI
//
//  - Superadmin: tuman yaratish/o'chirish, foydalanuvchini tumanga
//    biriktirish
//  - District Admin: o'z tumanidagi maktablar, jadval tekshiruvi,
//    bildirishnoma yuborish, audit log
//
//  XAVFSIZLIK: barcha cheklovlar Supabase RLS darajasida — bu fayl
//  faqat so'rov yuboradi, ruxsatni server tekshiradi.
// =====================================================================
import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------
//  TUMANLAR (superadmin boshqaradi, RLS himoya qiladi)
// ---------------------------------------------------------------------
export async function fetchDistricts() {
  const { data, error } = await supabase
    .from("districts")
    .select("*")
    .order("name");
  if (error) throw new Error("Tumanlarni yuklashda xato: " + error.message);
  return data || [];
}

export async function createDistrict(name, region) {
  if (!name?.trim()) throw new Error("Tuman nomini kiriting");
  const { error } = await supabase
    .from("districts")
    .insert({ name: name.trim(), region: (region || "").trim() });
  if (error) throw new Error(error.message);
}

export async function deleteDistrict(id) {
  const { error } = await supabase.from("districts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// Foydalanuvchini tumanga biriktirish (null = tumandan chiqarish)
export async function assignUserDistrict(userId, districtId) {
  const { error } = await supabase.rpc("admin_set_district", {
    target: userId,
    new_district: districtId || null,
  });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------
//  DISTRICT ADMIN — O'Z TUMANI HAQIDA
// ---------------------------------------------------------------------
export async function fetchMyDistrictInfo(districtId) {
  if (!districtId) return null;
  const { data } = await supabase
    .from("districts")
    .select("*")
    .eq("id", districtId)
    .maybeSingle();
  return data || null;
}

// ---------------------------------------------------------------------
//  Jadvaldagi darslarni chuqur sanash — schedule qanday shaklda
//  bo'lsa ham (tekis yoki ichma-ich obyekt) barg (leaf) yozuvlarni
//  sanaydi.
// ---------------------------------------------------------------------
function countLessons(schedule) {
  if (!schedule || typeof schedule !== "object") return 0;
  let n = 0;
  for (const v of Object.values(schedule)) {
    if (v && typeof v === "object" && !Array.isArray(v)) n += countLessons(v);
    else if (v !== null && v !== undefined) n += 1;
  }
  return n;
}

// ---------------------------------------------------------------------
//  O'Z TUMANIDAGI MAKTABLAR RO'YXATI (statistika bilan)
//  RLS tufayli faqat o'z tumanidagi qatorlar qaytadi.
// ---------------------------------------------------------------------
export async function fetchDistrictSchools() {
  const [profRes, blobRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, uid, name, email, phone, school_name, status, role, sub_status, sub_expires_at, district_id, region_name, district_name")
      .order("school_name"),
    supabase
      .from("schools")
      .select("owner_id, updated_at, data"),
  ]);

  if (profRes.error) throw new Error("Maktablarni yuklashda xato: " + profRes.error.message);
  if (blobRes.error) throw new Error("Ma'lumotlarni yuklashda xato: " + blobRes.error.message);

  const blobMap = new Map((blobRes.data || []).map((b) => [b.owner_id, b]));

  return (profRes.data || [])
    .filter((p) => p.role === "user")
    .map((p) => {
      const b = blobMap.get(p.id);
      const d = b?.data || {};
      const lessons = countLessons(d.schedule || {});
      return {
        id: p.id,
        uid: p.uid || "",
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        schoolName: p.school_name || "(nomsiz maktab)",
        regionName: p.region_name || "",
        districtName: p.district_name || "",
        status: p.status || "active",
        subStatus: p.sub_status || "unpaid",
        subExpiresAt: p.sub_expires_at ? new Date(p.sub_expires_at).getTime() : null,
        updatedAt: b?.updated_at ? new Date(b.updated_at).getTime() : null,
        classesCount: Array.isArray(d.classes) ? d.classes.length : 0,
        teachersCount: Array.isArray(d.teachers) ? d.teachers.length : 0,
        subjectsCount: Array.isArray(d.subjects) ? d.subjects.length : 0,
        roomsCount: Array.isArray(d.rooms) ? d.rooms.length : 0,
        lessonsCount: lessons,
        hasSchedule: lessons > 0,
        data: d, // batafsil ko'rish oynasi uchun (faqat o'qish)
      };
    });
}

// ---------------------------------------------------------------------
//  JADVAL TEKSHIRUV OQIMI (schedule_submissions)
// ---------------------------------------------------------------------
export async function fetchSubmissions() {
  const { data, error } = await supabase
    .from("schedule_submissions")
    .select("id, school_id, status, school_comment, review_comment, submitted_at, reviewed_at, updated_at")
    .order("submitted_at", { ascending: false });
  if (error) throw new Error("Jadvallarni yuklashda xato: " + error.message);
  return data || [];
}

// Bitta submission'ni snapshot bilan olish (ko'rish oynasi uchun)
export async function fetchSubmissionFull(id) {
  const { data, error } = await supabase
    .from("schedule_submissions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// Tuman admini statusni o'zgartiradi: reviewing / returned / approved / archived
export async function reviewSubmission(id, status, comment) {
  const patch = {
    status,
    reviewed_at: new Date().toISOString(),
  };
  if (comment !== undefined && comment !== null) patch.review_comment = comment;

  const { data: sess } = await supabase.auth.getSession();
  const me = sess?.session?.user?.id;
  if (me) patch.reviewer_id = me;

  const { error } = await supabase
    .from("schedule_submissions")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------
//  BILDIRISHNOMALAR
// ---------------------------------------------------------------------
export async function sendNotification({ recipientId, districtId, type, title, body }) {
  if (!recipientId) throw new Error("Qabul qiluvchi maktabni tanlang");
  if (!title?.trim()) throw new Error("Sarlavha kiriting");

  const { data: sess } = await supabase.auth.getSession();
  const sender = sess?.session?.user?.id;
  if (!sender) throw new Error("Sessiya topilmadi. Qaytadan kiring.");

  const { error } = await supabase.from("notifications").insert({
    sender_id: sender,
    recipient_id: recipientId,
    district_id: districtId || null,
    type: type || "info",
    title: title.trim(),
    body: (body || "").trim(),
  });
  if (error) throw new Error(error.message);
}

export async function fetchSentNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data || [];
}

// Maktab (user) o'ziga kelgan bildirishnomalarni o'qiydi — keyingi
// bosqichda maktab interfeysiga ulanadi.
export async function fetchMyNotifications() {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function markNotificationRead(id) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------
//  AUDIT LOG
// ---------------------------------------------------------------------
export async function fetchAuditLog(limit = 200) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

// Amalni logga yozish (xato bersa ham asosiy ishni to'xtatmaydi)
export async function logAction({ user, action, targetType, targetId, details }) {
  try {
    if (!user?.id) return;
    await supabase.from("audit_log").insert({
      actor_id: user.id,
      actor_email: user.email || null,
      actor_role: user.role || null,
      action,
      target_type: targetType || null,
      target_id: targetId != null ? String(targetId) : null,
      details: details || {},
      district_id: user.districtId || null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    /* log yozilmasa ham davom etamiz */
  }
}