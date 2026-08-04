import "./landing.css";

// =====================================================================
//  SMARTJADVAL.UZ — LANDING (BOSH) SAHIFA
//
//  Tizimga kirmagan mehmonlar ko'radigan marketing sahifa.
//  Props:
//    onLogin()    — "Kirish" bosilganda AuthPage (login) ochiladi
//    onRegister() — "Ro'yxatdan o'tish" bosilganda AuthPage (register)
// =====================================================================

const ADMIN_TELEGRAM = "https://t.me/+998941366667";
const ADMIN_PHONE = "+998 94 136 66 67";

const FEATURES = [
  {
    icon: "⚡",
    title: "Avtomatik jadval tuzish",
    desc: "Bir tugma bilan butun maktab jadvali bir necha soniyada tayyor — 100% to'qnashuvsiz.",
  },
  {
    icon: "🧑‍🏫",
    title: "O'qituvchi cheklovlari",
    desc: "Har bir ustozning dam kunlari, band vaqtlari va maksimal yuklamasi hisobga olinadi.",
  },
  {
    icon: "🧩",
    title: "Guruhlar va parallel darslar",
    desc: "Daraja guruhlari, sinfni guruhlarga bo'lish va bir ustozning parallel darslari qo'llab-quvvatlanadi.",
  },
  {
    icon: "🍽️",
    title: "Obed va tanaffuslar",
    desc: "Obed guruhlari va tanaffus vaqtlariga hech qachon dars qo'yilmaydi.",
  },
  {
    icon: "📊",
    title: "Excel eksport",
    desc: "Sinflar, o'qituvchilar va xonalar kesimida chiroyli, rangli Excel jadvallar bir bosishda.",
  },
  {
    icon: "📈",
    title: "To'liq tahlil",
    desc: "O'qituvchi yuklamasi, jadval to'ldirilishi va sinflar bo'yicha batafsil statistika.",
  },
];

const STEPS = [
  { title: "Ro'yxatdan o'ting", desc: "Maktab nomi, viloyat va tumanni tanlang — 1 daqiqada tayyor." },
  { title: "Ma'lumot kiriting", desc: "Sinflar, fanlar, o'qituvchilar va dars soatlarini qo'shing." },
  { title: "Jadval tuzing", desc: "Bir tugmani bosing — tizim to'qnashuvsiz jadvalni o'zi tuzadi." },
  { title: "Yuklab oling", desc: "Tayyor jadvalni Excel ko'rinishida chop eting yoki ulashing." },
];

const PLANS = [
  {
    name: "Standart — 6 oy",
    price: "200 000 so'm",
    per: "yarim yilga, bitta maktab uchun",
    popular: false,
    items: [
      "Cheksiz sinf, fan va o'qituvchi",
      "Avtomatik jadval tuzish",
      "Excel eksport",
      "Bulutda saqlash va sinxronizatsiya",
    ],
  },
  {
    name: "1 yil",
    price: "350 000 so'm",
    per: "bir yilga, bitta maktab uchun",
    popular: true,
    items: [
      "Standart tarifning barcha imkoniyatlari",
      "O'qituvchini almashtirish moduli",
      "To'liq tahlil va statistika",
      "Ustuvor qo'llab-quvvatlash (Telegram)",
    ],
  },
];

// Hero'dagi kichik jadval namunasi uchun ranglar
const DEMO_COLORS = ["#7c6ce8", "#f472b6", "#34d399", "#fbbf24", "#60a5fa"];
const DEMO_SUBJECTS = [
  "Matem", "Ona tili", "Fizika", "Ingliz", "Tarix",
  "Kimyo", "Biolog", "Inform", "Geogr", "Adabiyot",
  "Matem", "Rus tili", "Jism", "Ingliz", "Musiqa",
];

export default function Landing({ onLogin, onRegister }) {
  return (
    <div className="land-root">
      <div className="land-bg-circle land-bg-circle--1" />
      <div className="land-bg-circle land-bg-circle--2" />
      <div className="land-bg-ring land-bg-ring--1" />
      <div className="land-bg-ring land-bg-ring--2" />

      <div className="land-inner">
        {/* ---------- NAVBAR ---------- */}
        <nav className="land-nav">
          <div className="land-logo">
            <img
              src={`${import.meta.env.BASE_URL}logo.png`}
              alt="Smartjadval.uz"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            Smartjadval<span>.uz</span>
          </div>
          <div className="land-nav-actions">
            <button type="button" className="land-btn land-btn--ghost" onClick={onLogin}>
              Kirish
            </button>
            <button type="button" className="land-btn land-btn--primary" onClick={onRegister}>
              Ro'yxatdan o'tish
            </button>
          </div>
        </nav>

        {/* ---------- HERO ---------- */}
        <section className="land-hero">
          <div>
            <div className="land-hero-badge">🇺🇿 O'zbekiston maktablari uchun</div>
            <h1>
              Maktab dars jadvalini <em>bir necha soniyada</em> tuzing
            </h1>
            <p className="land-hero-sub">
              Smartjadval — o'qituvchilar, sinflar va xonalar bo'yicha 100%
              to'qnashuvsiz jadval tuzuvchi avtomatik platforma. Qo'lda bir
              haftalik ishni tizim soniyalarda bajaradi.
            </p>
            <div className="land-hero-cta">
              <button type="button" className="land-btn land-btn--primary land-btn--big" onClick={onRegister}>
                Bepul boshlash →
              </button>
              <button type="button" className="land-btn land-btn--ghost land-btn--big" onClick={onLogin}>
                Tizimga kirish
              </button>
            </div>
            <div className="land-hero-stats">
              <div className="land-stat"><b>100%</b><span>to'qnashuvsiz jadval</span></div>
              <div className="land-stat"><b>&lt; 60 son.</b><span>jadval tuzish vaqti</span></div>
              <div className="land-stat"><b>Excel</b><span>rangli eksport</span></div>
            </div>
          </div>

          <div className="land-hero-card">
            <div className="land-hero-card-head">
              <div className="land-hero-card-title">5-A sinf · Dushanba</div>
              <div className="land-hero-card-chip">✓ To'qnashuvsiz</div>
            </div>
            <div className="land-mini-table">
              {DEMO_SUBJECTS.map((s, i) => (
                <div
                  key={i}
                  className="land-mini-cell"
                  style={{ background: DEMO_COLORS[i % DEMO_COLORS.length] }}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- IMKONIYATLAR ---------- */}
        <section className="land-section">
          <h2 className="land-section-title">Platforma imkoniyatlari</h2>
          <p className="land-section-sub">
            Jadval tuzishdagi barcha murakkabliklar — cheklovlar, guruhlar,
            obedlar — tizim tomonidan avtomatik hisobga olinadi.
          </p>
          <div className="land-features">
            {FEATURES.map((f) => (
              <div className="land-feature" key={f.title}>
                <div className="land-feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- QANDAY ISHLAYDI ---------- */}
        <section className="land-section">
          <h2 className="land-section-title">Qanday ishlaydi?</h2>
          <p className="land-section-sub">
            Ro'yxatdan o'tishdan tayyor jadvalgacha — atigi 4 bosqich.
          </p>
          <div className="land-steps">
            {STEPS.map((s, i) => (
              <div className="land-step" key={s.title}>
                <div className="land-step-num">{i + 1}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- NARXLAR ---------- */}
        <section className="land-section">
          <h2 className="land-section-title">Narxlar</h2>
          <p className="land-section-sub">
            Ro'yxatdan o'tish bepul — platformani mehmon rejimida ko'rib
            chiqing, keyin o'zingizga mos tarifni tanlang.
          </p>
          <div className="land-pricing">
            {PLANS.map((p) => (
              <div
                className={`land-price-card ${p.popular ? "land-price-card--popular" : ""}`}
                key={p.name}
              >
                {p.popular && <div className="land-price-flag">ENG FOYDALI</div>}
                <div className="land-price-name">{p.name}</div>
                <div className="land-price-value">{p.price}</div>
                <div className="land-price-per">{p.per}</div>
                <ul className="land-price-list">
                  {p.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <button
                  type="button"
                  className="land-btn land-btn--primary land-btn--big"
                  style={{ width: "100%" }}
                  onClick={onRegister}
                >
                  Boshlash
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- PASTKI CTA ---------- */}
        <section className="land-section">
          <div className="land-cta-banner">
            <h2>Jadval tuzishga ketadigan kunlarni tejang</h2>
            <p>Bugun ro'yxatdan o'ting — birinchi jadvalingizni 10 daqiqada tuzing.</p>
            <button type="button" className="land-btn land-btn--white" onClick={onRegister}>
              Bepul boshlash →
            </button>
          </div>
        </section>

        {/* ---------- FOOTER ---------- */}
        <footer className="land-footer">
          <div className="land-footer-contacts">
            <a href={`tel:${ADMIN_PHONE.replace(/\s/g, "")}`}>📞 {ADMIN_PHONE}</a>
            <a href={ADMIN_TELEGRAM} target="_blank" rel="noreferrer">✈️ Telegram orqali yozish</a>
          </div>
          <div className="land-footer-copy">
            © 2026 Smartjadval.uz — Barcha huquqlar himoyalangan.
          </div>
        </footer>
      </div>
    </div>
  );
}
