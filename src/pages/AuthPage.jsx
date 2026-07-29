import { useState, useEffect } from "react";
import {
  login,
  registerUser,
  sendPasswordReset,
  completePasswordReset,
  clearRecoveryUrl,
} from "../services/authService";
import "../styles/auth.css";

// =====================================================================
//  KIRISH / RO'YXATDAN O'TISH / PAROLNI TIKLASH
//
//  Rejimlar:
//    login    — email + parol bilan kirish (qurilma cheklovi YO'Q)
//    register — yangi hisob ochish
//    forgot   — emailga tiklash havolasini yuborish
//    reset    — havoladan kelgan foydalanuvchi yangi parol o'rnatadi
// =====================================================================
export default function AuthPage({ onAuth, initialMode = "login" }) {
  const savedEmail = localStorage.getItem("edu_remember_email") || "";
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: "", email: savedEmail, password: "", schoolName: "" });
  const [newPass, setNewPass] = useState({ a: "", b: "" });
  const [remember, setRemember] = useState(!!savedEmail);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  // Tiklash rejimida ochilsa, URL'dagi tokenni ko'rinmas qilamiz
  useEffect(() => {
    if (initialMode === "reset") {
      setInfo("Yangi parolingizni kiriting.");
    }
  }, [initialMode]);

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    clearMsgs();
  }

  function clearMsgs() {
    setError("");
    setSuccess("");
    setInfo("");
  }

  function switchMode(next) {
    setMode(next);
    clearMsgs();
  }

  // ------------------------------------------------------------------
  //  KIRISH
  // ------------------------------------------------------------------
  async function handleLogin(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const user = await login(form.email, form.password);
      if (remember) localStorage.setItem("edu_remember_email", form.email);
      else localStorage.removeItem("edu_remember_email");
      onAuth(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------------
  //  RO'YXATDAN O'TISH
  // ------------------------------------------------------------------
  async function handleRegister(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await registerUser(form);
      setMode("login");
      setSuccess("Ro'yxatdan o'tdingiz. Endi login qiling.");
      setForm(prev => ({ ...prev, password: "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------------
  //  PAROLNI UNUTDIM -> EMAILGA HAVOLA
  // ------------------------------------------------------------------
  async function handleForgot(e) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      await sendPasswordReset(form.email);
      setSuccess(
        "Tiklash havolasi yuborildi. Pochtangizni (va \"Spam\" papkasini) tekshiring."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ------------------------------------------------------------------
  //  YANGI PAROLNI O'RNATISH
  // ------------------------------------------------------------------
  async function handleReset(e) {
    e.preventDefault();
    if (loading) return;
    if (newPass.a !== newPass.b) {
      setError("Parollar mos kelmadi");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await completePasswordReset(newPass.a);
      clearRecoveryUrl();
      setNewPass({ a: "", b: "" });
      setMode("login");
      setSuccess("Parol yangilandi! Endi yangi parol bilan kiring.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const isLogin = mode === "login";
  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";

  const submitHandler = isLogin
    ? handleLogin
    : isRegister
    ? handleRegister
    : isForgot
    ? handleForgot
    : handleReset;

  return (
    <div className="edu-auth">
      {/* Fon bezaklari */}
      <div className="edu-bg-circle edu-bg-circle--1" />
      <div className="edu-bg-circle edu-bg-circle--2" />
      <div className="edu-bg-ring edu-bg-ring--1" />
      <div className="edu-bg-ring edu-bg-ring--2" />

      {/* Chap tomondagi 3D elementlar */}
      <div className="edu-deco edu-deco--left" aria-hidden="true">
        <div className="edu-clock">
          <span className="edu-clock__hand edu-clock__hand--h" />
          <span className="edu-clock__hand edu-clock__hand--m" />
        </div>
        <div className="edu-board">
          <div className="edu-board__top"><i /><i /><i /></div>
          <div className="edu-board__grid">
            <span className="c1" /><span /><span className="c2" /><span /><span />
            <span /><span className="c3" /><span /><span /><span className="c4" />
            <span className="c2" /><span /><span /><span className="c1" /><span />
          </div>
          <div className="edu-board__check">✓</div>
        </div>
        <div className="edu-cup">
          <span className="edu-pencil edu-pencil--1" />
          <span className="edu-pencil edu-pencil--2" />
          <span className="edu-pencil edu-pencil--3" />
          <div className="edu-cup__body" />
        </div>
        <div className="edu-books">
          <div className="edu-book edu-book--top" />
          <div className="edu-book edu-book--bottom" />
        </div>
      </div>

      {/* O'ng tomondagi 3D elementlar */}
      <div className="edu-deco edu-deco--right" aria-hidden="true">
        <div className="edu-chart">
          <span className="edu-chart__bar edu-chart__bar--g" />
          <span className="edu-chart__bar edu-chart__bar--o" />
          <span className="edu-chart__bar edu-chart__bar--p" />
        </div>
        <div className="edu-calicon">
          <div className="edu-calicon__page">
            <span className="edu-calicon__ring" />
            <span className="edu-calicon__ring" />
          </div>
        </div>
      </div>

      <div className="edu-center">
        <div className="edu-card">
          <div className="edu-card__brand">
            <img
              className="edu-card__logoimg"
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Edujadval.uz"
            />
          </div>

          {/* Tablar faqat login/register rejimida ko'rinadi */}
          {(isLogin || isRegister) && (
            <div className="edu-tabs">
              <button
                type="button"
                className={`edu-tabs__btn ${isLogin ? "edu-tabs__btn--active" : ""}`}
                onClick={() => switchMode("login")}
              >
                Kirish
              </button>
              <button
                type="button"
                className={`edu-tabs__btn ${isRegister ? "edu-tabs__btn--active" : ""}`}
                onClick={() => switchMode("register")}
              >
                Ro'yxatdan o'tish
              </button>
            </div>
          )}

          {/* Tiklash rejimlarining sarlavhasi */}
          {isForgot && (
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 34, marginBottom: 4 }}>🔑</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                Parolni tiklash
              </div>
              <div style={{ fontSize: 13.5, color: "#64748b", marginTop: 4 }}>
                Email manzilingizni kiriting — tiklash havolasini yuboramiz.
              </div>
            </div>
          )}

          {isReset && (
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 34, marginBottom: 4 }}>🔒</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                Yangi parol o'rnatish
              </div>
            </div>
          )}

          {error && <div className="edu-alert edu-alert--warn">⚠️ {error}</div>}
          {success && <div className="edu-alert edu-alert--ok">✅ {success}</div>}
          {info && <div className="edu-alert edu-alert--info">ℹ️ {info}</div>}

          <form onSubmit={submitHandler} className="edu-form">
            {/* --- Ro'yxatdan o'tishdagi qo'shimcha maydonlar --- */}
            {isRegister && (
              <>
                <div className="edu-field">
                  <label className="edu-field__label">ISM FAMILIYA</label>
                  <div className="edu-field__wrap">
                    <span className="edu-field__icon">👤</span>
                    <input
                      className="edu-field__input"
                      value={form.name}
                      onChange={e => update("name", e.target.value)}
                      placeholder="Asliddin Munavvarov"
                    />
                  </div>
                </div>
                <div className="edu-field">
                  <label className="edu-field__label">MAKTAB NOMI</label>
                  <div className="edu-field__wrap">
                    <span className="edu-field__icon">🏫</span>
                    <input
                      className="edu-field__input"
                      value={form.schoolName}
                      onChange={e => update("schoolName", e.target.value)}
                      placeholder="Turon odob-ilm maktabi"
                    />
                  </div>
                </div>
              </>
            )}

            {/* --- Email (reset rejimidan tashqari hamma joyda) --- */}
            {!isReset && (
              <div className="edu-field">
                <label className="edu-field__label">EMAIL</label>
                <div className="edu-field__wrap">
                  <span className="edu-field__icon">✉️</span>
                  <input
                    className="edu-field__input"
                    type="email"
                    value={form.email}
                    onChange={e => update("email", e.target.value)}
                    placeholder="email@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>
            )}

            {/* --- Parol (forgot rejimida kerak emas) --- */}
            {(isLogin || isRegister) && (
              <div className="edu-field">
                <label className="edu-field__label">PAROL</label>
                <div className="edu-field__wrap">
                  <span className="edu-field__icon">🔒</span>
                  <input
                    className="edu-field__input edu-field__input--pass"
                    type={showPass ? "text" : "password"}
                    value={form.password}
                    onChange={e => update("password", e.target.value)}
                    placeholder="Kamida 6 belgi"
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    className="edu-field__eye"
                    onClick={() => setShowPass(v => !v)}
                    title={showPass ? "Parolni yashirish" : "Parolni ko'rsatish"}
                  >
                    {showPass ? "🙈" : "👁️"}
                  </button>
                </div>
              </div>
            )}

            {/* --- Yangi parol maydonlari (reset rejimi) --- */}
            {isReset && (
              <>
                <div className="edu-field">
                  <label className="edu-field__label">YANGI PAROL</label>
                  <div className="edu-field__wrap">
                    <span className="edu-field__icon">🔒</span>
                    <input
                      className="edu-field__input edu-field__input--pass"
                      type={showPass ? "text" : "password"}
                      value={newPass.a}
                      onChange={e => { setNewPass(p => ({ ...p, a: e.target.value })); clearMsgs(); }}
                      placeholder="Kamida 6 belgi"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="edu-field__eye"
                      onClick={() => setShowPass(v => !v)}
                    >
                      {showPass ? "🙈" : "👁️"}
                    </button>
                  </div>
                </div>
                <div className="edu-field">
                  <label className="edu-field__label">PAROLNI TAKRORLANG</label>
                  <div className="edu-field__wrap">
                    <span className="edu-field__icon">🔁</span>
                    <input
                      className="edu-field__input"
                      type={showPass ? "text" : "password"}
                      value={newPass.b}
                      onChange={e => { setNewPass(p => ({ ...p, b: e.target.value })); clearMsgs(); }}
                      placeholder="Yana bir marta"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </>
            )}

            {/* --- Eslab qolish + parolni unutdingizmi --- */}
            {isLogin && (
              <div className="edu-row">
                <label className="edu-remember">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                  />
                  <span>Meni eslab qolish</span>
                </label>
                <button
                  type="button"
                  className="edu-forgot"
                  onClick={() => switchMode("forgot")}
                >
                  Parolni unutdingizmi?
                </button>
              </div>
            )}

            <button className="edu-submit" type="submit" disabled={loading}>
              {isLogin && (loading ? "Tekshirilmoqda..." : "Kirish")}
              {isRegister && (loading ? "Yaratilmoqda..." : "Ro'yxatdan o'tish")}
              {isForgot && (loading ? "Yuborilmoqda..." : "Tiklash havolasini yuborish")}
              {isReset && (loading ? "Saqlanmoqda..." : "Parolni saqlash")}
            </button>
          </form>

          {/* --- Orqaga qaytish + admin yordami --- */}
          {isForgot && (
            <>
              <button
                type="button"
                className="edu-forgot"
                style={{ display: "block", margin: "14px auto 0" }}
                onClick={() => switchMode("login")}
              >
                ← Kirish sahifasiga qaytish
              </button>
              <div style={{
                marginTop: 14, padding: "11px 14px", borderRadius: 12,
                background: "#f8fafc", border: "1px solid #e2e8f0",
                fontSize: 12.5, color: "#475569", lineHeight: 1.6, textAlign: "center",
              }}>
                Xat kelmadimi? Administrator ham parolingizni tiklab bera oladi:{" "}
                <a
                  href="https://t.me/+998941366667"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#4f46e5", fontWeight: 700 }}
                >
                  Asliddin_Muhiddinovich ✈️
                </a>
              </div>
            </>
          )}

          {isReset && (
            <button
              type="button"
              className="edu-forgot"
              style={{ display: "block", margin: "14px auto 0" }}
              onClick={() => { clearRecoveryUrl(); switchMode("login"); }}
            >
              ← Bekor qilish
            </button>
          )}
        </div>

        <div className="edu-footer">
          © 2026 Edujadval.uz. Barcha huquqlar himoyalangan. · Admin: Asliddin_Muhiddinovich
        </div>
      </div>
    </div>
  );
}
