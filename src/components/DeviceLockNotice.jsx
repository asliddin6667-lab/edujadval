// ============================================================
// EDUJADVAL.UZ — Qurilma qulflash UI komponentlari
// 1) <DevicePolicyNotice />  -> to'lov/obuna sahifasida ko'rsatiladi
// 2) <DeviceLockedScreen />  -> boshqa qurilmadan kirganda ko'rsatiladi
// ============================================================
import './deviceLock.css';

// --- To'lov sahifasidagi ogohlantirish ---
export function DevicePolicyNotice() {
  return (
    <div className="device-policy-notice">
      <span className="device-policy-icon" aria-hidden="true">⚠️</span>
      <div className="device-policy-text">
        <strong>Muhim shart:</strong> Obuna bitta qurilmaga bog&#x2bb;lanadi.
        Profilingiz faqat ro&#x2bb;yxatdan o&#x2bb;tgan kompyuteringizda ishlaydi.
        Kompyuteringizni almashtirsangiz, admin orqali{' '}
        <strong>bepul</strong> qayta bog&#x2bb;lash mumkin.
      </div>
    </div>
  );
}

// --- Qulflangan holat ekrani ---
// props: userId (EDU-XXXXXX), deviceName (bog'langan qurilma), onBack (login'ga qaytish)
export function DeviceLockedScreen({ userId, deviceName, onBack }) {
  return (
    <div className="device-locked-screen">
      <div className="device-locked-card">
        <div className="device-locked-icon" aria-hidden="true">🔒</div>
        <h2>Profil boshqa qurilmaga bog&#x2bb;langan</h2>
        <p>
          Obunangiz xavfsizligi uchun profil bitta qurilmaga bog&#x2bb;lanadi.
          Bu profil hozirda{' '}
          <strong>{deviceName || 'boshqa qurilma'}</strong>ga bog&#x2bb;langan.
        </p>
        <p>
          Agar kompyuteringizni almashtirgan bo&#x2bb;lsangiz, admin bilan
          bog&#x2bb;laning &mdash; qurilmangiz <strong>bepul</strong> qayta
          bog&#x2bb;lab beriladi.
        </p>
        <div className="device-locked-info">
          <div>
            <span className="device-locked-label">Admin:</span>{' '}
            Asliddin_Muhiddinovich
          </div>
          {userId && (
            <div>
              <span className="device-locked-label">Sizning ID:</span>{' '}
              <code>{userId}</code>
            </div>
          )}
        </div>
        {onBack && (
          <button type="button" className="device-locked-back" onClick={onBack}>
            Kirish sahifasiga qaytish
          </button>
        )}
      </div>
    </div>
  );
}
