import { DAYS } from "./constants";

// =====================================================================
//  EDUJADVAL — O'QITUVCHINI ALMASHTIRISH (minimal-buzilish qayta rejalash)
//
//  Maqsad: ketgan o'qituvchining darslarini yangi o'qituvchiga o'tkazish,
//  BUTUN JADVALNI QAYTA TUZMASDAN. Har bir dars uchun eng kam siljish
//  qidiriladi:
//    1-daraja (0 siljish): yangi ustoz o'sha joyda bo'sh → faqat nom almashadi
//    2-daraja (1 siljish): band → o'sha darsni yangi ustoz bo'sh joyiga surish
//    3-daraja (2 siljish): u ham band → bitta to'siq darsni chetga surib joy ochish
//  Boshqa ustoz/sinflar jadvaliga faqat 3-darajada, majburiyatдан tegiladi.
//
//  Tashqi API: mavjud `schedule` obyektini oladi, o'zgartirilgan nusxa va
//  o'zgarishlar jurnalini qaytaradi. scheduleGenerator formatiga to'liq mos.
// =====================================================================

function isTeachingSlot(timeslot) {
  const type = timeslot?.type || "lesson";
  return type !== "lunch" && type !== "break";
}

function classIdsOf(lesson) {
  return Array.isArray(lesson.classIds)
    ? lesson.classIds
    : [lesson.classId].filter(Boolean);
}

function getTeacherSubjectIds(teacher) {
  return Array.isArray(teacher.subjectIds)
    ? teacher.subjectIds
    : teacher.subjectId
    ? [teacher.subjectId]
    : [];
}

// schedule ni chuqur nusxalash (asl jadval buzilmasin)
function cloneSchedule(schedule) {
  const next = {};
  for (const day of Object.keys(schedule || {})) {
    next[day] = {};
    for (const tsId of Object.keys(schedule[day] || {})) {
      next[day][tsId] = (schedule[day][tsId] || []).map((l) => ({ ...l }));
    }
  }
  return next;
}

/**
 * O'qituvchini almashtirish.
 *
 * @param {Object} params
 * @param {Object} params.schedule       - mavjud dars jadvali (o'zgartirilmaydi, nusxasi qaytadi)
 * @param {Array}  params.timeslots      - dars vaqtlari
 * @param {Array}  params.teachers       - barcha o'qituvchilar
 * @param {Array}  params.classes        - barcha sinflar (dam kunlari uchun)
 * @param {string} params.oldTeacherId   - ketgan o'qituvchi id
 * @param {string} params.newTeacherId   - yangi o'qituvchi id
 * @param {Array}  [params.lunchGroups]  - obed guruhlari
 * @param {Array}  [params.onlyClassSubjectIds] - faqat shu {classId, subjectId} juftlarini
 *                                          ko'chirish (bo'sh bo'lsa — hammasini)
 * @returns {{ schedule, changes, movedOthers, failed, summary }}
 */
export function replaceTeacher({
  schedule,
  timeslots,
  teachers,
  classes = [],
  oldTeacherId,
  newTeacherId,
  lunchGroups = [],
  onlyClassSubjectIds = null,
}) {
  const result = {
    schedule: cloneSchedule(schedule),
    changes: [],       // [{classId, subjectId, kind, from, to}]
    movedOthers: [],   // 3-darajada surilgan boshqa darslar
    failed: [],        // ko'chirib bo'lmagan darslar
    summary: null,
  };

  if (!oldTeacherId || !newTeacherId) {
    result.summary = { error: "Eski yoki yangi o'qituvchi tanlanmagan" };
    return result;
  }
  if (oldTeacherId === newTeacherId) {
    result.summary = { error: "Eski va yangi o'qituvchi bir xil" };
    return result;
  }

  const sch = result.schedule;
  const newTeacher = teachers.find((t) => t.id === newTeacherId);
  const oldTeacher = teachers.find((t) => t.id === oldTeacherId);
  if (!newTeacher) {
    result.summary = { error: "Yangi o'qituvchi topilmadi" };
    return result;
  }

  // ——— Slotlar va indekslar ———
  const allSortedTs = [...timeslots].sort(
    (a, b) => Number(a.lessonNumber) - Number(b.lessonNumber)
  );
  const teachingTs = allSortedTs.filter(isTeachingSlot);
  const T = teachingTs.length;
  const teachIdxById = new Map(teachingTs.map((ts, i) => [ts.id, i]));

  // yonma-yon slotlarmi (blok darslar uzilmasligi uchun)
  const allIdxById = new Map(allSortedTs.map((ts, i) => [ts.id, i]));
  const nextConsecutive = new Array(Math.max(0, T - 1)).fill(false);
  for (let i = 0; i < T - 1; i++) {
    nextConsecutive[i] =
      allIdxById.get(teachingTs[i + 1].id) === allIdxById.get(teachingTs[i].id) + 1;
  }

  const newTeacherSubjects = new Set(getTeacherSubjectIds(newTeacher));
  const newTeacherMax = Number(newTeacher.maxWeeklyHours || 40);
  const newTeacherOff = new Set(Array.isArray(newTeacher.offDays) ? newTeacher.offDays : []);

  const classOff = {};
  classes.forEach((c) => {
    classOff[c.id] = new Set(Array.isArray(c.offDays) ? c.offDays : []);
  });

  // ——— Obed bloklangan slotlar: `${day}|${classId}|${tsId}` ———
  function classHasLunchAt(ts, classId, day) {
    return (lunchGroups || []).some((group) => {
      const cids = Array.isArray(group.classIds) ? group.classIds : [];
      if (!cids.includes(classId)) return false;
      const slotIds = Array.isArray(group.timeslotIds) ? group.timeslotIds : null;
      if (slotIds && slotIds.length) {
        if (!slotIds.includes(ts.id)) return false;
        const days = Array.isArray(group.days) && group.days.length ? group.days : null;
        return days ? days.includes(day) : true;
      }
      // eski format (vaqt oralig'i) — soddalik uchun bloklangan deb hisoblaymiz
      const toMin = (t = "00:00") => { const [h, m] = String(t).split(":").map(Number); return (h || 0) * 60 + (m || 0); };
      return toMin(ts.startTime) < toMin(group.endTime) && toMin(ts.endTime) > toMin(group.startTime);
    });
  }

  // ——— Joriy bandlik holatini jadvaldan qurish ———
  // occTeacher/occRoom/occClass: `${day}|${tsId}` → Set(id)
  const occTeacher = new Map();
  const occRoom = new Map();
  const occClass = new Map();
  const teacherWeekLoad = new Map(); // teacherId → jami soat

  function grab(map, key) {
    let s = map.get(key);
    if (!s) { s = new Set(); map.set(key, s); }
    return s;
  }

  for (const day of DAYS) {
    for (const ts of teachingTs) {
      const cell = sch[day]?.[ts.id] || [];
      const key = `${day}|${ts.id}`;
      for (const l of cell) {
        if (l.teacherId) {
          grab(occTeacher, key).add(l.teacherId);
          teacherWeekLoad.set(l.teacherId, (teacherWeekLoad.get(l.teacherId) || 0) + 1);
        }
        if (l.roomId) grab(occRoom, key).add(l.roomId);
        classIdsOf(l).forEach((cid) => grab(occClass, key).add(cid));
      }
    }
  }

  // ——— Ketgan ustozning ko'chiriladigan darslarini yig'ish ———
  // Har biri: { day, tsId, lesson, classIds, subjectId }
  const targets = [];
  const onlySet = onlyClassSubjectIds
    ? new Set(onlyClassSubjectIds.map((x) => `${x.classId}__${x.subjectId}`))
    : null;

  for (const day of DAYS) {
    for (const ts of teachingTs) {
      const cell = sch[day]?.[ts.id] || [];
      for (const l of cell) {
        if (l.teacherId !== oldTeacherId) continue;
        // faqat tanlangan sinf/fanlar (agar berilgan bo'lsa)
        if (onlySet) {
          const match = classIdsOf(l).some((cid) => onlySet.has(`${cid}__${l.subjectId}`));
          if (!match) continue;
        }
        targets.push({ day, tsId: ts.id, lesson: l, classIds: classIdsOf(l), subjectId: l.subjectId });
      }
    }
  }

  if (!targets.length) {
    result.summary = {
      ok: true,
      message: "Ketgan o'qituvchining ko'chiriladigan darsi topilmadi",
      totalLessons: 0, inPlace: 0, moved: 0, ejected: 0, failed: 0,
    };
    return result;
  }

  // Yangi ustoz bu fanlarni o'qiy oladimi — ogohlantirish (bloklamaymiz,
  // lekin xabar beramiz)
  const subjectsCovered = new Set(targets.map((t) => t.subjectId));
  const uncoveredSubjects = [...subjectsCovered].filter((sid) => !newTeacherSubjects.has(sid));

  // ——— Yordamchi tekshiruvlar ———
  function slotBlockedForClasses(day, tsId, classIds) {
    const ts = teachingTs[teachIdxById.get(tsId)];
    if (!ts) return true;
    for (const cid of classIds) {
      if (classOff[cid]?.has(day)) return true;
      if (classHasLunchAt(ts, cid, day)) return true;
    }
    return false;
  }

  // Yangi ustoz shu (day, tsId) da band emasmi + dam kuni emasmi
  function newTeacherFree(day, tsId, ignoreLesson = null) {
    if (newTeacherOff.has(day)) return false;
    const key = `${day}|${tsId}`;
    const set = occTeacher.get(key);
    if (!set) return true;
    if (!set.has(newTeacherId)) return true;
    // agar band bo'lsa, ehtimol o'sha bandlik aynan biz ko'chirayotgan
    // darsdan (ignoreLesson) — bunda hisobga olmaymiz
    if (ignoreLesson) {
      const cell = sch[day]?.[tsId] || [];
      const others = cell.filter(
        (l) => l !== ignoreLesson && l.teacherId === newTeacherId
      );
      return others.length === 0;
    }
    return false;
  }

  // Berilgan darsni (uning sinflari va xonasi bilan) shu (day, tsId) ga
  // yangi ustoz bilan qo'yish mumkinmi (sinf/xona/ustoz bandligi)
  function canPlaceHere(day, tsId, classIds, roomId, ignoreLesson = null) {
    if (slotBlockedForClasses(day, tsId, classIds)) return false;
    if (!newTeacherFree(day, tsId, ignoreLesson)) return false;
    const key = `${day}|${tsId}`;
    // sinf band emasmi (ignoreLesson dan tashqari)
    const cSet = occClass.get(key);
    if (cSet) {
      for (const cid of classIds) {
        if (cSet.has(cid)) {
          // shu sinf bandligi ignoreLesson dan bo'lishi mumkin
          const cell = sch[day]?.[tsId] || [];
          const other = cell.some(
            (l) => l !== ignoreLesson && classIdsOf(l).includes(cid)
          );
          if (other) return false;
        }
      }
    }
    // xona band emasmi
    if (roomId) {
      const rSet = occRoom.get(key);
      if (rSet && rSet.has(roomId)) {
        const cell = sch[day]?.[tsId] || [];
        const other = cell.some((l) => l !== ignoreLesson && l.roomId === roomId);
        if (other) return false;
      }
    }
    return true;
  }

  // Bandlik indekslaridan darsni olib tashlash
  function removeFromOcc(day, tsId, lesson) {
    const key = `${day}|${tsId}`;
    if (lesson.teacherId) {
      // faqat shu hujayrada boshqa dars shu ustozni ishlatmasa Set'dan olamiz
      const cell = sch[day]?.[tsId] || [];
      const stillTeacher = cell.some((l) => l !== lesson && l.teacherId === lesson.teacherId);
      if (!stillTeacher) occTeacher.get(key)?.delete(lesson.teacherId);
      teacherWeekLoad.set(lesson.teacherId, Math.max(0, (teacherWeekLoad.get(lesson.teacherId) || 0) - 1));
    }
    if (lesson.roomId) {
      const cell = sch[day]?.[tsId] || [];
      const stillRoom = cell.some((l) => l !== lesson && l.roomId === lesson.roomId);
      if (!stillRoom) occRoom.get(key)?.delete(lesson.roomId);
    }
    classIdsOf(lesson).forEach((cid) => {
      const cell = sch[day]?.[tsId] || [];
      const stillClass = cell.some((l) => l !== lesson && classIdsOf(l).includes(cid));
      if (!stillClass) occClass.get(key)?.delete(cid);
    });
  }

  // Bandlik indekslariga dars qo'shish
  function addToOcc(day, tsId, lesson) {
    const key = `${day}|${tsId}`;
    if (lesson.teacherId) {
      grab(occTeacher, key).add(lesson.teacherId);
      teacherWeekLoad.set(lesson.teacherId, (teacherWeekLoad.get(lesson.teacherId) || 0) + 1);
    }
    if (lesson.roomId) grab(occRoom, key).add(lesson.roomId);
    classIdsOf(lesson).forEach((cid) => grab(occClass, key).add(cid));
  }

  // Darsni jadval hujayrasidan olib tashlash (obyekt havolasi bo'yicha)
  function detachLesson(day, tsId, lesson) {
    const cell = sch[day]?.[tsId];
    if (!cell) return;
    const idx = cell.indexOf(lesson);
    if (idx >= 0) cell.splice(idx, 1);
  }

  // Darsni jadval hujayrasiga qo'yish
  function attachLesson(day, tsId, lesson) {
    if (!sch[day]) sch[day] = {};
    if (!sch[day][tsId]) sch[day][tsId] = [];
    sch[day][tsId].push(lesson);
  }

  // Yangi ustozning haftalik limiti oshmaydimi (ketgan ustoz o'rniga
  // kelayotgani uchun, ketganning yuki chiqarilgan bo'ladi)
  function newLoadOk(extra = 1) {
    return (teacherWeekLoad.get(newTeacherId) || 0) + extra <= newTeacherMax;
  }

  // ——— Har bir maqsad darsni ko'chirish ———
  let inPlace = 0, moved = 0, ejected = 0;

  for (const target of targets) {
    const { day, tsId, lesson } = target;
    const classIds = classIdsOf(lesson);
    const roomId = lesson.roomId || "";

    // Avval bu darsni eski ustoz bandligidan chiqaramiz (o'zi ko'chadi)
    removeFromOcc(day, tsId, lesson);

    // === 1-DARAJA: o'z joyida qoldirish (faqat ustoz nomi almashadi) ===
    if (canPlaceHere(day, tsId, classIds, roomId, lesson) && newLoadOk(1)) {
      lesson.teacherId = newTeacherId;
      addToOcc(day, tsId, lesson);
      inPlace += 1;
      result.changes.push({
        classIds, subjectId: lesson.subjectId, kind: "inPlace",
        from: { day, tsId }, to: { day, tsId },
      });
      continue;
    }

    // === 2-DARAJA: shu darsni yangi ustoz bo'sh bo'lgan boshqa joyga surish ===
    // Eng kam "begonalik": o'sha kunni afzal ko'ramiz, keyin qo'shni kunlar
    const candidate = findBestFreeSlot(day, tsId, classIds, roomId, lesson);
    if (candidate) {
      detachLesson(day, tsId, lesson);
      lesson.teacherId = newTeacherId;
      attachLesson(candidate.day, candidate.tsId, lesson);
      addToOcc(candidate.day, candidate.tsId, lesson);
      moved += 1;
      result.changes.push({
        classIds, subjectId: lesson.subjectId, kind: "moved",
        from: { day, tsId }, to: { day: candidate.day, tsId: candidate.tsId },
      });
      continue;
    }

    // === 3-DARAJA: bitta to'siq darsni chetga surib, joy ochish (ejection) ===
    const ejectPlan = tryEject(day, tsId, classIds, roomId, lesson);
    if (ejectPlan) {
      // to'siqni ko'chiramiz
      const { blocker, blockerTo, targetDay, targetTsId } = ejectPlan;
      // blocker'ni eski joyidan olib, yangi joyiga
      removeFromOcc(blocker.day, blocker.tsId, blocker.lesson);
      detachLesson(blocker.day, blocker.tsId, blocker.lesson);
      attachLesson(blockerTo.day, blockerTo.tsId, blocker.lesson);
      addToOcc(blockerTo.day, blockerTo.tsId, blocker.lesson);
      result.movedOthers.push({
        teacherId: blocker.lesson.teacherId,
        classIds: classIdsOf(blocker.lesson),
        subjectId: blocker.lesson.subjectId,
        from: { day: blocker.day, tsId: blocker.tsId },
        to: { day: blockerTo.day, tsId: blockerTo.tsId },
      });
      // endi maqsad darsni ochilgan joyga
      detachLesson(day, tsId, lesson);
      lesson.teacherId = newTeacherId;
      attachLesson(targetDay, targetTsId, lesson);
      addToOcc(targetDay, targetTsId, lesson);
      ejected += 1;
      result.changes.push({
        classIds, subjectId: lesson.subjectId, kind: "ejected",
        from: { day, tsId }, to: { day: targetDay, tsId: targetTsId },
      });
      continue;
    }

    // === Ko'chirib bo'lmadi ===
    // darsni eski holicha qaytaramiz (ustoz hali ham eski — ogohlantirish beriladi)
    addToOcc(day, tsId, lesson);
    result.failed.push({
      classIds, subjectId: lesson.subjectId, at: { day, tsId },
    });
  }

  // ——— 2-daraja qidiruv: eng yaqin bo'sh joy ———
  function findBestFreeSlot(origDay, origTsId, classIds, roomId, ignoreLesson) {
    const origDayIdx = DAYS.indexOf(origDay);
    // kunlarni "yaqinlik" bo'yicha tartiblaymiz (avval o'sha kun, keyin qo'shnilar)
    const dayOrder = [...DAYS].sort((a, b) => {
      return Math.abs(DAYS.indexOf(a) - origDayIdx) - Math.abs(DAYS.indexOf(b) - origDayIdx);
    });
    for (const day of dayOrder) {
      for (let i = 0; i < T; i++) {
        const ts = teachingTs[i];
        if (day === origDay && ts.id === origTsId) continue; // o'sha joy allaqachon sinaldi
        if (canPlaceHere(day, ts.id, classIds, roomId, ignoreLesson) && newLoadOk(1)) {
          return { day, tsId: ts.id };
        }
      }
    }
    return null;
  }

  // ——— 3-daraja: to'siqni surib, joy ochish ———
  // Maqsad darsni qo'yish uchun bitta band slotни tanlaymiz, undagi
  // to'siq darsni (boshqa ustozniki) boshqa bo'sh joyga suramiz.
  function tryEject(origDay, origTsId, classIds, roomId, ignoreLesson) {
    const origDayIdx = DAYS.indexOf(origDay);
    const dayOrder = [...DAYS].sort((a, b) => {
      return Math.abs(DAYS.indexOf(a) - origDayIdx) - Math.abs(DAYS.indexOf(b) - origDayIdx);
    });

    for (const day of dayOrder) {
      if (newTeacherOff.has(day)) continue;
      for (let i = 0; i < T; i++) {
        const ts = teachingTs[i];
        // bu joy sinf/obed jihatidan mumkinmi (faqat to'siq ustoz/xonани e'tiborsiz)
        if (slotBlockedForClasses(day, ts.id, classIds)) continue;
        if (!newTeacherFree(day, ts.id, ignoreLesson)) continue;

        // shu joyda maqsad sinflarni band qilayotgan bitta dars bormi?
        const cell = sch[day]?.[ts.id] || [];
        const conflicting = cell.filter(
          (l) => l !== ignoreLesson &&
            (classIdsOf(l).some((cid) => classIds.includes(cid)) ||
              (roomId && l.roomId === roomId))
        );
        // faqat bitta to'siq bo'lsa ko'chirishga arziydi (minimal buzilish)
        if (conflicting.length !== 1) continue;
        const blocker = conflicting[0];
        // ketgan ustozning boshqa darsini emas, mustaqil darsni suramiz
        if (blocker.teacherId === oldTeacherId) continue;

        // bu to'siqni boshqa bo'sh joyga ko'chira olamizmi?
        const blockerClassIds = classIdsOf(blocker);
        const blockerTeacher = teachers.find((t) => t.id === blocker.teacherId);
        const blockerOff = new Set(Array.isArray(blockerTeacher?.offDays) ? blockerTeacher.offDays : []);

        const spot = findFreeSlotForBlocker(blocker, blockerClassIds, blockerOff, day, ts.id);
        if (spot) {
          return {
            blocker: { lesson: blocker, day, tsId: ts.id },
            blockerTo: spot,
            targetDay: day,
            targetTsId: ts.id,
          };
        }
      }
    }
    return null;
  }

  // to'siq dars uchun bo'sh joy (uning o'z ustozi/sinfi/xonasi bandligiga qarab)
  function findFreeSlotForBlocker(blocker, blockerClassIds, blockerOff, avoidDay, avoidTsId) {
    const roomId = blocker.roomId || "";
    const teacherId = blocker.teacherId;
    for (const day of DAYS) {
      if (blockerOff.has(day)) continue;
      for (let i = 0; i < T; i++) {
        const ts = teachingTs[i];
        if (day === avoidDay && ts.id === avoidTsId) continue;
        if (slotBlockedForClasses(day, ts.id, blockerClassIds)) continue;
        const key = `${day}|${ts.id}`;
        // ustoz band emasmi
        if (teacherId && occTeacher.get(key)?.has(teacherId)) {
          const cell = sch[day]?.[ts.id] || [];
          if (cell.some((l) => l !== blocker && l.teacherId === teacherId)) continue;
        }
        // sinf band emasmi
        let classBusy = false;
        const cSet = occClass.get(key);
        if (cSet) {
          for (const cid of blockerClassIds) {
            if (cSet.has(cid)) {
              const cell = sch[day]?.[ts.id] || [];
              if (cell.some((l) => l !== blocker && classIdsOf(l).includes(cid))) { classBusy = true; break; }
            }
          }
        }
        if (classBusy) continue;
        // xona band emasmi
        if (roomId && occRoom.get(key)?.has(roomId)) {
          const cell = sch[day]?.[ts.id] || [];
          if (cell.some((l) => l !== blocker && l.roomId === roomId)) continue;
        }
        return { day, tsId: ts.id };
      }
    }
    return null;
  }

  result.summary = {
    ok: result.failed.length === 0,
    totalLessons: targets.length,
    inPlace,
    moved,
    ejected,
    failed: result.failed.length,
    uncoveredSubjects, // yangi ustoz biriktirilmagan fanlar (ogohlantirish)
    oldTeacherName: oldTeacher?.name || oldTeacherId,
    newTeacherName: newTeacher?.name || newTeacherId,
  };

  return result;
}