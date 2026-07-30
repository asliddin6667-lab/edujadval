import { useState, useEffect } from "react";
import {
  fetchAllUsers, adminCreateUser, adminSetStatus, adminSetRole,
  adminUpdateProfile, adminDeleteUser,
  activateSubscription, deactivateSubscription,
  updateOwnProfile,
  adminResetPassword,
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
  const [form, setForm] = useState({ name: "", email: "", password: "", schoolName: "", role: "user" });
  const [showForm, setShowForm] = useState(false);

  // Tahrirlash
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", schoolName: "" });

  // Parol yangilash oynasi
  const [pwUser, setPwUser] = useState(null);
  const [pwValue, setPwValue] = useState("");

  // Qidiruv (ID / email / ism / maktab bo'yicha)
  const [query, setQuery] = useState("");

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
      setShowForm(false);
      setForm({ name: "", email: "", password: "", schoolName: "", role: "user" });
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
    setEditForm({ name: u.name || "", email: u.email || "", password: "", schoolName: u.schoolName || "" });
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
        setEditUser(null);
      }, "Foydalanuvchi yangilandi ✓");
    }
  }

  function subLabel(u) {
    const sub = u.subscription || {};
    if (u.role === "superadmin") return { text: "Admin", cls: "badge-info" };
    if (sub.status === "active") {
      if (!sub.expiresAt) return { text: "Faol (muddatsiz)", cls: "badge-success" };
      if (Date.now() > sub.expiresAt) return { text: "Muddati tugagan", cls: "badge-warning" };
      const days = Math.ceil((sub.expiresAt - Date.now()) / 86400000);
      return { text: `Faol — ${days} kun qoldi`, cls: "badge-success" };
    }
    if (sub.status === "expired") return { text: "Muddati tugagan", cls: "badge-warning" };
    return { text: "To'lov qilmagan", cls: "badge-danger" };
  }

  const isSelfEdit = editUser && editUser.id === currentUser.id;

  // ------------------------------------------------------------------
  //  QIDIRUV — EDU-ID, email, ism yoki maktab nomi bo'yicha
  //  Bo'sh joylar va katta-kichik harf farqi hisobga olinmaydi.
  // ------------------------------------------------------------------
  const q = query.trim().toLowerCase();
  const shownUsers = !q
    ? users
    : users.filter((u) =>
        [u.uid, u.email, u.name, u.schoolName]
          .filter(Boolean)
          .some((field) => String(field).toLowerCase().includes(q))
      );

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
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Parol</label>
                  <input className="form-control" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                </div>
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
                  placeholder="EDU-ID, email, ism yoki maktab nomi..."
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
                {q
                  ? `${shownUsers.length} / ${users.length} foydalanuvchi`
                  : `Jami: ${users.length} foydalanuvchi`}
              </div>
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
                      🔍 "{query}" bo'yicha hech narsa topilmadi
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
