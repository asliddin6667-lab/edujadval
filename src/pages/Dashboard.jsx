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

const MARQUEE_TEXT = [
  "🎓 Edujadval.uz — maktablar uchun avtomatik dars jadvali platformasi",
  "⚡ Bir necha soniyada 100% to'liq jadval tuzadi",
  "🧑‍🏫 O'qituvchi yuklamasi, dam kunlari va band vaqtlari hisobga olinadi",
  "🔁 Parallel darslar: bir ustoz bir vaqtda bir nechta sinfga",
  "🧩 Daraja guruhlari, guruhlarga bo'lish va almashinuv darslari",
  "🍽️ Obed va tanaffus vaqtlariga dars qo'yilmaydi",
  "✏️ Qo'lda dars qo'shish va qulflash — qayta tuzganda buzilmaydi",
  "📊 Excelga chiroyli, rangli jadval yuklab olish",
  "📈 Sinf va o'qituvchilar bo'yicha to'liq tahlil",
].join("     •     ") + "     •     ";

export default function DashboardPage({
  classes = [],
  subjects = [],
  teachers = [],
  rooms = [],
  timeslots = [],
  schedule = {},
  setActivePage,
}) {
  const go = (page) => { if (setActivePage) setActivePage(page); };
  const totalLessons = countLessons(schedule);
  const maxLessons = Math.max(classes.length * timeslots.length * DAYS.length, 1);
  const percent = Math.round((totalLessons / maxLessons) * 100);

  const recentClasses = [...classes].slice(-3).reverse();
  const recentSubjects = [...subjects].slice(-3).reverse();
  const recentTeachers = [...teachers].slice(-3).reverse();

  const stats = [
    { label: "Sinflar", value: classes.length, icon: "🏫", color: "#6366f1", bg: "#eef2ff", page: "classes" },
    { label: "Fanlar", value: subjects.length, icon: "📚", color: "#16a34a", bg: "#ecfdf5", page: "subjects" },
    { label: "O‘qituvchilar", value: teachers.length, icon: "🧑‍🏫", color: "#f97316", bg: "#fff7ed", page: "teachers" },
    { label: "Xonalar", value: rooms.length, icon: "🚪", color: "#0ea5e9", bg: "#f0f9ff", page: "rooms" },
    { label: "Dars vaqtlari", value: timeslots.length, icon: "⏰", color: "#ec4899", bg: "#fdf2f8", page: "timeslots" },
    { label: "Jadval darslar", value: totalLessons, icon: "🗓️", color: "#7c3aed", bg: "#f5f3ff", page: "schedule" },
  ];

  const quickActions = [
    { icon: "⚡", title: "Avtomatik jadval", page: "schedule" },
    { icon: "🗓️", title: "Jadvalni ko‘rish", page: "schedule" },
    { icon: "📊", title: "Excel export", page: "importExport" },
    { icon: "🏫", title: "Sinflar", page: "classes" },
    { icon: "📚", title: "Fanlar", page: "subjects" },
    { icon: "🧑‍🏫", title: "O‘qituvchilar", page: "teachers" },
  ];

  // Haftalik yuklamа — kunlik dars soni
  const dayCounts = DAYS.map((day) =>
    Object.values(schedule?.[day] || {}).reduce((sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0), 0)
  );
  const maxDay = Math.max(1, ...dayCounts);

  return (
    <div style={{ paddingBottom: 40 }}>
      <style>{`
        .dash-hero {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 26px;
        }

        .dash-title {
          font-size: 30px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }

        .dash-sub {
          color: #64748b;
          margin-top: 6px;
          font-size: 14px;
        }

        .dash-search {
          width: 340px;
          background: white;
          border: 1px solid #e2e8f0;
          box-shadow: 0 8px 25px rgba(15, 23, 42, .06);
          border-radius: 16px;
          padding: 14px 18px;
          color: #64748b;
        }

        .modern-stats {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 18px;
          margin-bottom: 24px;
        }

        .modern-stat {
          position: relative;
          overflow: hidden;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 22px;
          padding: 22px;
          min-height: 150px;
          box-shadow: 0 12px 35px rgba(15, 23, 42, .07);
          transition: .25s;
        }

        .modern-stat:hover {
          transform: translateY(-4px);
          box-shadow: 0 18px 45px rgba(15, 23, 42, .12);
        }

        .modern-stat-icon {
          position: absolute;
          right: 18px;
          top: 22px;
          width: 58px;
          height: 58px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 30px;
        }

        .modern-stat-label {
          font-weight: 700;
          color: #334155;
          margin-bottom: 20px;
        }

        .modern-stat-value {
          font-size: 34px;
          font-weight: 900;
          color: #0f172a;
          line-height: 1;
        }

        .modern-stat-plus {
          margin-top: 20px;
          font-size: 13px;
          font-weight: 700;
        }

        .modern-grid {
          display: grid;
          grid-template-columns: 1.1fr 2.1fr;
          gap: 20px;
          margin-bottom: 22px;
        }

        .modern-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          padding: 26px;
          box-shadow: 0 14px 40px rgba(15, 23, 42, .07);
          overflow: hidden;
          position: relative;
        }

        .modern-card-title {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 20px;
        }

        .progress-line {
          height: 12px;
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

        @keyframes grow {
          from { width: 0; }
          to { width: ${percent}%; }
        }

        .percent-big {
          font-size: 34px;
          font-weight: 900;
          color: #6366f1;
          margin-top: 20px;
        }

        .chart {
          height: 185px;
          display: flex;
          align-items: end;
          gap: 28px;
          padding-top: 10px;
        }

        .bar {
          flex: 1;
          border-radius: 14px 14px 0 0;
          background: linear-gradient(180deg, #6366f1, #c4b5fd);
          min-height: 40px;
          opacity: .9;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }

        .mini-list {
          display: flex;
          flex-direction: column;
          gap: 13px;
        }

        .mini-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 10px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 14px;
        }

        .mini-name {
          font-weight: 800;
          color: #0f172a;
        }

        .mini-meta {
          color: #64748b;
          font-size: 13px;
        }

        .quick-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }

        .quick-item {
          min-height: 92px;
          border-radius: 20px;
          background: linear-gradient(135deg, #f8fafc, #eef2ff);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 800;
          color: #4f46e5;
          transition: .2s;
        }

        .quick-item:hover {
          transform: scale(1.04);
          background: linear-gradient(135deg, #eef2ff, #ddd6fe);
        }

        .quick-icon {
          font-size: 28px;
        }

        .bottom-banner {
          margin-top: 24px;
          background: linear-gradient(135deg, #4f46e5, #8b5cf6);
          color: white;
          border-radius: 24px;
          padding: 26px 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 18px 45px rgba(79, 70, 229, .35);
        }

        .banner-title {
          font-size: 22px;
          font-weight: 900;
        }

        .banner-btn {
          background: white;
          color: #4f46e5;
          border: none;
          padding: 14px 22px;
          border-radius: 14px;
          font-weight: 800;
        }

        @media (max-width: 1200px) {
          .modern-stats { grid-template-columns: repeat(3, 1fr); }
          .info-grid { grid-template-columns: repeat(2, 1fr); }
        }

        @media (max-width: 800px) {
          .modern-stats, .modern-grid, .info-grid { grid-template-columns: 1fr; }
          .dash-search { display: none; }
        }

        .dash-marquee {
          overflow: hidden;
          white-space: nowrap;
          background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);
          color: #fff;
          border-radius: 14px;
          padding: 11px 0;
          margin-bottom: 22px;
          box-shadow: 0 10px 26px rgba(99, 102, 241, 0.28);
        }
        .dash-marquee-track {
          display: inline-block;
          white-space: nowrap;
          will-change: transform;
          animation: dashMarquee 34s linear infinite;
          font-weight: 600;
          font-size: 14px;
        }
        .dash-marquee:hover .dash-marquee-track { animation-play-state: paused; }
        .dash-marquee-track > span { padding: 0 30px; }
        @keyframes dashMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .load-chart { display: flex; gap: 12px; align-items: flex-end; margin-top: 10px; }
        .load-cell { flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 0; }
        .load-count { font-weight: 800; color: #4f46e5; margin-bottom: 6px; font-size: 15px; }
        .load-box {
          position: relative; width: 100%; height: 150px; border-radius: 16px;
          border: 2px solid #c7d2fe; background: #eef2ff; overflow: visible;
          display: flex; align-items: flex-end; justify-content: center;
        }
        .load-fill {
          position: absolute; left: 0; right: 0; bottom: 0;
          background: linear-gradient(180deg, #818cf8, #4f46e5);
          border-radius: 0 0 13px 13px; transition: height .7s ease; z-index: 1;
        }
        .load-bolt {
          position: relative; z-index: 2; font-size: 42px; margin-bottom: 40px;
          filter: drop-shadow(0 3px 8px rgba(79,70,229,.5));
          animation: boltPulse 1.6s ease-in-out infinite;
        }
        @keyframes boltPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.12); } }
        .spark { position: absolute; z-index: 3; font-size: 16px; animation: sparkFlash 1.1s ease-in-out infinite; }
        @keyframes sparkFlash { 0%,100% { opacity: .2; transform: scale(.7); } 50% { opacity: 1; transform: scale(1.2); } }
        .load-day { margin-top: 8px; color: #64748b; font-size: 13px; text-align: center; }
      `}</style>


      <div className="dash-hero">
        <div>
          <h1 className="dash-title">Dashboard</h1>
          <div className="dash-sub">
            Edujadval.uz — Avtomatik dars jadvali platformasi
          </div>
        </div>
        <div className="dash-brand">
          <img
            src={`${import.meta.env.BASE_URL}logo.png`}
            alt="Edujadval.uz"
            style={{ height: 192, width: "auto", objectFit: "contain", maxWidth: "100%" }}
            onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextSibling.style.display = "block"; }}
          />
          <span style={{ display: "none", fontWeight: 800, fontSize: 22, color: "#4f46e5" }}>Edujadval<span style={{ color: "#ec4899" }}>.uz</span></span>
        </div>
      </div>

      <div className="dash-marquee">
        <div className="dash-marquee-track">
          <span>{MARQUEE_TEXT}</span>
          <span>{MARQUEE_TEXT}</span>
        </div>
      </div>

      <div className="modern-stats">
        {stats.map((s) => (
          <div className="modern-stat" key={s.label} onClick={() => go(s.page)} style={{ cursor: "pointer" }} title={`${s.label} bo'limi`}>
            <div className="modern-stat-label">{s.label}</div>
            <div className="modern-stat-value">{s.value}</div>
            <div className="modern-stat-plus" style={{ color: s.color }}>
              +{Math.max(0, Math.floor(s.value / 10))} this month
            </div>
            <div className="modern-stat-icon" style={{ background: s.bg }}>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="modern-grid">
        <div className="modern-card">
          <div className="modern-card-title">Jadval to‘ldirilishi</div>
          <div className="progress-line">
            <div className="progress-fill" />
          </div>
          <div className="percent-big">{percent}%</div>
          <p style={{ color: "#64748b" }}>
            {totalLessons} ta dars joylashtirilgan, taxminiy maksimum: {maxLessons}
          </p>
        </div>

        <div className="modern-card">
          <div className="modern-card-title">Haftalik dars yuklamasi</div>
          <div className="load-chart">
            {DAYS.map((day, i) => {
              const count = dayCounts[i];
              const pct = Math.round((count / maxDay) * 100);
              const nSparks = Math.min(7, Math.ceil(count / 8)); // ko'p yuklama = ko'p chaqmoq
              const sparkPos = [
                { top: -10, left: -6 }, { top: -14, right: -4 }, { top: 30, right: -12 },
                { bottom: 20, left: -12 }, { top: 60, left: -10 }, { bottom: 4, right: -10 },
                { top: -12, left: "45%" },
              ];
              return (
                <div className="load-cell" key={day}>
                  <div className="load-count">{count}</div>
                  <div className="load-box" title={`${day}: ${count} soat`}>
                    <div className="load-fill" style={{ height: `${pct}%` }} />
                    <div className="load-bolt">⚡</div>
                    {Array.from({ length: nSparks }).map((_, s) => (
                      <span key={s} className="spark" style={{ ...sparkPos[s % sparkPos.length], animationDelay: `${s * 0.15}s` }}>⚡</span>
                    ))}
                  </div>
                  <div className="load-day">{day}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="info-grid">
        <div className="modern-card">
          <div className="modern-card-title">🏫 Oxirgi sinflar</div>
          <div className="mini-list">
            {recentClasses.map((c) => (
              <div className="mini-row" key={c.id}>
                <span className="mini-name">{c.name}</span>
                <span className="mini-meta">{c.students || 25} o‘quvchi</span>
              </div>
            ))}
          </div>
        </div>

        <div className="modern-card">
          <div className="modern-card-title">📚 Oxirgi fanlar</div>
          <div className="mini-list">
            {recentSubjects.map((s) => (
              <div className="mini-row" key={s.id}>
                <span className="mini-name">● {s.name}</span>
                <span className="mini-meta">{s.weeklyHours || 2} soat</span>
              </div>
            ))}
          </div>
        </div>

        <div className="modern-card">
          <div className="modern-card-title">👩‍🏫 Oxirgi o‘qituvchilar</div>
          <div className="mini-list">
            {recentTeachers.map((t) => (
              <div className="mini-row" key={t.id}>
                <span className="mini-name">{t.name}</span>
                <span className="mini-meta">Faol</span>
              </div>
            ))}
          </div>
        </div>

        <div className="modern-card">
          <div className="modern-card-title">Tezkor amallar</div>
          <div className="quick-grid">
            {quickActions.map((a) => (
              <div className="quick-item" key={a.title} onClick={() => go(a.page)} style={{ cursor: "pointer" }} title={a.title}>
                <div className="quick-icon">{a.icon}</div>
                <div>{a.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bottom-banner">
        <div>
          <div className="banner-title">Zo‘r ish!</div>
          <div>Jadvalingiz tobora mukammallashib bormoqda. Davom eting! 🚀</div>
        </div>
        <button className="banner-btn" onClick={() => go("analytics")}>Ko‘proq statistika ko‘rish →</button>
      </div>
    </div>
  );
}