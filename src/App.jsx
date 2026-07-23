import { useState, useEffect } from "react";
import "./styles/global.css";

import Sidebar from "./components/Sidebar";
import PaywallModal from "./components/PaywallModal";
import AuthPage from "./pages/AuthPage";
import SubscriptionPage from "./pages/Subscription";
import DashboardPage from "./pages/Dashboard";
import ClassesPage from "./pages/Classes";
import SubjectsPage from "./pages/Subjects";
import TeachersPage from "./pages/Teachers";
import ClassSubjectsPage from "./pages/ClassSubjects";
import RoomsPage from "./pages/Rooms";
import TimeslotsPage from "./pages/TimeSlots";
import LunchGroupsPage from "./pages/LunchGroups";
import SchedulePage from "./pages/Schedule";
import TeacherReplacePage from "./pages/TeacherReplace";
import AnalyticsPage from "./pages/Analytics";
import ImportExportPage from "./pages/ImportExport";
import UsersPage from "./pages/Users";
import SettingsPage from "./pages/Settings";
import { useToast } from "./hooks/useToast";
import { loadData, saveData, loadUserData, saveUserData } from "./services/storageService";
import { getCurrentUser, logout, checkSubscription, refreshCurrentUser } from "./services/authService";
import { buildDemoSchoolData } from "./utils/demoData";

const emptySettings = { schoolName: "", academicYear: "2024-2025" };

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [activePage, setActivePage] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(() => loadData("darkMode", false));
  const [settings, setSettings] = useState(emptySettings);

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classSubjects, setClassSubjects] = useState({});
  const [rooms, setRooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [lunchGroups, setLunchGroups] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [schedule, setSchedule] = useState({});
  const [dataReady, setDataReady] = useState(false);

  // ——— Mehmon rejimi holatlari ———
  const [paywallOpen, setPaywallOpen] = useState(false); // kichik to'lov oynasi
  const [showPayPage, setShowPayPage] = useState(false); // to'liq to'lov sahifasi

  const { toasts, addToast } = useToast();
  const userId = currentUser?.id;

  // ——— Doimiy saqlash (persistent storage) ———
  // Brauzerga "bu saytning ma'lumotlarini joy bo'shatish uchun
  // avtomatik o'chirma" degan so'rov yuboriladi. localStorage'dagi
  // jadval ma'lumotlari eviction'dan himoyalanadi.
  useEffect(() => {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((granted) => {
        console.log(
          granted
            ? "✅ Doimiy saqlash yoqildi — brauzer ma'lumotlarni avtomatik o'chirmaydi"
            : "⚠️ Doimiy saqlash hozircha berilmadi — saytdan ko'proq foydalanilsa, brauzer keyinroq ruxsat beradi"
        );
      }).catch(() => {});
    }
  }, []);

  // Yuklanganda profil serverdan yangilanadi:
  // - obuna faollashtirilgan bo'lsa — darhol ochiladi
  // - sessiya tugagan/bloklangan bo'lsa — login sahifasiga qaytadi
  useEffect(() => {
    if (!currentUser) return;
    refreshCurrentUser().then((fresh) => {
      if (!fresh) {
        setCurrentUser(null);
      } else if (
        fresh.subscription?.status !== currentUser.subscription?.status ||
        fresh.subscription?.expiresAt !== currentUser.subscription?.expiresAt ||
        fresh.email !== currentUser.email ||
        fresh.role !== currentUser.role
      ) {
        setCurrentUser(fresh);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!currentUser) return;
    setDataReady(false);

    let loadedSettings = loadUserData(currentUser.id, "settings", { ...emptySettings, schoolName: currentUser.schoolName || "" });
    let loadedClasses = loadUserData(currentUser.id, "classes", []);
    let loadedSubjects = loadUserData(currentUser.id, "subjects", []);
    let loadedTeachers = loadUserData(currentUser.id, "teachers", []);
    let loadedClassSubjects = loadUserData(currentUser.id, "classSubjects", {});
    let loadedRooms = loadUserData(currentUser.id, "rooms", []);
    let loadedTimeslots = loadUserData(currentUser.id, "timeslots", []);
    let loadedLunchGroups = loadUserData(currentUser.id, "lunchGroups", []);
    let loadedShifts = loadUserData(currentUser.id, "shifts", []);
    let loadedSchedule = loadUserData(currentUser.id, "schedule", {});

    // Demo foydalanuvchida ma'lumot bo'lmasa, platforma avtomatik to'ldirilgan holda ochiladi.
    if (currentUser.email === "demo@edujadval.uz" && !loadedClasses.length) {
      const demo = buildDemoSchoolData();
      loadedSettings = demo.settings;
      loadedClasses = demo.classes;
      loadedSubjects = demo.subjects;
      loadedTeachers = demo.teachers;
      loadedClassSubjects = demo.classSubjects;
      loadedRooms = demo.rooms;
      loadedTimeslots = demo.timeslots;
      loadedLunchGroups = demo.lunchGroups;
      loadedShifts = demo.shifts || [];
      loadedSchedule = demo.schedule;
    }

    setSettings(loadedSettings);
    setClasses(loadedClasses);
    setSubjects(loadedSubjects);
    setTeachers(loadedTeachers);
    setClassSubjects(loadedClassSubjects);
    setRooms(loadedRooms);
    setTimeslots(loadedTimeslots);
    setLunchGroups(loadedLunchGroups);
    setShifts(loadedShifts);
    setSchedule(loadedSchedule);
    setDataReady(true);
    setActivePage("dashboard");
    setPaywallOpen(false);
    setShowPayPage(false);
  }, [currentUser]);

  useEffect(() => { if (userId && dataReady) saveUserData(userId, "classes", classes); }, [userId, dataReady, classes]);
  useEffect(() => { if (userId && dataReady) saveUserData(userId, "subjects", subjects); }, [userId, dataReady, subjects]);
  useEffect(() => { if (userId && dataReady) saveUserData(userId, "teachers", teachers); }, [userId, dataReady, teachers]);
  useEffect(() => { if (userId && dataReady) saveUserData(userId, "classSubjects", classSubjects); }, [userId, dataReady, classSubjects]);
  useEffect(() => { if (userId && dataReady) saveUserData(userId, "rooms", rooms); }, [userId, dataReady, rooms]);
  useEffect(() => { if (userId && dataReady) saveUserData(userId, "timeslots", timeslots); }, [userId, dataReady, timeslots]);
  useEffect(() => { if (userId && dataReady) saveUserData(userId, "lunchGroups", lunchGroups); }, [userId, dataReady, lunchGroups]);
  useEffect(() => { if (userId && dataReady) saveUserData(userId, "shifts", shifts); }, [userId, dataReady, shifts]);
  useEffect(() => { if (userId && dataReady) saveUserData(userId, "schedule", schedule); }, [userId, dataReady, schedule]);
  useEffect(() => { if (userId && dataReady) saveUserData(userId, "settings", settings); }, [userId, dataReady, settings]);
  useEffect(() => { saveData("darkMode", darkMode); }, [darkMode]);

  useEffect(() => {
    if (darkMode) document.body.classList.add("dark-mode");
    else document.body.classList.remove("dark-mode");
  }, [darkMode]);

  function handleLogout() {
    logout();
    setCurrentUser(null);
    setDataReady(false);
    setPaywallOpen(false);
    setShowPayPage(false);
  }

  if (!currentUser) {
    return <AuthPage onAuth={setCurrentUser} />;
  }

  // ——— Obuna nazorati (MEHMON REJIMI) ———
  // To'lov qilinmagan / muddati tugagan foydalanuvchi platformaga KIRADI,
  // hammasini KO'RA OLADI, lekin biror amal qilmoqchi bo'lsa to'lov oynasi chiqadi.
  const subState = checkSubscription(currentUser);
  const locked = subState.blocked;

  // Foydalanuvchi "To'lov qilish"ni bossagina to'liq to'lov sahifasi ochiladi
  if (locked && showPayPage) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowPayPage(false)}
          style={{
            position: "fixed", top: 16, left: 16, zIndex: 3000,
            display: "inline-flex", alignItems: "center", gap: 6,
            height: 42, padding: "0 16px", border: "none", borderRadius: 12,
            background: "rgba(255,255,255,.92)", color: "#334155",
            fontSize: 14, fontWeight: 800, cursor: "pointer",
            boxShadow: "0 6px 18px rgba(0,0,0,.18)",
          }}
        >
          ← Platformaga qaytish
        </button>
        <SubscriptionPage
          user={currentUser}
          toast={addToast}
          onLogout={handleLogout}
          onUnlocked={() => {
            setShowPayPage(false);
            setCurrentUser(getCurrentUser()); // serverdan yangilangan profil
          }}
        />
      </>
    );
  }

  // Mehmon rejimida asosiy kontentdagi har qanday interaktiv element
  // (tugma, select, input, havola) bosilganda to'lov oynasi ochiladi.
  function guardClick(e) {
    if (!locked) return;
    const el = e.target.closest?.(
      "button, a, input, select, textarea, label, [role='button'], .btn"
    );
    if (!el) return;
    if (el.closest("[data-pw-allow]")) return; // ruxsat berilgan elementlar (banner tugmasi)
    e.preventDefault();
    e.stopPropagation();
    setPaywallOpen(true);
  }

  function guardFocus(e) {
    if (!locked) return;
    const t = e.target;
    if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName) && !t.closest("[data-pw-allow]")) {
      t.blur();
      e.stopPropagation();
      setPaywallOpen(true);
    }
  }

  const pageProps = { classes, subjects, teachers, rooms, timeslots, lunchGroups, schedule, classSubjects, toast: addToast, currentUser };

  function renderPage() {
    switch (activePage) {
      case "dashboard": return <DashboardPage {...pageProps} setActivePage={setActivePage} />;
      case "classes": return <ClassesPage {...pageProps} setClasses={setClasses} />;
      case "subjects": return <SubjectsPage {...pageProps} setSubjects={setSubjects} />;
      case "teachers": return <TeachersPage {...pageProps} setTeachers={setTeachers} />;
      case "classSubjects": return <ClassSubjectsPage {...pageProps} setClassSubjects={setClassSubjects} />;
      case "rooms": return <RoomsPage {...pageProps} setRooms={setRooms} />;
      case "timeslots": return <TimeslotsPage {...pageProps} setTimeslots={setTimeslots} shifts={shifts} setShifts={setShifts} />;
      case "lunchGroups": return <LunchGroupsPage {...pageProps} setLunchGroups={setLunchGroups} />;
      case "schedule": return <SchedulePage {...pageProps} setSchedule={setSchedule} />;
      case "teacherReplace": return <TeacherReplacePage {...pageProps} setSchedule={setSchedule} />;
      case "analytics": return <AnalyticsPage {...pageProps} />;
      case "importExport": return <ImportExportPage {...pageProps} setSubjects={setSubjects} setTeachers={setTeachers} />;
      case "users": return currentUser.role === "superadmin" ? <UsersPage {...pageProps} /> : <DashboardPage {...pageProps} setActivePage={setActivePage} />;
      case "settings": return (
        <SettingsPage
          settings={settings} setSettings={setSettings}
          darkMode={darkMode} setDarkMode={setDarkMode}
          setClasses={setClasses} setSubjects={setSubjects}
          setTeachers={setTeachers} setRooms={setRooms}
          setTimeslots={setTimeslots} setSchedule={setSchedule}
          setClassSubjects={setClassSubjects} setLunchGroups={setLunchGroups}
          shifts={shifts} setShifts={setShifts}
          {...pageProps}
        />
      );
      default: return <DashboardPage {...pageProps} setActivePage={setActivePage} />;
    }
  }

  return (
    <>
      <div className="app-layout">
        <Sidebar
          activePage={activePage}
          setActivePage={setActivePage}
          schoolName={settings.schoolName}
          currentUser={currentUser}
          onLogout={handleLogout}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
        />
        <main
          className="main-content"
          onClickCapture={guardClick}
          onFocusCapture={guardFocus}
        >
          {locked && (
            <div
              data-pw-allow
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, flexWrap: "wrap",
                background: "linear-gradient(135deg, rgba(245,158,11,.12), rgba(249,115,22,.12))",
                border: "1.5px solid rgba(245,158,11,.4)",
                borderRadius: 14, padding: "10px 16px", marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700, color: "#b45309" }}>
                👀 Mehmon rejimi — platformani ko'rishingiz mumkin, foydalanish uchun obunani faollashtiring.
              </div>
              <button
                type="button"
                onClick={() => setShowPayPage(true)}
                style={{
                  border: "none", borderRadius: 11, height: 38, padding: "0 16px",
                  background: "linear-gradient(135deg,#16a34a,#059669)", color: "#fff",
                  fontSize: 13.5, fontWeight: 800, cursor: "pointer",
                  boxShadow: "0 5px 14px rgba(22,163,74,.32)", whiteSpace: "nowrap",
                }}
              >
                💳 To'lov qilish
              </button>
            </div>
          )}
          {renderPage()}
        </main>
      </div>

      {paywallOpen && (
        <PaywallModal
          user={currentUser}
          subState={subState}
          onClose={() => setPaywallOpen(false)}
          onGoPay={() => { setPaywallOpen(false); setShowPayPage(true); }}
        />
      )}

      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
        ))}
      </div>

    </>
  );
}
