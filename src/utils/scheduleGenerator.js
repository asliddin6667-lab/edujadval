import { DAYS } from "./constants";

export function isTeachingSlot(timeslot) {
  const type = timeslot?.type || "lesson";
  return type !== "lunch" && type !== "break";
}

export function emptySchedule(timeslots) {
  const schedule = {};
  DAYS.forEach((day) => {
    schedule[day] = {};
    timeslots.forEach((ts) => {
      schedule[day][ts.id] = [];
    });
  });
  return schedule;
}

export function getTeacherSubjectIds(teacher) {
  return Array.isArray(teacher.subjectIds)
    ? teacher.subjectIds
    : teacher.subjectId
    ? [teacher.subjectId]
    : [];
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, rng = Math.random) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cleanLevelGroups(groups = []) {
  return (Array.isArray(groups) ? groups : [])
    .map((g, i) => ({
      name: g?.name || `${i + 1}-guruh`,
      teacherId: g?.teacherId || "",
      roomId: g?.roomId || "",
    }))
    .filter((g) => g.teacherId);
}

export function normalizeAssignment(item, subject) {
  const levelGroups = cleanLevelGroups(item.levelGroups || []);

  return {
    subjectId: item.subjectId,
    weeklyHours: Number(item.weeklyHours || subject?.weeklyHours || 1),
    teacherId: item.teacherId || "",
    roomId: item.roomId || "",
    groupKey: (item.groupKey || "").trim(),
    splitEnabled: Boolean(item.splitEnabled),
    teacherId2: item.teacherId2 || "",
    roomId2: item.roomId2 || "",
    swapEnabled: Boolean(item.swapEnabled),
    swapSubjectId: item.swapSubjectId || "",
    swapTeacherId: item.swapTeacherId || "",
    swapRoomId: item.swapRoomId || "",
    groupName1: item.groupName1 || "1-guruh",
    groupName2: item.groupName2 || "2-guruh",
    weekAltEnabled: Boolean(item.weekAltEnabled),
    weekAltSubjectId: item.weekAltSubjectId || "",
    weekAltTeacherId: item.weekAltTeacherId || "",
    weekAltRoomId: item.weekAltRoomId || "",
    weekAltHours: Number(item.weekAltHours || 1),
    levelGroupEnabled: Boolean(item.levelGroupEnabled),
    levelGroupKey: (item.levelGroupKey || "").trim(),
    isCore: Boolean(item.isCore),
    allowDouble:
      item.allowDouble === undefined
        ? Boolean(subject?.allowDouble)
        : Boolean(item.allowDouble),
    levelGroups,
  };
}

function toMinutes(time = "00:00") {
  const [h, m] = String(time).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(aEnd) > toMinutes(bStart);
}

export function classHasLunchAt(timeslot, classId, lunchGroups = [], day = null) {
  if (!timeslot || !classId) return false;

  return (lunchGroups || []).some((group) => {
    const classIds = Array.isArray(group.classIds) ? group.classIds : [];
    if (!classIds.includes(classId)) return false;

    const slotIds = Array.isArray(group.timeslotIds) ? group.timeslotIds : null;
    if (slotIds && slotIds.length) {
      if (!slotIds.includes(timeslot.id)) return false;
      const days = Array.isArray(group.days) && group.days.length ? group.days : null;
      if (day == null) return true;
      return days ? days.includes(day) : true;
    }

    return overlaps(timeslot.startTime, timeslot.endTime, group.startTime, group.endTime);
  });
}

export function classesHaveLunchAt(timeslot, classIds = [], lunchGroups = [], day = null) {
  return classIds.some((classId) => classHasLunchAt(timeslot, classId, lunchGroups, day));
}

export function validateScheduleData(classes, subjects, teachers, rooms, timeslots, classSubjects) {
  const errors = [];

  if (!classes.length) errors.push("Sinflar qo'shilmagan");
  if (!subjects.length) errors.push("Fanlar qo'shilmagan");
  if (!teachers.length) errors.push("O'qituvchilar qo'shilmagan");
  if (!timeslots.length) errors.push("Dars vaqtlari qo'shilmagan");

  if (timeslots.length && !timeslots.some(isTeachingSlot)) {
    errors.push("Kamida bitta dars vaqti bo'lishi kerak");
  }

  classes.forEach((cls) => {
    const assigned = classSubjects?.[cls.id] || [];

    if (!assigned.length) {
      errors.push(`${cls.name} sinfiga fan biriktirilmagan`);
    }

    assigned.forEach((raw) => {
      const subject = subjects.find((s) => s.id === raw.subjectId);
      if (!subject) return;

      const a = normalizeAssignment(raw, subject);

      if (a.levelGroupEnabled) {
        if (!a.levelGroupKey) {
          errors.push(`${cls.name}: ${subject.name} uchun daraja guruh kaliti yozilmagan`);
        }

        if (!a.levelGroups.length) {
          errors.push(`${cls.name}: ${subject.name} daraja guruhlariga ustozlar tanlanmagan`);
        }

        const seen = new Set();

        a.levelGroups.forEach((g, i) => {
          const teacher = teachers.find((t) => t.id === g.teacherId);

          if (!teacher) {
            errors.push(`${cls.name}: ${subject.name} ${g.name || `${i + 1}-guruh`} ustoz topilmadi`);
          } else if (!getTeacherSubjectIds(teacher).includes(a.subjectId)) {
            errors.push(`${teacher.name} ${subject.name} faniga biriktirilmagan`);
          }

          if (seen.has(g.teacherId)) {
            errors.push(`${cls.name}: ${subject.name} daraja guruhlarida bitta ustoz ikki marta tanlangan`);
          }

          seen.add(g.teacherId);
        });

        return;
      }

      if (!a.teacherId) {
        errors.push(`${cls.name}: ${subject.name} faniga 1-ustoz tanlanmagan`);
      } else {
        const teacher = teachers.find((t) => t.id === a.teacherId);

        if (!teacher) {
          errors.push(`${cls.name}: ${subject.name} uchun tanlangan 1-ustoz topilmadi`);
        } else if (!getTeacherSubjectIds(teacher).includes(a.subjectId)) {
          errors.push(`${teacher.name} ${subject.name} faniga biriktirilmagan`);
        }
      }

      // Hafta almashinuvi (juft/toq) — sinf bo'linmaydi, butun sinf navbatlashadi
      if (a.weekAltEnabled) {
        const altSubject = subjects.find((s) => s.id === a.weekAltSubjectId);
        if (!a.weekAltSubjectId || !altSubject) {
          errors.push(`${cls.name}: ${subject.name} hafta almashinuvi uchun 2-fan tanlanmagan`);
        }
        if (!a.weekAltTeacherId) {
          errors.push(`${cls.name}: ${subject.name} hafta almashinuvi uchun 2-fan ustozi tanlanmagan`);
        } else {
          const altTeacher = teachers.find((t) => t.id === a.weekAltTeacherId);
          if (!altTeacher) {
            errors.push(`${cls.name}: ${subject.name} hafta almashinuvi 2-fan ustozi topilmadi`);
          } else if (altSubject && !getTeacherSubjectIds(altTeacher).includes(a.weekAltSubjectId)) {
            errors.push(`${altTeacher.name} ${altSubject.name} faniga biriktirilmagan`);
          }
        }
      }

      if (a.splitEnabled && a.swapEnabled) {
        const swapSubject = subjects.find((s) => s.id === a.swapSubjectId);
        if (!a.swapSubjectId || !swapSubject) {
          errors.push(`${cls.name}: ${subject.name} almashinuv uchun 2-fan tanlanmagan`);
        }
        if (!a.swapTeacherId) {
          errors.push(`${cls.name}: ${subject.name} almashinuv uchun 2-fan ustozi tanlanmagan`);
        } else {
          const swapTeacher = teachers.find((t) => t.id === a.swapTeacherId);
          if (!swapTeacher) {
            errors.push(`${cls.name}: ${subject.name} almashinuv 2-fan ustozi topilmadi`);
          } else if (swapSubject && !getTeacherSubjectIds(swapTeacher).includes(a.swapSubjectId)) {
            errors.push(`${swapTeacher.name} ${swapSubject.name} faniga biriktirilmagan`);
          }
          if (a.teacherId && a.teacherId === a.swapTeacherId) {
            errors.push(`${cls.name}: ${subject.name} almashinuvida ikkala fan ustozi bir xil bo'lmasin`);
          }
        }
      } else if (a.splitEnabled) {
        if (!a.teacherId2) {
          errors.push(`${cls.name}: ${subject.name} 2-guruh uchun 2-ustoz tanlanmagan`);
        } else {
          const teacher2 = teachers.find((t) => t.id === a.teacherId2);

          if (!teacher2) {
            errors.push(`${cls.name}: ${subject.name} uchun tanlangan 2-ustoz topilmadi`);
          } else if (!getTeacherSubjectIds(teacher2).includes(a.subjectId)) {
            errors.push(`${teacher2.name} ${subject.name} faniga biriktirilmagan`);
          }

          if (a.teacherId && a.teacherId === a.teacherId2) {
            errors.push(`${cls.name}: ${subject.name} uchun 1-ustoz va 2-ustoz bir xil bo'lmasin`);
          }
        }
      }
    });
  });

  return [...new Set(errors)];
}

function classIdsOf(lesson) {
  return Array.isArray(lesson.classIds)
    ? lesson.classIds
    : [lesson.classId].filter(Boolean);
}

export function hasAdjacentSameSubject(schedule, day, tsId, classIds, subjectId, timeslots) {
  const sorted = [...timeslots].sort(
    (a, b) => Number(a.lessonNumber) - Number(b.lessonNumber)
  );

  const idx = sorted.findIndex((ts) => ts.id === tsId);
  if (idx < 0) return false;

  const neighbors = [sorted[idx - 1], sorted[idx + 1]].filter(Boolean);

  return neighbors.some((ts) => {
    if (!isTeachingSlot(ts)) return false;

    const lessons = schedule[day]?.[ts.id] || [];

    return lessons.some(
      (l) =>
        l.subjectId === subjectId &&
        classIdsOf(l).some((id) => classIds.includes(id))
    );
  });
}

function splitHoursToBlocks(hours, allowDouble) {
  const total = Number(hours || 0);

  if (!allowDouble) {
    return Array.from({ length: total }, () => 1);
  }

  const blocks = [];
  let remaining = total;

  while (remaining >= 2) {
    blocks.push(2);
    remaining -= 2;
  }

  if (remaining === 1) blocks.push(1);

  return blocks;
}

function attemptSchedule(
  classes, subjects, teachers, rooms, timeslots,
  classSubjects = {}, lunchGroups = [], lockedSchedule = null, options = {}
) {
  const rng = mulberry32((options.seed ?? 1) >>> 0);
  const deadline = options.deadline || Date.now() + 8000;
  const polishBudgetMs = options.polishBudgetMs ?? 450;
  const schedule = emptySchedule(timeslots);
  if (!classes.length || !subjects.length || !teachers.length || !timeslots.length) {
    return { schedule, placed: 0, attempted: 0, soft: 0, report: null };
  }
  let attemptedHours = 0;
  let placedHours = 0;
  const D = DAYS.length;
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const teacherById = new Map(teachers.map((t) => [t.id, t]));
  const teacherSubjSet = new Map(teachers.map((t) => [t.id, new Set(getTeacherSubjectIds(t))]));
  const allSortedTs = [...timeslots].sort((a, b) => Number(a.lessonNumber) - Number(b.lessonNumber));
  const teachingTs = allSortedTs.filter(isTeachingSlot);
  const T = teachingTs.length;
  const DT = D * T;
  const allIdxById = new Map(allSortedTs.map((ts, i) => [ts.id, i]));
  const teachIdxById = new Map(teachingTs.map((ts, i) => [ts.id, i]));
  const nextConsecutive = new Array(Math.max(0, T - 1)).fill(false);
  for (let i = 0; i < T - 1; i++) {
    nextConsecutive[i] = allIdxById.get(teachingTs[i + 1].id) === allIdxById.get(teachingTs[i].id) + 1;
  }
  const C = classes.length;
  const TT = teachers.length;
  const S = subjects.length;
  const cIdxOf = new Map(classes.map((c, i) => [c.id, i]));
  const tIdxOf = new Map(teachers.map((t, i) => [t.id, i]));
  const sIdxOf = new Map(subjects.map((s, i) => [s.id, i]));
  const classOffMask = new Uint8Array(C * D);
  const classOffSet = {};
  classes.forEach((c, ci) => {
    const off = new Set(Array.isArray(c.offDays) ? c.offDays : []);
    classOffSet[c.id] = off;
    DAYS.forEach((day, d) => { if (off.has(day)) classOffMask[ci * D + d] = 1; });
  });
  const teacherOffMask = new Uint8Array(TT * D);
  const teacherOffSet = {};
  teachers.forEach((t, ti) => {
    const off = new Set(Array.isArray(t.offDays) ? t.offDays : []);
    teacherOffSet[t.id] = off;
    DAYS.forEach((day, d) => { if (off.has(day)) teacherOffMask[ti * D + d] = 1; });
  });
  const lunchGrid = new Uint8Array(C * DT);
  classes.forEach((c, ci) => {
    DAYS.forEach((day, d) => {
      teachingTs.forEach((ts, i) => {
        if (classHasLunchAt(ts, c.id, lunchGroups, day)) lunchGrid[ci * DT + d * T + i] = 1;
      });
    });
  });
  // ——— Smena/sinf biriktiruvi: timeslot.classIds bo'yicha bandlik ———
  // Agar timeslot.classIds bo'sh bo'lsa — bu vaqt BARCHA sinflarga ochiq.
  // Agar to'ldirilgan bo'lsa — faqat o'sha sinflar shu vaqtda joylashadi
  // (boshqa sinflar uchun bu slot bloklanadi). Smena shu orqali ishlaydi.
  const slotClassBlock = new Uint8Array(C * DT);
  classes.forEach((c, ci) => {
    teachingTs.forEach((ts, i) => {
      const allowed = Array.isArray(ts.classIds) ? ts.classIds : [];
      if (allowed.length && !allowed.includes(c.id)) {
        for (let d = 0; d < D; d++) slotClassBlock[ci * DT + d * T + i] = 1;
      }
    });
  });
  const classGrid = new Uint8Array(C * DT);
  const teacherGrid = new Uint8Array(TT * DT);
  const roomGridMap = new Map();
  function roomGrid(rid) {
    let g = roomGridMap.get(rid);
    if (!g) { g = new Uint8Array(DT); roomGridMap.set(rid, g); }
    return g;
  }
  const teacherLoadArr = new Int16Array(TT);
  const teacherMaxArr = new Int16Array(TT);
  teachers.forEach((t, ti) => { teacherMaxArr[ti] = Number(t.maxWeeklyHours || 40); });
  const teacherDailyArr = new Int16Array(TT * D);
  const classDayCount = new Int16Array(C * D);
  const classDailySubj = new Int16Array(C * D * S);
  const placedKeyCount = new Map();
  function bumpKeyIdx(ci, si, delta) {
    if (ci < 0 || si < 0) return;
    const k = ci * S + si;
    placedKeyCount.set(k, (placedKeyCount.get(k) || 0) + delta);
  }
  function getPlacedKey(cid, sid) {
    const ci = cIdxOf.get(cid);
    const si = sIdxOf.get(sid);
    if (ci === undefined || si === undefined) return 0;
    return placedKeyCount.get(ci * S + si) || 0;
  }
  const placements = [];
  const entryToPlacement = new Map();
  const LOCKED = { locked: true };
  const lockedCount = {};
  if (lockedSchedule) {
    const groupedCS = new Set();
    classes.forEach((c) => {
      (classSubjects[c.id] || []).forEach((a) => {
        if (a.groupKey || (a.levelGroupEnabled && a.levelGroupKey)) groupedCS.add(`${c.id}__${a.subjectId}`);
      });
    });
    const isGroupedLesson = (l) => classIdsOf(l).some((cid) => groupedCS.has(`${cid}__${l.subjectId}`));
    DAYS.forEach((day, d) => {
      allSortedTs.forEach((ts) => {
        const cell = lockedSchedule?.[day]?.[ts.id];
        if (!Array.isArray(cell)) return;
        const manual = cell.filter((l) => l && l.manual && !isGroupedLesson(l));
        if (!manual.length) return;
        if (!schedule[day]) schedule[day] = {};
        schedule[day][ts.id] = [...(schedule[day][ts.id] || []), ...manual];
        const tIdx = teachIdxById.get(ts.id);
        manual.forEach((l) => {
          entryToPlacement.set(l, LOCKED);
          const ti = tIdxOf.get(l.teacherId);
          if (ti !== undefined) {
            teacherLoadArr[ti] += 1;
            teacherDailyArr[ti * D + d] += 1;
            if (tIdx !== undefined) teacherGrid[ti * DT + d * T + tIdx] = 1;
          }
          if (l.roomId && tIdx !== undefined) roomGrid(l.roomId)[d * T + tIdx] = 1;
          // Hafta almashinuvi manual darsida ikkinchi ustoz ham band bo'ladi
          if (l.alternating && l.altTeacherId) {
            const ti2 = tIdxOf.get(l.altTeacherId);
            if (ti2 !== undefined) {
              teacherLoadArr[ti2] += 1;
              teacherDailyArr[ti2 * D + d] += 1;
              if (tIdx !== undefined) teacherGrid[ti2 * DT + d * T + tIdx] = 1;
            }
          }
        });
        const seen = new Set();
        manual.forEach((l) => {
          const sid = l.subjectId;
          const si = sIdxOf.get(sid);
          classIdsOf(l).forEach((cid) => {
            const ci = cIdxOf.get(cid);
            const k = `${cid}__${sid}`;
            if (!seen.has(k)) {
              seen.add(k);
              lockedCount[k] = (lockedCount[k] || 0) + 1;
              if (ci !== undefined && si !== undefined) {
                classDailySubj[(ci * D + d) * S + si] += 1;
                bumpKeyIdx(ci, si, 1);
              }
            }
            if (ci !== undefined && tIdx !== undefined) {
              const gi = ci * DT + d * T + tIdx;
              if (!classGrid[gi]) { classGrid[gi] = 1; classDayCount[ci * D + d] += 1; }
            }
          });
        });
      });
    });
  }

  const simpleRequests = [];
  const groupMap = new Map();
  const levelGroupMap = new Map();
  shuffle(classes, rng).forEach((cls) => {
    const assigned = shuffle(classSubjects[cls.id] || [], rng);
    assigned.forEach((raw) => {
      const subject = subjectById.get(raw.subjectId);
      if (!subject) return;
      const a = normalizeAssignment(raw, subject);
      const lockedH = lockedCount[`${cls.id}__${a.subjectId}`] || 0;
      if (lockedH > 0) {
        a.weeklyHours = Math.max(0, Number(a.weeklyHours || 0) - lockedH);
        if (a.weeklyHours <= 0) return;
      }
      const blocks = splitHoursToBlocks(a.weeklyHours, Boolean(a.allowDouble));
      if (a.levelGroupEnabled && a.levelGroupKey) {
        if (!a.levelGroups.length) return;
        const key = `${a.subjectId}__LEVEL__${a.levelGroupKey}`;
        if (!levelGroupMap.has(key)) {
          levelGroupMap.set(key, {
            type: "levelGroup", subjectId: a.subjectId, levelGroupKey: a.levelGroupKey,
            classIds: [], blocks, levelGroups: a.levelGroups, isCore: a.isCore,
            priority: a.weeklyHours + 40 + (a.allowDouble ? 15 : 0) + a.levelGroups.length,
          });
        }
        const group = levelGroupMap.get(key);
        if (a.isCore) group.isCore = true;
        if (!group.classIds.includes(cls.id)) group.classIds.push(cls.id);
        if (a.levelGroups.length > group.levelGroups.length) group.levelGroups = a.levelGroups;
        if (blocks.length > group.blocks.length || a.weeklyHours > group.blocks.reduce((x, y) => x + y, 0)) group.blocks = blocks;
        return;
      }
      if (!a.teacherId) return;

      // ——— HAFTA ALMASHINUVI (juft/toq): sinf bo'linmaydi, butun sinf navbatlashadi ———
      // Fanning weekAltHours soati navbatlanadi (bir hafta A fan, keyingi hafta B fan).
      // Bitta slot, LEKIN ikkala ustoz ham band bo'ladi (navbat bilan shu vaqtda kelishadi).
      if (a.weekAltEnabled && a.weekAltSubjectId && a.weekAltTeacherId) {
        const altHours = Math.max(1, Math.min(Number(a.weekAltHours || 1), Number(a.weeklyHours || 1)));
        const normalHours = Math.max(0, Number(a.weeklyHours || 0) - altHours);
        const normalBlocks = splitHoursToBlocks(normalHours, Boolean(a.allowDouble));
        normalBlocks.forEach((blockSize) => {
          simpleRequests.push({
            type: "single", classIds: [cls.id], subjectId: a.subjectId,
            teacherId: a.teacherId, roomId: a.roomId,
            blockSize, priority: a.weeklyHours + (blockSize === 2 ? 10 : 0), isCore: a.isCore,
          });
        });
        for (let k = 0; k < altHours; k++) {
          simpleRequests.push({
            type: "weekAlt", classIds: [cls.id],
            subjectId: a.subjectId, altSubjectId: a.weekAltSubjectId,
            teacherId: a.teacherId, altTeacherId: a.weekAltTeacherId,
            teacherIds: [a.teacherId, a.weekAltTeacherId],
            roomId: a.roomId || "", altRoomId: a.weekAltRoomId || "",
            roomIds: [a.roomId || "", a.weekAltRoomId || ""].filter(Boolean),
            blockSize: 1, priority: a.weeklyHours + 25, isCore: a.isCore,
          });
        }
        return;
      }

      if (a.splitEnabled && a.swapEnabled && a.swapSubjectId && a.swapTeacherId) {
        const swapBlocks = Math.max(1, Number(a.weeklyHours || 1));
        for (let k = 0; k < swapBlocks; k++) {
          simpleRequests.push({
            type: "swap", classIds: [cls.id], subjectId: a.subjectId, swapSubjectId: a.swapSubjectId,
            teacherId: a.teacherId, swapTeacherId: a.swapTeacherId, roomId: a.roomId || "", swapRoomId: a.swapRoomId || "",
            teacherIds: [a.teacherId, a.swapTeacherId], roomIds: [a.roomId || "", a.swapRoomId || ""],
            groupName1: a.groupName1 || "1-guruh", groupName2: a.groupName2 || "2-guruh",
            blockSize: 2, priority: a.weeklyHours + 30, isCore: a.isCore,
          });
        }
        return;
      }
      if (a.splitEnabled && a.teacherId2) {
        blocks.forEach((blockSize) => {
          simpleRequests.push({
            type: "split", classIds: [cls.id], subjectId: a.subjectId, teacherId: a.teacherId,
            teacherIds: [a.teacherId, a.teacherId2], roomId: a.roomId, roomIds: [a.roomId || "", a.roomId2 || ""],
            splitGroups: [
              { teacherId: a.teacherId, roomId: a.roomId || "", groupPart: a.groupName1 || "1-guruh" },
              { teacherId: a.teacherId2, roomId: a.roomId2 || "", groupPart: a.groupName2 || "2-guruh" },
            ],
            blockSize, priority: a.weeklyHours + (blockSize === 2 ? 10 : 0) + 15, isCore: a.isCore,
          });
        });
      } else if (a.groupKey) {
        const key = `${a.subjectId}__${a.teacherId}__${a.roomId || "xonasiz"}__${a.groupKey}`;
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            type: "group", subjectId: a.subjectId, teacherId: a.teacherId, roomId: a.roomId,
            groupKey: a.groupKey, blocks, classIds: [], isCore: a.isCore,
            priority: a.weeklyHours + 20 + (a.allowDouble ? 10 : 0),
          });
        }
        const group = groupMap.get(key);
        if (a.isCore) group.isCore = true;
        if (!group.classIds.includes(cls.id)) group.classIds.push(cls.id);
        if (blocks.length > group.blocks.length || a.weeklyHours > group.blocks.reduce((x, y) => x + y, 0)) group.blocks = blocks;
      } else {
        blocks.forEach((blockSize) => {
          simpleRequests.push({
            type: "single", classIds: [cls.id], subjectId: a.subjectId, teacherId: a.teacherId,
            roomId: a.roomId, blockSize, priority: a.weeklyHours + (blockSize === 2 ? 10 : 0), isCore: a.isCore,
          });
        });
      }
    });
  });

  const groupRequests = [];
  for (const group of groupMap.values()) {
    group.blocks.forEach((blockSize) => { groupRequests.push({ ...group, blockSize }); });
  }
  for (const group of levelGroupMap.values()) {
    const teacherIds = group.levelGroups.map((g) => g.teacherId).filter(Boolean);
    const roomIds = group.levelGroups.map((g) => g.roomId || "");
    group.blocks.forEach((blockSize) => { groupRequests.push({ ...group, teacherIds, roomIds, blockSize }); });
  }

  const allRequests = [...groupRequests, ...simpleRequests];
  const teacherTotalReq = {};
  allRequests.forEach((r) => {
    (r.teacherIds || [r.teacherId]).filter(Boolean).forEach((id) => {
      teacherTotalReq[id] = (teacherTotalReq[id] || 0) + (r.blockSize || 1);
    });
  });
  function difficulty(r) {
    const tids = (r.teacherIds || [r.teacherId]).filter(Boolean);
    const maxTeacherLoad = tids.reduce((mx, id) => Math.max(mx, teacherTotalReq[id] || 0), 0);
    const teacherOff = tids.some((id) => teacherOffSet[id] && teacherOffSet[id].size) ? 8 : 0;
    const classOff = (r.classIds || []).some((cid) => classOffSet[cid] && classOffSet[cid].size) ? 5 : 0;
    const multiClass = (r.classIds?.length || 1) >= 2 ? 4 : 0;
    const multiTeacher = tids.length >= 2 ? tids.length * 12 : 0;
    return maxTeacherLoad + (r.blockSize || 1) * 2 + teacherOff + classOff + multiClass + multiTeacher;
  }
  function isValidRequest(req) {
    const reqTeacherIds = (req.teacherIds || [req.teacherId]).filter(Boolean);
    const reqTeachers = reqTeacherIds.map((id) => teacherById.get(id)).filter(Boolean);
    if (!subjectById.has(req.subjectId)) return false;
    if (reqTeachers.length !== reqTeacherIds.length) return false;
    if (req.type === "swap") {
      const tA = teacherById.get(req.teacherId);
      const tB = teacherById.get(req.swapTeacherId);
      if (!tA || !tB) return false;
      if (!teacherSubjSet.get(tA.id).has(req.subjectId)) return false;
      if (!teacherSubjSet.get(tB.id).has(req.swapSubjectId)) return false;
    } else if (req.type === "weekAlt") {
      const tA = teacherById.get(req.teacherId);
      const tB = teacherById.get(req.altTeacherId);
      if (!tA || !tB) return false;
      if (!teacherSubjSet.get(tA.id).has(req.subjectId)) return false;
      if (!teacherSubjSet.get(tB.id).has(req.altSubjectId)) return false;
    } else if (reqTeachers.some((t) => !teacherSubjSet.get(t.id).has(req.subjectId))) {
      return false;
    }
    if (new Set(reqTeacherIds).size !== reqTeacherIds.length) return false;
    return true;
  }
  const pending = [];
  for (const req of allRequests) {
    if (!isValidRequest(req)) continue;
    req.tids = (req.teacherIds || [req.teacherId]).filter(Boolean);
    req.rids = (req.roomIds || [req.roomId]).filter(Boolean);
    if (new Set(req.rids).size !== req.rids.length) req.roomDup = true;
    req.diff = difficulty(req);
    req.placedRef = null;
    req.cIdxs = req.classIds.map((cid) => cIdxOf.get(cid)).filter((x) => x !== undefined);
    req.tIdxs = req.tids.map((tid) => tIdxOf.get(tid)).filter((x) => x !== undefined);
    req.sIdx = sIdxOf.get(req.subjectId) ?? -1;
    req.swapSIdx = req.swapSubjectId ? (sIdxOf.get(req.swapSubjectId) ?? -1) : -1;
    req.roomArrs = req.rids.map((rid) => roomGrid(rid));
    pending.push(req);
  }
  function buildDomain(req) {
    const dom = [];
    if (req.roomDup) return dom;
    for (let d = 0; d < D; d++) {
      let dayOk = true;
      for (const ci of req.cIdxs) if (classOffMask[ci * D + d]) { dayOk = false; break; }
      if (dayOk) for (const ti of req.tIdxs) if (teacherOffMask[ti * D + d]) { dayOk = false; break; }
      if (!dayOk) continue;
      for (let i = 0; i + req.blockSize <= T; i++) {
        let ok = true;
        for (let o = 0; o < req.blockSize; o++) {
          if (o > 0 && !nextConsecutive[i + o - 1]) { ok = false; break; }
          for (const ci of req.cIdxs) { if (lunchGrid[ci * DT + d * T + i + o] || slotClassBlock[ci * DT + d * T + i + o]) { ok = false; break; } }
          if (!ok) break;
        }
        if (ok) dom.push({ d, i });
      }
    }
    return shuffle(dom, rng);
  }
  pending.forEach((req) => { req.domain = buildDomain(req); });
  const reqsByTeacher = new Map();
  const reqsByClass = new Map();
  const reqsByRoom = new Map();
  function grabSet(map, key) {
    let s = map.get(key);
    if (!s) { s = new Set(); map.set(key, s); }
    return s;
  }
  pending.forEach((req) => {
    req.tids.forEach((id) => grabSet(reqsByTeacher, id).add(req));
    req.classIds.forEach((cid) => grabSet(reqsByClass, cid).add(req));
    req.rids.forEach((rid) => grabSet(reqsByRoom, rid).add(req));
  });
  pending.forEach((req) => {
    let deg = 0;
    req.tids.forEach((id) => (deg += (reqsByTeacher.get(id)?.size || 1) - 1));
    req.classIds.forEach((cid) => (deg += (reqsByClass.get(cid)?.size || 1) - 1));
    req.degree = deg;
    const set = new Set();
    req.tids.forEach((id) => reqsByTeacher.get(id)?.forEach((r) => { if (r !== req) set.add(r); }));
    req.classIds.forEach((cid) => reqsByClass.get(cid)?.forEach((r) => { if (r !== req) set.add(r); }));
    req.rids.forEach((rid) => reqsByRoom.get(rid)?.forEach((r) => { if (r !== req) set.add(r); }));
    req.affected = [...set];
  });
  function fitsAt(req, d, i) {
    const base = d * T + i;
    for (let o = 0; o < req.blockSize; o++) {
      const off = base + o;
      for (const ci of req.cIdxs) if (classGrid[ci * DT + off]) return false;
      for (const ti of req.tIdxs) if (teacherGrid[ti * DT + off]) return false;
      for (const rg of req.roomArrs) if (rg[off]) return false;
    }
    return true;
  }
  function loadAllows(req) {
    for (const ti of req.tIdxs) { if (teacherLoadArr[ti] + req.blockSize > teacherMaxArr[ti]) return false; }
    return true;
  }
  function refreshFeas(req) {
    let count = 0;
    const sample = [];
    for (const cand of req.domain) {
      if (fitsAt(req, cand.d, cand.i)) { count++; if (sample.length < 4) sample.push(cand); }
    }
    req.feasCount = count;
    req.feasSample = sample;
    req.dirty = false;
  }
  pending.forEach(refreshFeas);
  function markAffected(req) {
    for (const r of req.affected) {
      if (r.placedRef || r.failed) continue;
      if (r.feasCount !== undefined && r.feasCount <= 4) refreshFeas(r);
      else r.dirty = true;
    }
  }
  function buildEntries(req, blockIndex) {
    if (req.type === "swap") {
      const first = blockIndex === 0;
      const g1 = first ? { subjectId: req.subjectId, teacherId: req.teacherId, roomId: req.roomId }
        : { subjectId: req.swapSubjectId, teacherId: req.swapTeacherId, roomId: req.swapRoomId };
      const g2 = first ? { subjectId: req.swapSubjectId, teacherId: req.swapTeacherId, roomId: req.swapRoomId }
        : { subjectId: req.subjectId, teacherId: req.teacherId, roomId: req.roomId };
      return [
        { subjectId: g1.subjectId, classId: req.classIds[0], classIds: req.classIds, teacherId: g1.teacherId, roomId: g1.roomId || "", groupPart: req.groupName1, splitEnabled: true, swap: true, blockSize: 2, blockIndex },
        { subjectId: g2.subjectId, classId: req.classIds[0], classIds: req.classIds, teacherId: g2.teacherId, roomId: g2.roomId || "", groupPart: req.groupName2, splitEnabled: true, swap: true, blockSize: 2, blockIndex },
      ];
    }
    if (req.type === "weekAlt") {
      // Bitta dars: butun sinf, bir hafta A fan, keyingi hafta B fan (navbat).
      // Jadval katakchasida "A / B" ko'rinadi (Schedule.jsx alternating ni tanaydi).
      return [{
        subjectId: req.subjectId, classId: req.classIds[0], classIds: req.classIds,
        teacherId: req.teacherId, roomId: req.roomId || "",
        alternating: true, altSubjectId: req.altSubjectId, altTeacherId: req.altTeacherId,
        altRoomId: req.altRoomId || "", blockSize: 1, blockIndex,
      }];
    }
    if (req.type === "split") {
      return req.splitGroups.map((g) => ({
        subjectId: req.subjectId, classId: req.classIds[0], classIds: req.classIds,
        teacherId: g.teacherId, roomId: g.roomId || "", groupKey: req.groupKey || "",
        groupPart: g.groupPart, splitEnabled: true, blockSize: req.blockSize, blockIndex,
      }));
    }
    if (req.type === "levelGroup") {
      return req.levelGroups.map((g) => ({
        subjectId: req.subjectId, classId: req.classIds[0], classIds: req.classIds,
        teacherId: g.teacherId, roomId: g.roomId || "", groupKey: req.levelGroupKey || "",
        groupPart: g.name || "Daraja guruhi", levelGroupEnabled: true, blockSize: req.blockSize, blockIndex,
      }));
    }
    return [{
      subjectId: req.subjectId, classId: req.classIds[0], classIds: req.classIds,
      teacherId: req.teacherId, roomId: req.roomId || "", groupKey: req.groupKey || "",
      blockSize: req.blockSize, blockIndex,
    }];
  }
  function applyCounters(req, d, sign) {
    const bs = sign * req.blockSize;
    for (const ti of req.tIdxs) { teacherLoadArr[ti] += bs; teacherDailyArr[ti * D + d] += bs; }
    for (const ci of req.cIdxs) {
      classDailySubj[(ci * D + d) * S + req.sIdx] += bs;
      if (req.swapSIdx >= 0) classDailySubj[(ci * D + d) * S + req.swapSIdx] += bs;
      classDayCount[ci * D + d] += bs;
      bumpKeyIdx(ci, req.sIdx, bs);
      if (req.swapSIdx >= 0) bumpKeyIdx(ci, req.swapSIdx, bs);
    }
  }
  function place(req, d, i) {
    const day = DAYS[d];
    const slots = [];
    const entries = [];
    const base = d * T + i;
    for (let o = 0; o < req.blockSize; o++) {
      const ts = teachingTs[i + o];
      slots.push(ts);
      const cell = schedule[day][ts.id];
      const es = buildEntries(req, o);
      es.forEach((e) => cell.push(e));
      entries.push(...es);
      const off = base + o;
      for (const ci of req.cIdxs) classGrid[ci * DT + off] = 1;
      for (const ti of req.tIdxs) teacherGrid[ti * DT + off] = 1;
      for (const rg of req.roomArrs) rg[off] = 1;
    }
    applyCounters(req, d, +1);
    placedHours += req.blockSize;
    const p = { req, d, day, startIdx: i, slots, entries, locked: false, active: true };
    entries.forEach((e) => entryToPlacement.set(e, p));
    placements.push(p);
    req.placedRef = p;
    return p;
  }
  function unplace(p) {
    if (!p.active) return;
    p.active = false;
    const { req, d, day, startIdx } = p;
    const base = d * T + startIdx;
    for (let o = 0; o < req.blockSize; o++) {
      const ts = p.slots[o];
      schedule[day][ts.id] = schedule[day][ts.id].filter((e) => !p.entries.includes(e));
      const off = base + o;
      for (const ci of req.cIdxs) classGrid[ci * DT + off] = 0;
      for (const ti of req.tIdxs) teacherGrid[ti * DT + off] = 0;
      for (const rg of req.roomArrs) rg[off] = 0;
    }
    p.entries.forEach((e) => entryToPlacement.delete(e));
    applyCounters(req, d, -1);
    placedHours -= req.blockSize;
    const idx = placements.indexOf(p);
    if (idx >= 0) placements.splice(idx, 1);
    req.placedRef = null;
  }
  const journal = [];
  const chainTouched = new Set();
  function jPlace(req, d, i) { const p = place(req, d, i); journal.push({ op: "place", p }); chainTouched.add(req); return p; }
  function jUnplace(p) { unplace(p); journal.push({ op: "unplace", p }); chainTouched.add(p.req); }
  function rollbackTo(mark) {
    while (journal.length > mark) {
      const { op, p } = journal.pop();
      if (op === "place") unplace(p);
      else place(p.req, p.d, p.startIdx);
    }
  }
  function emptyBeforeCount(d, ci, idx) {
    const cBase = ci * DT + d * T;
    let empty = 0;
    for (let k = 0; k < idx; k++) {
      if (lunchGrid[cBase + k]) continue;
      if (classGrid[cBase + k]) continue;
      empty += 1;
    }
    return empty;
  }
  function adjacentSame(d, i, blockSize, req) {
    const day = DAYS[d];
    const checks = [];
    const before = i - 1;
    const after = i + blockSize;
    if (before >= 0 && nextConsecutive[before]) checks.push(before);
    if (after < T && nextConsecutive[after - 1]) checks.push(after);
    for (const k of checks) {
      const cell = schedule[day][teachingTs[k].id];
      for (const l of cell) {
        if (l.subjectId !== req.subjectId) continue;
        const ids = classIdsOf(l);
        for (const cid of req.classIds) if (ids.includes(cid)) return true;
      }
    }
    return false;
  }
  function forwardCheckPenalty(req, d, i) {
    let penalty = 0;
    const bEnd = i + req.blockSize - 1;
    for (const other of req.affected) {
      if (other.placedRef || other.failed) continue;
      const fc = other.feasCount;
      if (fc === undefined || fc > 3 || fc === 0) continue;
      let killed = 0;
      for (const cand of other.feasSample) {
        if (cand.d !== d) continue;
        const aStart = cand.i;
        const aEnd = cand.i + other.blockSize - 1;
        if (aStart > bEnd || aEnd < i) continue;
        killed += 1;
      }
      if (killed >= fc) penalty += 1e6;
      else if (killed > 0) penalty += killed * 220;
    }
    return penalty;
  }
  function scoreCandidate(req, d, i) {
    const blockSize = req.blockSize;
    const adjacencyPenalty = blockSize === 1 && adjacentSame(d, i, blockSize, req) ? 1500 : 0;
    let compactPenalty = 0;
    for (const ci of req.cIdxs) { for (let o = 0; o < blockSize; o++) { compactPenalty += emptyBeforeCount(d, ci, i + o) * 100; } }
    let repeatPenalty = 0;
    for (const ci of req.cIdxs) { repeatPenalty += classDailySubj[(ci * D + d) * S + req.sIdx] * 25; }
    const spreadPenalty = Math.abs((d % 2) - (blockSize === 2 ? 0 : 1));
    let classLoadPenalty = 0;
    for (const ci of req.cIdxs) { classLoadPenalty += classDayCount[ci * D + d]; }
    let teacherPenalty = 0;
    for (const ti of req.tIdxs) { teacherPenalty += teacherLoadArr[ti] + teacherDailyArr[ti * D + d]; }
    const coreEarlyPenalty = req.isCore ? i * 60 : 0;
    const randomPenalty = rng() * 5;
    return compactPenalty + repeatPenalty + classLoadPenalty + teacherPenalty + spreadPenalty + coreEarlyPenalty + adjacencyPenalty + randomPenalty;
  }
  function bestCandidate(req, withForwardCheck) {
    let best = null;
    let bestScore = Infinity;
    for (const cand of req.domain) {
      if (!fitsAt(req, cand.d, cand.i)) continue;
      let s = scoreCandidate(req, cand.d, cand.i);
      if (withForwardCheck) s += forwardCheckPenalty(req, cand.d, cand.i);
      if (s < bestScore) { bestScore = s; best = cand; }
    }
    return best;
  }
  const EJECT_DEFAULT = { maxDepth: 3, blockersRoot: 3, blockersDeep: 2, tryRoot: 14, tryDeep: 6 };
  const EJECT_INTENSE = { maxDepth: 4, blockersRoot: 5, blockersDeep: 3, tryRoot: 28, tryDeep: 10 };
  function collectBlockers(req, d, i, frozen, maxBlockers) {
    const day = DAYS[d];
    const blockers = new Set();
    for (let o = 0; o < req.blockSize; o++) {
      const ts = teachingTs[i + o];
      const cell = schedule[day][ts.id];
      for (const l of cell) {
        const conflicts = classIdsOf(l).some((cid) => req.classIds.includes(cid)) ||
          (l.teacherId && req.tids.includes(l.teacherId)) || (l.roomId && req.rids.includes(l.roomId));
        if (!conflicts) continue;
        const p = entryToPlacement.get(l);
        if (!p || p.locked || frozen.has(p)) return null;
        blockers.add(p);
        if (blockers.size > maxBlockers) return null;
      }
    }
    return [...blockers];
  }
  function tryEject(req, depth, frozen, cfg) {
    if (Date.now() > deadline) return false;
    if (!loadAllows(req)) return false;
    const maxBlockers = depth === 1 ? cfg.blockersRoot : cfg.blockersDeep;
    const direct = bestCandidate(req, false);
    if (direct) { const p = jPlace(req, direct.d, direct.i); frozen.add(p); return true; }
    if (depth > cfg.maxDepth) return false;
    const cands = [];
    for (const cand of req.domain) {
      const blockers = collectBlockers(req, cand.d, cand.i, frozen, maxBlockers);
      if (blockers && blockers.length) cands.push({ cand, count: blockers.length });
    }
    cands.sort((a, b) => a.count - b.count);
    const tryLimit = depth === 1 ? cfg.tryRoot : cfg.tryDeep;
    for (let c = 0; c < Math.min(cands.length, tryLimit); c++) {
      const { cand } = cands[c];
      const blockers = collectBlockers(req, cand.d, cand.i, frozen, maxBlockers);
      if (!blockers) continue;
      if (!blockers.length) {
        if (fitsAt(req, cand.d, cand.i)) { const p = jPlace(req, cand.d, cand.i); frozen.add(p); return true; }
        continue;
      }
      const mark = journal.length;
      blockers.forEach((b) => jUnplace(b));
      if (!fitsAt(req, cand.d, cand.i)) { rollbackTo(mark); continue; }
      const myP = jPlace(req, cand.d, cand.i);
      frozen.add(myP);
      let ok = true;
      for (const b of blockers) { if (!tryEject(b.req, depth + 1, frozen, cfg)) { ok = false; break; } }
      if (ok) return true;
      frozen.delete(myP);
      rollbackTo(mark);
    }
    return false;
  }
  function ejectAndPlace(req, cfg = EJECT_DEFAULT) {
    const frozen = new Set();
    chainTouched.clear();
    const mark = journal.length;
    const ok = tryEject(req, 1, frozen, cfg);
    if (!ok) rollbackTo(mark);
    journal.length = 0;
    chainTouched.add(req);
    for (const r of chainTouched) markAffected(r);
    if (!req.placedRef) refreshFeas(req);
    chainTouched.clear();
    return ok;
  }
  const open = pending.filter((r) => r.domain.length > 0);
  pending.forEach((r) => { if (!r.domain.length) r.failed = true; });
  const deferred = [];
  function pickMRV() {
    for (let iter = 0; iter < 5; iter++) {
      let sel = null;
      for (const r of open) {
        if (r.placedRef || r.done) continue;
        if (!sel || r.feasCount < sel.feasCount ||
          (r.feasCount === sel.feasCount && (r.degree > sel.degree ||
            (r.degree === sel.degree && (r.diff > sel.diff || (r.diff === sel.diff && r.priority > sel.priority)))))) sel = r;
      }
      if (!sel) return null;
      if (!sel.dirty) return sel;
      refreshFeas(sel);
    }
    let sel = null;
    for (const r of open) {
      if (r.placedRef || r.done) continue;
      if (r.dirty) refreshFeas(r);
      if (!sel || r.feasCount < sel.feasCount) sel = r;
    }
    return sel;
  }
  let remainingOpen = open.length;
  while (remainingOpen > 0) {
    if (Date.now() > deadline) {
      for (const r of open) {
        if (r.placedRef || r.done) continue;
        r.done = true;
        remainingOpen -= 1;
        if (!loadAllows(r)) { r.failed = true; continue; }
        attemptedHours += r.blockSize;
        const cand = bestCandidate(r, false);
        if (cand) place(r, cand.d, cand.i);
        else deferred.push(r);
      }
      break;
    }
    const sel = pickMRV();
    if (!sel) break;
    sel.done = true;
    remainingOpen -= 1;
    if (!loadAllows(sel)) { sel.failed = true; continue; }
    attemptedHours += sel.blockSize;
    if (sel.dirty) refreshFeas(sel);
    if (sel.feasCount > 0) {
      const cand = bestCandidate(sel, true);
      if (cand) { place(sel, cand.d, cand.i); markAffected(sel); continue; }
    }
    if (!ejectAndPlace(sel)) deferred.push(sel);
  }
  let wave = 0;
  while (deferred.length && Date.now() < deadline && wave < 14) {
    const cfg = wave < 3 ? EJECT_DEFAULT : EJECT_INTENSE;
    const still = [];
    for (const req of shuffle(deferred, rng)) {
      if (Date.now() > deadline) { still.push(req); continue; }
      refreshFeas(req);
      if (req.feasCount > 0) {
        const cand = bestCandidate(req, false);
        if (cand) { place(req, cand.d, cand.i); markAffected(req); continue; }
      }
      req.domain = shuffle(req.domain, rng);
      if (!ejectAndPlace(req, cfg)) still.push(req);
    }
    if (still.length === deferred.length && wave >= 3) { deferred.length = 0; deferred.push(...still); break; }
    deferred.length = 0;
    deferred.push(...still);
    wave += 1;
  }
  let lnsRound = 0;
  while (deferred.length && Date.now() < deadline && lnsRound < 40) {
    lnsRound += 1;
    const target = deferred[lnsRound % deferred.length];
    const victims = [];
    const shuffledAff = shuffle(target.affected, rng);
    for (const r of shuffledAff) { if (victims.length >= 6) break; if (r.placedRef && !r.placedRef.locked) victims.push(r); }
    if (!victims.length) continue;
    const savedPos = victims.map((r) => ({ r, d: r.placedRef.d, i: r.placedRef.startIdx }));
    victims.forEach((r) => unplace(r.placedRef));
    const toPlace = [target, ...victims].sort((a, b) => b.diff - a.diff);
    const failedNow = [];
    for (const r of toPlace) {
      if (r.placedRef) continue;
      refreshFeas(r);
      let cand = r.feasCount > 0 ? bestCandidate(r, false) : null;
      if (cand) { place(r, cand.d, cand.i); continue; }
      if (!ejectAndPlace(r, EJECT_INTENSE)) failedNow.push(r);
    }
    if (failedNow.length === 0) {
      const di = deferred.indexOf(target);
      if (di >= 0) deferred.splice(di, 1);
      for (const r of victims) markAffected(r);
      markAffected(target);
    } else {
      for (const r of toPlace) { if (r.placedRef && !r.placedRef.locked) unplace(r.placedRef); }
      for (const { r, d, i } of savedPos) {
        if (fitsAt(r, d, i)) place(r, d, i);
        else {
          refreshFeas(r);
          const cand = r.feasCount > 0 ? bestCandidate(r, false) : null;
          if (cand) place(r, cand.d, cand.i);
          else if (!ejectAndPlace(r, EJECT_INTENSE)) { if (!deferred.includes(r)) deferred.push(r); }
        }
      }
      for (const { r } of savedPos) markAffected(r);
    }
  }
  for (const cls of classes) {
    if (Date.now() > deadline) break;
    const raws = classSubjects[cls.id] || [];
    for (const raw of raws) {
      const subj = subjectById.get(raw.subjectId);
      if (!subj) continue;
      const a = normalizeAssignment(raw, subj);
      if (a.levelGroupEnabled || a.splitEnabled || a.swapEnabled || a.weekAltEnabled || a.groupKey) continue;
      const tid = a.teacherId;
      if (!tid) continue;
      const t = teacherById.get(tid);
      if (!t || !teacherSubjSet.get(tid).has(a.subjectId)) continue;
      let remaining = Number(a.weeklyHours || 0) - getPlacedKey(cls.id, a.subjectId);
      let guard = 0;
      while (remaining > 0 && guard < 100) {
        guard += 1;
        const ti = tIdxOf.get(tid);
        if (ti === undefined || teacherLoadArr[ti] + 1 > teacherMaxArr[ti]) break;
        const fReq = {
          type: "single", classIds: [cls.id], subjectId: a.subjectId, teacherId: tid, roomId: a.roomId || "",
          tids: [tid], rids: a.roomId ? [a.roomId] : [], blockSize: 1, isCore: a.isCore, priority: 0, domain: null,
          cIdxs: [cIdxOf.get(cls.id)].filter((x) => x !== undefined), tIdxs: [ti], sIdx: sIdxOf.get(a.subjectId) ?? -1,
          swapSIdx: -1, roomArrs: a.roomId ? [roomGrid(a.roomId)] : [], affected: [], diff: 0,
        };
        fReq.domain = buildDomain(fReq);
        let cand = bestCandidate(fReq, false);
        if (!cand) { if (!ejectAndPlace(fReq, EJECT_INTENSE)) break; remaining -= 1; continue; }
        place(fReq, cand.d, cand.i);
        remaining -= 1;
      }
    }
  }
  function polish(budgetMs) {
    const stop = Math.min(deadline, Date.now() + budgetMs);
    const movable = placements.filter((p) => !p.locked);
    if (!movable.length) return;
    let temperature = 60;
    while (Date.now() < stop) {
      for (let k = 0; k < 16; k++) {
        const p = movable[Math.floor(rng() * movable.length)];
        if (!p || p.req.placedRef !== p) continue;
        const req = p.req;
        const oldD = p.d;
        const oldIdx = p.startIdx;
        unplace(p);
        const oldScore = scoreCandidate(req, oldD, oldIdx);
        let cand = null;
        let candScore = Infinity;
        for (let tr = 0; tr < 6; tr++) {
          const c = req.domain[Math.floor(rng() * req.domain.length)];
          if (!c || !fitsAt(req, c.d, c.i)) continue;
          const s = scoreCandidate(req, c.d, c.i);
          if (s < candScore) { candScore = s; cand = c; }
        }
        const delta = candScore - oldScore;
        if (cand && (delta < 0 || rng() < Math.exp(-delta / Math.max(1, temperature)))) {
          const np = place(req, cand.d, cand.i);
          const mi = movable.indexOf(p);
          if (mi >= 0) movable[mi] = np;
        } else {
          place(req, oldD, oldIdx);
          const np = req.placedRef;
          const mi = movable.indexOf(p);
          if (mi >= 0 && np) movable[mi] = np;
        }
      }
      temperature *= 0.96;
      if (temperature < 0.5) temperature = 0.5;
    }
  }
  if (placedHours >= attemptedHours && attemptedHours > 0 && polishBudgetMs > 0) {
    polish(Math.min(polishBudgetMs, Math.max(0, deadline - Date.now())));
  }
  let soft = 0;
  for (const p of placements) { soft += scoreCandidate(p.req, p.d, p.startIdx); }
  const report = buildValidationReport({
    schedule, classes, subjects, teachers, timeslots: allSortedTs, classSubjects,
    lunchGroups, classOffSet, teacherOffSet, entryToPlacement,
  });
  return { schedule, placed: placedHours, attempted: attemptedHours, soft, report };
}

function buildValidationReport(ctx) {
  const {
    schedule, classes, subjects, teachers, timeslots, classSubjects,
    lunchGroups, classOffSet, teacherOffSet, entryToPlacement,
  } = ctx;
  const teacherConflicts = [];
  const roomConflicts = [];
  const classConflicts = [];
  const lunchConflicts = [];
  const offDayConflicts = [];
  const placedPerKey = {};
  DAYS.forEach((day) => {
    timeslots.forEach((ts) => {
      const cell = schedule[day]?.[ts.id];
      if (!Array.isArray(cell) || !cell.length) return;
      if (!isTeachingSlot(ts)) {
        cell.forEach((l) => { if (!l.manual) lunchConflicts.push({ day, tsId: ts.id, subjectId: l.subjectId }); });
      }
      const tSeen = new Map();
      const rSeen = new Map();
      const cSeen = new Map();
      cell.forEach((l) => {
        const p = entryToPlacement?.get(l) || l;
        if (l.teacherId) {
          if (tSeen.has(l.teacherId) && tSeen.get(l.teacherId) !== p) teacherConflicts.push({ day, tsId: ts.id, teacherId: l.teacherId });
          tSeen.set(l.teacherId, p);
        }
        // Hafta almashinuvi: ikkinchi ustoz ham shu slotda band (navbat sherigi)
        if (l.alternating && l.altTeacherId) {
          if (tSeen.has(l.altTeacherId) && tSeen.get(l.altTeacherId) !== p) teacherConflicts.push({ day, tsId: ts.id, teacherId: l.altTeacherId });
          tSeen.set(l.altTeacherId, p);
        }
        if (l.roomId) {
          if (rSeen.has(l.roomId) && rSeen.get(l.roomId) !== p) roomConflicts.push({ day, tsId: ts.id, roomId: l.roomId });
          rSeen.set(l.roomId, p);
        }
        classIdsOf(l).forEach((cid) => {
          let set = cSeen.get(cid);
          if (!set) cSeen.set(cid, (set = new Set()));
          set.add(p);
          if (set.size > 1) classConflicts.push({ day, tsId: ts.id, classId: cid });
          if (!l.manual && isTeachingSlot(ts) && classHasLunchAt(ts, cid, lunchGroups, day)) lunchConflicts.push({ day, tsId: ts.id, classId: cid });
          if (!l.manual && classOffSet?.[cid]?.has(day)) offDayConflicts.push({ day, tsId: ts.id, classId: cid });
        });
        if (!l.manual && l.teacherId && teacherOffSet?.[l.teacherId]?.has(day)) offDayConflicts.push({ day, tsId: ts.id, teacherId: l.teacherId });
      });
      if (isTeachingSlot(ts)) {
        const uniq = new Set();
        cell.forEach((l) => classIdsOf(l).forEach((cid) => uniq.add(`${cid}__${l.subjectId}`)));
        uniq.forEach((k) => { placedPerKey[k] = (placedPerKey[k] || 0) + 1; });
      }
    });
  });
  let requiredTotal = 0;
  let placedTotal = 0;
  const remainingList = [];
  classes.forEach((cls) => {
    (classSubjects[cls.id] || []).forEach((raw) => {
      const subj = subjects.find((s) => s.id === raw.subjectId);
      if (!subj) return;
      const a = normalizeAssignment(raw, subj);
      if (a.levelGroupEnabled && !a.levelGroups.length) return;
      if (!a.levelGroupEnabled && !a.teacherId) return;
      const need = Number(a.weeklyHours || 0);
      const got = Math.min(need, placedPerKey[`${cls.id}__${a.subjectId}`] || 0);
      requiredTotal += need;
      placedTotal += got;
      if (got < need) remainingList.push({ className: cls.name, subjectName: subj.name, missing: need - got });
    });
  });
  return {
    requiredTotal, placedTotal, remainingTotal: Math.max(0, requiredTotal - placedTotal), remainingList,
    teacherConflicts, roomConflicts, classConflicts, lunchConflicts, offDayConflicts,
    ok: requiredTotal === placedTotal && !teacherConflicts.length && !roomConflicts.length &&
      !classConflicts.length && !lunchConflicts.length && !offDayConflicts.length,
  };
}

export function generateSchedule(...args) {
  const timeslots = args[4] || [];
  const HARD_ATTEMPT_CAP = 5000;
  let totalHours = 0;
  const cs = args[5] || {};
  Object.values(cs).forEach((list) => (Array.isArray(list) ? list : []).forEach((a) => { totalHours += Number(a?.weeklyHours || 0); }));
  const TIME_BUDGET_MS = totalHours <= 700 ? 9000 : Math.min(20000, Math.round(9000 + (totalHours - 700) * 4));
  const start = Date.now();
  const deadline = start + TIME_BUDGET_MS;
  const baseSeed = (Math.floor(Math.random() * 0x7fffffff)) | 0;
  let best = null;
  let attempt = 0;
  let noImprove = 0;
  while (attempt < HARD_ATTEMPT_CAP) {
    if (attempt > 0 && Date.now() >= deadline) break;
    if (noImprove >= 1 && Date.now() - start >= 9000) break;
    const slice = Math.max(3500, Math.round(TIME_BUDGET_MS * 0.34));
    const attemptDeadline = Math.min(deadline, Date.now() + slice);
    const seed = (baseSeed + attempt * 0x9e3779b1) | 0;
    const res = attemptSchedule(args[0], args[1], args[2], args[3], args[4], args[5] || {}, args[6] || [], args[7] || null, { seed, deadline: attemptDeadline });
    attempt += 1;
    const improved = !best || res.placed > best.placed;
    if (!best || res.placed > best.placed || (res.placed === best.placed && res.soft < best.soft)) best = res;
    noImprove = improved ? 0 : noImprove + 1;
    if (res.attempted > 0 && res.placed >= res.attempted && res.report?.remainingTotal === 0) break;
    if (res.attempted === 0) break;
  }
  if (best) {
    if (typeof console !== "undefined" && best.report) {
      const r = best.report;
      const pct = r.requiredTotal ? ((r.placedTotal / r.requiredTotal) * 100).toFixed(1) : "0";
      console.log(`📊 Jadval generatori: ${r.placedTotal}/${r.requiredTotal} soat (${pct}%), urinishlar: ${attempt}, vaqt: ${Date.now() - start}ms`,
        { qolganSoatlar: r.remainingList, teacherConflicts: r.teacherConflicts.length, roomConflicts: r.roomConflicts.length,
          classConflicts: r.classConflicts.length, lunchConflicts: r.lunchConflicts.length, offDayConflicts: r.offDayConflicts.length });
    }
    return best.schedule;
  }
  return emptySchedule(timeslots);
}