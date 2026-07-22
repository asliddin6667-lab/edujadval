import { useState } from "react";
import ConfirmModal from "../components/ConfirmModal";
import { genId } from "../utils/helpers";
import { SUBJECT_COLORS, STANDARD_SUBJECTS, STANDARD_SUBJECTS_RU, EDU_LANGS } from "../utils/constants";

export default function SubjectsPage({ subjects, setSubjects, toast }) {
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("all"); // all | uz | ru
  const [previewLang, setPreviewLang] = useState("uz"); // standart fanlar kartasi uchun
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [form, setForm] = useState({ name: "", weeklyHours: 2, color: SUBJECT_COLORS[0], type: "Oddiy", allowDouble: false, lang: "uz" });

  const filtered = subjects
    .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
    .filter(s => langFilter === "all" || (s.lang || "uz") === langFilter)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "uz", { numeric: true, sensitivity: "base" }));

  function openAdd() {
    setEditItem(null);
    setForm({ name: "", weeklyHours: 2, color: SUBJECT_COLORS[0], type: "Oddiy", allowDouble: false, lang: "uz" });
    setShowModal(true);
  }

  function openEdit(item) {
    setEditItem(item);
    setForm({ name: item.name, weeklyHours: item.weeklyHours, color: item.color, type: item.type || "Oddiy", allowDouble: Boolean(item.allowDouble), lang: item.lang || "uz" });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name.trim()) return;
    if (editItem) {
      setSubjects(subjects.map(s => s.id === editItem.id ? { ...s, ...form } : s));
      toast("Fan yangilandi ✓", "success");
    } else {
      setSubjects([...subjects, { id: genId(), ...form, createdAt: Date.now() }]);
      toast("Fan qo'shildi ✓", "success");
    }
    setShowModal(false);
  }

  function handleDelete() {
    setSubjects(subjects.filter(s => s.id !== deleteId));
    setDeleteId(null);
    toast("Fan o'chirildi", "error");
  }

  function addStandardSubjects(lang = "uz") {
    const source = lang === "ru" ? STANDARD_SUBJECTS_RU : STANDARD_SUBJECTS;
    const existingNames = new Set(subjects.map(s => s.name.trim().toLowerCase()));
    const prepared = source
      .filter(s => !existingNames.has(s.name.trim().toLowerCase()))
      .map((s, index) => ({
        id: genId(),
        ...s,
        lang,
        color: SUBJECT_COLORS[(subjects.length + index) % SUBJECT_COLORS.length],
        allowDouble: Boolean(s.allowDouble),
        createdAt: Date.now() + index
      }));

    if (!prepared.length) {
      toast(lang === "ru" ? "Ruscha standart fanlar allaqachon qo'shilgan" : "Standart fanlar allaqachon qo'shilgan", "warning");
      return;
    }
    setSubjects([...subjects, ...prepared]);
    toast(`${prepared.length} ta standart fan qo'shildi ✓ (${lang === "ru" ? "Rus tili" : "O'zbek tili"})`, "success");
  }

  const previewList = previewLang === "ru" ? STANDARD_SUBJECTS_RU : STANDARD_SUBJECTS;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Fanlar</div>
          <div className="page-subtitle">O'quv fanlari va haftalik soatlar</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-success" onClick={() => addStandardSubjects("uz")}>⚡ Standart fanlar (🇺🇿 O'zbek)</button>
          <button className="btn btn-success" onClick={() => addStandardSubjects("ru")}>⚡ Standart fanlar (🇷🇺 Rus)</button>
          <button className="btn btn-primary" onClick={openAdd}>＋ Qo'lda fan qo'shish</button>
        </div>
      </div>
      <div className="page-body">
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="card-body">
            <div className="toolbar">
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>📚 Standart fanlar</div>
                <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Ta'lim tiliga mos asosiy fanlarni avtomatik qo'shadi. Qo'lda fan qo'shish ham qoladi.</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {EDU_LANGS.map(l => (
                  <button key={l.key}
                    className={`btn ${previewLang === l.key ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setPreviewLang(l.key)}>
                    {l.icon} {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {previewList.map(s => (
                <span key={s.name} className="badge badge-default">{s.name}</span>
              ))}
            </div>
            <button className="btn btn-success" onClick={() => addStandardSubjects(previewLang)}>
              {previewLang === "ru" ? "🇷🇺 Ruscha standart fanlarni qo'shish" : "🇺🇿 O'zbekcha standart fanlarni qo'shish"}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <div className="toolbar">
              <div className="search-bar">
                <span style={{ color: "var(--text-muted)" }}>🔍</span>
                <input placeholder="Fan qidirish..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <select className="form-control" style={{ width: "auto" }} value={langFilter} onChange={e => setLangFilter(e.target.value)}>
                  <option value="all">Barcha tillar</option>
                  <option value="uz">🇺🇿 O'zbek tili</option>
                  <option value="ru">🇷🇺 Rus tili</option>
                </select>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{filtered.length} ta fan</span>
              </div>
            </div>
            {filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📚</div>
                <div className="empty-state-title">Fanlar topilmadi</div>
                <div className="empty-state-desc">Yangi fan qo'shing</div>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fan nomi</th>
                    <th>Ta'lim tili</th>
                    <th>Haftalik soat</th>
                    <th>Turi</th>
                    <th>Rang</th>
                    <th>Ketma-ket</th>
                    <th>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{i + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="color-dot" style={{ background: s.color }} />
                          <strong>{s.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-default">
                          {(s.lang || "uz") === "ru" ? "🇷🇺 Rus" : "🇺🇿 O'zbek"}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info">{s.weeklyHours} soat</span>
                      </td>
                      <td>
                        <span className={`badge ${s.type === "Guruhli" ? "badge-warning" : "badge-default"}`}>
                          {s.type || "Oddiy"}
                        </span>
                      </td>
                      <td>
                        <div style={{ width: 24, height: 24, borderRadius: 6, background: s.color }} />
                      </td>
                      <td>
                        <span className={`badge ${s.allowDouble ? "badge-success" : "badge-default"}`}>
                          {s.allowDouble ? "Ruxsat" : "Yo'q"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn btn-icon" onClick={() => openEdit(s)}>✏️</button>
                          <button className="btn btn-icon" onClick={() => setDeleteId(s.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editItem ? "Fan tahrirlash" : "Yangi fan"}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Fan nomi *</label>
                <input className="form-control" placeholder="Masalan: Matematika" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Haftalik soat</label>
                  <input className="form-control" type="number" min="1" max="20" value={form.weeklyHours}
                    onChange={e => setForm({ ...form, weeklyHours: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Turi</label>
                  <select className="form-control" value={form.type}
                    onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option>Oddiy</option>
                    <option>Guruhli</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Ta'lim tili</label>
                <select className="form-control" value={form.lang}
                  onChange={e => setForm({ ...form, lang: e.target.value })}>
                  <option value="uz">🇺🇿 O'zbek tili</option>
                  <option value="ru">🇷🇺 Rus tili</option>
                </select>
              </div>
              <div className="form-group">
                <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                  <input type="checkbox" checked={form.allowDouble} onChange={e => setForm({ ...form, allowDouble: e.target.checked })} style={{ marginTop: 3 }} />
                  <span>
                    <b>Ketma-ket 2 soatga ruxsat</b>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Masalan: Informatika, laboratoriya yoki jismoniy tarbiya uchun kerak bo'lsa yoqing.</div>
                  </span>
                </label>
              </div>
              <div className="form-group">
                <label className="form-label">Fan rangi</label>
                <div className="color-picker-row">
                  {SUBJECT_COLORS.map(c => (
                    <div key={c} className={`color-option ${form.color === c ? "selected" : ""}`}
                      style={{ background: c }} onClick={() => setForm({ ...form, color: c })} />
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Bekor</button>
              <button className="btn btn-primary" onClick={handleSave}>
                {editItem ? "Saqlash" : "Qo'shish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <ConfirmModal
          message="Bu fanni o'chirmoqchimisiz?"
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}
