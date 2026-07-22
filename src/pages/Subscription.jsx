import { useState } from "react";
import { checkSubscription, refreshSubscription } from "../services/authService";
import { DevicePolicyNotice } from "../components/DeviceLockNotice";

// =====================================================================
//  OBUNA SAHIFASI — to'lov qilinmagan/muddati tugagan foydalanuvchilar
//  uchun platforma bloklanadi va shu sahifa ko'rsatiladi.
//
//  SOZLAMALAR (o'zingizga moslang):
// =====================================================================
const PLANS = [
  { key: "standart", label: "Standart — 6 oy", days: 180, price: "50 000 so'm", popular: false },
  { key: "yillik", label: "1 yil", days: 365, price: "80 000 so'm", popular: true, note: "Eng foydali!" },
];
// To'lov havolasi (Payme/Click/Uzum sahifangiz). Bo'sh qoldirsangiz tugma
// faqat ko'rsatmalarni ochadi.
const PAYMENT_URL = "";
// Karta raqami va admin aloqasi — to'lov ko'rsatmalarida chiqadi
const CARD_NUMBER = "8600 1221 6304 1808";
const CARD_OWNER = "Asliddin Munavvarov";
const ADMIN_PHONE = "+998 94 136 66 67";
// Telegram havolasi. Username'ingiz bo'lsa shu yerga yozing,
// masalan: "https://t.me/Asliddin_Muhiddinovich"
const TELEGRAM_URL = "https://t.me/+998941366667";

export default function SubscriptionPage({ user, onUnlocked, onLogout, toast }) {
  const [copied, setCopied] = useState(false);
  const sub = checkSubscription(user);
  const isExpired = sub.status === "expired";

  function copyUid() {
    try {
      navigator.clipboard?.writeText(sub.uid || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* eski brauzerlar */ }
  }

  function handlePay(plan) {
    if (PAYMENT_URL) {
      window.open(PAYMENT_URL, "_blank", "noopener");
    }
    toast?.(`To'lovda izohga ID'ingizni yozing: ${sub.uid}`, "info");
  }

  async function handleCheck() {
    // Serverdan yangi holatni o'qiymiz — admin faollashtirgan bo'lsa darhol ochiladi
    const fresh = await refreshSubscription();
    if (!fresh.blocked) {
      toast?.("Obuna faollashtirildi! Xush kelibsiz 🎉", "success");
      onUnlocked?.();
    } else {
      toast?.("Hali faollashtirilmagan. To'lov tasdiqlanishini kuting.", "warning");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #312e81 100%)", padding: 20,
    }}>
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{
          background: "#fff", borderRadius: 22, padding: "34px 34px 28px",
          boxShadow: "0 30px 80px rgba(0,0,0,.45)",
        }}>
          {/* Sarlavha */}
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div style={{ fontSize: 44, marginBottom: 6 }}>{isExpired ? "⏳" : "🔒"}</div>
            <h1 style={{ margin: 0, fontSize: 24, color: "#0f172a" }}>
              {isExpired ? "Obuna muddati tugadi" : "Platformadan foydalanish uchun obuna kerak"}
            </h1>
            <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: 14.5 }}>
              Salom, <b>{user?.name}</b>! {isExpired
                ? "Ishni davom ettirish uchun obunani yangilang."
                : "Ro'yxatdan o'tdingiz — endi tarifni tanlab to'lov qiling."}
            </p>
          </div>

          {/* Unikal ID */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
            background: "#f1f5f9", border: "1.5px dashed #94a3b8", borderRadius: 14,
            padding: "13px 16px", marginBottom: 22,
          }}>
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: "#64748b", letterSpacing: .5 }}>SIZNING UNIKAL ID'INGIZ</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#4f46e5", letterSpacing: 1 }}>{sub.uid || "—"}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={copyUid} type="button">
              {copied ? "✓ Nusxalandi" : "📋 Nusxalash"}
            </button>
          </div>

          {/* Tariflar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            {PLANS.map((p) => (
              <div key={p.key} style={{
                position: "relative", border: p.popular ? "2px solid #4f46e5" : "1.5px solid #e2e8f0",
                borderRadius: 16, padding: "18px 16px", textAlign: "center",
                boxShadow: p.popular ? "0 10px 26px rgba(79,70,229,.22)" : "none",
              }}>
                {p.popular && (
                  <div style={{
                    position: "absolute", top: -11, left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff",
                    fontSize: 11, fontWeight: 800, padding: "3px 12px", borderRadius: 999,
                  }}>ENG QULAY</div>
                )}
                <div style={{ fontSize: 15, fontWeight: 800, color: "#334155" }}>{p.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "#0f172a", margin: "6px 0 2px" }}>{p.price}</div>
                {p.note && <div style={{ fontSize: 12, color: "#059669", fontWeight: 700 }}>{p.note}</div>}
                <button
                  className="btn btn-primary"
                  style={{ width: "100%", marginTop: 12 }}
                  onClick={() => handlePay(p)}
                  type="button"
                >💳 To'lov qilish</button>
              </div>
            ))}
          </div>

          {/* Qurilma sharti haqida ogohlantirish */}
          <DevicePolicyNotice />

          {/* To'lov ko'rsatmasi */}
          <div style={{
            background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14,
            padding: "14px 16px", fontSize: 13.5, color: "#92400e", lineHeight: 1.65, marginBottom: 12,
          }}>
            <b>To'lov tartibi:</b>
            <br />1. Quyidagi kartaga tanlagan tarif summasini o'tkazing:
            <br />&nbsp;&nbsp;&nbsp;💳 <b style={{ letterSpacing: 1 }}>{CARD_NUMBER}</b> ({CARD_OWNER})
            <br />2. To'lov izohiga yoki xabar bilan ID'ingizni yuboring: <b>{sub.uid}</b>
            <br />3. Chekni yuboring: <b>{ADMIN_PHONE}</b> (Telegram/telefon)
            <br />4. Tasdiqlangach hisobingiz avtomatik ochiladi — "Tekshirish"ni bosing.
          </div>

          {/* Telegramga o'tish tugmasi */}
          <a
            href={TELEGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              height: 46, borderRadius: 13, textDecoration: "none",
              background: "linear-gradient(135deg,#2AABEE,#229ED9)", color: "#fff",
              fontSize: 15, fontWeight: 800, marginBottom: 18,
              boxShadow: "0 8px 20px rgba(42,171,238,.35)",
            }}
          >
            ✈️ Telegram orqali chek yuborish
          </a>

          {/* Pastki tugmalar */}
          <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
            <button className="btn btn-secondary" onClick={onLogout} type="button">← Chiqish</button>
            <button className="btn btn-success" onClick={handleCheck} type="button">🔄 Tekshirish</button>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "rgba(255,255,255,.65)", fontSize: 12.5, marginTop: 14 }}>
          Savollar bo'lsa: {ADMIN_PHONE} · Edujadval.uz
        </p>
      </div>
    </div>
  );
}
