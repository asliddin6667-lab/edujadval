import { useMemo, useState } from "react";
import { DAYS } from "../utils/constants";
import { isTeachingSlot } from "../utils/scheduleGenerator";

function classIdsOf(lesson) {
  return Array.isArray(lesson.classIds) ? lesson.classIds : [lesson.classId].filter(Boolean);
}

export default function AnalyticsPage({
  classes = [],
  subjects = [],
  teachers = [],
  schedule = {},
  classSubjects = {},
  timeslots = [],
}) {
  const [view, setView] = useState("classes"); // "classes" | "teachers"
  const [search, setSearch] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const subjectMap = useMemo(() => new Map(subjects.map((s) => [s.id, s])), [subjects]);
  const teacherMap = useMemo(() => new Map(teachers.map((t) => [t.id, t])), [teachers]);
  const classMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  const sortedTimeslots = useMemo(
    () => [...timeslots].sort((a, b) => Number(a.lessonNumber || 0) - Number(b.lessonNumber || 0)),
    [timeslots]
  );

  const stats = useMemo(() => {
    const classSubject = {}; // `${cid}__${sid}` -> hours
    const classTotal = {}; // cid -> hours
    const teacherTotal = {}; // tid -> distinct teaching slots
    const teacherClass = {}; // tid -> { cid -> hours }
    const teacherSubject = {}; // tid -> { sid -> hours }
    const teacherDaily = {}; // tid -> { day -> hours }
    const classSubjectTeachers = {}; // `${cid}__${sid}` -> Set(tid)
    const teacherClassSubject = {}; // `${tid}__${cid}__${sid}` -> hours

    DAYS.forEach((day) => {
      sortedTimeslots.forEach((ts) => {
        if (!isTeachingSlot(ts)) return;
        const cell = schedule?.[day]?.[ts.id] || [];
        if (!cell.length) return;
        const seenCS = new Set();
        const seenT = new Set();
        const seenTC = new Set();
        const seenTS = new Set();
        const seenTCS = new Set();
        cell.forEach((l) => {
          const sid = l.subjectId;
          const tid = l.teacherId || "";
          classIdsOf(l).forEach((cid) => {
            const csk = `${cid}__${sid}`;
            if (tid) {
              classSubjectTeachers[csk] = classSubjectTeachers[csk] || new Set();
              classSubjectTeachers[csk].add(tid);
            }
            if (!seenCS.has(csk)) {
              seenCS.add(csk);
              classSubject[csk] = (classSubject[csk] || 0) + 1;
              classTotal[cid] = (classTotal[cid] || 0) + 1;
            }
            if (tid) {
              const tck = `${tid}__${cid}`;
              if (!seenTC.has(tck)) {
                seenTC.add(tck);
                teacherClass[tid] = teacherClass[tid] || {};
                teacherClass[tid][cid] = (teacherClass[tid][cid] || 0) + 1;
              }
              const tcsk = `${tid}__${cid}__${sid}`;
              if (!seenTCS.has(tcsk)) {
                seenTCS.add(tcsk);
                teacherClassSubject[tcsk] = (teacherClassSubject[tcsk] || 0) + 1;
              }
            }
          });
          if (tid) {
            if (!seenT.has(tid)) {
              seenT.add(tid);
              teacherTotal[tid] = (teacherTotal[tid] || 0) + 1;
              teacherDaily[tid] = teacherDaily[tid] || {};
              teacherDaily[tid][day] = (teacherDaily[tid][day] || 0) + 1;
            }
            const tsk = `${tid}__${sid}`;
            if (!seenTS.has(tsk)) {
              seenTS.add(tsk);
              teacherSubject[tid] = teacherSubject[tid] || {};
              teacherSubject[tid][sid] = (teacherSubject[tid][sid] || 0) + 1;
            }
          }
        });
      });
    });

    return { classSubject, classTotal, teacherTotal, teacherClass, teacherSubject, teacherDaily, classSubjectTeachers, teacherClassSubject };
  }, [schedule, sortedTimeslots]);

  function requiredHours(classId, subjectId) {
    const list = classSubjects?.[classId] || [];
    let req = 0;
    list.forEach((a) => {
      if (a.subjectId === subjectId) req += Number(a.weeklyHours || 0);
      if (a.swapEnabled && a.swapSubjectId === subjectId) req += Number(a.weeklyHours || 0);
    });
    return req;
  }

  // Sinf uchun barcha tegishli fanlar (biriktirilgan + jadvalda bor)
  function subjectsForClass(classId) {
    const ids = new Set();
    (classSubjects?.[classId] || []).forEach((a) => {
      if (a.subjectId) ids.add(a.subjectId);
      if (a.swapEnabled && a.swapSubjectId) ids.add(a.swapSubjectId);
    });
    Object.keys(stats.classSubject).forEach((k) => {
      const [cid, sid] = k.split("__");
      if (cid === classId) ids.add(sid);
    });
    return [...ids];
  }

  const totals = useMemo(() => {
    let placed = 0;
    let required = 0;
    classes.forEach((c) => {
      placed += stats.classTotal[c.id] || 0;
      (classSubjects?.[c.id] || []).forEach((a) => {
        required += Number(a.weeklyHours || 0);
        if (a.swapEnabled && a.swapSubjectId) required += Number(a.weeklyHours || 0);
      });
    });
    return { placed, required };
  }, [classes, classSubjects, stats]);

  const fillPct = totals.required > 0 ? Math.round((totals.placed / totals.required) * 100) : 0;

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => String(a.name).localeCompare(String(b.name), "uz", { numeric: true })),
    [classes]
  );
  const sortedTeachers = useMemo(
    () => [...teachers].sort((a, b) => (stats.teacherTotal[b.id] || 0) - (stats.teacherTotal[a.id] || 0)),
    [teachers, stats]
  );

  // Tanlangan o'qituvchi (sinflar ko'rinishida qo'shimcha ustun uchun)
  const selectedTeacher = filterTeacher ? teacherMap.get(filterTeacher) : null;

  const card = { background: "var(--card-bg, #fff)", border: "1px solid var(--card-border, #e5e7eb)", borderRadius: 12, padding: 16, marginBottom: 16 };
  const th = { textAlign: "left", padding: "8px 10px", fontSize: 13, color: "var(--text-secondary)", borderBottom: "2px solid var(--card-border, #e5e7eb)" };
  const td = { padding: "8px 10px", fontSize: 14, borderBottom: "1px solid var(--card-border, #eef2f7)" };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">📈 Jadval tahlili</div>
          <div className="page-subtitle">Sinflar va o'qituvchilar bo'yicha soatlar tahlili</div>
        </div>
      </div>

      {/* Umumiy ko'rsatkichlar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Sinflar", value: classes.length, icon: "🏫" },
          { label: "O'qituvchilar", value: teachers.length, icon: "👩‍🏫" },
          { label: "Joylashgan soat", value: totals.placed, icon: "✅" },
          { label: "To'ldirish", value: `${fillPct}%`, icon: fillPct >= 100 ? "🟢" : "🟡" },
        ].map((c) => (
          <div key={c.label} style={{ ...card, marginBottom: 0, textAlign: "center" }}>
            <div style={{ fontSize: 22 }}>{c.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "var(--accent, #4f46e5)" }}>{c.value}</div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Ko'rinish tanlash */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button
          className={`btn ${view === "classes" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: 17, fontWeight: 700, padding: "14px 28px", borderRadius: 12 }}
          onClick={() => setView("classes")}
        >
          🏫 Sinflar bo'yicha
        </button>
        <button
          className={`btn ${view === "teachers" ? "btn-primary" : "btn-secondary"}`}
          style={{ fontSize: 17, fontWeight: 700, padding: "14px 28px", borderRadius: 12 }}
          onClick={() => setView("teachers")}
        >
          👩‍🏫 O'qituvchilar bo'yicha
        </button>
      </div>

      {/* Izlash / filtr */}
      <div style={{ ...card, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
        <div style={{ flex: "1 1 200px", minWidth: 160 }}>
          <label className="form-label" style={{ fontSize: 12 }}>Izlash</label>
          <input className="form-control" placeholder="Nom bo'yicha izlash..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div style={{ flex: "1 1 160px", minWidth: 140 }}>
          <label className="form-label" style={{ fontSize: 12 }}>Sinf</label>
          <select className="form-control" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
            <option value="">Barcha sinflar</option>
            {sortedClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 180px", minWidth: 150 }}>
          <label className="form-label" style={{ fontSize: 12 }}>O'qituvchi</label>
          <select className="form-control" value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)}>
            <option value="">Barcha o'qituvchilar</option>
            {[...teachers].sort((a, b) => String(a.name).localeCompare(String(b.name), "uz")).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div style={{ flex: "1 1 160px", minWidth: 140 }}>
          <label className="form-label" style={{ fontSize: 12 }}>Fan</label>
          <select className="form-control" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
            <option value="">Barcha fanlar</option>
            {[...subjects].sort((a, b) => String(a.name).localeCompare(String(b.name), "uz")).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        {(search || filterClass || filterTeacher || filterSubject) && (
          <button className="btn btn-secondary" onClick={() => { setSearch(""); setFilterClass(""); setFilterTeacher(""); setFilterSubject(""); }}>
            ✕ Tozalash
          </button>
        )}
      </div>

      {/* Tanlangan o'qituvchi haqida umumiy ma'lumot */}
      {selectedTeacher && (
        <div style={{ ...card, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>👩‍🏫 {selectedTeacher.name}</div>
          <span className="badge badge-info">Jami: {stats.teacherTotal[filterTeacher] || 0} soat</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {Object.entries(stats.teacherClass[filterTeacher] || {})
              .sort((a, b) => String(classMap.get(a[0])?.name || "").localeCompare(String(classMap.get(b[0])?.name || ""), "uz", { numeric: true }))
              .map(([cid, h]) => (
                <span key={cid} className="badge badge-default">{classMap.get(cid)?.name || "?"}: {h} soat</span>
              ))}
          </div>
        </div>
      )}

      {/* Tanlangan o'qituvchining haftalik dars jadvali: qaysi kuni, nechinchi soat, qaysi sinf */}
      {selectedTeacher && (() => {
        const teachingSlots = sortedTimeslots.filter((ts) => isTeachingSlot(ts));
        const slotsByNumber = {};
        teachingSlots.forEach((ts) => {
          const n = Number(ts.lessonNumber || 0);
          (slotsByNumber[n] = slotsByNumber[n] || []).push(ts);
        });
        const lessonNumbers = Object.keys(slotsByNumber).map(Number).sort((a, b) => a - b);
        return (
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>
              📅 {selectedTeacher.name} — haftalik dars jadvali
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr>
                    <th style={th}>Soat</th>
                    {DAYS.map((d) => (
                      <th key={d} style={{ ...th, textAlign: "center" }}>{d}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lessonNumbers.map((n) => (
                    <tr key={n}>
                      <td style={{ ...td, fontWeight: 700, whiteSpace: "nowrap" }}>{n}-soat</td>
                      {DAYS.map((day) => {
                        const items = [];
                        (slotsByNumber[n] || []).forEach((ts) => {
                          (schedule?.[day]?.[ts.id] || []).forEach((l) => {
                            if ((l.teacherId || "") === filterTeacher) items.push(l);
                          });
                        });
                        return (
                          <td key={day} style={{ ...td, textAlign: "center", verticalAlign: "top" }}>
                            {items.length === 0 ? (
                              <span style={{ color: "var(--text-muted, #d1d5db)" }}>—</span>
                            ) : (
                              items.map((l, i) => (
                                <div
                                  key={i}
                                  style={{
                                    background: "var(--accent-light, #eef2ff)",
                                    borderRadius: 8,
                                    padding: "4px 8px",
                                    marginBottom: i < items.length - 1 ? 4 : 0,
                                    display: "inline-block",
                                    minWidth: 70,
                                  }}
                                >
                                  <div style={{ fontWeight: 800, fontSize: 13, color: "var(--accent, #4f46e5)" }}>
                                    {classIdsOf(l).map((cid) => classMap.get(cid)?.name || "?").join(", ")}
                                  </div>
                                  <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                                    {subjectMap.get(l.subjectId)?.name || ""}
                                  </div>
                                </div>
                              ))
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {view === "classes" && (
        <div>
          {(() => {
            const q = search.trim().toLowerCase();
            const rows = sortedClasses
              .filter((cls) => !filterClass || cls.id === filterClass)
              .map((cls) => {
                let subs = subjectsForClass(cls.id);
                if (filterSubject) subs = subs.filter((sid) => sid === filterSubject);
                if (filterTeacher) subs = subs.filter((sid) => stats.classSubjectTeachers[`${cls.id}__${sid}`]?.has(filterTeacher));
                if (q) {
                  const classMatch = String(cls.name).toLowerCase().includes(q);
                  if (!classMatch) subs = subs.filter((sid) => String(subjectMap.get(sid)?.name || "").toLowerCase().includes(q));
                }
                subs = subs.sort((a, b) => String(subjectMap.get(a)?.name || "").localeCompare(String(subjectMap.get(b)?.name || ""), "uz"));
                return { cls, subs };
              })
              .filter(({ subs, cls }) => {
                const anyFilter = filterSubject || filterTeacher || q;
                if (anyFilter && subs.length === 0) {
                  // agar faqat sinf nomi qidiruvga mos bo'lsa ham ko'rsatamiz
                  if (q && String(cls.name).toLowerCase().includes(q) && !filterSubject && !filterTeacher) return true;
                  return false;
                }
                return true;
              });

            if (rows.length === 0) return <div style={card}>Mos natija topilmadi.</div>;

            return rows.map(({ cls, subs }) => {
              const total = stats.classTotal[cls.id] || 0;
              const teacherInClass = filterTeacher ? (stats.teacherClass[filterTeacher]?.[cls.id] || 0) : 0;
              return (
                <div key={cls.id} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>🏫 {cls.name}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {selectedTeacher && (
                        <span className="badge badge-success">👩‍🏫 {selectedTeacher.name}: {teacherInClass} soat</span>
                      )}
                      <span className="badge badge-info">Jami: {total} soat</span>
                    </div>
                  </div>
                  {subs.length === 0 ? (
                    <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>Mos fan yo'q.</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={th}>Fan</th>
                          <th style={{ ...th, textAlign: "center" }}>Joylashgan</th>
                          {selectedTeacher && (
                            <th style={{ ...th, textAlign: "center", color: "var(--accent, #4f46e5)" }}>
                              {selectedTeacher.name} (soat)
                            </th>
                          )}
                          <th style={{ ...th, textAlign: "center" }}>Kerakli</th>
                          <th style={{ ...th, textAlign: "center" }}>Holat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subs.map((sid) => {
                          const placed = stats.classSubject[`${cls.id}__${sid}`] || 0;
                          const need = requiredHours(cls.id, sid);
                          const ok = need > 0 ? placed >= need : true;
                          const teacherHours = filterTeacher ? (stats.teacherClassSubject[`${filterTeacher}__${cls.id}__${sid}`] || 0) : 0;
                          return (
                            <tr key={sid}>
                              <td style={td}>{subjectMap.get(sid)?.name || "Fan"}</td>
                              <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{placed}</td>
                              {selectedTeacher && (
                                <td style={{ ...td, textAlign: "center", fontWeight: 800, color: "var(--accent, #4f46e5)" }}>
                                  {teacherHours}
                                </td>
                              )}
                              <td style={{ ...td, textAlign: "center", color: "var(--text-secondary)" }}>{need || "—"}</td>
                              <td style={{ ...td, textAlign: "center" }}>
                                {need === 0 ? (
                                  <span className="badge badge-default">reja yo'q</span>
                                ) : ok ? (
                                  <span className="badge badge-success">to'liq</span>
                                ) : (
                                  <span className="badge badge-warning">{need - placed} kam</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {view === "teachers" && (
        <div style={card}>
          {(() => {
            const q = search.trim().toLowerCase();
            const list = sortedTeachers.filter((t) => {
              if (filterTeacher && t.id !== filterTeacher) return false;
              if (filterClass && !(stats.teacherClass[t.id] && stats.teacherClass[t.id][filterClass])) return false;
              if (filterSubject && !(stats.teacherSubject[t.id] && stats.teacherSubject[t.id][filterSubject])) return false;
              if (q) {
                const nameMatch = String(t.name).toLowerCase().includes(q);
                const subjMatch = Object.keys(stats.teacherSubject[t.id] || {}).some((sid) => String(subjectMap.get(sid)?.name || "").toLowerCase().includes(q));
                const classMatch = Object.keys(stats.teacherClass[t.id] || {}).some((cid) => String(classMap.get(cid)?.name || "").toLowerCase().includes(q));
                if (!nameMatch && !subjMatch && !classMatch) return false;
              }
              return true;
            });
            if (list.length === 0) return <div style={{ color: "var(--text-secondary)" }}>Mos natija topilmadi.</div>;
            return (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={th}>O'qituvchi</th>
                    <th style={{ ...th, textAlign: "center" }}>Jami soat</th>
                    <th style={th}>Fanlar (soat)</th>
                    <th style={th}>Sinflar (soat)</th>
                    <th style={th}>Kunlik yuk</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => {
                    const total = stats.teacherTotal[t.id] || 0;
                    let subjEntries = Object.entries(stats.teacherSubject[t.id] || {});
                    let classEntries = Object.entries(stats.teacherClass[t.id] || {});
                    if (filterSubject) subjEntries = subjEntries.filter(([sid]) => sid === filterSubject);
                    if (filterClass) classEntries = classEntries.filter(([cid]) => cid === filterClass);
                    const daily = stats.teacherDaily[t.id] || {};
                    const maxWeek = Number(t.maxWeeklyHours || 0);
                    const over = maxWeek > 0 && total > maxWeek;
                    return (
                      <tr key={t.id}>
                        <td style={{ ...td, fontWeight: 700 }}>
                          {t.name}
                          {maxWeek > 0 && (
                            <div style={{ fontSize: 12, color: over ? "#dc2626" : "var(--text-secondary)" }}>
                              maks: {maxWeek} soat{over ? " (oshib ketgan!)" : ""}
                            </div>
                          )}
                        </td>
                        <td style={{ ...td, textAlign: "center", fontWeight: 800, fontSize: 16 }}>{total}</td>
                        <td style={td}>
                          {subjEntries.length === 0 ? "—" : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {subjEntries.sort((a, b) => b[1] - a[1]).map(([sid, h]) => (
                                <span key={sid} className="badge badge-default">{subjectMap.get(sid)?.name || "Fan"}: {h}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={td}>
                          {classEntries.length === 0 ? "—" : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {classEntries
                                .sort((a, b) => String(classMap.get(a[0])?.name || "").localeCompare(String(classMap.get(b[0])?.name || ""), "uz", { numeric: true }))
                                .map(([cid, h]) => (
                                  <span key={cid} className="badge badge-info">{classMap.get(cid)?.name || "?"}: {h}</span>
                                ))}
                            </div>
                          )}
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 3 }}>
                            {DAYS.map((d) => (
                              <span key={d} title={d} style={{
                                width: 22, height: 22, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center",
                                fontSize: 11, fontWeight: 700,
                                background: (daily[d] || 0) > 0 ? "var(--accent-light, #eef2ff)" : "var(--content-bg, #f3f4f6)",
                                color: (daily[d] || 0) > 0 ? "var(--accent, #4f46e5)" : "var(--text-muted, #9ca3af)",
                              }}>
                                {daily[d] || 0}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}
    </div>
  );
}
