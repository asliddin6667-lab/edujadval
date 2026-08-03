import { useState, useEffect, useMemo } from "react";
import {
  fetchMyDistrictInfo, fetchDistrictSchools, fetchSubmissions,
  reviewSubmission, sendNotification, fetchSentNotifications,
  fetchAuditLog, logAction, adminResetPassword,
} from "../services/districtService";
import { fetchExcelStore } from "../services/districtExcelService";
import { ExcelDataPage, ReportsPage, SetkaMatrix, JadvalViewer, TeacherHoursTable } from "./districtExcel";
import "./district.css";

// =====================================================================
//  DISTRICT ADMIN (TUMAN ADMINI) PANELI
//
//  Tuman admini FAQAT o'z tumanidagi maktablarni ko'radi (RLS).
//  Ma'lumotlarni o'zgartira olmaydi — faqat ko'rish, tekshirish,
//  tasdiqlash/qaytarish, bildirishnoma yuborish va zarur bo'lganda
//  maktab paroliga vaqtinchalik parol o'rnatish.
// =====================================================================

const NAV = [
  { id: "dashboard",     icon: "📊", label: "Dashboard" },
  { id: "schools",       icon: "🏫", label: "Maktablar" },
  { id: "review",        icon: "⏳", label: "Tekshiruvdagi jadvallar" },
  { id: "approved",      icon: "✅", label: "Tasdiqlangan jadvallar" },
  { id: "reports",       icon: "📈", label: "Hisobotlar" },
  { id: "excel",         icon: "📥", label: "Excel ma'lumotlar" },
  { id: "notifications", icon: "🔔", label: "Bildirishnomalar" },
  { id: "audit",         icon: "🧾", label: "Audit log" },
  { id: "profile",       icon: "👤", label: "Profil" },
];

const STATUS_META = {
  draft:     { label: "Qoralama",       color: "#64748b" },
  submitted: { label: "Yuborilgan",     color: "#2563eb" },
  reviewing: { label: "Tekshirilmoqda", color: "#f59e0b" },
  returned:  { label: "Qaytarilgan",    color: "#ef4444" },
  approved:  { label: "Tasdiqlangan",   color: "#10b981" },
  archived:  { label: "Arxivlangan",    color: "#6b7280" },
};

const NOTIF_TYPES = [
  { value: "info",        label: "ℹ️ Eslatma" },
  { value: "warning",     label: "⚠️ Ogohlantirish" },
  { value: "error",       label: "❌ Xatolik" },
  { value: "news",        label: "📰 Yangilik" },
  { value: "maintenance", label: "🛠 Texnik ishlar" },
];

function fmtDate(ts) {
  if (!ts) return "—";
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
}

function timeAgo(ts) {
  if (!ts) return "—";
  const diff = Date.now() - (typeof ts === "number" ? ts : new Date(ts).getTime());
  if (diff < 0) return "hozir";
  const min = Math.floor(diff / 60000);
  if (min < 1) return "hozirgina";
  if (min < 60) return `${min} daqiqa oldin`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} soat oldin`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} kun oldin`;
  return fmtDate(ts);
}

// Vaqtinchalik parol generatori — adashtiruvchi belgilar (0/O, 1/l/I)
// ishlatilmaydi, telefonda aytib berish oson bo'lishi uchun.
function genTempPassword(len = 10) {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  const rnd = new Uint32Array(len);
  crypto.getRandomValues(rnd);
  for (let i = 0; i < len; i++) out += chars[rnd[i] % chars.length];
  return out;
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, color: "#64748b" };
  return (
    <span className="da-badge" style={{ background: `${m.color}1c`, color: m.color }}>
      ● {m.label}
    </span>
  );
}

function SubBadge({ school }) {
  if (school.subStatus === "active") {
    const days = school.subExpiresAt
      ? Math.max(0, Math.ceil((school.subExpiresAt - Date.now()) / 86400000))
      : null;
    return (
      <span className="da-badge" style={{ background: "#10b9811c", color: "#059669" }}>
        {days === null ? "Faol" : `Faol · ${days} kun`}
      </span>
    );
  }
  if (school.subStatus === "expired") {
    return <span className="da-badge" style={{ background: "#f59e0b1c", color: "#b45309" }}>Muddati tugagan</span>;
  }
  return <span className="da-badge" style={{ background: "#ef44441c", color: "#dc2626" }}>To'lov qilmagan</span>;
}

function Empty({ icon, title, text }) {
  return (
    <div className="da-empty">
      <div className="da-empty__icon">{icon}</div>
      <div className="da-empty__title">{title}</div>
      <div className="da-empty__text">{text}</div>
    </div>
  );
}

// =====================================================================
//  PAROL TIKLASH MODALI
// =====================================================================
function ResetPasswordModal({ school, currentUser, addToast, onClose }) {
  const [password, setPassword] = useState(() => genTempPassword());
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleReset() {
    if (busy || done) return;
    const pwd = password.trim();
    if (pwd.length < 8) {
      addToast("Parol kamida 8 belgidan iborat bo'lishi kerak", "warning");
      return;
    }
    setBusy(true);
    try {
      const res = await adminResetPassword(school.id, pwd);
      setDone(true);
      if (res?.warning) addToast(res.warning, "warning");
      try {
        await logAction({
          user: currentUser,
          action: "password_reset",
          targetType: "user",
          targetId: school.id,
          details: { school: school.schoolName, email: school.email },
        });
      } catch {
        /* audit yozilmasa ham asosiy amal bajarilgan */
      }
    } catch (e) {
      addToast(e.message || "Parol tiklashda xatolik", "warning");
    } finally {
      setBusy(false);
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      addToast("Nusxalab bo'lmadi — parolni qo'lda belgilab oling", "warning");
    }
  }

  return (
    <div className="da-modal-backdrop" onClick={done ? undefined : onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,.55)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div className="da-card" onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, margin: 0 }}
      >
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>
          🔑 Parolni tiklash
        </div>
        <div style={{ fontSize: 13, color: "var(--da-text-2)", marginBottom: 14 }}>
          <b>{school.schoolName}</b> · {school.email}
        </div>

        {!done ? (
          <>
            <div style={{
              padding: "9px 13px", borderRadius: 11, fontSize: 12.5, marginBottom: 14,
              background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)",
              color: "#b45309", lineHeight: 1.55,
            }}>
              ⚠️ Maktabning hozirgi paroli bekor bo'ladi. Yangi vaqtinchalik parolni
              maktabga yetkazing — u kirgach parolni majburiy almashtiradi.
            </div>

            <label className="da-label">Vaqtinchalik parol</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input
                className="da-input"
                style={{ flex: 1, fontFamily: "monospace", fontSize: 15, letterSpacing: 1 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
              />
              <button type="button" className="da-btn da-btn--ghost" disabled={busy}
                title="Yangi parol yaratish"
                onClick={() => setPassword(genTempPassword())}>
                🎲
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className="da-btn da-btn--primary" disabled={busy} onClick={handleReset}>
                {busy ? "O'rnatilmoqda..." : "🔑 Parolni o'rnatish"}
              </button>
              <button type="button" className="da-btn da-btn--ghost" disabled={busy} onClick={onClose}>
                Bekor
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{
              padding: "12px 14px", borderRadius: 12, marginBottom: 14,
              background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.35)",
              color: "#059669", fontWeight: 700, fontSize: 13.5,
            }}>
              ✅ Vaqtinchalik parol o'rnatildi
            </div>

            <label className="da-label">Yangi parol — maktabga yetkazing</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                className="da-input" readOnly
                style={{ flex: 1, fontFamily: "monospace", fontSize: 16, letterSpacing: 1.5, fontWeight: 700 }}
                value={password.trim()}
                onFocus={(e) => e.target.select()}
              />
              <button type="button" className="da-btn da-btn--primary" onClick={copyPassword}>
                {copied ? "✓ Nusxalandi" : "📋 Nusxalash"}
              </button>
            </div>
            <div style={{ fontSize: 12, color: "var(--da-text-2)", marginBottom: 16, lineHeight: 1.55 }}>
              ℹ️ Bu parol qayta ko'rsatilmaydi — oynani yopishdan oldin nusxalab oling.
              Maktab shu parol bilan kirgach, tizim yangi parol o'rnatishni talab qiladi.
            </div>

            <button type="button" className="da-btn da-btn--ghost" onClick={onClose}>
              Yopish
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// =====================================================================
//  ASOSIY KOMPONENT
// =====================================================================
export default function DistrictApp({ currentUser, onLogout, darkMode, setDarkMode, toasts, addToast }) {
  const [page, setPage] = useState("dashboard");
  const [navOpen, setNavOpen] = useState(false);

  const [district, setDistrict] = useState(null);
  const [schools, setSchools] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchool, setSelectedSchool] = useState(null);

  const hasDistrict = !!currentUser.districtId;

  async function loadAll() {
    if (!hasDistrict) { setLoading(false); return; }
    setLoading(true);
    try {
      const [d, sc, sb] = await Promise.all([
        fetchMyDistrictInfo(currentUser.districtId),
        fetchDistrictSchools(),
        fetchSubmissions(),
      ]);
      setDistrict(d);
      setSchools(sc);
      setSubs(sb);
    } catch (e) {
      addToast(e.message, "warning");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingCount = useMemo(
    () => subs.filter((s) => s.status === "submitted" || s.status === "reviewing").length,
    [subs]
  );

  const schoolById = useMemo(() => {
    const m = new Map();
    for (const s of schools) m.set(s.id, s);
    return m;
  }, [schools]);

  function goto(id) {
    setPage(id);
    setSelectedSchool(null);
    setNavOpen(false);
  }

  const initials = (currentUser.name || currentUser.email || "TA").trim().charAt(0).toUpperCase();

  return (
    <div className={`da-root ${navOpen ? "da-root--nav-open" : ""}`}>
      <button type="button" className="da-burger" onClick={() => setNavOpen(true)} aria-label="Menyu">☰</button>
      <div className="da-backdrop" onClick={() => setNavOpen(false)} />

      {/* ------------------------------ SIDEBAR ------------------------------ */}
      <aside className="da-sidebar">
        <div className="da-sidebar__logocard">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Edujadval.uz"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
        <div className="da-sidebar__rolebar">🏛 TUMAN ADMINI</div>

        <nav className="da-nav">
          <div className="da-nav__section">ASOSIY</div>
          {NAV.slice(0, 1).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`da-nav__item ${page === item.id ? "da-nav__item--active" : ""}`}
              onClick={() => goto(item.id)}
            >
              <span className="da-nav__icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <div className="da-nav__section">NAZORAT</div>
          {NAV.slice(1, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`da-nav__item ${page === item.id ? "da-nav__item--active" : ""}`}
              onClick={() => goto(item.id)}
            >
              <span className="da-nav__icon">{item.icon}</span>
              {item.label}
              {item.id === "review" && pendingCount > 0 && (
                <span className="da-nav__badge">{pendingCount}</span>
              )}
            </button>
          ))}
          <div className="da-nav__section">TIZIM</div>
          {NAV.slice(6).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`da-nav__item ${page === item.id ? "da-nav__item--active" : ""}`}
              onClick={() => goto(item.id)}
            >
              <span className="da-nav__icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="da-sidebar__footer">
          <div className="da-sidebar__user">
            <div className="da-sidebar__avatar">{initials}</div>
            <div style={{ minWidth: 0 }}>
              <div className="da-sidebar__username">{currentUser.name || currentUser.email}</div>
              <div className="da-sidebar__role">{district?.name || "Tuman admini"}</div>
            </div>
          </div>
          <button type="button" className="da-nav__item" onClick={onLogout}>
            <span className="da-nav__icon">🚪</span> Chiqish
          </button>
        </div>
      </aside>

      {/* ------------------------------- MAIN -------------------------------- */}
      <main className="da-main">
        <div className="da-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div className="da-topbar__title">
              {NAV.find((n) => n.id === page)?.label || "Dashboard"}
            </div>
            {district && (
              <span className="da-topbar__district">
                📍 {district.name}{district.region ? ` · ${district.region}` : ""}
              </span>
            )}
          </div>
          <div className="da-topbar__actions">
            <button type="button" className="da-iconbtn" title="Yangilash" onClick={loadAll} disabled={loading}>⟳</button>
            <button
              type="button"
              className="da-iconbtn"
              title={darkMode ? "Yorug' rejim" : "Tungi rejim"}
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {!hasDistrict ? (
          <div className="da-card">
            <Empty
              icon="🏛"
              title="Sizga hali tuman biriktirilmagan"
              text="Super Admin sizni tumanga biriktirishi kerak. Iltimos, administrator bilan bog'laning, so'ng tizimga qaytadan kiring."
            />
          </div>
        ) : selectedSchool ? (
          <SchoolDetail school={selectedSchool} onBack={() => setSelectedSchool(null)} />
        ) : (
          <>
            {page === "dashboard" && (
              <DashboardPage loading={loading} schools={schools} subs={subs} onOpenSchool={(s) => setSelectedSchool(s)} />
            )}
            {page === "schools" && (
              <SchoolsPage
                loading={loading}
                schools={schools}
                onOpenSchool={(s) => setSelectedSchool(s)}
                currentUser={currentUser}
                addToast={addToast}
              />
            )}
            {page === "review" && (
              <SubmissionsPage
                subs={subs.filter((s) => ["submitted", "reviewing", "returned"].includes(s.status))}
                schoolById={schoolById}
                currentUser={currentUser}
                addToast={addToast}
                onChanged={loadAll}
                mode="review"
              />
            )}
            {page === "approved" && (
              <SubmissionsPage
                subs={subs.filter((s) => ["approved", "archived"].includes(s.status))}
                schoolById={schoolById}
                currentUser={currentUser}
                addToast={addToast}
                onChanged={loadAll}
                mode="approved"
              />
            )}
            {page === "reports" && <ReportsPage schools={schools} />}
            {page === "excel" && <ExcelDataPage schools={schools} addToast={addToast} districtId={currentUser.districtId} />}
            {page === "notifications" && (
              <NotificationsPage schools={schools} currentUser={currentUser} addToast={addToast} />
            )}
            {page === "audit" && <AuditPage addToast={addToast} />}
            {page === "profile" && <ProfilePage currentUser={currentUser} district={district} schools={schools} />}
          </>
        )}
      </main>

      <div className="toast-container">
        {(toasts || []).map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </div>
  );
}

// =====================================================================
//  DASHBOARD
// =====================================================================
function DashboardPage({ loading, schools, subs, onOpenSchool }) {
  const stats = useMemo(() => {
    const total = schools.length;
    const withSched = schools.filter((s) => s.hasSchedule).length;
    const teachers = schools.reduce((a, s) => a + s.teachersCount, 0);
    const classes = schools.reduce((a, s) => a + s.classesCount, 0);
    const lessons = schools.reduce((a, s) => a + s.lessonsCount, 0);
    const approved = subs.filter((s) => s.status === "approved").length;
    const pending = subs.filter((s) => s.status === "submitted" || s.status === "reviewing").length;
    return { total, withSched, without: total - withSched, teachers, classes, lessons, approved, pending };
  }, [schools, subs]);

  const KPIS = [
    { icon: "🏫", label: "Jami maktablar",           value: stats.total,    bg: "rgba(37,99,235,.13)" },
    { icon: "📅", label: "Jadval yaratgan",           value: stats.withSched, bg: "rgba(16,185,129,.13)" },
    { icon: "⏳", label: "Jadval yaratmagan",         value: stats.without,  bg: "rgba(245,158,11,.14)" },
    { icon: "✅", label: "Tasdiqlangan jadvallar",    value: stats.approved, bg: "rgba(16,185,129,.13)" },
    { icon: "⚠️", label: "Tekshiruv kutmoqda",        value: stats.pending,  bg: "rgba(239,68,68,.12)" },
    { icon: "👨‍🏫", label: "Jami o'qituvchilar",       value: stats.teachers, bg: "rgba(99,102,241,.13)" },
    { icon: "🎓", label: "Jami sinflar",              value: stats.classes,  bg: "rgba(14,165,233,.13)" },
    { icon: "📚", label: "Haftalik jami darslar",     value: stats.lessons,  bg: "rgba(168,85,247,.13)" },
  ];

  if (loading) {
    return (
      <>
        <div className="da-kpis">
          {KPIS.map((k, i) => <div key={i} className="da-skel" style={{ height: 82 }} />)}
        </div>
        <div className="da-grid-2">
          <div className="da-skel" style={{ height: 260 }} />
          <div className="da-skel" style={{ height: 260 }} />
        </div>
      </>
    );
  }

  const topSchools = [...schools].sort((a, b) => b.lessonsCount - a.lessonsCount).slice(0, 8);
  const maxLessons = Math.max(1, ...topSchools.map((s) => s.lessonsCount));
  const recent = [...schools]
    .filter((s) => s.updatedAt)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 6);
  const pct = stats.total ? Math.round((stats.withSched / stats.total) * 100) : 0;

  return (
    <>
      <div className="da-kpis">
        {KPIS.map((k, i) => (
          <div key={i} className="da-kpi" style={{ animationDelay: `${i * 45}ms` }}>
            <div className="da-kpi__icon" style={{ background: k.bg }}>{k.icon}</div>
            <div>
              <div className="da-kpi__value">{k.value}</div>
              <div className="da-kpi__label">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="da-grid-2">
        <div className="da-card">
          <div className="da-card__title">📚 Eng ko'p dars yuklamasi bo'lgan maktablar</div>
          {topSchools.length === 0 ? (
            <Empty icon="🏫" title="Maktablar yo'q" text="Tumaningizga hali maktab biriktirilmagan." />
          ) : (
            topSchools.map((s) => (
              <div key={s.id} className="da-bar-row">
                <div className="da-bar-name" title={s.schoolName}>{s.schoolName}</div>
                <div className="da-bar-track">
                  <div className="da-bar-fill" style={{ width: `${(s.lessonsCount / maxLessons) * 100}%` }} />
                </div>
                <div className="da-bar-val">{s.lessonsCount}</div>
              </div>
            ))
          )}
        </div>

        <div className="da-card">
          <div className="da-card__title">📅 Tuman bo'yicha jadval holati</div>
          <div style={{ display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
            <div className="da-ring" style={{ "--p": pct }}>
              <div className="da-ring__value">{pct}%</div>
              <div className="da-ring__label">jadval tayyor</div>
            </div>
            <div style={{ flex: 1, minWidth: 190 }}>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <b style={{ color: "#10b981" }}>●</b> Jadval yaratgan: <b>{stats.withSched}</b> ta maktab
              </div>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <b style={{ color: "#f59e0b" }}>●</b> Jadval yaratmagan: <b>{stats.without}</b> ta maktab
              </div>
              <div style={{ fontSize: 13 }}>
                <b style={{ color: "#2563eb" }}>●</b> Tekshiruv kutmoqda: <b>{stats.pending}</b> ta jadval
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="da-card">
        <div className="da-card__title">🕐 Oxirgi faol maktablar</div>
        {recent.length === 0 ? (
          <Empty icon="💤" title="Faollik yo'q" text="Maktablar hali ma'lumot kiritmagan." />
        ) : (
          <div className="da-tablewrap">
            <table className="da-table">
              <thead>
                <tr>
                  <th>Maktab</th>
                  <th>O'qituvchilar</th>
                  <th>Sinflar</th>
                  <th>Darslar</th>
                  <th>Oxirgi faollik</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} className="da-row-click" onClick={() => onOpenSchool(s)}>
                    <td><b>{s.schoolName}</b></td>
                    <td>{s.teachersCount}</td>
                    <td>{s.classesCount}</td>
                    <td>{s.lessonsCount}</td>
                    <td>{timeAgo(s.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// =====================================================================
//  MAKTABLAR RO'YXATI
// =====================================================================
function SchoolsPage({ loading, schools, onOpenSchool, currentUser, addToast }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all"); // all | with | without
  const [resetFor, setResetFor] = useState(null); // parol tiklanayotgan maktab

  const q = query.trim().toLowerCase();
  const shown = schools.filter((s) => {
    if (filter === "with" && !s.hasSchedule) return false;
    if (filter === "without" && s.hasSchedule) return false;
    if (!q) return true;
    return [s.schoolName, s.name, s.email, s.uid, s.phone]
      .filter(Boolean)
      .some((f) => String(f).toLowerCase().includes(q));
  });

  if (loading) return <div className="da-skel" style={{ height: 380 }} />;

  return (
    <div className="da-card">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div className="da-search">
          <span className="da-search__icon">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Maktab, direktor, email yoki EDU-ID..."
          />
        </div>
        <div className="da-tabs" style={{ marginBottom: 0 }}>
          <button type="button" className={`da-tab ${filter === "all" ? "da-tab--active" : ""}`} onClick={() => setFilter("all")}>
            Hammasi ({schools.length})
          </button>
          <button type="button" className={`da-tab ${filter === "with" ? "da-tab--active" : ""}`} onClick={() => setFilter("with")}>
            Jadvali bor ({schools.filter((s) => s.hasSchedule).length})
          </button>
          <button type="button" className={`da-tab ${filter === "without" ? "da-tab--active" : ""}`} onClick={() => setFilter("without")}>
            Jadvali yo'q ({schools.filter((s) => !s.hasSchedule).length})
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty
          icon="🏫"
          title={q ? "Hech narsa topilmadi" : "Maktablar yo'q"}
          text={q ? `"${query}" bo'yicha maktab topilmadi.` : "Tumaningizga hali maktab biriktirilmagan. Super Admin maktablarni tumanga biriktirishi kerak."}
        />
      ) : (
        <div className="da-tablewrap">
          <table className="da-table">
            <thead>
              <tr>
                <th>Maktab nomi</th>
                <th>Direktor</th>
                <th>Obuna</th>
                <th>Jadval holati</th>
                <th>O'qituvchilar</th>
                <th>Sinflar</th>
                <th>Oxirgi faollik</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id}>
                  <td>
                    <b>{s.schoolName}</b>
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: "#6366f1" }}>{s.uid || "—"}</div>
                  </td>
                  <td>
                    {s.name || "—"}
                    <div style={{ fontSize: 12, color: "var(--da-text-2)" }}>{s.email}</div>
                    {s.phone && <div style={{ fontSize: 12, color: "var(--da-text-2)" }}>📞 {s.phone}</div>}
                  </td>
                  <td><SubBadge school={s} /></td>
                  <td>
                    {s.hasSchedule
                      ? <span className="da-badge" style={{ background: "#10b9811c", color: "#059669" }}>✓ Yaratilgan</span>
                      : <span className="da-badge" style={{ background: "#f59e0b1c", color: "#b45309" }}>⏳ Yaratilmagan</span>}
                  </td>
                  <td>{s.teachersCount}</td>
                  <td>{s.classesCount}</td>
                  <td>{timeAgo(s.updatedAt)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" className="da-btn da-btn--primary da-btn--sm" onClick={() => onOpenSchool(s)}>
                        👁 Ko'rish
                      </button>
                      <button
                        type="button"
                        className="da-btn da-btn--warning da-btn--sm"
                        title="Vaqtinchalik parol o'rnatish"
                        onClick={() => setResetFor(s)}
                      >
                        🔑 Parol
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {resetFor && (
        <ResetPasswordModal
          school={resetFor}
          currentUser={currentUser}
          addToast={addToast}
          onClose={() => setResetFor(null)}
        />
      )}
    </div>
  );
}

// =====================================================================
//  MAKTAB OYNASI (faqat ko'rish)
//
//  Ikki xil manba ko'rsatiladi:
//    1. Maktab o'zi kiritgan ma'lumotlar (school.data — o'qituvchilar,
//       sinflar, fanlar, xonalar)
//    2. Tuman admini Excel orqali yuklagan ma'lumotlar (Supabase'dagi
//       district_excel_data): dars jadvali, sinf-fan soatlari (setka)
//       va o'qituvchi haftalik soatlari
// =====================================================================
function SchoolDetail({ school, onBack }) {
  const [tab, setTab] = useState("teachers");
  const [excel, setExcel] = useState(null);       // { teachers, setka, jadval }
  const [excelLoading, setExcelLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const store = await fetchExcelStore();
        if (alive) setExcel(store[school.id] || {});
      } catch {
        if (alive) setExcel({});
      } finally {
        if (alive) setExcelLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [school.id]);

  const d = school.data || {};
  const teachers = Array.isArray(d.teachers) ? d.teachers : [];
  const classes = Array.isArray(d.classes) ? d.classes : [];
  const subjects = Array.isArray(d.subjects) ? d.subjects : [];
  const rooms = Array.isArray(d.rooms) ? d.rooms : [];

  const jadvalRows = excel?.jadval?.rows?.length || 0;
  const setkaRows = excel?.setka?.rows?.length || 0;
  const excelTeacherRows = excel?.teachers?.rows?.length || 0;

  const TABS = [
    { id: "teachers", label: `👨‍🏫 O'qituvchilar (${teachers.length})` },
    { id: "classes",  label: `🎓 Sinflar (${classes.length})` },
    { id: "subjects", label: `📚 Fanlar (${subjects.length})` },
    { id: "rooms",    label: `🚪 Xonalar (${rooms.length})` },
    { id: "jadval",   label: "📅 Dars jadvali" },
    { id: "setka",    label: "🕐 Sinf-fan soatlari" },
    { id: "hours",    label: "⏱ O'qituvchi soatlari" },
  ];

  function nameOf(x) {
    if (!x) return "—";
    if (typeof x === "string") return x;
    return x.name || x.fullName || x.title || "—";
  }

  function ExcelEmpty({ icon, title }) {
    return (
      <Empty
        icon={icon}
        title={title}
        text={`Bu maktab uchun "📥 Excel ma'lumotlar" bo'limida tegishli faylni yuklang — shu yerda avtomatik ko'rinadi.`}
      />
    );
  }

  return (
    <>
      <div className="da-card">
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className="da-btn da-btn--ghost" onClick={onBack}>← Orqaga</button>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{school.schoolName}</div>
            <div style={{ fontSize: 12.5, color: "var(--da-text-2)" }}>
              {school.name && `Direktor: ${school.name} · `}{school.email}
              {school.phone && ` · 📞 ${school.phone}`}
            </div>
            {(school.regionName || school.districtName) && (
              <div style={{ fontSize: 12.5, color: "var(--da-text-2)", marginTop: 2 }}>
                📍 {[school.regionName, school.districtName].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SubBadge school={school} />
            <span className="da-badge" style={{ background: "rgba(37,99,235,.1)", color: "#2563eb" }}>
              📚 {school.lessonsCount} dars
            </span>
            {jadvalRows > 0 && (
              <span className="da-badge" style={{ background: "#10b9811c", color: "#059669" }}>
                📅 Jadval yuklangan
              </span>
            )}
          </div>
        </div>
        <div style={{
          marginTop: 12, padding: "9px 13px", borderRadius: 11, fontSize: 12.5,
          background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)",
          color: "#b45309", fontWeight: 600,
        }}>
          🔒 Faqat ko'rish rejimi — maktab ma'lumotlarini o'zgartirib bo'lmaydi.
        </div>
      </div>

      <div className="da-card">
        <div className="da-tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`da-tab ${tab === t.id ? "da-tab--active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "teachers" && (
          teachers.length === 0
            ? <Empty icon="👨‍🏫" title="O'qituvchilar kiritilmagan" text="Maktab hali o'qituvchilar ro'yxatini kiritmagan." />
            : (
              <div className="da-tablewrap">
                <table className="da-table">
                  <thead><tr><th>#</th><th>F.I.Sh.</th></tr></thead>
                  <tbody>
                    {teachers.map((t, i) => (
                      <tr key={t?.id || i}><td>{i + 1}</td><td><b>{nameOf(t)}</b></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}

        {tab === "classes" && (
          classes.length === 0
            ? <Empty icon="🎓" title="Sinflar kiritilmagan" text="Maktab hali sinflar ro'yxatini kiritmagan." />
            : (
              <div className="da-tablewrap">
                <table className="da-table">
                  <thead><tr><th>#</th><th>Sinf</th></tr></thead>
                  <tbody>
                    {classes.map((c, i) => (
                      <tr key={c?.id || i}><td>{i + 1}</td><td><b>{nameOf(c)}</b></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}

        {tab === "subjects" && (
          subjects.length === 0
            ? <Empty icon="📚" title="Fanlar kiritilmagan" text="Maktab hali fanlar ro'yxatini kiritmagan." />
            : (
              <div className="da-tablewrap">
                <table className="da-table">
                  <thead><tr><th>#</th><th>Fan</th></tr></thead>
                  <tbody>
                    {subjects.map((s, i) => (
                      <tr key={s?.id || i}><td>{i + 1}</td><td><b>{nameOf(s)}</b></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}

        {tab === "rooms" && (
          rooms.length === 0
            ? <Empty icon="🚪" title="Xonalar kiritilmagan" text="Maktab hali xonalar ro'yxatini kiritmagan." />
            : (
              <div className="da-tablewrap">
                <table className="da-table">
                  <thead><tr><th>#</th><th>Xona</th></tr></thead>
                  <tbody>
                    {rooms.map((r, i) => (
                      <tr key={r?.id || i}><td>{i + 1}</td><td><b>{nameOf(r)}</b></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}

        {tab === "jadval" && (
          excelLoading
            ? <div className="da-skel" style={{ height: 240 }} />
            : jadvalRows > 0
              ? <JadvalViewer d={excel.jadval} />
              : <ExcelEmpty icon="📅" title="Dars jadvali hali yuklanmagan" />
        )}

        {tab === "setka" && (
          excelLoading
            ? <div className="da-skel" style={{ height: 240 }} />
            : setkaRows > 0
              ? (
                <SetkaMatrix
                  title="🕐 Sinf-fan haftalik soatlari"
                  rows={excel.setka.rows}
                  classes={excel.setka.classes}
                />
              )
              : <ExcelEmpty icon="🕐" title="Soat setkasi hali yuklanmagan" />
        )}

        {tab === "hours" && (
          excelLoading
            ? <div className="da-skel" style={{ height: 240 }} />
            : (excelTeacherRows > 0 || jadvalRows > 0)
              ? (
                <TeacherHoursTable
                  teachers={excel.teachers}
                  jadval={excel.jadval}
                />
              )
              : <ExcelEmpty icon="⏱" title="O'qituvchi soatlari uchun ma'lumot yo'q" />
        )}
      </div>
    </>
  );
}

// =====================================================================
//  JADVAL TEKSHIRUVI / TASDIQLANGANLAR
// =====================================================================
function SubmissionsPage({ subs, schoolById, currentUser, addToast, onChanged, mode }) {
  const [busy, setBusy] = useState(false);
  const [commentFor, setCommentFor] = useState(null); // { sub, action }
  const [comment, setComment] = useState("");

  async function doReview(sub, status, note) {
    if (busy) return;
    setBusy(true);
    try {
      await reviewSubmission(sub.id, status, note);
      await logAction({
        user: currentUser,
        action: `submission.${status}`,
        targetType: "submission",
        targetId: sub.id,
        details: { school_id: sub.school_id },
      });
      addToast(
        status === "approved" ? "Jadval tasdiqlandi ✅"
          : status === "returned" ? "Jadval qaytarildi"
          : status === "reviewing" ? "Tekshiruvga olindi"
          : "Arxivlandi",
        status === "returned" ? "warning" : "success"
      );
      setCommentFor(null);
      setComment("");
      onChanged();
    } catch (e) {
      addToast(e.message, "warning");
    } finally {
      setBusy(false);
    }
  }

  if (subs.length === 0) {
    return (
      <div className="da-card">
        <Empty
          icon={mode === "approved" ? "✅" : "⏳"}
          title={mode === "approved" ? "Tasdiqlangan jadvallar yo'q" : "Tekshiruvda jadval yo'q"}
          text={mode === "approved"
            ? "Siz tasdiqlagan jadvallar shu yerda ko'rinadi."
            : "Maktablar jadvalini tekshiruvga yuborganda shu yerda paydo bo'ladi. Maktab tomonidagi \"Tekshiruvga yuborish\" tugmasi 4-bosqichda qo'shiladi."}
        />
      </div>
    );
  }

  return (
    <div className="da-card">
      {commentFor && (
        <div style={{
          marginBottom: 16, padding: 15, borderRadius: 14,
          border: "1.5px solid var(--da-warning)", background: "rgba(245,158,11,.07)",
        }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            💬 Izoh — {schoolById.get(commentFor.sub.school_id)?.schoolName || "maktab"}
          </div>
          <textarea
            className="da-textarea"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Maktabga izoh yozing: nimani to'g'irlash kerak..."
          />
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className={`da-btn ${commentFor.action === "approved" ? "da-btn--success" : "da-btn--warning"}`}
              disabled={busy}
              onClick={() => doReview(commentFor.sub, commentFor.action, comment)}
            >
              {commentFor.action === "approved" ? "✅ Tasdiqlash" : "↩️ Qaytarish"}
            </button>
            <button type="button" className="da-btn da-btn--ghost" onClick={() => { setCommentFor(null); setComment(""); }}>
              Bekor
            </button>
          </div>
        </div>
      )}

      <div className="da-tablewrap">
        <table className="da-table">
          <thead>
            <tr>
              <th>Maktab</th>
              <th>Holat</th>
              <th>Yuborilgan</th>
              <th>Izohlar</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((sub) => {
              const school = schoolById.get(sub.school_id);
              return (
                <tr key={sub.id}>
                  <td><b>{school?.schoolName || "Noma'lum maktab"}</b></td>
                  <td><StatusBadge status={sub.status} /></td>
                  <td>{fmtDate(sub.submitted_at)}</td>
                  <td style={{ maxWidth: 230 }}>
                    {sub.school_comment && (
                      <div style={{ fontSize: 12 }}>🏫 {sub.school_comment}</div>
                    )}
                    {sub.review_comment && (
                      <div style={{ fontSize: 12, color: "var(--da-text-2)" }}>🏛 {sub.review_comment}</div>
                    )}
                    {!sub.school_comment && !sub.review_comment && "—"}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {mode === "review" && sub.status === "submitted" && (
                        <button type="button" className="da-btn da-btn--primary da-btn--sm" disabled={busy}
                          onClick={() => doReview(sub, "reviewing")}>
                          🔍 Tekshiruvga olish
                        </button>
                      )}
                      {mode === "review" && ["submitted", "reviewing"].includes(sub.status) && (
                        <>
                          <button type="button" className="da-btn da-btn--success da-btn--sm" disabled={busy}
                            onClick={() => setCommentFor({ sub, action: "approved" })}>
                            ✅ Tasdiqlash
                          </button>
                          <button type="button" className="da-btn da-btn--warning da-btn--sm" disabled={busy}
                            onClick={() => setCommentFor({ sub, action: "returned" })}>
                            ↩️ Qaytarish
                          </button>
                        </>
                      )}
                      {mode === "approved" && sub.status === "approved" && (
                        <button type="button" className="da-btn da-btn--ghost da-btn--sm" disabled={busy}
                          onClick={() => doReview(sub, "archived")}>
                          🗄 Arxivlash
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// =====================================================================
//  BILDIRISHNOMALAR
// =====================================================================
function NotificationsPage({ schools, currentUser, addToast }) {
  const [form, setForm] = useState({ recipientId: "", type: "info", title: "", body: "" });
  const [toAll, setToAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState([]);
  const [loadingSent, setLoadingSent] = useState(true);

  async function loadSent() {
    try {
      setLoadingSent(true);
      setSent(await fetchSentNotifications());
    } catch {
      /* jim — asosiy oqimni buzmaydi */
    } finally {
      setLoadingSent(false);
    }
  }

  useEffect(() => { loadSent(); }, []);

  async function handleSend() {
    if (busy) return;
    if (!toAll && !form.recipientId) return addToast("Qabul qiluvchi maktabni tanlang", "warning");
    if (!form.title.trim()) return addToast("Sarlavha kiriting", "warning");

    setBusy(true);
    try {
      const targets = toAll ? schools.map((s) => s.id) : [form.recipientId];
      for (const rid of targets) {
        await sendNotification({
          recipientId: rid,
          districtId: currentUser.districtId,
          type: form.type,
          title: form.title,
          body: form.body,
        });
      }
      await logAction({
        user: currentUser,
        action: "notification.send",
        targetType: "notification",
        details: { count: targets.length, type: form.type, title: form.title },
      });
      addToast(toAll ? `Bildirishnoma ${targets.length} ta maktabga yuborildi ✓` : "Bildirishnoma yuborildi ✓");
      setForm({ recipientId: "", type: "info", title: "", body: "" });
      setToAll(false);
      loadSent();
    } catch (e) {
      addToast(e.message, "warning");
    } finally {
      setBusy(false);
    }
  }

  const schoolName = (id) => schools.find((s) => s.id === id)?.schoolName || "—";
  const typeLabel = (v) => NOTIF_TYPES.find((t) => t.value === v)?.label || v;

  return (
    <>
      <div className="da-card">
        <div className="da-card__title">✉️ Yangi bildirishnoma yuborish</div>
        <div className="da-formgrid">
          <div>
            <label className="da-label">Qabul qiluvchi</label>
            <select
              className="da-select"
              value={toAll ? "__all__" : form.recipientId}
              onChange={(e) => {
                if (e.target.value === "__all__") { setToAll(true); }
                else { setToAll(false); setForm({ ...form, recipientId: e.target.value }); }
              }}
            >
              <option value="">— Maktabni tanlang —</option>
              <option value="__all__">📢 Barcha maktablarga ({schools.length})</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.schoolName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="da-label">Turi</label>
            <select className="da-select" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {NOTIF_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 13 }}>
          <label className="da-label">Sarlavha</label>
          <input
            className="da-input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Masalan: Jadvalni 15-sentabrgacha yuboring"
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="da-label">Matn</label>
          <textarea
            className="da-textarea"
            rows={3}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Bildirishnoma matni..."
          />
        </div>
        <button type="button" className="da-btn da-btn--primary" onClick={handleSend} disabled={busy}>
          {busy ? "Yuborilmoqda..." : "📨 Yuborish"}
        </button>
      </div>

      <div className="da-card">
        <div className="da-card__title">📤 Yuborilganlar tarixi</div>
        {loadingSent ? (
          <div className="da-skel" style={{ height: 120 }} />
        ) : sent.length === 0 ? (
          <Empty icon="📭" title="Hali bildirishnoma yuborilmagan" text="Yuborgan bildirishnomalaringiz shu yerda ko'rinadi." />
        ) : (
          <div className="da-tablewrap">
            <table className="da-table">
              <thead>
                <tr><th>Maktab</th><th>Turi</th><th>Sarlavha</th><th>Yuborilgan</th><th>O'qildi</th></tr>
              </thead>
              <tbody>
                {sent.map((n) => (
                  <tr key={n.id}>
                    <td><b>{schoolName(n.recipient_id)}</b></td>
                    <td>{typeLabel(n.type)}</td>
                    <td style={{ maxWidth: 260 }}>
                      <b>{n.title}</b>
                      {n.body && <div style={{ fontSize: 12, color: "var(--da-text-2)" }}>{n.body}</div>}
                    </td>
                    <td>{fmtDate(n.created_at)}</td>
                    <td>
                      {n.read_at
                        ? <span className="da-badge" style={{ background: "#10b9811c", color: "#059669" }}>✓ O'qildi</span>
                        : <span className="da-badge" style={{ background: "#64748b1c", color: "#64748b" }}>Kutilmoqda</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// =====================================================================
//  AUDIT LOG
// =====================================================================
function AuditPage({ addToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setRows(await fetchAuditLog(200));
      } catch (e) {
        addToast(e.message, "warning");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = query.trim().toLowerCase();
  const shown = q
    ? rows.filter((r) =>
        [r.actor_email, r.action, r.target_type, r.target_id]
          .filter(Boolean)
          .some((f) => String(f).toLowerCase().includes(q)))
    : rows;

  if (loading) return <div className="da-skel" style={{ height: 300 }} />;

  return (
    <div className="da-card">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div className="da-search">
          <span className="da-search__icon">🔍</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Email, amal yoki obyekt bo'yicha qidirish..." />
        </div>
        <div style={{ fontSize: 13, color: "var(--da-text-2)", fontWeight: 700 }}>
          Jami: {shown.length} ta yozuv
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty icon="🧾" title="Log yozuvlari yo'q" text="Panelda amallar bajarilgani sari shu yerda tarix yig'iladi: kim, qachon, nima qildi." />
      ) : (
        <div className="da-tablewrap">
          <table className="da-table">
            <thead>
              <tr><th>Vaqt</th><th>Kim</th><th>Amal</th><th>Obyekt</th></tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.created_at)}</td>
                  <td>
                    <b>{r.actor_email || "—"}</b>
                    {r.actor_role && <div style={{ fontSize: 11.5, color: "var(--da-text-2)" }}>{r.actor_role}</div>}
                  </td>
                  <td><span className="da-badge" style={{ background: "rgba(37,99,235,.1)", color: "#2563eb" }}>{r.action}</span></td>
                  <td style={{ fontSize: 12.5, color: "var(--da-text-2)" }}>
                    {r.target_type || "—"}{r.target_id ? ` · ${String(r.target_id).slice(0, 8)}…` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =====================================================================
//  PROFIL
// =====================================================================
function ProfilePage({ currentUser, district, schools }) {
  return (
    <div className="da-card" style={{ maxWidth: 560 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 18 }}>
        <div className="da-sidebar__avatar" style={{ width: 60, height: 60, fontSize: 23 }}>
          {(currentUser.name || currentUser.email || "T").trim().charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{currentUser.name || "Tuman admini"}</div>
          <div style={{ fontSize: 13, color: "var(--da-text-2)" }}>{currentUser.email}</div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 11, fontSize: 13.5 }}>
        <div><b>Rol:</b> 🏛 Tuman admini (District Admin)</div>
        <div><b>Tuman:</b> {district ? `${district.name}${district.region ? ` · ${district.region}` : ""}` : "—"}</div>
        <div><b>Nazoratdagi maktablar:</b> {schools.length} ta</div>
        {currentUser.phone && <div><b>Telefon:</b> {currentUser.phone}</div>}
        {currentUser.uid && <div><b>ID:</b> {currentUser.uid}</div>}
      </div>
      <div style={{
        marginTop: 16, padding: "10px 13px", borderRadius: 11, fontSize: 12.5,
        background: "rgba(37,99,235,.07)", border: "1px solid rgba(37,99,235,.2)",
        color: "var(--da-text-2)", lineHeight: 1.6,
      }}>
        ℹ️ Parolni o'zgartirish kerak bo'lsa Super Admin bilan bog'laning.
      </div>
    </div>
  );
}
