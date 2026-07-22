import { useState } from "react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "🏠" },
  { id: "classes", label: "Sinflar", icon: "🏫" },
  { id: "subjects", label: "Fanlar", icon: "📚" },
  { id: "teachers", label: "O'qituvchilar", icon: "🧑‍🏫" },
  { id: "classSubjects", label: "Sinf fanlari", icon: "🧩" },
  { id: "rooms", label: "Xonalar", icon: "🚪" },
  { id: "timeslots", label: "Dars vaqtlari", icon: "⏰" },
  { id: "lunchGroups", label: "Obed guruhlari", icon: "🍽️" },
  { id: "schedule", label: "Dars jadvali", icon: "🗓️" },
  { id: "teacherReplace", label: "Ustoz almashtirish", icon: "🔄" },
  { id: "analytics", label: "Jadval tahlili", icon: "📈" },
  { id: "importExport", label: "Excel", icon: "📊" },
  { id: "users", label: "Foydalanuvchilar", icon: "👥", superOnly: true },
  { id: "settings", label: "Sozlamalar", icon: "⚙️" },
];

export default function Sidebar({
  activePage,
  setActivePage,
  schoolName,
  currentUser,
  onLogout,
  darkMode,
  setDarkMode,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.superOnly || currentUser?.role === "superadmin"
  );

  const renderItem = (item) => (
    <button
      key={item.id}
      type="button"
      onClick={() => setActivePage(item.id)}
      className={`nav-item ${activePage === item.id ? "active" : ""}`}
      title={item.label}
    >
      <span className="nav-icon" aria-hidden="true">{item.icon}</span>
      <span className="nav-label">{item.label}</span>
    </button>
  );

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-logo sidebar-logo-image">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt="Edujadval.uz"
          className="sidebar-brand-img"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
        />
        <div className="sidebar-brand-fallback">Edujadval<span>.uz</span></div>
        <div className="sidebar-school-name">
          {schoolName || currentUser?.schoolName || "Maktab platformasi"}
        </div>
      </div>

      <nav className="sidebar-nav">
        <button
          type="button"
          className="sidebar-toggle"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Menyuni ochish" : "Menyuni yig'ish"}
        >
          <span className="sidebar-toggle-icon">{collapsed ? "»" : "«"}</span>
          <span className="sidebar-toggle-label">Yig'ish</span>
        </button>

        {!collapsed ? (
          <div className="nav-section-row">
            <div className="nav-section-title">Asosiy</div>
            <button
              className={`theme-switch ${darkMode ? "night" : ""}`}
              type="button"
              onClick={() => setDarkMode?.(!darkMode)}
              title={darkMode ? "Kunduzgi rejim" : "Tungi rejim"}
            >
              <span className="theme-switch-star s1" />
              <span className="theme-switch-star s2" />
              <span className="theme-switch-star s3" />
              <span className="theme-switch-knob">{darkMode ? "🌙" : "☀️"}</span>
            </button>
          </div>
        ) : (
          <button
            className={`theme-switch collapsed ${darkMode ? "night" : ""}`}
            type="button"
            onClick={() => setDarkMode?.(!darkMode)}
            title={darkMode ? "Kunduzgi rejim" : "Tungi rejim"}
          >
            <span className="theme-switch-knob">{darkMode ? "🌙" : "☀️"}</span>
          </button>
        )}
        {visibleItems.filter((i) => ["dashboard"].includes(i.id)).map(renderItem)}

        {!collapsed && <div className="nav-section-title">Ma'lumotlar</div>}
        {visibleItems
          .filter((i) =>
            [
              "classes",
              "subjects",
              "teachers",
              "classSubjects",
              "rooms",
              "timeslots",
              "lunchGroups",
            ].includes(i.id)
          )
          .map(renderItem)}

        {!collapsed && <div className="nav-section-title">Jadval</div>}
        {visibleItems
          .filter((i) => ["schedule", "teacherReplace", "analytics", "importExport"].includes(i.id))
          .map(renderItem)}

        {!collapsed && <div className="nav-section-title">Tizim</div>}
        {visibleItems
          .filter((i) => ["users", "settings"].includes(i.id))
          .map(renderItem)}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-name">{currentUser?.name || "Foydalanuvchi"}</div>
        <div className="sidebar-user-role">
          {currentUser?.role === "superadmin" ? "Super Admin" : "Foydalanuvchi"}
        </div>

        <button className="sidebar-logout" type="button" onClick={onLogout} title="Chiqish">
          Chiqish
        </button>

        <div className="sidebar-version">v2.0 · Demo School</div>
      </div>
    </aside>
  );
}
