// Jadval tahlili Excel eksporti — sinflar va o'qituvchilar bo'yicha soatlar tahlili.
// Excel bo'limidan (ImportExport.jsx) chaqiriladi.
//
// 1-varaq "Sinflar tahlili": umumiy statistika + har sinf uchun
//   Fan | Joylashgan | Kerakli | Holat jadvali va Jami qatori.
// 2-varaq "O'qituvchilar tahlili": O'qituvchi | Fanlar | Jadvaldagi soat |
//   Maksimal soat | Yuklama % | Holat.

import { DAYS } from './constants';
import { loadStyledXLSX } from './excelUtils';
import { isTeachingSlot } from './scheduleGenerator';

function lessonClassIds(lesson) {
  return Array.isArray(lesson.classIds) ? lesson.classIds : [lesson.classId].filter(Boolean);
}

function safeFileDate() {
  return new Date().toISOString().slice(0, 10);
}

// Ranglar
const C_TITLE = { bg: '4338CA', fg: 'FFFFFF' };   // to'q ko'k
const C_HEAD = { bg: 'E0E7FF', fg: '3730A3' };    // och ko'k (ustun sarlavhalari)
const C_SUM = { bg: '35E0F2', fg: '0F3D5C' };     // havorang (statistika)
const C_OK = { bg: 'D1FAE5', fg: '065F46' };      // yashil — to'liq/normal
const C_BAD = { bg: 'FEE2E2', fg: 'B91C1C' };     // qizil — kam/oshgan
const C_WARN = { bg: 'FEF3C7', fg: '92400E' };    // sariq — ortiqcha
const C_TOTAL = { bg: 'F1F5F9', fg: '1F2937' };   // Jami qatori

export async function exportAnalysisExcel({
  classes = [],
  subjects = [],
  teachers = [],
  timeslots = [],
  schedule = {},
  classSubjects = {},
  toast,
}) {
  try {
    if (!classes.length) {
      toast?.("Avval sinf qo'shing", 'warning');
      return;
    }
    const hasCS = Object.keys(classSubjects || {}).some((k) => (classSubjects[k] || []).length);
    if (!hasCS) {
      toast?.("Sinf fanlari topilmadi — avval «Sinf fanlari» bo'limini to'ldiring", 'warning');
      return;
    }

    const XLSX = await loadStyledXLSX();
    const sortedTimeslots = [...timeslots].sort(
      (a, b) => Number(a.lessonNumber || 0) - Number(b.lessonNumber || 0)
    );
    const teachingSlots = sortedTimeslots.filter(isTeachingSlot);
    const sortedClasses = [...classes].sort((a, b) =>
      String(a.name).localeCompare(String(b.name), 'uz', { numeric: true })
    );
    const subjName = (id) => subjects.find((s) => s.id === id)?.name || 'Fan';

    // Sinf uchun shu fan bo'yicha joylashgan soatlar
    const placedHours = (classId, subjectId) => {
      let n = 0;
      DAYS.forEach((day) => {
        teachingSlots.forEach((ts) => {
          const cell = schedule?.[day]?.[ts.id];
          if (Array.isArray(cell) && cell.some((l) => l.subjectId === subjectId && lessonClassIds(l).includes(classId))) {
            n += 1;
          }
        });
      });
      return n;
    };

    // Sinf uchun shu fan bo'yicha kerakli soatlar (swap bilan)
    const requiredHours = (classId, subjectId) => {
      let req = 0;
      (classSubjects?.[classId] || []).forEach((a) => {
        if (a.subjectId === subjectId) req += Number(a.weeklyHours || 0);
        if (a.swapEnabled && a.swapSubjectId === subjectId) req += Number(a.weeklyHours || 0);
      });
      return req;
    };

    // Sinfning barcha fanlari (asosiy + swap)
    const classSubjectIds = (classId) => {
      const ids = new Set();
      (classSubjects?.[classId] || []).forEach((a) => {
        if (a.subjectId) ids.add(a.subjectId);
        if (a.swapEnabled && a.swapSubjectId) ids.add(a.swapSubjectId);
      });
      return [...ids];
    };

    // O'qituvchining jadvaldagi soati
    const teacherHours = (teacherId) => {
      let n = 0;
      DAYS.forEach((day) => {
        teachingSlots.forEach((ts) => {
          n += (schedule?.[day]?.[ts.id] || []).filter((l) => l.teacherId === teacherId).length;
        });
      });
      return n;
    };

    const teacherSubjectNames = (t) => {
      const ids = Array.isArray(t.subjectIds) ? t.subjectIds : (t.subjectId ? [t.subjectId] : []);
      return ids.map(subjName).filter(Boolean).join(', ');
    };

    // ——— Umumiy statistika ———
    let totalPlaced = 0;
    let totalRequired = 0;
    const classData = sortedClasses.map((cls) => {
      const rows = classSubjectIds(cls.id)
        .map((sid) => {
          const got = placedHours(cls.id, sid);
          const need = requiredHours(cls.id, sid);
          return { name: subjName(sid), got, need };
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'uz'));
      const got = rows.reduce((s, x) => s + x.got, 0);
      const need = rows.reduce((s, x) => s + x.need, 0);
      totalPlaced += got;
      totalRequired += need;
      return { cls, rows, got, need };
    });
    const fillPct = totalRequired > 0 ? Math.round((totalPlaced / totalRequired) * 100) : 100;

    // =====================================================================
    // 1-VARAQ: Sinflar tahlili
    // =====================================================================
    const aoa1 = [];
    const styles1 = []; // { r, c, span?, style }
    const rowHpt1 = [];
    const COLS1 = 4;
    const put1 = (row, hpt = 22) => { aoa1.push(row); rowHpt1.push(hpt); return aoa1.length - 1; };
    const mark1 = (r, c, color, opts = {}) => styles1.push({ r, c, color, ...opts });

    // Sarlavha
    let R = put1([`Jadval tahlili — sinflar bo'yicha (${safeFileDate()})`, '', '', ''], 32);
    for (let c = 0; c < COLS1; c++) mark1(R, c, C_TITLE, { sz: 15, merge: c === 0 ? COLS1 : 0 });

    put1(['', '', '', ''], 8);

    // Statistika
    R = put1(['Sinflar', "O'qituvchilar", 'Joylashgan soat', "To'ldirish"], 22);
    for (let c = 0; c < COLS1; c++) mark1(R, c, C_SUM, { sz: 11 });
    R = put1([sortedClasses.length, teachers.length, `${totalPlaced} / ${totalRequired}`, `${fillPct}%`], 24);
    for (let c = 0; c < COLS1; c++) mark1(R, c, fillPct >= 100 ? C_OK : C_WARN, { sz: 13 });

    put1(['', '', '', ''], 10);

    // Har sinf bo'limi
    classData.forEach(({ cls, rows, got, need }) => {
      const pct = need > 0 ? Math.round((got / need) * 100) : 100;
      R = put1([`${cls.name} sinf — Jami: ${got}/${need} soat (${pct}%)`, '', '', ''], 26);
      for (let c = 0; c < COLS1; c++) mark1(R, c, C_TITLE, { sz: 13, merge: c === 0 ? COLS1 : 0 });

      R = put1(['Fan', 'Joylashgan', 'Kerakli', 'Holat'], 20);
      for (let c = 0; c < COLS1; c++) mark1(R, c, C_HEAD, { sz: 11 });

      rows.forEach(({ name, got: g, need: n }) => {
        let holat; let hc;
        if (g === n) { holat = "To'liq"; hc = C_OK; }
        else if (g < n) { holat = `${n - g} soat kam`; hc = C_BAD; }
        else { holat = `${g - n} soat ortiqcha`; hc = C_WARN; }
        R = put1([name, g, n, holat], 20);
        mark1(R, 0, null, { left: true });
        mark1(R, 3, hc);
      });

      R = put1(['Jami', got, need, need > 0 ? `${pct}%` : '—'], 22);
      for (let c = 0; c < COLS1; c++) mark1(R, c, C_TOTAL, { bold: true });

      put1(['', '', '', ''], 10);
    });

    // =====================================================================
    // 2-VARAQ: O'qituvchilar tahlili
    // =====================================================================
    const aoa2 = [];
    const styles2 = [];
    const rowHpt2 = [];
    const COLS2 = 6;
    const put2 = (row, hpt = 22) => { aoa2.push(row); rowHpt2.push(hpt); return aoa2.length - 1; };
    const mark2 = (r, c, color, opts = {}) => styles2.push({ r, c, color, ...opts });

    R = put2([`Jadval tahlili — o'qituvchilar bo'yicha (${safeFileDate()})`, '', '', '', '', ''], 32);
    for (let c = 0; c < COLS2; c++) mark2(R, c, C_TITLE, { sz: 15, merge: c === 0 ? COLS2 : 0 });

    put2(['', '', '', '', '', ''], 8);

    R = put2(["O'qituvchi", 'Fanlar', 'Jadvaldagi soat', 'Maksimal soat', 'Yuklama %', 'Holat'], 22);
    for (let c = 0; c < COLS2; c++) mark2(R, c, C_HEAD, { sz: 11 });

    const sortedTeachers = [...teachers].sort((a, b) =>
      String(a.name).localeCompare(String(b.name), 'uz')
    );
    sortedTeachers.forEach((t) => {
      const hours = teacherHours(t.id);
      const max = Number(t.maxWeeklyHours || 28);
      const pct = max > 0 ? Math.round((hours / max) * 100) : 0;
      const over = hours > max;
      R = put2([t.name, teacherSubjectNames(t), hours, max, `${pct}%`, over ? 'Oshib ketgan' : 'Normal'], 20);
      mark2(R, 0, null, { left: true });
      mark2(R, 1, null, { left: true });
      mark2(R, 5, over ? C_BAD : C_OK);
    });

    // ——— Varaq yaratish va uslublash ———
    const thin = { style: 'thin', color: { rgb: '9CA3AF' } };
    const border = { top: thin, bottom: thin, left: thin, right: thin };

    const buildSheet = (aoa, styleList, rowHpt, colWidths) => {
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const range = XLSX.utils.decode_range(ws['!ref']);
      // Baza: oq fon, chegarasiz (bo'sh joylar toza ko'rinadi)
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const ref = XLSX.utils.encode_cell({ r, c });
          if (!ws[ref]) ws[ref] = { t: 's', v: '' };
          ws[ref].s = { alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, font: { sz: 11 }, fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } } };
        }
      }
      const merges = [];
      styleList.forEach(({ r, c, color, sz = 11, bold = false, merge = 0, left = false }) => {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) ws[ref] = { t: 's', v: '' };
        ws[ref].s = {
          alignment: { horizontal: left ? 'left' : 'center', vertical: 'center', wrapText: true },
          border,
          font: { bold: bold || !!color, sz, color: { rgb: color ? color.fg : '1F2937' } },
          fill: { patternType: 'solid', fgColor: { rgb: color ? color.bg : 'FFFFFF' } },
        };
        if (merge > 1) merges.push({ s: { r, c }, e: { r, c: c + merge - 1 } });
      });
      // Ma'lumotli qatorlarda qolgan kataklarga ham chegara (styleList da color=null bo'lganlar allaqachon bor;
      // raqamli kataklar uchun): styleList qamrab olmagan, lekin qiymati bor kataklar
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const ref = XLSX.utils.encode_cell({ r, c });
          const hasStyle = styleList.some((s) => s.r === r && s.c === c);
          const rowHasContent = aoa[r] && aoa[r].some((v) => v !== '' && v !== null && v !== undefined);
          if (!hasStyle && rowHasContent) {
            ws[ref].s = { alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border, font: { sz: 11, color: { rgb: '1F2937' } }, fill: { patternType: 'solid', fgColor: { rgb: 'FFFFFF' } } };
          }
        }
      }
      ws['!merges'] = merges;
      ws['!cols'] = colWidths;
      ws['!rows'] = rowHpt.map((h) => ({ hpt: h }));
      return ws;
    };

    const ws1 = buildSheet(aoa1, styles1, rowHpt1, [{ wch: 30 }, { wch: 13 }, { wch: 11 }, { wch: 18 }]);
    const ws2 = buildSheet(aoa2, styles2, rowHpt2, [{ wch: 26 }, { wch: 36 }, { wch: 15 }, { wch: 14 }, { wch: 12 }, { wch: 15 }]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Sinflar tahlili');
    XLSX.utils.book_append_sheet(wb, ws2, "O'qituvchilar tahlili");
    XLSX.writeFile(wb, `jadval_tahlili_${safeFileDate()}.xlsx`);
    toast?.('Jadval tahlili Excelga yuklandi ✓', 'success');
  } catch (e) {
    toast?.(e.message || 'Excel eksportda xatolik', 'error');
  }
}
