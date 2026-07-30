import { useState, useEffect } from "react";
import {
  fetchAllUsers, adminCreateUser, adminSetStatus, adminSetRole,
  adminUpdateProfile, adminDeleteUser,
  activateSubscription, deactivateSubscription,
  updateOwnProfile,
  adminResetPassword, adminSetPhone, formatPhone,
} from "../services/authService";

// =====================================================================
//  FOYDALANUVCHILAR (Superadmin paneli)
//
//  O'ZGARISHLAR:
//  - Qurilma bog'lash/tiklash butunlay olib tashlandi (cheklov yo'q).
//  - "🔑 Parol" — superadmin foydalanuvchiga yangi parol o'rnatadi
//    (Edge Function orqali).
//  - Email orqali tiklash ishlatilmaydi: parolni faqat superadmin
//    o'rnatadi va foydalanuvchiga o'zi yetkazadi.
// =====================================================================
export default function UsersPage({ currentUser, toast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", schoolName: "", phone: "", role: "user" });
  const [showForm, setShowForm] = useState(false);

  // Tahrirlash
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", schoolName: "", phone: "" });

  // Parol yangilash oynasi
  const [pwUser, setPwUser] = useState(null);
  const [pwValue, setPwValue] = useState("");

  // Qidiruv (ID / email / ism / maktab bo'yicha)
  const [query, setQuery] = useState("");
  // Obuna filtri: all | active | expired | unpaid
  const [subFilter, setSubFilter] = useState("all");

  async function loadUsers() {
    try {
      setLoading(true);
      const list = await fetchAllUsers();
      setUsers(list);
    } catch (err) {
      toast(err.message, "warning");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run(action, okMsg, okType = "success") {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      if (okMsg) toast(okMsg, okType);
      await loadUsers();
    } catch (err) {
      toast(err.message, "warning");
    } finally {
      setBusy(false);
    }
  }

  function handleCreate() {
    const { name, email, password } = form;
    if (!name.trim()) return toast("Ism kiriting", "warning");
    if (!email.includes("@")) return toast("Email noto'g'ri", "warning");
    if (password.length < 6) return toast("Parol kamida 6 ta belgi bo'lsin", "warning");
    run(async () => {
      await adminCreateUser(form);
      // admin_create_user telefonni qabul qilmaydi — yaratilgach alohida yozamiz
      if (form.phone.trim()) {
        const list = await fetchAllUsers();
        const created = list.find(
          (u) => (u.email || "").toLowerCase() === email.trim().toLowerCase()
        );
        if (created) await adminSetPhone(created.id, form.phone);
      }
      setShowForm(false);
      setForm({ name: "", email: "", password: "", schoolName: "", phone: "", role: "user" });
    }, "Foydalanuvchi yaratildi ✓");
  }

  function toggleStatus(user) {
    if (user.id === currentUser.id) return toast("O'zingizni bloklay olmaysiz", "warning");
    const next = user.status === "active" ? "blocked" : "active";
    run(() => adminSetStatus(user.id, next), "Status yangilandi");
  }

  function removeUser(user) {
    if (user.id === currentUser.id) return toast("O'zingizni o'chira olmaysiz", "warning");
    if (!confirm(`${user.email} butunlay o'chirilsinmi?\nBu amalni qaytarib bo'lmaydi.`)) return;
    run(() => adminDeleteUser(user.id), "Foydalanuvchi o'chirildi", "error");
  }

  function changeRole(user, role) {
    if (user.id === currentUser.id) return toast("O'zingizning rolingizni o'zgartira olmaysiz", "warning");
    run(() => adminSetRole(user.id, role), "Rol yangilandi");
  }

  function grantDays(user, days) {
    run(() => activateSubscription(user.id, days), `${user.name}: obuna ${days} kunga faollashtirildi ✓`);
  }

  function revokeSub(user) {
    if (!confirm(`${user.email} obunasi bekor qilinsinmi? Platforma u uchun bloklanadi.`)) return;
    run(() => deactivateSubscription(user.id), "Obuna bekor qilindi", "warning");
  }

  // ------------------------------------------------------------------
  //  PAROL BOSHQARUVI
  // ------------------------------------------------------------------
  function startPwReset(u) {
    setPwUser(u);
    setPwValue("");
    setEditUser(null);
    setShowForm(false);
  }

  function savePassword() {
    if (pwValue.length < 6) return toast("Parol kamida 6 ta belgi bo'lsin", "warning");
    run(async () => {
      await adminResetPassword(pwUser.id, pwValue);
      const shown = pwValue;
      setPwUser(null);
      setPwValue("");
      toast(`Parol o'rnatildi. Foydalanuvchiga yuboring: ${shown}`, "success");
    });
  }

  // ------------------------------------------------------------------
  //  TAHRIRLASH
  // ------------------------------------------------------------------
  function startEdit(u) {
    setEditUser(u);
    setEditForm({
      name: u.name || "", email: u.email || "", password: "",
      schoolName: u.schoolName || "", phone: u.phone || "",
    });
    setShowForm(false);
    setPwUser(null);
  }

  function handleEditSave() {
    const isSelf = editUser.id === currentUser.id;
    const name = editForm.name.trim();
    if (!name) return toast("Ism kiriting", "warning");

    if (isSelf) {
      if (!editForm.email.trim().includes("@")) return toast("Email noto'g'ri", "warning");
      run(async () => {
        await updateOwnProfile(editForm);
        setEditUser(null);
        toast("Ma'lumotlaringiz yangilandi ✓ Sahifa yangilanmoqda...", "success");
        setTimeout(() => window.location.reload(), 900);
      });
    } else {
      run(async () => {
        await adminUpdateProfile(editUser.id, name, editForm.schoolName);
        await adminSetPhone(editUser.id, editForm.phone);
        setEditUser(null);
      }, "Foydalanuvchi yangilandi ✓");
    }
  }

  // ------------------------------------------------------------------
  //  OBUNA HOLATI — filtr va belgi (badge) uchun yagona manba
  //  Qaytaradi: 'admin' | 'active' | 'expired' | 'unpaid'
  // ------------------------------------------------------------------
  function subState(u) {
    if (u.role === "superadmin") return "admin";
    const sub = u.subscription || {};
    if (sub.status === "active") {
      // Muddati o'tib ketgan bo'lsa, serverda hali 'active' turgan bo'lishi mumkin
      if (sub.expiresAt && Date.now() > sub.expiresAt) return "expired";
      return "active";
    }
    if (sub.status === "expired") return "expired";
    return "unpaid";
  }

  function subLabel(u) {
    const st = subState(u);
    if (st === "admin") return { text: "Admin", cls: "badge-info" };
    if (st === "active") {
      const exp = u.subscription?.expiresAt;
      if (!exp) return { text: "Faol (muddatsiz)", cls: "badge-success" };
      const days = Math.ceil((exp - Date.now()) / 86400000);
      return { text: `Faol — ${days} kun qoldi`, cls: "badge-success" };
    }
    if (st === "expired") return { text: "Muddati tugagan", cls: "badge-warning" };
    return { text: "To'lov qilmagan", cls: "badge-danger" };
  }

  const isSelfEdit = editUser && editUser.id === currentUser.id;

  // ------------------------------------------------------------------
  //  QIDIRUV — EDU-ID, email, ism yoki maktab nomi bo'yicha
  //  Bo'sh joylar va katta-kichik harf farqi hisobga olinmaydi.
  // ------------------------------------------------------------------
  const q = query.trim().toLowerCase();

  // Har bir holat uchun nechta foydalanuvchi bor — chiplarda ko'rsatiladi
  const counts = { all: users.length, active: 0, expired: 0, unpaid: 0 };
  for (const u of users) {
    const st = subState(u);
    if (st in counts) counts[st] += 1;
  }

  const shownUsers = users.filter((u) => {
    // Obuna filtri
    if (subFilter !== "all" && subState(u) !== subFilter) return false;
    // Matn qidiruvi
    if (!q) return true;
    if (
      [u.uid, u.email, u.name, u.schoolName]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    ) return true;
    // Telefon: faqat raqamlar bo'yicha solishtiramiz, shunda
    // "901234567" ham, "+998 90 123" ham topadi
    const qDigits = q.replace(/\D/g, "");
    if (qDigits && u.phone) {
      return String(u.phone).replace(/\D/g, "").includes(qDigits);
    }
    return false;
  });

  const SUB_TABS = [
    { key: "all",     label: "Hammasi",        color: "#475569" },
    { key: "active",  label: "Obuna faol",     color: "#059669" },
    { key: "expired", label: "Muddati tugagan", color: "#b45309" },
    { key: "unpaid",  label: "To'lov qilmagan", color: "#dc2626" },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Foydalanuvchilar</div>
          <div className="page-subtitle">Super Admin paneli: user yaratish, bloklash, rol va parol boshqaruvi</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={loadUsers} disabled={loading}>⟳ Yangilash</button>
          <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditUser(null); setPwUser(null); }}>＋ Foydalanuvchi yaratish</button>
        </div>
      </div>

      <div className="page-body">
        {/* ---------------- PAROL YANGILASH OYNASI ---------------- */}
        {pwUser && (
          <div className="card" style={{ marginBottom: 18, border: "2px solid #f59e0b" }}>
            <div className="card-body">
              <div style={{ fontWeight: 800, marginBottom: 4 }}>
                🔑 Parolni yangilash: {pwUser.email}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 12 }}>
                Yangi parolni siz o'rnatasiz. Uni foydalanuvchiga o'zingiz yetkazing —
                keyin u Sozlamalar bo'limidan o'zgartirib olishi mumkin.
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Yangi parol</label>
                  <input
                    className="form-control"
                    value={pwValue}
                    onChange={e => setPwValue(e.target.value)}
                    placeholder="Kamida 6 belgi"
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group" style={{ display: "flex", alignItems: "end", gap: 8 }}>
                  <button className="btn btn-primary" onClick={savePassword} disabled={busy}>
                    {busy ? "Saqlanmoqda..." : "Parolni o'rnatish"}
                  </button>
                  <button className="btn btn-secondary" onClick={() => setPwUser(null)}>Bekor</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- TAHRIRLASH ---------------- */}
        {editUser && (
          <div className="card" style={{ marginBottom: 18, border: "2px solid #6366f1" }}>
            <div className="card-body">
              <div style={{ fontWeight: 800, marginBottom: 12 }}>
                ✏️ Tahrirlash: {editUser.email}
                {isSelfEdit && <span style={{ color: "#6366f1" }}> (bu — sizning hisobingiz)</span>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ism</label>
                  <input className="form-control" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Maktab</label>
                  <input className="form-control" value={editForm.schoolName} onChange={e => setEditForm({ ...editForm, schoolName: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Telefon raqam</label>
                  <input
                    className="form-control"
                    type="tel"
                    value={editForm.phone}
                    onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                  />
                </div>
                <div className="form-group" />
              </div>
              {isSelfEdit ? (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-control" type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Yangi parol <span style={{ fontWeight: 400, color: "var(--text-secondary)" }}>(bo'sh qoldirsangiz o'zgarmaydi)</span></label>
                    <input className="form-control" type="password" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} autoComplete="new-password" />
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 10 }}>
                  ℹ️ Parolni o'zgartirish uchun jadvaldagi <b>🔑 Parol</b> tugmasidan foydalaning.
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={handleEditSave} disabled={busy}>{busy ? "Saqlanmoqda..." : "Saqlash"}</button>
                <button className="btn btn-secondary" onClick={() => setEditUser(null)}>Bekor</button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- YANGI FOYDALANUVCHI ---------------- */}
        {showForm && (
          <div className="card" style={{ marginBottom: 18 }}>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Ism</label>
                  <input className="form-control" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Maktab</label>
                  <input className="form-control" value={form.schoolName} onChange={e => setForm({ ...form, schoolName: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Telefon raqam</label>
                  <input
                    className="form-control"
                    type="tel"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+998 90 123 45 67"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Parol</label>
                  <input className="form-control" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="form-group" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Rol</label>
                  <select className="form-control" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="user">Foydalanuvchi</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: "flex", alignItems: "end", gap: 8 }}>
                  <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>{busy ? "Yaratilmoqda..." : "Saqlash"}</button>
                  <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Bekor</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- JADVAL ---------------- */}
        <div className="card">
          <div className="card-body">
            {/* ---------------- QIDIRUV ---------------- */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              flexWrap: "wrap", marginBottom: 14,
            }}>
              <div style={{ position: "relative", flex: "1 1 280px", minWidth: 220 }}>
                <span style={{
                  position: "absolute", left: 12, top: "50%",
                  transform: "translateY(-50%)", fontSize: 15, opacity: .55,
                  pointerEvents: "none",
                }}>🔍</span>
                <input
                  className="form-control"
                  style={{ paddingLeft: 36, paddingRight: 34 }}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="EDU-ID, email, telefon, ism yoki maktab..."
                  autoComplete="off"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    title="Tozalash"
                    style={{
                      position: "absolute", right: 8, top: "50%",
                      transform: "translateY(-50%)", border: "none",
                      background: "transparent", cursor: "pointer",
                      fontSize: 16, lineHeight: 1, color: "var(--text-secondary)",
                      padding: 4,
                    }}
                  >×</button>
                )}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
                {(q || subFilter !== "all")
                  ? `${shownUsers.length} / ${users.length} foydalanuvchi`
                  : `Jami: ${users.length} foydalanuvchi`}
              </div>
            </div>

            {/* ---------------- OBUNA FILTRI ---------------- */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              {SUB_TABS.map((t) => {
                const on = subFilter === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setSubFilter(t.key)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 7,
                      height: 34, padding: "0 13px", borderRadius: 999,
                      border: on ? `1.5px solid ${t.color}` : "1.5px solid var(--border, #e2e8f0)",
                      background: on ? `${t.color}18` : "transparent",
                      color: on ? t.color : "var(--text-secondary)",
                      fontSize: 13, fontWeight: on ? 800 : 600,
                      cursor: "pointer", transition: "all .15s",
                    }}
                  >
                    {t.label}
                    <span style={{
                      minWidth: 20, padding: "1px 6px", borderRadius: 999,
                      background: on ? t.color : "var(--border, #e2e8f0)",
                      color: on ? "#fff" : "var(--text-secondary)",
                      fontSize: 11.5, fontWeight: 800, lineHeight: 1.5,
                    }}>
                      {counts[t.key]}
                    </span>
                  </button>
                );
              })}
            </div>

            {loading ? (
              <div style={{ padding: 30, textAlign: "center", color: "var(--text-secondary)" }}>
                Yuklanmoqda...
              </div>
            ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Foydalanuvchi</th>
                  <th>Maktab</th>
                  <th>Rol</th>
                  <th>Obuna</th>
                  <th>Status</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {shownUsers.map((u, i) => (
                  <tr key={u.id}>
                    <td>{i + 1}</td>
                    <td>
                      <strong>{u.name}</strong>
                      <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>{u.email}</div>
                      {u.phone && (
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          📞 <a href={`tel:${u.phone}`} style={{ color: "inherit", textDecoration: "none" }}>
                            {formatPhone(u.phone)}
                          </a>
                        </div>
                      )}
                      <div style={{ fontSize: 11.5, fontWeight: 800, color: "#6366f1", letterSpacing: .5 }}>{u.uid || "—"}</div>
                    </td>
                    <td>{u.schoolName || "—"}</td>
                    <td>
                      <select className="form-control" value={u.role} onChange={e => changeRole(u, e.target.value)} style={{ maxWidth: 150 }} disabled={busy}>
                        <option value="user">Foydalanuvchi</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    </td>
                    <td>
                      {(() => { const b = subLabel(u); return <span className={`badge ${b.cls}`}>{b.text}</span>; })()}
                      {u.role !== "superadmin" && (
                        <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
                          <button className="btn btn-success btn-sm" title="6 oyga faollashtirish (Standart)" onClick={() => grantDays(u, 180)} disabled={busy}>+6 oy</button>
                          <button className="btn btn-success btn-sm" title="1 yilga faollashtirish" onClick={() => grantDays(u, 365)} disabled={busy}>+1 yil</button>
                          {(u.subscription?.status === "active") && (
                            <button className="btn btn-warning btn-sm" title="Obunani bekor qilish" onClick={() => revokeSub(u)} disabled={busy}>Bekor</button>
                          )}
                        </div>
                      )}
                    </td>
                    <td><span className={`badge ${u.status === "active" ? "badge-success" : "badge-danger"}`}>{u.status === "active" ? "Faol" : "Bloklangan"}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button className="btn btn-info btn-sm" title="Ism va maktabni o'zgartirish" onClick={() => startEdit(u)} disabled={busy}>✏️ Tahrirlash</button>
                        <button className="btn btn-warning btn-sm" title="Yangi parol o'rnatish" onClick={() => startPwReset(u)} disabled={busy}>🔑 Parol</button>
                        <button className="btn btn-warning btn-sm" onClick={() => toggleStatus(u)} disabled={busy}>{u.status === "active" ? "Bloklash" : "Faollashtirish"}</button>
                        <button className="btn btn-danger btn-sm" onClick={() => removeUser(u)} disabled={busy}>O'chirish</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {shownUsers.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{
                      padding: "28px 10px", textAlign: "center",
                      color: "var(--text-secondary)", fontSize: 14,
                    }}>
                      🔍 {q
                        ? `"${query}" bo'yicha hech narsa topilmadi`
                        : "Bu holatda foydalanuvchi yo'q"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
