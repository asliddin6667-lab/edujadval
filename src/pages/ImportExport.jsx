import { useRef, useState } from 'react';
import { DAYS } from '../utils/constants';
import { genId } from '../utils/helpers';
import { loadXLSX, loadStyledXLSX, hexToExcelRGB, readableTextRGB, splitNames, normalizeText, findByName, makeSubject, worksheetToRows, downloadWorkbook } from '../utils/excelUtils';
import { isTeachingSlot, classHasLunchAt } from '../utils/scheduleGenerator';

function lessonClassIds(lesson) {
  return Array.isArray(lesson.classIds) ? lesson.classIds : [lesson.classId].filter(Boolean);
}

function teacherSubjectIds(teacher) {
  return Array.isArray(teacher.subjectIds) ? teacher.subjectIds : (teacher.subjectId ? [teacher.subjectId] : []);
}

function safeFileDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function ImportExportPage({
  classes, subjects, setSubjects,
  teachers, setTeachers,
  rooms, timeslots, lunchGroups, schedule,
  toast,
}) {
  const teacherFileRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const sortedTimeslots = [...timeslots].sort((a, b) => Number(a.lessonNumber) - Number(b.lessonNumber));

  async function downloadTeacherTemplate() {
    try {
      const XLSX = await loadXLSX();
      downloadWorkbook(XLSX, [{
        name: "O'qituvchilar",
        rows: [
          {
            "Ism familiya": "Aliyev Ali",
            "Fanlar": "Matematika, Algebra",
            "Telefon": "+998 90 000 00 00",
            "Maksimal haftalik soat": 28,
            "Status": "Bo'sh",
          },
          {
            "Ism familiya": "Karimova Malika",
            "Fanlar": "Ingliz tili, Rus tili",
            "Telefon": "+998 91 000 00 00",
            "Maksimal haftalik soat": 24,
            "Status": "Bo'sh",
          },
        ],
      }], `oqituvchilar_shablon_${safeFileDate()}.xlsx`);
      toast("O'qituvchi shabloni yuklandi ✓", 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  async function importTeachers(file) {
    if (!file) return;
    setImporting(true);
    try {
      const XLSX = await loadXLSX();
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = worksheetToRows(XLSX, ws);
      if (!rows.length) {
        toast('Excel faylda ma\'lumot topilmadi', 'warning');
        return;
      }

      let nextSubjects = [...subjects];
      const nextTeachers = [...teachers];
      let addedTeachers = 0;
      let updatedTeachers = 0;
      let addedSubjects = 0;

      rows.forEach((row, rowIndex) => {
        const name = normalizeText(row["Ism familiya"] || row["F.I.Sh"] || row["O'qituvchi"] || row["Ustoz"] || row["Name"]);
        if (!name) return;

        const subjectNames = splitNames(row["Fanlar"] || row["Fan"] || row["Subjects"] || row["Subject"]);
        const subjectIds = [];
        subjectNames.forEach(subjectName => {
          let subject = findByName(nextSubjects, subjectName);
          if (!subject) {
            subject = makeSubject(subjectName, nextSubjects.length + rowIndex);
            nextSubjects.push(subject);
            addedSubjects += 1;
          }
          subjectIds.push(subject.id);
        });

        const maxWeeklyHours = Number(row["Maksimal haftalik soat"] || row["Max soat"] || row["MaxWeeklyHours"] || 28) || 28;
        const phone = normalizeText(row["Telefon"] || row["Phone"] || '');
        const status = normalizeText(row["Status"] || "Bo'sh") || "Bo'sh";
        const existing = findByName(nextTeachers, name);

        if (existing) {
          existing.subjectIds = [...new Set([ ...teacherSubjectIds(existing), ...subjectIds ])];
          existing.subjectId = existing.subjectIds[0] || existing.subjectId || '';
          existing.phone = phone || existing.phone || '';
          existing.maxWeeklyHours = maxWeeklyHours;
          existing.status = status;
          updatedTeachers += 1;
        } else {
          nextTeachers.push({
            id: genId(),
            name,
            subjectIds: [...new Set(subjectIds)],
            subjectId: subjectIds[0] || '',
            phone,
            maxWeeklyHours,
            status,
            createdAt: Date.now(),
          });
          addedTeachers += 1;
        }
      });

      setSubjects(nextSubjects);
      setTeachers(nextTeachers);
      toast(`${addedTeachers} ta o'qituvchi qo'shildi, ${updatedTeachers} ta yangilandi, ${addedSubjects} ta fan yaratildi ✓`, 'success');
    } catch (e) {
      toast(e.message || 'Excel importda xatolik', 'error');
    } finally {
      setImporting(false);
      if (teacherFileRef.current) teacherFileRef.current.value = '';
    }
  }

  async function exportTeachers() {
    try {
      const XLSX = await loadXLSX();
      const rows = teachers.map(t => ({
        "Ism familiya": t.name,
        "Fanlar": teacherSubjectIds(t).map(id => subjects.find(s => s.id === id)?.name).filter(Boolean).join(', '),
        "Telefon": t.phone || '',
        "Maksimal haftalik soat": t.maxWeeklyHours || 28,
        "Status": t.status || "Bo'sh",
      }));
      downloadWorkbook(XLSX, [{ name: "O'qituvchilar", rows: rows.length ? rows : [{ "Ism familiya": '', "Fanlar": '', "Telefon": '', "Maksimal haftalik soat": '', "Status": '' }] }], `oqituvchilar_${safeFileDate()}.xlsx`);
      toast("O'qituvchilar Excelga yuklandi ✓", 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  function getSubject(id) { return subjects.find(s => s.id === id); }
  function getTeacher(id) { return teachers.find(t => t.id === id); }
  function getRoom(id) { return rooms.find(r => r.id === id); }
  function getClassName(id) { return classes.find(c => c.id === id)?.name || ''; }

  function scheduleRows() {
    const rows = [];
    DAYS.forEach(day => {
      sortedTimeslots.forEach(ts => {
        const blocked = !isTeachingSlot(ts);
        if (blocked) {
          rows.push({
            "Kun": day,
            "Dars": ts.title || (ts.type === 'lunch' ? 'Obed vaqti' : 'Tanaffus'),
            "Boshlanish": ts.startTime || '',
            "Tugash": ts.endTime || '',
            "Sinf / guruh": '',
            "Fan": "Dars qo'yilmaydi",
            "O'qituvchi": '',
            "Xona": '',
            "Guruh kaliti": '',
          });
          return;
        }
        const lessons = schedule?.[day]?.[ts.id] || [];
        lessons.forEach(lesson => {
          rows.push({
            "Kun": day,
            "Dars": `${ts.lessonNumber}-dars`,
            "Boshlanish": ts.startTime || '',
            "Tugash": ts.endTime || '',
            "Sinf / guruh": lessonClassIds(lesson).map(getClassName).filter(Boolean).join(', '),
            "Fan": getSubject(lesson.subjectId)?.name || '',
            "O'qituvchi": getTeacher(lesson.teacherId)?.name || '',
            "Xona": getRoom(lesson.roomId)?.name || 'Xonasiz',
            "Guruh kaliti": lesson.groupKey || '',
          });
        });
      });
    });
    return rows;
  }

  function classScheduleRows() {
    const rows = [];
    classes.forEach(cls => {
      DAYS.forEach(day => {
        sortedTimeslots.forEach(ts => {
          const blocked = !isTeachingSlot(ts);
          const classLunch = !blocked && classHasLunchAt(ts, cls.id, lunchGroups, day);
          const lesson = (blocked || classLunch) ? null : (schedule?.[day]?.[ts.id] || []).find(l => lessonClassIds(l).includes(cls.id));
          rows.push({
            "Sinf": cls.name,
            "Kun": day,
            "Dars": blocked ? (ts.title || (ts.type === 'lunch' ? 'Obed vaqti' : 'Tanaffus')) : `${ts.lessonNumber}-dars`,
            "Vaqt": `${ts.startTime || ''}-${ts.endTime || ''}`,
            "Fan": blocked ? "Dars qo'yilmaydi" : (classLunch ? "Obed" : (lesson ? (getSubject(lesson.subjectId)?.name || '') : '')),
            "O'qituvchi": lesson ? (getTeacher(lesson.teacherId)?.name || '') : '',
            "Xona": lesson ? (getRoom(lesson.roomId)?.name || 'Xonasiz') : '',
            "Guruh": lesson?.groupKey || '',
          });
        });
      });
    });
    return rows;
  }

  function teacherLoadRows() {
    return teachers.map(t => {
      let lessons = 0;
      DAYS.forEach(day => sortedTimeslots.forEach(ts => {
        lessons += (schedule?.[day]?.[ts.id] || []).filter(l => l.teacherId === t.id).length;
      }));
      return {
        "O'qituvchi": t.name,
        "Fanlar": teacherSubjectIds(t).map(id => subjects.find(s => s.id === id)?.name).filter(Boolean).join(', '),
        "Jadvaldagi darslar": lessons,
        "Maksimal soat": t.maxWeeklyHours || 28,
        "Holat": lessons > Number(t.maxWeeklyHours || 28) ? 'Oshib ketgan' : 'Normal',
      };
    });
  }

  // Sinflar ustun (har biri 1 ustun), kun+dars qator bo'lgan rangli matritsa.
  // Fan N guruhga bo'linsa, o'sha dars N kichik qatorga bo'linadi — har guruh
  // (fani + ustozi) alohida katakda, tagma-tagma (biri ostida biri).
  // Oddiy (butun sinf) dars — bitta katak (kichik qatorlar bo'ylab birlashadi).
  function buildClassMatrix() {
    const header = ['Dars / vaqt', ...classes.map((c) => c.name)];
    const aoa = [header];
    const merges = [];
    const fills = []; // { r, c, bg, fg }
    const dayBandRows = []; // kulrang kun-sarlavha qatorlari
    const totalCols = 1 + classes.length;

    const cellFor = (l, withGroup) => {
      const subj = getSubject(l.subjectId);
      const tName = getTeacher(l.teacherId)?.name || '';
      const gp = withGroup && l.groupPart ? l.groupPart + '\n' : '';
      const text = gp + (subj?.name || '') + (tName ? '\n' + tName : '');
      const bg = hexToExcelRGB(subj?.color);
      return { text, fill: bg ? { bg, fg: readableTextRGB(bg) } : null };
    };

    const lessonsAt = (day, ts, cls) =>
      (schedule?.[day]?.[ts.id] || []).filter((l) => lessonClassIds(l).includes(cls.id));

    // Sinf uchun shu darsdagi guruhlar ro'yxati (yoki holat)
    function classCellPlan(day, ts, cls) {
      const teaching = isTeachingSlot(ts);
      if (!teaching) {
        return { kind: 'label', text: ts.type === 'lunch' ? 'Obed' : 'Tanaffus', fill: { bg: 'E5E7EB', fg: '6B7280' } };
      }
      const offDays = Array.isArray(cls.offDays) ? cls.offDays : [];
      if (offDays.includes(day)) return { kind: 'label', text: 'Dam', fill: { bg: 'FEF3C7', fg: 'B45309' } };
      if (classHasLunchAt(ts, cls.id, lunchGroups, day)) return { kind: 'label', text: 'Obed', fill: { bg: 'FDE68A', fg: '92400E' } };

      const ls = lessonsAt(day, ts, cls);
      if (!ls.length) return { kind: 'empty' };
      if (ls.length === 1) {
        const c = cellFor(ls[0], false);
        return { kind: 'single', text: c.text, fill: c.fill };
      }
      const sorted = [...ls].sort((a, b) =>
        String(a.groupPart || '').localeCompare(String(b.groupPart || ''), 'uz', { numeric: true })
      );
      return { kind: 'groups', groups: sorted.map((l) => cellFor(l, true)) };
    }

    let r = 1; // 0 = sarlavha qatori
    DAYS.forEach((day) => {
      // KULRANG kun-sarlavha qatori (butun en bo'ylab) — kunlarni ajratib turadi
      const bandRow = new Array(totalCols).fill('');
      bandRow[0] = day;
      aoa.push(bandRow);
      merges.push({ s: { r, c: 0 }, e: { r, c: totalCols - 1 } });
      dayBandRows.push(r);
      r += 1;

      sortedTimeslots.forEach((ts) => {
        const teaching = isTeachingSlot(ts);
        const timeLabel = `${ts.startTime || ''}${ts.endTime ? '-' + ts.endTime : ''}`;
        const darsLabel = teaching
          ? `${ts.lessonNumber}-dars${timeLabel ? '\n' + timeLabel : ''}`
          : (ts.title || (ts.type === 'lunch' ? 'Obed' : 'Tanaffus'));

        // Har bir sinf uchun rejani oldindan hisoblaymiz
        const plans = classes.map((cls) => classCellPlan(day, ts, cls));
        const groupCounts = plans.map((p) => (p.kind === 'groups' ? p.groups.length : 1));
        const maxGroups = Math.max(1, ...groupCounts);
        const blockStart = r;

        // maxGroups ta kichik qator yaratamiz
        for (let sub = 0; sub < maxGroups; sub++) {
          const row = [sub === 0 ? darsLabel : ''];
          plans.forEach((p, ci) => {
            const col = 1 + ci;
            let text = '';
            let fill = null;
            if (p.kind === 'groups') {
              if (sub < p.groups.length) { text = p.groups[sub].text; fill = p.groups[sub].fill; }
            } else if (sub === 0) {
              if (p.kind === 'single' || p.kind === 'label') { text = p.text; fill = p.fill || null; }
            }
            row.push(text);
            if (fill) fills.push({ r: blockStart + sub, c: col, bg: fill.bg, fg: fill.fg });
          });
          aoa.push(row);
        }

        // Birlashtirishlar (faqat maxGroups > 1 bo'lsa kerak bo'ladi)
        if (maxGroups > 1) {
          // Dars/vaqt ustunini vertikal birlashtirish
          merges.push({ s: { r: blockStart, c: 0 }, e: { r: blockStart + maxGroups - 1, c: 0 } });

          plans.forEach((p, ci) => {
            const col = 1 + ci;
            const gc = p.kind === 'groups' ? p.groups.length : 1;
            if (gc <= 1) {
              // butun sinf / bo'sh / dam / obed — maxGroups qator bo'ylab bitta katak
              merges.push({ s: { r: blockStart, c: col }, e: { r: blockStart + maxGroups - 1, c: col } });
            } else if (gc < maxGroups) {
              // guruhlar birinchi gc qatorda; qolgan bo'sh qatorlarni bitta katak qilamiz
              merges.push({ s: { r: blockStart + gc, c: col }, e: { r: blockStart + maxGroups - 1, c: col } });
            }
            // gc === maxGroups bo'lsa har guruh o'z qatorida, birlashtirilmaydi
          });
        }

        r += maxGroups;
      });
    });

    const colWidths = [
      { wch: 16 },
      ...classes.map((c) => ({ wch: Math.min(Math.max(String(c.name).length + 2, 18), 26) })),
    ];

    return { aoa, merges, fills, colWidths, dayBandRows };
  }

  // Batafsil ko'rinish: Kun | Soat | Vaqt | [har sinf: Fan/O'qituvchi | Auditoriya]
  function buildDetailedMatrix() {
    const LEAD = 3;
    const totalCols = LEAD + classes.length * 2;
    const aoa = [];
    const merges = [];
    const fills = [];        // { r, c, bg, fg } — fan/xona kataklari
    const bandRows = [];     // { r, bg, fg } — Nonushta/Tushlik/Uyqu
    const dayLabelRows = []; // { r } — kun ustuni birlashmasi boshi

    // 2 qatorli sarlavha
    const h0 = ['Kun', 'Soat', 'Vaqt'];
    const h1 = ['', '', ''];
    classes.forEach((c) => { h0.push(c.name, ''); h1.push("Fan / O'qituvchi", 'Auditoriya'); });
    aoa.push(h0, h1);
    for (let c = 0; c < LEAD; c++) merges.push({ s: { r: 0, c }, e: { r: 1, c } });
    classes.forEach((_, ci) => {
      const col = LEAD + ci * 2;
      merges.push({ s: { r: 0, c: col }, e: { r: 0, c: col + 1 } });
    });

    const subjColor = (l) => {
      const subj = getSubject(l.subjectId);
      const bg = hexToExcelRGB(subj?.color);
      return bg ? { bg, fg: readableTextRGB(bg) } : { bg: 'BDD7EE', fg: '1F2937' };
    };
    const lessonsAt = (day, ts, cls) =>
      (schedule?.[day]?.[ts.id] || []).filter((l) => lessonClassIds(l).includes(cls.id));
    const bandColor = (ts) => {
      const t = String(ts.title || '').toLowerCase();
      if (t.includes('uyqu') || t.includes('uxla')) return { bg: 'F8CBAD', fg: '7C2D12' };
      return { bg: '13A05A', fg: 'FFFFFF' };
    };

    let r = 2;
    DAYS.forEach((day) => {
      const dayStart = r;
      sortedTimeslots.forEach((ts) => {
        const teaching = isTeachingSlot(ts);
        const timeLabel = `${ts.startTime || ''}${ts.endTime ? '-' + ts.endTime : ''}`;
        if (!teaching) {
          const row = new Array(totalCols).fill('');
          row[1] = ts.lessonNumber || '';
          row[2] = timeLabel;
          row[LEAD] = ts.title || (ts.type === 'lunch' ? 'Tushlik vaqti' : 'Tanaffus');
          aoa.push(row);
          merges.push({ s: { r, c: LEAD }, e: { r, c: totalCols - 1 } });
          bandRows.push({ r, ...bandColor(ts) });
          r += 1;
          return;
        }
        const plans = classes.map((cls) => {
          const offDays = Array.isArray(cls.offDays) ? cls.offDays : [];
          if (offDays.includes(day)) return { kind: 'label', text: 'Dam', fill: { bg: 'FEF3C7', fg: 'B45309' } };
          if (classHasLunchAt(ts, cls.id, lunchGroups, day)) return { kind: 'label', text: 'Obed', fill: { bg: 'FDE68A', fg: '92400E' } };
          const ls = lessonsAt(day, ts, cls);
          if (!ls.length) return { kind: 'empty' };
          const sorted = [...ls].sort((a, b) => String(a.groupPart || '').localeCompare(String(b.groupPart || ''), 'uz', { numeric: true }));
          return {
            kind: 'lessons',
            items: sorted.map((l) => {
              const subj = getSubject(l.subjectId);
              const tName = getTeacher(l.teacherId)?.name || '';
              const gp = (sorted.length > 1 && l.groupPart) ? l.groupPart + ': ' : '';
              return { fan: gp + (subj?.name || '') + (tName ? '\n' + tName : ''), room: getRoom(l.roomId)?.name || '', fill: subjColor(l) };
            }),
          };
        });
        const counts = plans.map((p) => (p.kind === 'lessons' ? p.items.length : 1));
        const maxG = Math.max(1, ...counts);
        const blockStart = r;
        for (let sub = 0; sub < maxG; sub++) {
          const row = new Array(totalCols).fill('');
          if (sub === 0) { row[1] = ts.lessonNumber || ''; row[2] = timeLabel; }
          plans.forEach((p, ci) => {
            const colFan = LEAD + ci * 2;
            const colRoom = colFan + 1;
            if (p.kind === 'lessons') {
              if (sub < p.items.length) {
                row[colFan] = p.items[sub].fan;
                row[colRoom] = p.items[sub].room;
                fills.push({ r: blockStart + sub, c: colFan, ...p.items[sub].fill });
                fills.push({ r: blockStart + sub, c: colRoom, bg: 'FFFFFF', fg: '1F2937' });
              }
            } else if (sub === 0 && p.kind === 'label') {
              row[colFan] = p.text;
              fills.push({ r: blockStart, c: colFan, ...p.fill });
              fills.push({ r: blockStart, c: colRoom, ...p.fill });
            }
          });
          aoa.push(row);
        }
        if (maxG > 1) {
          merges.push({ s: { r: blockStart, c: 1 }, e: { r: blockStart + maxG - 1, c: 1 } });
          merges.push({ s: { r: blockStart, c: 2 }, e: { r: blockStart + maxG - 1, c: 2 } });
        }
        plans.forEach((p, ci) => {
          const colFan = LEAD + ci * 2;
          const colRoom = colFan + 1;
          const gc = p.kind === 'lessons' ? p.items.length : 1;
          if (gc <= 1 && maxG > 1) {
            merges.push({ s: { r: blockStart, c: colFan }, e: { r: blockStart + maxG - 1, c: colFan } });
            merges.push({ s: { r: blockStart, c: colRoom }, e: { r: blockStart + maxG - 1, c: colRoom } });
          } else if (gc > 1 && gc < maxG) {
            merges.push({ s: { r: blockStart + gc, c: colFan }, e: { r: blockStart + maxG - 1, c: colFan } });
            merges.push({ s: { r: blockStart + gc, c: colRoom }, e: { r: blockStart + maxG - 1, c: colRoom } });
          }
        });
        r += maxG;
      });
      if (r > dayStart) {
        merges.push({ s: { r: dayStart, c: 0 }, e: { r: r - 1, c: 0 } });
        aoa[dayStart][0] = day;
        dayLabelRows.push({ r: dayStart });
      }
    });

    const colWidths = [{ wch: 8 }, { wch: 6 }, { wch: 12 }];
    classes.forEach(() => { colWidths.push({ wch: 22 }, { wch: 16 }); });

    return { aoa, merges, fills, colWidths, bandRows, dayLabelRows, totalCols };
  }

  async function exportColoredMatrix() {
    try {
      if (!classes.length) {
        toast('Avval sinf qo\'shing', 'warning');
        return;
      }
      const hasAnyLesson = DAYS.some((day) =>
        sortedTimeslots.some((ts) => (schedule?.[day]?.[ts.id] || []).length > 0)
      );
      if (!hasAnyLesson) {
        toast('Avval dars jadvalini yarating', 'warning');
        return;
      }

      const XLSX = await loadStyledXLSX();
      const { aoa, merges, fills, colWidths, bandRows, dayLabelRows } = buildDetailedMatrix();
      const ws = XLSX.utils.aoa_to_sheet(aoa);

      const thin = { style: 'thin', color: { rgb: '9CA3AF' } };
      const border = { top: thin, bottom: thin, left: thin, right: thin };
      const range = XLSX.utils.decode_range(ws['!ref']);

      // Baza uslub — barcha kataklar
      for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const ref = XLSX.utils.encode_cell({ r: R, c: C });
          if (!ws[ref]) ws[ref] = { t: 's', v: '' };
          ws[ref].s = { alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border, font: { sz: 11 } };
        }
      }

      // Sarlavha 0-qatori (havorang) — Kun/Soat/Vaqt + sinf nomlari
      for (let C = range.s.c; C <= range.e.c; C++) {
        const ref = XLSX.utils.encode_cell({ r: 0, c: C });
        ws[ref].s = { alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border, font: { bold: true, sz: 12, color: { rgb: '0F3D5C' } }, fill: { patternType: 'solid', fgColor: { rgb: '35E0F2' } } };
      }
      // 1-qator: Kun/Soat/Vaqt (havorang, 0-qator bilan birlashgan) + sub-sarlavhalar (sariq)
      for (let C = 0; C < 3; C++) {
        const ref = XLSX.utils.encode_cell({ r: 1, c: C });
        if (!ws[ref]) ws[ref] = { t: 's', v: '' };
        ws[ref].s = { alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border, font: { bold: true, sz: 12, color: { rgb: '0F3D5C' } }, fill: { patternType: 'solid', fgColor: { rgb: '35E0F2' } } };
      }
      for (let C = 3; C <= range.e.c; C++) {
        const ref = XLSX.utils.encode_cell({ r: 1, c: C });
        if (!ws[ref]) ws[ref] = { t: 's', v: '' };
        ws[ref].s = { alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border, font: { bold: true, sz: 11, color: { rgb: '7A6A00' } }, fill: { patternType: 'solid', fgColor: { rgb: 'FFF200' } } };
      }

      // Fan / xona kataklari (rangli)
      fills.forEach(({ r, c, bg, fg }) => {
        const ref = XLSX.utils.encode_cell({ r, c });
        if (!ws[ref]) ws[ref] = { t: 's', v: '' };
        ws[ref].s = { alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border, font: { bold: true, sz: 11, color: { rgb: fg } }, fill: { patternType: 'solid', fgColor: { rgb: bg } } };
      });

      // Nonushta / Tushlik / Uyqu bandlari (butun en bo'ylab)
      bandRows.forEach(({ r, bg, fg }) => {
        for (let C = 3; C <= range.e.c; C++) {
          const ref = XLSX.utils.encode_cell({ r, c: C });
          if (!ws[ref]) ws[ref] = { t: 's', v: '' };
          ws[ref].s = { alignment: { horizontal: 'center', vertical: 'center', wrapText: false }, border, font: { bold: true, sz: 16, color: { rgb: fg } }, fill: { patternType: 'solid', fgColor: { rgb: bg } } };
        }
      });

      // Kun ustuni (vertikal yozuv, och sariq)
      dayLabelRows.forEach(({ r }) => {
        const ref = XLSX.utils.encode_cell({ r, c: 0 });
        if (!ws[ref]) ws[ref] = { t: 's', v: '' };
        ws[ref].s = { alignment: { horizontal: 'center', vertical: 'center', textRotation: 90, wrapText: false }, border, font: { bold: true, sz: 13, color: { rgb: '92400E' } }, fill: { patternType: 'solid', fgColor: { rgb: 'FDE68A' } } };
      });

      ws['!merges'] = merges;
      ws['!cols'] = colWidths;
      ws['!rows'] = aoa.map((_, i) => (i < 2 ? { hpt: 24 } : { hpt: 42 }));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Dars jadvali');
      XLSX.writeFile(wb, `dars_jadvali_rangli_${safeFileDate()}.xlsx`);
      toast('Rangli jadval Excelga yuklandi ✓', 'success');
    } catch (e) {
      toast(e.message || 'Excel eksportda xatolik', 'error');
    }
  }

  async function exportSchedule() {
    try {
      const rows = scheduleRows();
      if (!rows.length) {
        toast('Avval dars jadvalini yarating', 'warning');
        return;
      }
      const XLSX = await loadXLSX();
      downloadWorkbook(XLSX, [
        { name: 'Umumiy jadval', rows },
        { name: 'Sinflar kesimida', rows: classScheduleRows() },
        { name: 'Ustoz yuklamasi', rows: teacherLoadRows() },
      ], `dars_jadvali_${safeFileDate()}.xlsx`);
      toast('Dars jadvali Excelga yuklandi ✓', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Excel import / export</div>
          <div className="page-subtitle">O'qituvchilarni Excel orqali kiritish va dars jadvalini Excelga yuklash</div>
        </div>
      </div>

      <div className="page-body">
        <div className="alert alert-info">
          ℹ️ Excel fayllarini o'qish/yozish uchun SheetJS ishlatiladi. Internet bo'lmasa terminalda: <b>npm install xlsx</b>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          <div className="card"><div className="card-body">
            <div style={{ fontSize: 28, marginBottom: 10 }}>👩‍🏫</div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>O'qituvchilar importi</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Excel ustunlari: Ism familiya, Fanlar, Telefon, Maksimal haftalik soat, Status.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary" onClick={downloadTeacherTemplate}>⬇️ Shablon</button>
              <button className="btn btn-primary" onClick={() => teacherFileRef.current?.click()} disabled={importing}>{importing ? '⏳ Yuklanmoqda...' : '📥 Import'}</button>
              <button className="btn btn-secondary" onClick={exportTeachers} disabled={!teachers.length}>📤 Ustozlar export</button>
              <input ref={teacherFileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => importTeachers(e.target.files?.[0])} />
            </div>
          </div></div>

          <div className="card"><div className="card-body">
            <div style={{ fontSize: 28, marginBottom: 10 }}>📋</div>
            <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>Dars jadvalini Excelga yuklash</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Rangli jadval: ustunlarda sinflar, qatorlarda kun va dars vaqtlari, har bir fan o'z rangida. Pastdagi tugma — batafsil ro'yxat (sinf/ustoz kesimida).
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-success" onClick={exportColoredMatrix}>🎨 Rangli jadval (sinflar ustun)</button>
              <button className="btn btn-secondary" onClick={exportSchedule}>📊 Batafsil ro'yxat</button>
            </div>
          </div></div>
        </div>
      </div>
    </div>
  );
}
