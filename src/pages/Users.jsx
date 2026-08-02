import { useState, useEffect } from "react";
import {
  fetchAllUsers, adminCreateUser, adminSetStatus, adminSetRole,
  adminUpdateProfile, adminDeleteUser,
  activateSubscription, deactivateSubscription,
  updateOwnProfile,
  adminResetPassword, adminSetPhone, formatPhone,
} from "../services/authService";
import {
  fetchDistricts, createDistrict, deleteDistrict, assignUserDistrict,
  adminSetLocation,
} from "../services/districtService";
import { UZ_REGIONS, districtsOf } from "../utils/uzRegions";

// =====================================================================
//  FOYDALANUVCHILAR (Superadmin paneli)
//
//  YANGI (District Admin v1):
//  - 🏛 Tumanlar boshqaruvi: yaratish / o'chirish
//  - Rol tanlovida "Tuman admini" (district_admin) paydo bo'ldi
//  - Har bir foydalanuvchini tumanga biriktirish mumkin
//  - "🔑 Parol" o'rnatilganda foydalanuvchi birinchi kirishda
//    yangi parol qo'yishi MAJBURIY bo'ladi (must_change_password)
// =====================================================================
export default function UsersPage({ currentUser, toast }) {
  const [users, setUsers] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", schoolName: "", phone: "", role: "user" });
  const [showForm, setShowForm] = useState(false);

  // Tumanlar boshqaruvi — viloyat tanlanadi, tumanlar tayyor
  // O'zbekiston ro'yxatidan qo'shiladi
  const [showDistricts, setShowDistricts] = useState(false);
  const [selRegion, setSelRegion] = useState("");

  // Tahrirlash
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "", email: "", password: "", schoolName: "", phone: "",
    region: "", district: "",
  });

  // Parol yangilash oynasi
  const [pwUser, setPwUser] = useState(null);
  const [pwValue, setPwValue] = useState("");

  // Qidiruv (ID / email / ism / maktab bo'yicha)
  const [query, setQuery] = useState("");
  // Obuna filtri: all | active | expired | unpaid
  const [subFilter, setSubFilter] = useState("all");
  // Viloyat/tuman filtri
  const [filterRegion, setFilterRegion] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);
      const [list, dList] = await Promise.all([fetchAllUsers(), fetchDistricts()]);
      setUsers(list);
      setDistricts(dList);
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

  function changeDistrict(user, districtId) {
    run(
      () => assignUserDistrict(user.id, districtId || null),
      districtId ? "Tumanga biriktirildi ✓" : "Tumandan chiqarildi"
    );
  }

  function grantDays(user, days) {
    run(() => activateSubscription(user.id, days), `${user.name}: obuna ${days} kunga faollashtirildi ✓`);
  }

  function revokeSub(user) {
    if (!confirm(`${user.email} obunasi bekor qilinsinmi? Platforma u uchun bloklanadi.`)) return;
    run(() => deactivateSubscription(user.id), "Obuna bekor qilindi", "warning");
  }

  // ------------------------------------------------------------------
  //  TUMANLAR BOSHQARUVI — O'zbekiston ro'yxatidan qo'shiladi
  // ------------------------------------------------------------------
  function isDistrictAdded(regionName, districtName) {
    return districts.some((d) => d.name === districtName && d.region === regionName);
  }

  function addDistrictFromList(regionName, districtName) {
    if (isDistrictAdded(regionName, districtName)) return;
    run(async () => {
      await createDistrict(districtName, regionName);
    }, `"${districtName}" qo'shildi ✓`);
  }

  function handleDeleteDistrict(d) {
    const linked = users.filter((u) => u.districtId === d.id).length;
    const warn = linked
      ? `\nDIQQAT: ${linked} ta foydalanuvchi shu tumanga biriktirilgan — ular tumandan chiqariladi (o'chirilmaydi).`
      : "";
    if (!confirm(`"${d.name}" tumani o'chirilsinmi?${warn}`)) return;
    run(() => deleteDistrict(d.id), "Tuman o'chirildi", "warning");
  }

  function districtName(id) {
    return districts.find((d) => d.id === id)?.name || "—";
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
      toast(`Vaqtinchalik parol o'rnatildi: ${shown} — foydalanuvchi kirganda yangi parol qo'yishi majburiy`, "success");
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
      region: u.regionName || "", district: u.districtName || "",
    });
    setShowForm(false);
    setPwUser(null);
  }

  function handleEditSave() {
    const isSelf = editUser.id === currentUser.id;
    const name = editForm.name.trim();
    if (!name) return toast("Ism kiriting", "warning");
    if (editForm.region && !editForm.district) {
      return toast("Tumanni ham tanlang", "warning");
    }

    // Viloyat/tuman o'zgarganda serverga yozamiz; tuman tizimda
    // mavjud bo'lsa district_id ham avtomatik bog'lanadi (RPC ichida)
    const locChanged =
      editForm.region !== (editUser.regionName || "") ||
      editForm.district !== (editUser.districtName || "");

    if (isSelf) {
      if (!editForm.email.trim().includes("@")) return toast("Email noto'g'ri", "warning");
      run(async () => {
        await updateOwnProfile(editForm);
        if (locChanged && editForm.region) {
          await adminSetLocation(editUser.id, editForm.region, editForm.district);
        }
        setEditUser(null);
        toast("Ma'lumotlaringiz yangilandi ✓ Sahifa yangilanmoqda...", "success");
        setTimeout(() => window.location.reload(), 900);
      });
    } else {
      run(async () => {
        await adminUpdateProfile(editUser.id, name, editForm.schoolName);
        await adminSetPhone(editUser.id, editForm.phone);
        if (locChanged && editForm.region) {
          await adminSetLocation(editUser.id, editForm.region, editForm.district);
        }
        setEditUser(null);
      }, "Foydalanuvchi yangilandi ✓");
    }
  }

  // ------------------------------------------------------------------
  //  OBUNA HOLATI — filtr va belgi (badge) uchun yagona manba
  //  Qaytaradi: 'admin' | 'active' | 'expired' | 'unpaid'
  // ------------------------------------------------------------------
  function subState(u) {
    if (u.role === "superadmin" || u.role === "district_admin") return "admin";
    const sub = u.subscription || {};
    if (sub.status === "active") {
      if (sub.expiresAt && Date.now() > sub.expiresAt) return "expired";
      return "active";
    }
    if (sub.status === "expired") return "expired";
    return "unpaid";
  }

  function subLabel(u) {
    const st = subState(u);
    if (st === "admin") {
      return u.role === "district_admin"
        ? { text: "Tuman admini", cls: "badge-info" }
        : { text: "Admin", cls: "badge-info" };
    }
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
  // ------------------------------------------------------------------
  const q = query.trim().toLowerCase();

  const counts = { all: users.length, active: 0, expired: 0, unpaid: 0 };
  for (const u of users) {
    const st = subState(u);
    if (st in counts) counts[st] += 1;
  }

  const shownUsers = users.filter((u) => {
    if (subFilter !== "all" && subState(u) !== subFilter) return false;
    // Viloyat/tuman filtri
    if (filterRegion && (u.regionName || "") !== filterRegion) return false;
    if (filterDistrict && (u.districtName || "") !== filterDistrict) return false;
    if (!q) return true;
    if (
      [u.uid, u.email, u.name, u.schoolName]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    ) return true;
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
          <div className="page-subtitle">Super Admin paneli: user yaratish, bloklash, rol, tuman va parol boshqaruvi</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn-secondary" onClick={loadUsers} disabled={loading}>⟳ Yangilash</button>
          <button
            className="btn btn-secondary"
            onClick={() => { setShowDistricts(!showDistricts); setShowForm(false); setEditUser(null); setPwUser(null); }}
          >
            🏛 Tumanlar ({districts.length})
          </button>
          <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setShowDistricts(false); setEditUser(null); setPwUser(null); }}>＋ Foydalanuvchi yaratish</button>
        </div>
      </div>

      <div className="page-body">
        {/* ---------------- TUMANLAR BOSHQARUVI ---------------- */}
        {showDistricts && (
          <div className="card" style={{ marginBottom: 18, border: "2px solid #2563eb" }}>
            <div className="card-body">
              <div style={{ fontWeight: 800, marginBottom: 4 }}>🏛 Tumanlar boshqaruvi</div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 14 }}>
                Viloyatni tanlang — O'zbekistonning tayyor tumanlar ro'yxati chiqadi.
                Kerakli tumanni bosib tizimga qo'shing, so'ng foydalanuvchilar jadvalidagi
                "Tuman" ustuni orqali tuman adminini biriktiring.
                Maktablar ro'yxatdan o'tishda o'z tumanini tanlasa, tizimda mavjud
                tumanga AVTOMATIK bog'lanadi.
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Viloyat / shahar</label>
                  <select
                    className="form-control"
                    value={selRegion}
                    onChange={(e) => setSelRegion(e.target.value)}
                  >
                    <option value="">— Viloyatni tanlang —</option>
                    {UZ_REGIONS.map((r) => (
                      <option key={r.name} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" />
              </div>

              {selRegion && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--text-secondary)", marginBottom: 8 }}>
                    {selRegion} — tumanlar ({districtsOf(selRegion).length} ta).
                    Qo'shish uchun bosing:
                  </div>
                  <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                    {districtsOf(selRegion).map((dName) => {
                      const added = isDistrictAdded(selRegion, dName);
                      return (
                        <button
                          key={dName}
                          type="button"
                          disabled={added || busy}
                          onClick={() => addDistrictFromList(selRegion, dName)}
                          title={added ? "Allaqachon qo'shilgan" : "Tizimga qo'shish"}
                          style={{
                            height: 32, padding: "0 12px", borderRadius: 999,
                            fontSize: 12.5, fontWeight: 700,
                            cursor: added ? "default" : "pointer",
                            border: added ? "1.5px solid #10b981" : "1.5px solid var(--border, #e2e8f0)",
                            background: added ? "rgba(16,185,129,.1)" : "transparent",
                            color: added ? "#059669" : "var(--text-primary, #0f172a)",
                            transition: "all .15s",
                          }}
                        >
                          {added ? "✓ " : "＋ "}{dName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{ fontWeight: 800, fontSize: 13.5, marginBottom: 8 }}>
                Tizimga qo'shilgan tumanlar ({districts.length})
              </div>
              {districts.length === 0 ? (
                <div style={{ padding: "18px 10px", textAlign: "center", color: "var(--text-secondary)", fontSize: 13.5 }}>
                  Hali tuman qo'shilmagan — yuqoridan viloyat tanlab qo'shing
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Tuman</th>
                      <th>Viloyat / shahar</th>
                      <th>Tuman adminlari</th>
                      <th>Maktablar</th>
                      <th>Amallar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districts.map((d, i) => {
                      const admins = users.filter((u) => u.districtId === d.id && u.role === "district_admin");
                      const schoolsCount = users.filter((u) => u.districtId === d.id && u.role === "user").length;
                      return (
                        <tr key={d.id}>
                          <td>{i + 1}</td>
                          <td><strong>{d.name}</strong></td>
                          <td>{d.region || "—"}</td>
                          <td>
                            {admins.length === 0
                              ? <span className="badge badge-warning">Biriktirilmagan</span>
                              : admins.map((a) => (
                                  <div key={a.id} style={{ fontSize: 12.5 }}>👤 {a.name || a.email}</div>
                                ))}
                          </td>
                          <td>{schoolsCount} ta</td>
                          <td>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteDistrict(d)} disabled={busy}>
                              O'chirish
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ---------------- PAROL YANGILASH OYNASI ---------------- */}
        {pwUser && (
          <div className="card" style={{ marginBottom: 18, border: "2px solid #f59e0b" }}>
            <div className="card-body">
              <div style={{ fontWeight: 800, marginBottom: 4 }}>
                🔑 Parolni yangilash: {pwUser.email}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginBottom: 12 }}>
                Bu VAQTINCHALIK parol bo'ladi — uni foydalanuvchiga o'zingiz yetkazing.
                Foydalanuvchi shu parol bilan kirganda tizim undan darhol yangi parol
                o'rnatishni majburiy talab qiladi.
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Vaqtinchalik parol</label>
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
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Viloyat / shahar</label>
                  <select
                    className="form-control"
                    value={editForm.region}
                    onChange={e => setEditForm({ ...editForm, region: e.target.value, district: "" })}
                  >
                    <option value="">— Tanlanmagan —</option>
                    {UZ_REGIONS.map((r) => (
                      <option key={r.name} value={r.name}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tuman</label>
                  <select
                    className="form-control"
                    value={editForm.district}
                    onChange={e => setEditForm({ ...editForm, district: e.target.value })}
                    disabled={!editForm.region}
                  >
                    <option value="">
                      {editForm.region ? "— Tumanni tanlang —" : "Avval viloyatni tanlang"}
                    </option>
                    {districtsOf(editForm.region).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
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
                    <option value="user">Foydalanuvchi (maktab)</option>
                    <option value="district_admin">Tuman admini</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
                <div className="form-group" style={{ display: "flex", alignItems: "end", gap: 8 }}>
                  <button className="btn btn-primary" onClick={handleCreate} disabled={busy}>{busy ? "Yaratilmoqda..." : "Saqlash"}</button>
                  <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Bekor</button>
                </div>
              </div>
              {form.role === "district_admin" && (
                <div style={{
                  fontSize: 12.5, color: "var(--text-secondary)",
                  padding: "9px 12px", borderRadius: 10,
                  background: "rgba(37,99,235,.07)", border: "1px solid rgba(37,99,235,.2)",
                }}>
                  ℹ️ Tuman admini yaratilgach, jadvaldagi <b>Tuman</b> ustuni orqali
                  uni tumanga biriktirishni unutmang — aks holda paneli bo'sh ko'rinadi.
                </div>
              )}
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
                {(q || subFilter !== "all" || filterRegion || filterDistrict)
                  ? `${shownUsers.length} / ${users.length} foydalanuvchi`
                  : `Jami: ${users.length} foydalanuvchi`}
              </div>
            </div>

            {/* ---------------- VILOYAT / TUMAN FILTRI ---------------- */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              flexWrap: "wrap", marginBottom: 14,
            }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--text-secondary)" }}>
                📍 Hudud:
              </span>
              <select
                className="form-control"
                style={{ maxWidth: 230, height: 36 }}
                value={filterRegion}
                onChange={(e) => { setFilterRegion(e.target.value); setFilterDistrict(""); }}
              >
                <option value="">Barcha viloyatlar</option>
                {UZ_REGIONS.map((r) => (
                  <option key={r.name} value={r.name}>{r.name}</option>
                ))}
              </select>
              <select
                className="form-control"
                style={{ maxWidth: 230, height: 36, opacity: filterRegion ? 1 : .55 }}
                value={filterDistrict}
                onChange={(e) => setFilterDistrict(e.target.value)}
                disabled={!filterRegion}
              >
                <option value="">
                  {filterRegion ? "Barcha tumanlar" : "Avval viloyatni tanlang"}
                </option>
                {districtsOf(filterRegion).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {(filterRegion || filterDistrict) && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => { setFilterRegion(""); setFilterDistrict(""); }}
                >
                  × Tozalash
                </button>
              )}
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
                  <th>Tuman</th>
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
                        <option value="district_admin">Tuman admini</option>
                        <option value="superadmin">Super Admin</option>
                      </select>
                    </td>
                    <td>
                      {u.role === "superadmin" ? (
                        <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>—</span>
                      ) : (
                        <select
                          className="form-control"
                          value={u.districtId || ""}
                          onChange={(e) => changeDistrict(u, e.target.value)}
                          style={{ maxWidth: 170 }}
                          disabled={busy}
                        >
                          <option value="">— Tanlanmagan —</option>
                          {districts.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      )}
                      {(u.regionName || u.districtName) && (
                        <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 4 }}>
                          📍 {[u.regionName, u.districtName].filter(Boolean).join(" · ")}
                        </div>
                      )}
                      {u.role === "district_admin" && !u.districtId && (
                        <div style={{ fontSize: 11, color: "#dc2626", fontWeight: 700, marginTop: 3 }}>
                          ⚠️ Tuman biriktirilmagan!
                        </div>
                      )}
                      {u.role === "user" && !u.districtId && u.districtName && (
                        <div style={{ fontSize: 11, color: "#b45309", fontWeight: 700, marginTop: 3 }}>
                          ⚠️ "{u.districtName}" hali tizimga qo'shilmagan
                        </div>
                      )}
                    </td>
                    <td>
                      {(() => { const b = subLabel(u); return <span className={`badge ${b.cls}`}>{b.text}</span>; })()}
                      {u.role === "user" && (
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
                    <td colSpan={8} style={{
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
