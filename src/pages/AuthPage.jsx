import { useState } from "react";
import { login, registerUser } from "../services/authService";
import { DeviceLockedScreen } from "../components/DeviceLockNotice";
import "../styles/auth.css";

export default function AuthPage({ onAuth }) {
  const savedEmail = localStorage.getItem("edu_remember_email") || "";
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: savedEmail, password: "", schoolName: "" });
  const [remember, setRemember] = useState(!!savedEmail);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockedInfo, setLockedInfo] = useState(null); // { userId, deviceName }

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    setError("");
    setSuccess("");
    setInfo("");
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
      if (err.code === "DEVICE_LOCKED") {
        setLockedInfo({ userId: err.uid, deviceName: err.deviceName });
      } else {
        setError(err.message);
      }
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
      setSuccess("Ro'yxatdan o'tdingiz. Endi login qiling.");
      setMode("login");
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
      {/* Qulflangan qurilma ekrani */}
      {lockedInfo && (
        <DeviceLockedScreen
          userId={lockedInfo.userId}
          deviceName={lockedInfo.deviceName}
          onBack={() => setLockedInfo(null)}
        />
      )}

      {/* Fon bezaklari */}
      <div className="edu-bg-circle edu-bg-circle--1" />
      <div className="edu-bg-circle edu-bg-circle--2" />
      <div className="edu-bg-ring edu-bg-ring--1" />
      <div className="edu-bg-ring edu-bg-ring--2" />

      {/* Chap tomondagi 3D elementlar: kalendar taxtasi, soat, qalamlar, kitoblar */}
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

      {/* O'ng tomondagi 3D elementlar: diagramma va kalendar ikonkasi */}
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
        {/* Oq karta */}
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
              onClick={() => { setMode("login"); setError(""); setInfo(""); }}
            >
              Kirish
            </button>
            <button
              type="button"
              className={`edu-tabs__btn ${!isLogin ? "edu-tabs__btn--active" : ""}`}
              onClick={() => { setMode("register"); setError(""); setInfo(""); }}
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
                  onClick={() => setInfo("Parolni tiklash uchun administrator bilan bog'laning.")}
                >
                  Parolni unutdingizmi?
                </button>
              </div>
            )}

            <button className="edu-submit" type="submit" disabled={loading}>
              {isLogin ? (loading ? "Tekshirilmoqda..." : "Kirish") : "Ro'yxatdan o'tish"}
            </button>
          </form>
        </div>

        {/* Karta ostidagi imzo */}
        <div className="edu-footer">
          © 2026 Edujadval.uz. Barcha huquqlar himoyalangan. · Admin: Asliddin_Muhiddinovich
        </div>
      </div>
    </div>
  );
}
