import { useState } from "react";

/**
 * Mehmon rejimidagi foydalanuvchi biror amal qilmoqchi bo'lganda
 * chiqadigan to'lov oynasi.
 *
 * Props:
 *  - user: joriy foydalanuvchi
 *  - subState: checkSubscription(...) natijasi ({ status, uid, ... })
 *  - onClose: oynani yopish
 *  - onGoPay: to'liq to'lov sahifasiga o'tish
 */
export default function PaywallModal({ user, subState, onClose, onGoPay }) {
  const [copied, setCopied] = useState(false);
  const uid = subState?.uid || user?.uid || "—";
  const expired = subState?.status === "expired";

  function copyUid() {
    try {
      navigator.clipboard.writeText(uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard mavjud bo'lmasa jim o'tamiz */
    }
  }

  return (
    <div className="pw-overlay" onClick={onClose}>
      <style>{`
        .pw-overlay{position:fixed;inset:0;z-index:2000;background:rgba(15,23,42,.55);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:16px;animation:pwFade .2s ease;}
        @keyframes pwFade{from{opacity:0}to{opacity:1}}
        .pw-card{background:var(--card-bg,#fff);border-radius:20px;width:100%;max-width:430px;padding:28px 26px 22px;box-shadow:0 24px 70px rgba(0,0,0,.35);animation:pwPop .25s cubic-bezier(.2,1.4,.4,1);text-align:center;}
        @keyframes pwPop{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}
        .pw-icon{width:74px;height:74px;margin:0 auto 14px;border-radius:22px;display:flex;align-items:center;justify-content:center;font-size:36px;background:linear-gradient(135deg,#fbbf24,#f59e0b);box-shadow:0 10px 26px rgba(245,158,11,.35);}
        .pw-title{margin:0 0 6px;font-size:21px;font-weight:800;color:var(--text-primary,#0f172a);}
        .pw-sub{margin:0 0 16px;font-size:14px;line-height:1.55;color:var(--text-secondary,#64748b);}
        .pw-uid{display:flex;align-items:center;justify-content:space-between;gap:10px;background:var(--bg-secondary,#f1f5f9);border:1.5px dashed var(--card-border,#cbd5e1);border-radius:12px;padding:10px 14px;margin-bottom:14px;}
        .pw-uid-label{font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:var(--text-muted,#94a3b8);text-align:left;}
        .pw-uid-value{font-size:17px;font-weight:800;color:#4f46e5;letter-spacing:1px;}
        .pw-copy{border:none;background:rgba(79,70,229,.1);color:#4f46e5;border-radius:9px;padding:7px 12px;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap;transition:background .15s;}
        .pw-copy:hover{background:rgba(79,70,229,.18);}
        .pw-admin{background:rgba(22,163,74,.08);border:1px solid rgba(22,163,74,.25);border-radius:12px;padding:10px 14px;font-size:13.5px;color:#15803d;font-weight:600;margin-bottom:18px;line-height:1.5;}
        body.dark-mode .pw-admin{color:#4ade80;}
        .pw-actions{display:flex;flex-direction:column;gap:8px;}
        .pw-btn-pay{border:none;border-radius:13px;height:48px;font-size:15.5px;font-weight:800;color:#fff;cursor:pointer;background:linear-gradient(135deg,#16a34a,#059669);box-shadow:0 8px 20px rgba(22,163,74,.35);transition:transform .15s,filter .15s;}
        .pw-btn-pay:hover{transform:translateY(-1px);filter:brightness(1.06);}
        .pw-btn-close{border:none;background:transparent;color:var(--text-muted,#94a3b8);font-size:14px;font-weight:700;cursor:pointer;padding:8px;border-radius:10px;}
        .pw-btn-close:hover{color:var(--text-secondary,#64748b);}
      `}</style>

      <div className="pw-card" onClick={(e) => e.stopPropagation()}>
        <div className="pw-icon">🔒</div>
        <h3 className="pw-title">
          {expired ? "Obuna muddati tugagan" : "Bu funksiya to'lovdan keyin ochiladi"}
        </h3>
        <p className="pw-sub">
          Siz hozir <b>mehmon rejimida</b>siz — platformani ko'rishingiz mumkin,
          lekin foydalanish uchun obunani faollashtirish kerak.
        </p>

        <div className="pw-uid">
          <div>
            <div className="pw-uid-label">Sizning ID raqamingiz</div>
            <div className="pw-uid-value">{uid}</div>
          </div>
          <button type="button" className="pw-copy" onClick={copyUid}>
            {copied ? "✓ Nusxalandi" : "Nusxalash"}
          </button>
        </div>

        <div className="pw-admin">
          💬 To'lov uchun ID raqamingizni adminga yuboring:<br />
          <b>Admin: Asliddin_Muhiddinovich</b>
        </div>

        <div className="pw-actions">
          <button type="button" className="pw-btn-pay" onClick={onGoPay}>
            💳 To'lov qilish
          </button>
          <button type="button" className="pw-btn-close" onClick={onClose}>
            Hozircha ko'rib chiqaman
          </button>
        </div>
      </div>
    </div>
  );
}
