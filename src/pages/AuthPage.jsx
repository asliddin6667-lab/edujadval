import { useState } from "react";
import { login, registerUser } from "../services/authService";
import "../styles/auth.css";

// =====================================================================
//  KIRISH / RO'YXATDAN O'TISH
//
//  - Qurilma cheklovi YO'Q: istalgan kompyuter/telefondan kiriladi
//  - Email tasdiqlash YO'Q: ro'yxatdan o'tgan zahoti tizimga kiradi
//  - Parolni unutgan foydalanuvchini ADMIN tiklab beradi
//    (Foydalanuvchilar sahifasidagi "Parol" tugmasi orqali)
// =====================================================================

// Admin aloqa ma'lumotlari
const ADMIN_TELEGRAM = "https://t.me/+998941366667";
const ADMIN_PHONE = "+998 94 136 66 67";
const ADMIN_NAME = "Asliddin_Muhiddinovich";

export default function AuthPage({ onAuth, initialMode = "login" }) {
  const savedEmail = localStorage.getItem("edu_remember_email") || "";
  // Faqat login/register rejimlari mavjud; boshqasi kelsa login'ga tushadi
  const [mode, setMode] = useState(initialMode === "register" ? "register" : "login");
  const [form, setForm] = useState({ name: "", email: savedEmail, password: "", schoolName: "" });
  const [remember, setRemember] = useState(!!savedEmail);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  function clearMsgs() {
    setError("");
    setSuccess("");
    setInfo("");
  }

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    clearMsgs();
  }

  function switchMode(next) {
    setMode(next);
    setShowHelp(false);
    clearMsgs();
  }

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

  const isLogin = mode === "login";

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
              className={`edu-tabs__btn ${!isLogin ? "edu-tabs__btn--active" : ""}`}
              onClick={() => switchMode("register")}
            >
              Ro'yxatdan o'tish
            </button>
          </div>

          {error && <div className="edu-alert edu-alert--warn">⚠️ {error}</div>}
          {success && <div className="edu-alert edu-alert--ok">✅ {success}</div>}
          {info && <div className="edu-alert edu-alert--info">ℹ️ {info}</div>}

          <form onSubmit={isLogin ? handleLogin : handleRegister} className="edu-form">
            {!isLogin && (
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
                  onClick={() => setShowHelp(v => !v)}
                >
                  Parolni unutdingizmi?
                </button>
              </div>
            )}

            <button className="edu-submit" type="submit" disabled={loading}>
              {isLogin
                ? (loading ? "Tekshirilmoqda..." : "Kirish")
                : (loading ? "Yaratilmoqda..." : "Ro'yxatdan o'tish")}
            </button>
          </form>

          {/* Parolni tiklash yordami — administrator orqali */}
          {isLogin && showHelp && (
            <div style={{
              marginTop: 14, padding: "13px 15px", borderRadius: 12,
              background: "#f8fafc", border: "1px solid #e2e8f0",
              fontSize: 13, color: "#475569", lineHeight: 1.7,
            }}>
              <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: 5 }}>
                🔑 Parolni administrator tiklab beradi
              </div>
              Quyidagi manzilga murojaat qiling — ismingiz va email
              manzilingizni yozing, yangi parol beriladi.
              <div style={{ marginTop: 9 }}>
                <a
                  href={ADMIN_TELEGRAM}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#4f46e5", fontWeight: 700, textDecoration: "none" }}
                >
                  ✈️ Telegram: {ADMIN_NAME}
                </a>
              </div>
              <div style={{ marginTop: 4 }}>
                <a
                  href="tel:+998941366667"
                  style={{ color: "#4f46e5", fontWeight: 700, textDecoration: "none" }}
                >
                  📞 {ADMIN_PHONE}
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="edu-footer">
          © 2026 Edujadval.uz. Barcha huquqlar himoyalangan. · Admin: {ADMIN_NAME}
        </div>
      </div>
    </div>
  );
}
