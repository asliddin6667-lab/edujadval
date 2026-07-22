export default function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">⚠️ Tasdiqlash</span>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel}>Bekor qilish</button>
          <button className="btn btn-danger" onClick={onConfirm}>O'chirish</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD PAGE
// ============================================================
