import { useState } from "react";
import ConfirmModal from "../components/ConfirmModal";

export default function SettingsPage({ settings, setSettings, classes, subjects, teachers, rooms, timeslots, lunchGroups, shifts, schedule, classSubjects, setClasses, setSubjects, setTeachers, setRooms, setTimeslots, setLunchGroups, setShifts, setSchedule, setClassSubjects, toast, darkMode, setDarkMode }) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  function handleExport() {
    const data = {
      _meta: {
        app: "edujadval",
        version: 1,
        exportedAt: new Date().toISOString(),
      },
      settings, classes, subjects, teachers, rooms, timeslots,
      lunchGroups, shifts: shifts || [], classSubjects, schedule,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Sana bilan o'qiladigan fayl nomi: edujadval-zaxira-2026-07-23.json
    const sana = new Date().toISOString().slice(0, 10);
    a.download = `edujadval-zaxira-${sana}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Zaxira nusxa yuklab olindi ✓", "success");
  }

  function handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.classes) setClasses(data.classes);
        if (data.subjects) setSubjects(data.subjects);
        if (data.teachers) setTeachers(data.teachers);
        if (data.rooms) setRooms(data.rooms);
        if (data.timeslots) setTimeslots(data.timeslots);
        if (data.lunchGroups) setLunchGroups(data.lunchGroups);
        if (data.shifts && setShifts) setShifts(data.shifts);
        if (data.classSubjects) setClassSubjects(data.classSubjects);
        if (data.schedule) setSchedule(data.schedule);
        if (data.settings) setSettings(data.settings);
        toast("Zaxiradan ma'lumotlar tiklandi ✓", "success");
      } catch {
        toast("JSON fayl xato!", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleClearAll() {
    setClasses([]);
    setSubjects([]);
    setTeachers([]);
    setRooms([]);
    setTimeslots([]);
    setLunchGroups([]);
    if (setShifts) setShifts([]);
    setClassSubjects({});
    setSchedule({});
    setShowClearConfirm(false);
    toast("Barcha ma'lumotlar o'chirildi", "error");
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Sozlamalar</div>
          <div className="page-subtitle">Tizim va umumiy sozlamalar</div>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ maxWidth: 640 }}>
          <div className="card-body">
            {/* General */}
            <div className="settings-section">
              <div className="settings-section-title">Umumiy sozlamalar</div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Maktab nomi</div>
                  <div className="settings-row-desc">Jadval sarlavhasida ko'rinadi</div>
                </div>
                <input className="form-control" style={{ width: 240 }} value={settings.schoolName || ""}
                  placeholder="Maktab nomi" onChange={e => setSettings({ ...settings, schoolName: e.target.value })} />
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">O'quv yili</div>
                  <div className="settings-row-desc">Masalan: 2024-2025</div>
                </div>
                <input className="form-control" style={{ width: 160 }} value={settings.academicYear || ""}
                  placeholder="2024-2025" onChange={e => setSettings({ ...settings, academicYear: e.target.value })} />
              </div>
            </div>

            {/* Appearance */}
            <div className="settings-section">
              <div className="settings-section-title">Ko'rinish</div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Qorong'i rejim</div>
                  <div className="settings-row-desc">Dark mode ni yoqish/o'chirish</div>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={darkMode} onChange={e => setDarkMode(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>
            </div>

            {/* Data */}
            <div className="settings-section">
              <div className="settings-section-title">Ma'lumotlar</div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Zaxira nusxa (Export)</div>
                  <div className="settings-row-desc">Barcha ma'lumotlarni JSON faylga yuklab olish</div>
                </div>
                <button className="btn btn-secondary" onClick={handleExport}>⬇️ Zaxiralash</button>
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Zaxiradan tiklash (Import)</div>
                  <div className="settings-row-desc">Yuklab olingan JSON fayldan ma'lumotlarni qaytarish</div>
                </div>
                <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
                  ⬆️ Tiklash
                  <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
                </label>
              </div>
              <div className="settings-row">
                <div>
                  <div className="settings-row-label" style={{ color: "var(--danger)" }}>Barcha ma'lumotlarni o'chirish</div>
                  <div className="settings-row-desc">Bu amalni qaytarib bo'lmaydi!</div>
                </div>
                <button className="btn btn-danger" onClick={() => setShowClearConfirm(true)}>🗑️ O'chirish</button>
              </div>
            </div>

            {/* Stats */}
            <div className="settings-section">
              <div className="settings-section-title">Tizim ma'lumotlari</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  ["🏫 Sinflar", classes.length],
                  ["📚 Fanlar", subjects.length],
                  ["👩‍🏫 O'qituvchilar", teachers.length],
                  ["🚪 Xonalar", rooms.length],
                  ["⏰ Dars vaqtlari", timeslots.length],
                  ["🍽️ Obed guruhlari", lunchGroups?.length || 0],
                ].map(([label, val]) => (
                  <div key={label} style={{ background: "var(--content-bg)", borderRadius: 8, padding: "12px 14px", border: "1px solid var(--card-border)" }}>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</div>
                    <div style={{ fontWeight: 700, fontSize: 20, color: "var(--text-primary)", marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showClearConfirm && (
        <ConfirmModal
          message="BARCHA ma'lumotlarni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi!"
          onConfirm={handleClearAll}
          onCancel={() => setShowClearConfirm(false)}
        />
      )}
    </div>
  );
}
