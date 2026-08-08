import { useEffect, useMemo, useState } from "react";
import { DAYS } from "../utils/constants";

function countLessons(schedule = {}) {
  let total = 0;
  Object.values(schedule).forEach((dayMap) => {
    Object.values(dayMap || {}).forEach((lessons) => {
      total += Array.isArray(lessons) ? lessons.length : 0;
    });
  });
  return total;
}

// Deterministik "sparkline" nuqtalari — har karta uchun bir xil, o'sib boruvchi chiziq
function sparkPoints(seedStr, w = 150, h = 40) {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return (seed >>> 8) / 16777216;
  };
  const n = 9;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * w;
    const base = h - 6 - (i / (n - 1)) * (h - 14); // yuqoriga trend
    const jitter = (rnd() - 0.5) * 10;
    const y = Math.min(h - 3, Math.max(3, base + jitter));
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(" ");
}

const UZ_MONTHS = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

export default function DashboardPage({
  classes = [],
  subjects = [],
  teachers = [],
  rooms = [],
  timeslots = [],
  schedule = {},
  classSubjects = {},
  setActivePage,
}) {
  const go = (page) => { if (setActivePage) setActivePage(page); };
  const totalLessons = countLessons(schedule);
  const maxLessons = Math.max(classes.length * timeslots.length * DAYS.length, 1);
  const percent = Math.round((totalLessons / maxLessons) * 100);

  const recentClasses = [...classes].slice(-5).reverse();
  const recentSubjects = [...subjects].slice(-5).reverse();
  const recentTeachers = [...teachers].slice(-5).reverse();

  // ——— Oylik o'sish (+N oy davomida): joriy oy boshidagi holat localStorage'da saqlanadi ———
  const [deltas, setDeltas] = useState({});
  useEffect(() => {
    const monthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
    const current = {
      classes: classes.length,
      subjects: subjects.length,
      teachers: teachers.length,
      rooms: rooms.length,
      timeslots: timeslots.length,
      lessons: totalLessons,
    };
    try {
      const raw = localStorage.getItem("dash_month_snapshot");
      const snap = raw ? JSON.parse(raw) : null;
      if (!snap || snap.month !== monthKey || !snap.values) {
        localStorage.setItem("dash_month_snapshot", JSON.stringify({ month: monthKey, values: current }));
        setDeltas({});
      } else {
        const d = {};
        Object.keys(current).forEach((k) => {
          const prev = typeof snap.values[k] === "number" ? snap.values[k] : current[k];
          d[k] = current[k] - prev;
        });
        setDeltas(d);
      }
    } catch {
      setDeltas({});
    }
  }, [classes.length, subjects.length, teachers.length, rooms.length, timeslots.length, totalLessons]);

  const fmtDelta = (v) => (v > 0 ? `+${v}` : `${v || 0}`);

  const stats = [
    { key: "classes", label: "Sinflar", value: classes.length, color: "#6366f1", bg: "#eef2ff", page: "classes", icon: "🏫" },
    { key: "subjects", label: "Fanlar", value: subjects.length, color: "#16a34a", bg: "#ecfdf5", page: "subjects", icon: "📗" },
    { key: "teachers", label: "O‘qituvchilar", value: teachers.length, color: "#f59e0b", bg: "#fff7ed", page: "teachers", icon: "👤" },
    { key: "rooms", label: "Xonalar", value: rooms.length, color: "#0ea5e9", bg: "#f0f9ff", page: "rooms", icon: "📱" },
    { key: "timeslots", label: "Dars vaqtlari", value: timeslots.length, color: "#ec4899", bg: "#fdf2f8", page: "timeslots", icon: "⏰" },
    { key: "lessons", label: "Jadval darslar", value: totalLessons, color: "#7c3aed", bg: "#f5f3ff", page: "schedule", icon: "🗓️" },
  ];

  const quickActions = [
    { icon: "⚡", title: "Avtomatik jadval", page: "schedule" },
    { icon: "🗓️", title: "Jadvalni ko‘rish", page: "schedule" },
    { icon: "📊", title: "Excel export", page: "importExport" },
    { icon: "🏫", title: "Sinflar", page: "classes" },
    { icon: "📚", title: "Fanlar", page: "subjects" },
    { icon: "👤", title: "O‘qituvchilar", page: "teachers" },
  ];

  // Haftalik yuklama — kunlik dars soni
  const dayCounts = DAYS.map((day) =>
    Object.values(schedule?.[day] || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
  );
  const rawMax = Math.max(1, ...dayCounts);
  const niceMax = Math.max(4, Math.ceil(rawMax / 4) * 4); // 4 ga karrali "chiroyli" maksimum
  const ticks = [1, 0.75, 0.5, 0.25, 0]; // yuqoridan pastga

  // ——— Onboarding checklist ———
  const onboardSteps = [
    { key: "classes", label: "Sinflarni kiriting", page: "classes", done: classes.length > 0 },
    { key: "subjects", label: "Fanlarni qo'shing", page: "subjects", done: subjects.length > 0 },
    { key: "teachers", label: "O'qituvchilarni kiriting", page: "teachers", done: teachers.length > 0 },
    { key: "timeslots", label: "Dars vaqtlarini sozlang", page: "timeslots", done: timeslots.length > 0 },
    { key: "classSubjects", label: "Sinf-fan soatlarini bog'lang", page: "classSubjects", done: Object.keys(classSubjects || {}).length > 0 },
    { key: "schedule", label: "Jadvalni tuzing", page: "schedule", done: totalLessons > 0 },
  ];
  const doneCount = onboardSteps.filter((s) => s.done).length;
  const onboardingDone = doneCount === onboardSteps.length;
  const pendingSteps = onboardSteps.filter((s) => !s.done);

  // ——— Qidiruv (sinf / fan / o'qituvchi bo'yicha) ———
  const [q, setQ] = useState("");
  const searchResults = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    const out = [];
    classes.forEach((c) => {
      if ((c.name || "").toLowerCase().includes(term)) out.push({ id: `c-${c.id}`, icon: "🏫", name: c.name, meta: "Sinf", page: "classes" });
    });
    subjects.forEach((s) => {
      if ((s.name || "").toLowerCase().includes(term)) out.push({ id: `s-${s.id}`, icon: "📚", name: s.name, meta: "Fan", page: "subjects" });
    });
    teachers.forEach((t) => {
      if ((t.name || "").toLowerCase().includes(term)) out.push({ id: `t-${t.id}`, icon: "👤", name: t.name, meta: "O‘qituvchi", page: "teachers" });
    });
    return out.slice(0, 8);
  }, [q, classes, subjects, teachers]);

  // ——— Bildirishnomalar (bajarilmagan bosqichlar) ———
  const [notifOpen, setNotifOpen] = useState(false);

  // ——— Sana chipi ———
  const now = new Date();
  const dateLabel = `${now.getDate()}-${UZ_MONTHS[now.getMonth()]}, ${now.getFullYear()}`;

  // ——— Tungi rejim tugmasi (headerda) ———
  const toggleDark = () => {
    document.body.classList.toggle("dark-mode");
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <style>{`
        /* ===================== HEADER ===================== */
        .dash-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 26px;
          flex-wrap: wrap;
        }
        .dash-title {
          font-size: 30px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: -0.5px;
        }
        .dash-sub { color: #64748b; margin-top: 5px; font-size: 13.5px; }

        .dash-hero-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .dash-search-wrap { position: relative; }
        .dash-search {
          width: 300px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border: 1px solid #e2e8f0;
          box-shadow: 0 8px 25px rgba(15, 23, 42, .06);
          border-radius: 16px;
          padding: 12px 16px;
        }
        .dash-search input {
          border: none; outline: none; background: transparent;
          font-family: inherit; font-size: 14px; color: #0f172a; width: 100%;
        }
        .dash-search input::placeholder { color: #94a3b8; }
        .dash-search-drop {
          position: absolute; top: calc(100% + 8px); left: 0; right: 0;
          background: #fff; border: 1px solid #e2e8f0; border-radius: 16px;
          box-shadow: 0 20px 50px rgba(15,23,42,.15);
          padding: 8px; z-index: 60; max-height: 320px; overflow-y: auto;
        }
        .dash-search-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; border: none; background: none; cursor: pointer;
          padding: 10px 12px; border-radius: 12px; font-family: inherit;
          font-size: 14px; color: #0f172a; text-align: left;
        }
        .dash-search-item:hover { background: #eef2ff; }
        .dash-search-item small { margin-left: auto; color: #94a3b8; font-weight: 600; }
        .dash-search-empty { padding: 12px 14px; color: #94a3b8; font-size: 13.5px; }

        .dash-icon-btn {
          position: relative;
          width: 48px; height: 48px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          background: #fff;
          box-shadow: 0 8px 25px rgba(15,23,42,.06);
          font-size: 19px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: .2s;
        }
        .dash-icon-btn:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(15,23,42,.10); }
        .dash-badge {
          position: absolute; top: -6px; right: -6px;
          min-width: 20px; height: 20px; padding: 0 5px;
          border-radius: 999px; background: #ef4444; color: #fff;
          font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          border: 2px solid #fff;
        }
        .dash-notif-wrap { position: relative; }
        .dash-notif-drop {
          position: absolute; top: calc(100% + 10px); right: 0;
          width: 290px; background: #fff; border: 1px solid #e2e8f0;
          border-radius: 16px; box-shadow: 0 20px 50px rgba(15,23,42,.15);
          padding: 10px; z-index: 60;
        }
        .dash-notif-title { font-size: 13px; font-weight: 800; color: #334155; padding: 6px 10px 8px; }
        .dash-notif-item {
          display: flex; align-items: center; gap: 10px;
          width: 100%; border: none; background: none; cursor: pointer;
          padding: 10px 12px; border-radius: 12px; font-family: inherit;
          font-size: 13.5px; font-weight: 600; color: #0f172a; text-align: left;
        }
        .dash-notif-item:hover { background: #eef2ff; }
        .dash-notif-ok { padding: 12px 14px; color: #16a34a; font-size: 13.5px; font-weight: 700; }

        .dash-date-chip {
          display: flex; align-items: center; gap: 9px;
          background: #fff; border: 1px solid #e2e8f0;
          box-shadow: 0 8px 25px rgba(15,23,42,.06);
          border-radius: 16px; padding: 12px 18px;
          font-size: 14px; color: #64748b; white-space: nowrap;
        }
        .dash-date-chip b { color: #0f172a; font-weight: 800; }

        /* ===================== STAT KARTALAR ===================== */
        .modern-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(185px, 1fr));
          gap: 18px;
          margin-bottom: 24px;
        }
        .modern-stat {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 22px;
          padding: 18px 18px 14px;
          box-shadow: 0 12px 35px rgba(15, 23, 42, .07);
          transition: .25s;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .modern-stat:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 45px rgba(15, 23, 42, .12);
        }
        .modern-stat-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .modern-stat-icon {
          width: 48px; height: 48px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 23px; flex-shrink: 0;
        }
        .modern-stat-label {
          font-weight: 700;
          color: #64748b;
          font-size: 13.5px;
          line-height: 1.25;
          min-width: 0;
          overflow-wrap: anywhere;
        }
        .modern-stat-value {
          font-size: clamp(24px, 2vw, 30px);
          font-weight: 900;
          color: #0f172a;
          line-height: 1.1;
          margin-top: 2px;
        }
        .modern-stat-plus {
          margin-top: 10px;
          font-size: 12.5px;
          font-weight: 800;
          display: flex; align-items: baseline; gap: 6px;
        }
        .modern-stat-plus small { color: #94a3b8; font-weight: 600; font-size: 11.5px; }
        .modern-stat-spark { margin-top: 6px; margin-left: -18px; margin-right: -18px; margin-bottom: -14px; }
        .modern-stat-spark svg { display: block; width: 100%; height: 44px; }

        /* ===================== O'RTA QATOR ===================== */
        .modern-grid {
          display: grid;
          grid-template-columns: 1.05fr 2.1fr;
          gap: 20px;
          margin-bottom: 22px;
        }
        .modern-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 14px 40px rgba(15, 23, 42, .07);
          position: relative;
          overflow: hidden;
        }
        .modern-card-title {
          font-size: 16.5px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 18px;
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
        }

        /* — To'ldirilish kartasi — */
        .fill-flex { display: flex; align-items: flex-start; gap: 14px; }
        .fill-left { flex: 1; min-width: 0; }
        .progress-line {
          height: 10px;
          background: #eef2ff;
          border-radius: 999px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          width: ${percent}%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          border-radius: 999px;
          animation: grow 1s ease;
        }
        @keyframes grow { from { width: 0; } to { width: ${percent}%; } }
        .percent-big {
          font-size: 40px;
          font-weight: 900;
          color: #6366f1;
          margin-top: 18px;
          letter-spacing: -1px;
        }
        .fill-note { color: #64748b; font-size: 13.5px; margin-top: 6px; line-height: 1.5; }
        .fill-illustration {
          flex-shrink: 0;
          width: 118px; height: 118px;
          border-radius: 28px;
          background: radial-gradient(circle at 30% 25%, #ede9fe, #ddd6fe 70%);
          display: flex; align-items: center; justify-content: center;
          font-size: 58px;
          box-shadow: inset 0 2px 8px rgba(124,58,237,.12), 0 10px 24px rgba(124,58,237,.14);
          align-self: center;
        }

        /* — Haftalik yuklama grafigi — */
        .wk-chart {
          display: grid;
          grid-template-columns: 44px 1fr;
          gap: 0 10px;
        }
        .wk-axis {
          position: relative;
          height: 230px;
        }
        .wk-tick {
          position: absolute; right: 0; transform: translateY(-50%);
          font-size: 11.5px; color: #94a3b8; font-weight: 600;
        }
        .wk-plot {
          position: relative;
          height: 230px;
        }
        .wk-gridline {
          position: absolute; left: 0; right: 0; height: 1px;
          background: #eef2f7;
        }
        .wk-bars {
          position: absolute; inset: 0;
          display: flex; align-items: flex-end; gap: 26px;
          padding: 0 8px;
        }
        .wk-cell {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
          height: 100%;
          position: relative;
        }
        .wk-count {
          font-weight: 800; color: #4f46e5; font-size: 14.5px;
          margin-bottom: 4px;
        }
        .wk-count-line {
          width: 1px; height: 12px;
          border-left: 2px dotted #c7d2fe;
          margin-bottom: 2px;
        }
        .wk-bar {
          position: relative;
          width: 100%;
          max-width: 76px;
          border-radius: 14px;
          background: linear-gradient(180deg, #818cf8 0%, #6d5df6 55%, #7c3aed 100%);
          box-shadow: 0 10px 22px rgba(99,102,241,.30);
          display: flex; align-items: center; justify-content: center;
          transition: height .7s ease;
          min-height: 34px;
          overflow: visible;
        }
        .wk-bolt {
          position: relative;
          z-index: 2;
          font-size: 26px;
          filter: drop-shadow(0 2px 5px rgba(0,0,0,.25));
          animation: boltPulse 1.6s ease-in-out infinite;
        }
        @keyframes boltPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .wk-spark {
          position: absolute;
          z-index: 3;
          font-size: 15px;
          pointer-events: none;
          animation: sparkFlash 1.1s ease-in-out infinite;
        }
        @keyframes sparkFlash {
          0%, 100% { opacity: .15; transform: scale(.7) rotate(-8deg); }
          50% { opacity: 1; transform: scale(1.25) rotate(8deg); }
        }
        .wk-days {
          grid-column: 2;
          display: flex; gap: 26px; padding: 8px 8px 0;
        }
        .wk-day {
          flex: 1; text-align: center;
          color: #64748b; font-size: 13px; font-weight: 600;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }

        /* ===================== PASTKI QATOR ===================== */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .mini-list { display: flex; flex-direction: column; }
        .mini-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
        }
        .mini-row:last-child { border-bottom: none; }
        .mini-name {
          font-weight: 800; color: #0f172a;
          min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .mini-meta { color: #64748b; font-size: 12.5px; flex-shrink: 0; }
        .mini-meta.faol { color: #16a34a; font-weight: 800; }
        .mini-dot {
          display: inline-block; width: 7px; height: 7px; border-radius: 50%;
          background: #6366f1; margin-right: 8px; flex-shrink: 0;
        }
        .mini-more {
          margin-top: 12px;
          width: 100%;
          border: none;
          background: #eef2ff;
          color: #4f46e5;
          font-family: inherit;
          font-weight: 800;
          font-size: 13.5px;
          padding: 11px 12px;
          border-radius: 12px;
          cursor: pointer;
          transition: .2s;
        }
        .mini-more:hover { background: #ddd6fe; }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .quick-item {
          min-height: 88px;
          border-radius: 18px;
          background: linear-gradient(135deg, #f8fafc, #eef2ff);
          border: 1px solid #eef1f8;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 7px;
          font-weight: 800;
          font-size: 12.5px;
          color: #4f46e5;
          text-align: center;
          padding: 8px 6px;
          transition: .2s;
          cursor: pointer;
          line-height: 1.25;
        }
        .quick-item:hover {
          transform: scale(1.04);
          background: linear-gradient(135deg, #eef2ff, #ddd6fe);
        }
        .quick-icon { font-size: 26px; }

        /* ===================== BANNER ===================== */
        .bottom-banner {
          margin-top: 24px;
          background: linear-gradient(135deg, #4f46e5, #8b5cf6);
          color: white;
          border-radius: 24px;
          padding: 26px 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          box-shadow: 0 18px 45px rgba(79, 70, 229, .35);
        }
        .banner-title { font-size: 22px; font-weight: 900; }
        .banner-btn {
          background: white;
          color: #4f46e5;
          border: none;
          padding: 14px 22px;
          border-radius: 14px;
          font-weight: 800;
          font-family: inherit;
          cursor: pointer;
          transition: .2s;
        }
        .banner-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(255,255,255,.25); }

        /* ===================== ONBOARDING ===================== */
        .dash-onboard {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #fff;
          border-radius: 20px;
          padding: 20px 24px;
          margin-bottom: 22px;
          box-shadow: 0 14px 36px rgba(99, 102, 241, 0.30);
        }
        .dash-onboard-head {
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; margin-bottom: 16px;
        }
        .dash-onboard-title { font-size: 17px; font-weight: 800; }
        .dash-onboard-sub { font-size: 13px; opacity: .88; margin-top: 3px; }
        .dash-onboard-pct { font-size: 26px; font-weight: 900; }
        .dash-onboard-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .dash-onboard-step {
          display: flex; align-items: center; gap: 10px;
          border: 1.5px solid rgba(255,255,255,.35);
          background: rgba(255,255,255,.12);
          color: #fff;
          border-radius: 13px;
          padding: 11px 14px;
          font-family: inherit;
          font-size: 13.5px; font-weight: 700;
          cursor: pointer; text-align: left;
          transition: background .15s, transform .15s;
        }
        .dash-onboard-step:hover { background: rgba(255,255,255,.22); transform: translateY(-1px); }
        .dash-onboard-step.done { background: rgba(255,255,255,.92); color: #16a34a; border-color: transparent; }
        .dash-onboard-check {
          width: 24px; height: 24px; border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,.25); font-size: 12.5px; font-weight: 800; flex-shrink: 0;
        }
        .dash-onboard-step.done .dash-onboard-check { background: #dcfce7; color: #16a34a; }
        .dash-onboard-label { line-height: 1.3; }

        /* ===================== RESPONSIVE ===================== */
        @media (max-width: 1350px) {
          .info-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 1100px) {
          .modern-grid { grid-template-columns: 1fr; }
          .wk-bars, .wk-days { gap: 12px; }
        }
        @media (max-width: 900px) {
          .dash-onboard-steps { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 800px) {
          .info-grid { grid-template-columns: 1fr; }
          .dash-search { width: 100%; }
          .dash-search-wrap { flex: 1; min-width: 200px; }
          .fill-illustration { display: none; }
          .wk-bars, .wk-days { gap: 8px; }
          .wk-bolt { font-size: 18px; }
        }
        @media (max-width: 560px) {
          .dash-onboard-steps { grid-template-columns: 1fr; }
          .dash-date-chip { display: none; }
        }

        /* ===================== TUNGI REJIM ===================== */
        body.dark-mode .dash-title { color: #e8edf5; }
        body.dark-mode .dash-search,
        body.dark-mode .dash-icon-btn,
        body.dark-mode .dash-date-chip {
          background: #1a2030; border-color: #2a3350; color: #8a94a8;
        }
        body.dark-mode .dash-search input { color: #e8edf5; }
        body.dark-mode .dash-date-chip b { color: #e8edf5; }
        body.dark-mode .dash-search-drop,
        body.dark-mode .dash-notif-drop { background: #131722; border-color: #232a3d; }
        body.dark-mode .dash-search-item,
        body.dark-mode .dash-notif-item { color: #e8edf5; }
        body.dark-mode .dash-search-item:hover,
        body.dark-mode .dash-notif-item:hover { background: #1a2030; }
        body.dark-mode .quick-item {
          background: linear-gradient(135deg, #1a2030, #232a4a);
          border-color: #2a3350;
          color: #a5b4fc;
        }
        body.dark-mode .quick-item:hover { background: linear-gradient(135deg, #232a4a, #2d3560); }
        body.dark-mode .mini-row { border-bottom-color: #232a3d; }
        body.dark-mode .mini-more { background: #1a2030; color: #a5b4fc; }
        body.dark-mode .progress-line { background: #1a2030; }
        body.dark-mode .wk-gridline { background: #1e2538; }
        body.dark-mode .fill-illustration {
          background: radial-gradient(circle at 30% 25%, #232a4a, #1a2030 70%);
        }
      `}</style>

      {/* ===================== HEADER ===================== */}
      <div className="dash-hero">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <div className="dash-sub">Smartjadval.uz — Avtomatik dars jadvali platformasi</div>
        </div>

        <div className="dash-hero-right">
          <div className="dash-search-wrap">
            <div className="dash-search">
              <span>🔍</span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Qidirish..."
              />
            </div>
            {q.trim() && (
              <div className="dash-search-drop">
                {searchResults.length === 0 ? (
                  <div className="dash-search-empty">Hech narsa topilmadi</div>
                ) : (
                  searchResults.map((r) => (
                    <button
                      type="button"
                      key={r.id}
                      className="dash-search-item"
                      onClick={() => { setQ(""); go(r.page); }}
                    >
                      <span>{r.icon}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                      <small>{r.meta}</small>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="dash-notif-wrap">
            <button
              type="button"
              className="dash-icon-btn"
              title="Bildirishnomalar"
              onClick={() => setNotifOpen((v) => !v)}
            >
              🔔
              {pendingSteps.length > 0 && <span className="dash-badge">{pendingSteps.length}</span>}
            </button>
            {notifOpen && (
              <div className="dash-notif-drop">
                <div className="dash-notif-title">Bildirishnomalar</div>
                {pendingSteps.length === 0 ? (
                  <div className="dash-notif-ok">✓ Barcha bosqichlar bajarilgan!</div>
                ) : (
                  pendingSteps.map((s) => (
                    <button
                      type="button"
                      key={s.key}
                      className="dash-notif-item"
                      onClick={() => { setNotifOpen(false); go(s.page); }}
                    >
                      <span>⚠️</span>
                      <span>{s.label}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <button type="button" className="dash-icon-btn" title="Tungi rejim" onClick={toggleDark}>
            🌙
          </button>

          <div className="dash-date-chip">
            <span>📅</span>
            <span>Bugun: <b>{dateLabel}</b></span>
          </div>
        </div>
      </div>

      {/* ===================== ONBOARDING ===================== */}
      {!onboardingDone && (
        <div className="dash-onboard">
          <div className="dash-onboard-head">
            <div>
              <div className="dash-onboard-title">🚀 Boshlash bosqichlari</div>
              <div className="dash-onboard-sub">
                Jadval tuzish uchun quyidagi qadamlarni bajaring — {doneCount}/{onboardSteps.length} bajarildi
              </div>
            </div>
            <div className="dash-onboard-pct">{Math.round((doneCount / onboardSteps.length) * 100)}%</div>
          </div>
          <div className="dash-onboard-steps">
            {onboardSteps.map((st, i) => (
              <button
                type="button"
                key={st.key}
                className={`dash-onboard-step ${st.done ? "done" : ""}`}
                onClick={() => go(st.page)}
                title={st.label}
              >
                <span className="dash-onboard-check">{st.done ? "✓" : i + 1}</span>
                <span className="dash-onboard-label">{st.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===================== STAT KARTALAR ===================== */}
      <div className="modern-stats">
        {stats.map((s) => (
          <div
            className="modern-stat"
            key={s.key}
            onClick={() => go(s.page)}
            style={{ cursor: "pointer" }}
            title={`${s.label} bo'limi`}
          >
            <div className="modern-stat-head">
              <div className="modern-stat-icon" style={{ background: s.bg }}>{s.icon}</div>
              <div style={{ minWidth: 0 }}>
                <div className="modern-stat-label">{s.label}</div>
                <div className="modern-stat-value">{s.value.toLocaleString("ru-RU")}</div>
              </div>
            </div>
            <div className="modern-stat-plus" style={{ color: (deltas[s.key] || 0) > 0 ? s.color : "#94a3b8" }}>
              {fmtDelta(deltas[s.key])}
              <small>oy davomida</small>
            </div>
            <div className="modern-stat-spark">
              <svg viewBox="0 0 150 44" preserveAspectRatio="none">
                <defs>
                  <linearGradient id={`sg-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={s.color} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon
                  points={`0,44 ${sparkPoints(s.key + s.value, 150, 40)} 150,44`}
                  fill={`url(#sg-${s.key})`}
                />
                <polyline
                  points={sparkPoints(s.key + s.value, 150, 40)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* ===================== O'RTA QATOR ===================== */}
      <div className="modern-grid">
        <div className="modern-card">
          <div className="modern-card-title">Jadval to‘ldirilishi</div>
          <div className="fill-flex">
            <div className="fill-left">
              <div className="progress-line">
                <div className="progress-fill" />
              </div>
              <div className="percent-big">{percent}%</div>
              <p className="fill-note">
                {totalLessons.toLocaleString("ru-RU")} ta dars joylashtirilgan,<br />
                taxminiy maksimum: {maxLessons.toLocaleString("ru-RU")}
              </p>
            </div>
            <div className="fill-illustration">📋</div>
          </div>
        </div>

        <div className="modern-card">
          <div className="modern-card-title">Haftalik dars yuklamasi</div>
          <div className="wk-chart">
            <div className="wk-axis">
              {ticks.map((t) => (
                <div key={t} className="wk-tick" style={{ top: `${(1 - t) * 100}%` }}>
                  {Math.round(niceMax * t)}
                </div>
              ))}
            </div>
            <div className="wk-plot">
              {ticks.map((t) => (
                <div key={t} className="wk-gridline" style={{ top: `${(1 - t) * 100}%` }} />
              ))}
              <div className="wk-bars">
                {DAYS.map((day, i) => {
                  const count = dayCounts[i];
                  const pct = Math.max(14, Math.round((count / niceMax) * 82)); // yuqorida raqamga joy qoldiramiz
                  const nSparks = Math.min(7, Math.ceil(count / 8)); // ko'p yuklama = ko'p chaqmoq
                  const sparkPos = [
                    { top: -10, left: -6 }, { top: -14, right: -4 }, { top: "28%", right: -12 },
                    { bottom: "18%", left: -12 }, { top: "55%", left: -10 }, { bottom: 4, right: -10 },
                    { top: -12, left: "45%" },
                  ];
                  return (
                    <div className="wk-cell" key={day} title={`${day}: ${count} soat`}>
                      <div className="wk-count">{count}</div>
                      <div className="wk-count-line" />
                      <div className="wk-bar" style={{ height: `${pct}%` }}>
                        <span className="wk-bolt">⚡</span>
                        {Array.from({ length: nSparks }).map((_, s) => (
                          <span
                            key={s}
                            className="wk-spark"
                            style={{ ...sparkPos[s % sparkPos.length], animationDelay: `${s * 0.15}s` }}
                          >⚡</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="wk-days">
              {DAYS.map((day) => (
                <div className="wk-day" key={day}>{day}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===================== PASTKI QATOR ===================== */}
      <div className="info-grid">
        <div className="modern-card">
          <div className="modern-card-title">🏫 Oxirgi sinflar</div>
          <div className="mini-list">
            {recentClasses.length === 0 ? (
              <div className="mini-meta">Hozircha sinflar yo‘q</div>
            ) : (
              recentClasses.map((c) => (
                <div className="mini-row" key={c.id}>
                  <span className="mini-name">{c.name}</span>
                  <span className="mini-meta">{c.students || 25} o‘quvchi</span>
                </div>
              ))
            )}
          </div>
          <button type="button" className="mini-more" onClick={() => go("classes")}>
            Barchasini ko‘rish →
          </button>
        </div>

        <div className="modern-card">
          <div className="modern-card-title">📗 Oxirgi fanlar</div>
          <div className="mini-list">
            {recentSubjects.length === 0 ? (
              <div className="mini-meta">Hozircha fanlar yo‘q</div>
            ) : (
              recentSubjects.map((s) => (
                <div className="mini-row" key={s.id}>
                  <span className="mini-name"><span className="mini-dot" />{s.name}</span>
                  <span className="mini-meta">{s.weeklyHours || 1} soat</span>
                </div>
              ))
            )}
          </div>
          <button type="button" className="mini-more" onClick={() => go("subjects")}>
            Barchasini ko‘rish →
          </button>
        </div>

        <div className="modern-card">
          <div className="modern-card-title">👤 Oxirgi o‘qituvchilar</div>
          <div className="mini-list">
            {recentTeachers.length === 0 ? (
              <div className="mini-meta">Hozircha o‘qituvchilar yo‘q</div>
            ) : (
              recentTeachers.map((t) => (
                <div className="mini-row" key={t.id}>
                  <span className="mini-name">{t.name}</span>
                  <span className="mini-meta faol">Faol</span>
                </div>
              ))
            )}
          </div>
          <button type="button" className="mini-more" onClick={() => go("teachers")}>
            Barchasini ko‘rish →
          </button>
        </div>

        <div className="modern-card">
          <div className="modern-card-title">⚡ Tezkor amallar</div>
          <div className="quick-grid">
            {quickActions.map((a) => (
              <div
                className="quick-item"
                key={a.title}
                onClick={() => go(a.page)}
                title={a.title}
              >
                <div className="quick-icon">{a.icon}</div>
                <div>{a.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===================== BANNER ===================== */}
      <div className="bottom-banner">
        <div>
          <div className="banner-title">Zo‘r ish! 👏</div>
          <div>Jadvalingiz tobora mukammallashib bormoqda. Davom eting! 🚀</div>
        </div>
        <button type="button" className="banner-btn" onClick={() => go("analytics")}>
          Ko‘proq statistika ko‘rish →
        </button>
      </div>
    </div>
  );
}
