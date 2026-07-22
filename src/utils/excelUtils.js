import * as XLSXLib from 'xlsx';
import { genId } from './helpers';
import { SUBJECT_COLORS } from './constants';

export async function loadXLSX() {
  return XLSXLib;
}

// Rangli (uslubli) Excel uchun alohida kutubxona — xlsx-js-style.
// Dinamik import: agar o'rnatilmagan bo'lsa, faqat shu funksiya ishlamaydi,
// qolgan import/export ishlayveradi.
export async function loadStyledXLSX() {
  try {
    const mod = await import('xlsx-js-style');
    return mod.default || mod;
  } catch (e) {
    throw new Error(
      "Rangli jadval uchun 'xlsx-js-style' kutubxonasi kerak. Terminalda: npm install xlsx-js-style"
    );
  }
}

// "#6366f1" -> "6366F1" (Excel uchun). Yaroqsiz bo'lsa null.
export function hexToExcelRGB(hex) {
  let h = String(hex || '').replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return h.toUpperCase();
}

// Fon rangiga qarab o'qiladigan matn rangi (oq yoki to'q).
export function readableTextRGB(excelRgb) {
  const r = parseInt(excelRgb.slice(0, 2), 16);
  const g = parseInt(excelRgb.slice(2, 4), 16);
  const b = parseInt(excelRgb.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '111827' : 'FFFFFF';
}

export function normalizeText(value) {
  return String(value ?? '').trim();
}

export function splitNames(value) {
  return normalizeText(value)
    .split(/[,;|\n]/)
    .map(v => v.trim())
    .filter(Boolean);
}

export function findByName(list, name) {
  const key = normalizeText(name).toLowerCase();
  return list.find(item => normalizeText(item.name).toLowerCase() === key);
}

export function makeSubject(name, index = 0) {
  return {
    id: genId(),
    name: normalizeText(name),
    weeklyHours: 2,
    color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
    type: 'Oddiy',
    createdAt: Date.now(),
  };
}

export function worksheetToRows(XLSX, worksheet) {
  return XLSX.utils.sheet_to_json(worksheet, { defval: '' });
}

function applyWorksheetStyle(ws, rows) {
  const range = XLSXLib.utils.decode_range(ws['!ref'] || 'A1:A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellRef = XLSXLib.utils.encode_cell({ r: 0, c: C });
    if (ws[cellRef]) {
      ws[cellRef].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '111827' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
  }
  ws['!cols'] = Object.keys(rows[0] || { A: '' }).map((key) => ({
    wch: Math.min(Math.max(String(key).length + 8, 16), 44),
  }));
}

export function downloadWorkbook(XLSX, sheets, filename) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, rows }) => {
    const safeRows = rows?.length ? rows : [{ "Ma'lumot": '' }];
    const ws = XLSX.utils.json_to_sheet(safeRows);
    applyWorksheetStyle(ws, safeRows);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}