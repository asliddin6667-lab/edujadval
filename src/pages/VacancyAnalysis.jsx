import { useMemo, useState } from "react";
import "./vacancy.css";

// =====================================================================
//  VAKANSIYA TAHLILI — umumiy modul
//
//  Maktab ma'lumotlaridan (classes, subjects, teachers, classSubjects)
//  har bir fan bo'yicha vakant (o'qituvchi biriktirilmagan) soatlarni
//  va o'qituvchilarning ortiqcha yuklamasini hisoblaydi.
//
//  Ishlatiladi:
//    1. Maktab foydalanuvchisi — Tahlil (Analytics) sahifasida
//    2. Tuman admin — "💼 Vakansiyalar" bo'limi va maktab oynasida
//
//  Hisoblash mantig'i:
//    - Har bir sinf-fan biriktiruvi (classSubjects) "o'rin"larga
//      ajratiladi: oddiy dars = 1 o'rin (teacherId), bo'lingan guruh =
//      2 o'rin (teacherId + teacherId2), daraja guruhi (hovuz) = har
//      guruh alohida o'rin.
//    - O'rin bo'sh (o'qituvchi tanlanmagan) bo'lsa — shu fanning
//      haftalik soati VAKANT hisoblanadi.
//    - O'qituvchining biriktirilgan jami soati maksimal soatidan
//      (t.maxWeeklyHours, bo'lmasa 25) oshsa — ORTIQCHA YUKLAMA.
//    - Vakant soat > 0 yoki ortiqcha yuklama > 0 → maktab MUHTOJ.
// =====================================================================

export const DEFAULT_MAX_HOURS = 25;

function emptyResult() {
  return {
    hasData: false,
    subjects: [],
    vacantSubjects: [],
    teachers: [],
    overloaded: [],
    requiredTotal: 0,
    assignedTotal: 0,
    vacantTotal: 0,
    overloadTotal: 0,
    needy: false,
  };
}

export function computeVacancy(d) {
  if (!d || typeof d !== "object") return emptyResult();

  const classes = Array.isArray(d.classes) ? d.classes : [];
  const subjects = Array.isArray(d.subjects) ? d.subjects : [];
  const teachers = Array.isArray(d.teachers) ? d.teachers : [];
  const classSubjects =
    d.classSubjects && typeof d.classSubjects === "object" ? d.classSubjects : {};

  if (!classes.length) return emptyResult();

  const subjName = new Map(subjects.map((s) => [s.id, s.name]));

  const req = new Map();          // subjectId -> kerakli jami soat
  const ass = new Map();          // subjectId -> biriktirilgan soat
  const vac = new Map();          // subjectId -> vakant soat
  const vacByClass = new Map();   // subjectId -> Map(sinf -> soat)
  const declared = new Map();     // teacherId -> jami biriktirilgan soat
  const declaredSubj = new Map(); // teacherId -> Map(subjectId -> soat)

  const bump = (m, k, h) => m.set(k, (m.get(k) || 0) + h);

  for (const c of classes) {
    const list = Array.isArray(classSubjects[c.id]) ? classSubjects[c.id] : [];
    for (const a of list) {
      if (!a) continue;
      const h = Number(a.weeklyHours || 0);
      const sid = a.subjectId;
      if (!h || !sid) continue;

      // O'rinlar ro'yxati: har o'rin bitta o'qituvchi talab qiladi
      let slots;
      if (a.levelGroupEnabled && Array.isArray(a.levelGroups) && a.levelGroups.length) {
        slots = a.levelGroups.map((g) => (g && g.teacherId) || "");
      } else {
        slots = [a.teacherId || ""];
        if (a.teacherId2) slots.push(a.teacherId2);
      }

      for (const tid of slots) {
        bump(req, sid, h);
        if (tid) {
          bump(ass, sid, h);
          bump(declared, tid, h);
          if (!declaredSubj.has(tid)) declaredSubj.set(tid, new Map());
          bump(declaredSubj.get(tid), sid, h);
        } else {
          bump(vac, sid, h);
          if (!vacByClass.has(sid)) vacByClass.set(sid, new Map());
          bump(vacByClass.get(sid), c.name || "?", h);
        }
      }
    }
  }

  const subjectRows = [...req.keys()]
    .map((sid) => ({
      id: sid,
      name: subjName.get(sid) || "Noma'lum fan",
      required: req.get(sid) || 0,
      assigned: ass.get(sid) || 0,
      vacant: vac.get(sid) || 0,
      vacantClasses: [...(vacByClass.get(sid) || new Map()).entries()]
        .map(([cls, hours]) => ({ cls, hours }))
        .sort((x, y) => String(x.cls).localeCompare(String(y.cls), "uz", { numeric: true })),
    }))
    .sort((x, y) => (y.vacant - x.vacant) || x.name.localeCompare(y.name, "uz"));

  const teacherRows = teachers
    .filter((t) => t && t.name)
    .map((t) => {
      const dec = declared.get(t.id) || 0;
      const ownMax = Number(t.maxWeeklyHours || t.maxHours || 0);
      const max = ownMax > 0 ? ownMax : DEFAULT_MAX_HOURS;
      const sMap = declaredSubj.get(t.id);
      const subjectNames = sMap
        ? [...sMap.keys()].map((sid) => subjName.get(sid)).filter(Boolean).join(", ")
        : "";
      return {
        id: t.id,
        name: t.name,
        subjectNames,
        declared: dec,
        max,
        hasOwnMax: ownMax > 0,
        excess: Math.max(0, dec - max),
      };
    })
    .sort((x, y) =>
      (y.excess - x.excess) || (y.declared - x.declared) || x.name.localeCompare(y.name, "uz")
    );

  const overloaded = teacherRows.filter((t) => t.excess > 0);
  const requiredTotal = subjectRows.reduce((a, r) => a + r.required, 0);
  const assignedTotal = subjectRows.reduce((a, r) => a + r.assigned, 0);
  const vacantTotal = subjectRows.reduce((a, r) => a + r.vacant, 0);
  const overloadTotal = overloaded.reduce((a, t) => a + t.excess, 0);

  return {
    hasData: requiredTotal > 0,
    subjects: subjectRows,
    vacantSubjects: subjectRows.filter((r) => r.vacant > 0),
    teachers: teacherRows,
    overloaded,
    requiredTotal,
    assignedTotal,
    vacantTotal,
    overloadTotal,
    needy: vacantTotal > 0 || overloadTotal > 0,
  };
}

// Qisqa matn: "Fizika (12), Kimyo (4)" — jadval/ro'yxatlarda ishlatiladi
export function vacancySummaryText(vacResult, limit = 3) {
  if (!vacResult || !vacResult.vacantSubjects.length) return "";
  const parts = vacResult.vacantSubjects
    .slice(0, limit)
    .map((r) => `${r.name} (${r.vacant})`);
  const rest = vacResult.vacantSubjects.length - limit;
  return parts.join(", ") + (rest > 0 ? ` +${rest} fan` : "");
}

// ---------------------------------------------------------------------
//  Holat belgisi (badge)
// ---------------------------------------------------------------------
export function VacancyBadge({ vac }) {
  if (!vac || !vac.hasData) {
    return <span className="vak-badge vak-badge--muted">Ma'lumot yo'q</span>;
  }
  if (vac.vacantTotal > 0) {
    return <span className="vak-badge vak-badge--bad">🆘 Muhtoj · {vac.vacantTotal} soat vakant</span>;
  }
  if (vac.overloadTotal > 0) {
    return <span className="vak-badge vak-badge--warn">⚠️ Ortiqcha yuklama · {vac.overloadTotal} soat</span>;
  }
  return <span className="vak-badge vak-badge--ok">✓ Ta'minlangan</span>;
}

// ---------------------------------------------------------------------
//  TO'LIQ HISOBOT — bitta maktab uchun
//  props:
//    data         — computeVacancy() natijasi
//    showTeachers — barcha o'qituvchilar yuklamasi jadvali (default: true)
// ---------------------------------------------------------------------
export function VacancyReport({ data, showTeachers = true }) {
  const [teacherFilter, setTeacherFilter] = useState("all"); // all | over

  if (!data || !data.hasData) {
    return (
      <div className="vak-empty">
        <div className="vak-empty__icon">💼</div>
        <div className="vak-empty__title">Vakansiya tahlili uchun ma'lumot yo'q</div>
        <div className="vak-empty__text">
          "Sinf fanlari" bo'limida fanlarga haftalik soat va o'qituvchi biriktirilsa,
          tahlil shu yerda avtomatik hisoblanadi.
        </div>
      </div>
    );
  }

  const pct = data.requiredTotal
    ? Math.round((data.assignedTotal / data.requiredTotal) * 100)
    : 0;

  const KPIS = [
    { icon: "🕐", label: "Kerakli jami soat", value: data.requiredTotal, cls: "" },
    { icon: "✅", label: "Biriktirilgan soat", value: `${data.assignedTotal} (${pct}%)`, cls: "vak-kpi--ok" },
    { icon: "💼", label: "Vakant soat", value: data.vacantTotal, cls: data.vacantTotal > 0 ? "vak-kpi--bad" : "vak-kpi--ok" },
    { icon: "⚠️", label: "Ortiqcha yuklama", value: data.overloadTotal, cls: data.overloadTotal > 0 ? "vak-kpi--warn" : "vak-kpi--ok" },
  ];

  const shownTeachers = teacherFilter === "over" ? data.overloaded : data.teachers;
  const hasDefaultMax = data.teachers.some((t) => !t.hasOwnMax);

  return (
    <div className="vak-root">
      {/* Umumiy holat */}
      <div className="vak-statusrow">
        <VacancyBadge vac={data} />
        {data.vacantTotal > 0 && (
          <span className="vak-statusrow__note">
            Vakant fanlar: <b>{vacancySummaryText(data, 5)}</b> — yangi o'qituvchi kerak
          </span>
        )}
      </div>

      <div className="vak-kpis">
        {KPIS.map((k, i) => (
          <div key={i} className={`vak-kpi ${k.cls}`}>
            <div className="vak-kpi__icon">{k.icon}</div>
            <div>
              <div className="vak-kpi__value">{k.value}</div>
              <div className="vak-kpi__label">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Fanlar bo'yicha */}
      <div className="vak-section">
        <div className="vak-section__title">
          📚 Fanlar bo'yicha ta'minot
          {data.vacantSubjects.length > 0 && (
            <span className="vak-section__sub"> · {data.vacantSubjects.length} ta fanda vakansiya</span>
          )}
        </div>
        <div className="vak-tablewrap">
          <table className="vak-table">
            <thead>
              <tr>
                <th>Fan</th>
                <th>Kerakli</th>
                <th>Biriktirilgan</th>
                <th>Vakant</th>
                <th>Vakant sinflar</th>
                <th>Holat</th>
              </tr>
            </thead>
            <tbody>
              {data.subjects.map((r) => (
                <tr key={r.id} className={r.vacant > 0 ? "vak-row--bad" : ""}>
                  <td><b>{r.name}</b></td>
                  <td className="vak-c">{r.required}</td>
                  <td className="vak-c">{r.assigned}</td>
                  <td className="vak-c">
                    {r.vacant > 0 ? <b className="vak-red">{r.vacant}</b> : <span className="vak-dim">—</span>}
                  </td>
                  <td className="vak-classes">
                    {r.vacantClasses.length
                      ? r.vacantClasses.map((v) => `${v.cls} (${v.hours})`).join(", ")
                      : <span className="vak-dim">—</span>}
                  </td>
                  <td>
                    {r.vacant > 0
                      ? <span className="vak-badge vak-badge--bad">🆘 {r.vacant} soat vakant</span>
                      : <span className="vak-badge vak-badge--ok">✓ To'liq</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="vak-total">
                <td><b>Jami</b></td>
                <td className="vak-c"><b>{data.requiredTotal}</b></td>
                <td className="vak-c"><b>{data.assignedTotal}</b></td>
                <td className="vak-c"><b className={data.vacantTotal ? "vak-red" : ""}>{data.vacantTotal || "—"}</b></td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* O'qituvchilar yuklamasi */}
      {showTeachers && data.teachers.length > 0 && (
        <div className="vak-section">
          <div className="vak-section__head">
            <div className="vak-section__title">
              👨‍🏫 O'qituvchilar yuklamasi
              {data.overloaded.length > 0 && (
                <span className="vak-section__sub"> · {data.overloaded.length} ta o'qituvchida ortiqcha soat</span>
              )}
            </div>
            <div className="vak-tabs">
              <button
                type="button"
                className={`vak-tab ${teacherFilter === "all" ? "vak-tab--active" : ""}`}
                onClick={() => setTeacherFilter("all")}
              >
                Hammasi ({data.teachers.length})
              </button>
              <button
                type="button"
                className={`vak-tab ${teacherFilter === "over" ? "vak-tab--active" : ""}`}
                onClick={() => setTeacherFilter("over")}
              >
                Ortiqcha yuklama ({data.overloaded.length})
              </button>
            </div>
          </div>
          <div className="vak-tablewrap">
            <table className="vak-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>F.I.Sh.</th>
                  <th>Fanlari</th>
                  <th>Biriktirilgan</th>
                  <th>Maksimal</th>
                  <th>Yuklama</th>
                  <th>Holat</th>
                </tr>
              </thead>
              <tbody>
                {shownTeachers.length === 0 ? (
                  <tr><td colSpan={7} className="vak-dim vak-c">Ortiqcha yuklamali o'qituvchi yo'q ✓</td></tr>
                ) : shownTeachers.map((t, i) => {
                  const loadPct = t.max > 0 ? Math.round((t.declared / t.max) * 100) : 0;
                  return (
                    <tr key={t.id || i} className={t.excess > 0 ? "vak-row--warn" : ""}>
                      <td className="vak-c">{i + 1}</td>
                      <td><b>{t.name}</b></td>
                      <td>{t.subjectNames || <span className="vak-dim">—</span>}</td>
                      <td className="vak-c"><b>{t.declared || "—"}</b></td>
                      <td className="vak-c">
                        {t.max}{!t.hasOwnMax && <span className="vak-dim">*</span>}
                      </td>
                      <td className="vak-c">
                        <span className={`vak-load ${loadPct > 100 ? "vak-red" : loadPct >= 85 ? "vak-amber" : ""}`}>
                          {loadPct}%
                        </span>
                      </td>
                      <td>
                        {t.excess > 0
                          ? <span className="vak-badge vak-badge--warn">+{t.excess} soat ortiqcha</span>
                          : t.declared === 0
                            ? <span className="vak-badge vak-badge--muted">Soat biriktirilmagan</span>
                            : <span className="vak-badge vak-badge--ok">✓ Normal</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {hasDefaultMax && (
            <div className="vak-note">
              * — o'qituvchiga maksimal soat kiritilmagan, standart {DEFAULT_MAX_HOURS} soat olindi.
            </div>
          )}
        </div>
      )}

      {data.needy && (
        <div className="vak-alert">
          🆘 Xulosa: bu maktabga
          {data.vacantTotal > 0 && <> <b>{data.vacantTotal} soat</b> uchun yangi o'qituvchi kerak</>}
          {data.vacantTotal > 0 && data.overloadTotal > 0 && " va"}
          {data.overloadTotal > 0 && <> <b>{data.overloadTotal} soat</b> ortiqcha yuklamani qayta taqsimlash lozim</>}.
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
//  Maktab foydalanuvchisi uchun tayyor sahifa bo'lagi — Tahlil
//  (Analytics) sahifasiga qo'yiladi. Xom state'lardan o'zi hisoblaydi.
// ---------------------------------------------------------------------
export default function VacancyAnalysis({ classes, subjects, teachers, classSubjects }) {
  const data = useMemo(
    () => computeVacancy({ classes, subjects, teachers, classSubjects }),
    [classes, subjects, teachers, classSubjects]
  );
  return (
    <div className="vak-card">
      <div className="vak-card__title">💼 Vakansiya va yuklama tahlili</div>
      <VacancyReport data={data} />
    </div>
  );
}
