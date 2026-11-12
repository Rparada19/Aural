import ExcelJS from 'exceljs';

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export interface ZoneMonth {
  zone: string; month: number;
  prev_units: number; prev_amount: number; units: number; amount: number; cost: number;
}

const HEAD = ['Zona', 'Mes', 'Unidades año anterior', 'Ventas año anterior ($)', 'Unidades presupuesto', 'Presupuesto ventas ($)', 'Costo de venta ($)', 'Margen ($)', 'Margen %'];

/** Plantilla por zona: una fila por zona y mes. */
export async function buildTemplate(year: number, rows: ZoneMonth[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Aural · Wholesale';

  const help = wb.addWorksheet('Instrucciones');
  help.columns = [{ width: 110 }];
  [
    `Presupuesto wholesale ${year} por zona`,
    '',
    '1. En la hoja "Presupuesto" hay una fila por zona y por mes.',
    `2. "Año anterior" son las ventas de ${year - 1}: sirven de guía para comparar el cumplimiento. Vienen de lo registrado en el portal; corrígelas si tienes la cifra oficial.`,
    '3. Llena unidades, presupuesto de ventas y costo de venta, en pesos y sin puntos ni signos.',
    '4. Para una zona nueva, copia sus 12 filas con el nombre de la zona igual en todas.',
    '5. No cambies los títulos de las columnas. El margen se calcula solo y no se carga.',
    '6. Guarda el archivo y súbelo en Presupuestos → Subir Excel.',
  ].forEach((t, i) => { const r = help.addRow([t]); if (i === 0) r.font = { bold: true, size: 14 }; });

  const ws = wb.addWorksheet('Presupuesto', { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] });
  ws.columns = [{ width: 26 }, { width: 12 }, { width: 12 }, { width: 18 }, { width: 12 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 10 }];
  const head = ws.addRow(HEAD);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.alignment = { wrapText: true, vertical: 'middle' };
  head.height = 32;
  head.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF041E42' } }; });

  rows.forEach((r, i) => {
    const n = i + 2;
    const row = ws.addRow([r.zone, MONTHS[r.month - 1], r.prev_units || null, r.prev_amount || null, r.units || null, r.amount || null, r.cost || null]);
    row.getCell(8).value = { formula: `F${n}-G${n}` };
    row.getCell(9).value = { formula: `IF(F${n}>0,(F${n}-G${n})/F${n},"")` };
    [4, 6, 7, 8].forEach((c) => { row.getCell(c).numFmt = '#,##0'; });
    row.getCell(9).numFmt = '0%';
    if (r.month === 12) row.border = { bottom: { style: 'thin', color: { argb: 'FF9AA5B5' } } };
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function num(v: ExcelJS.CellValue): number {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v && 'result' in v) return num(v.result as ExcelJS.CellValue);
  const s = String(v).replace(/[$\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function text(v: ExcelJS.CellValue): string {
  if (v == null) return '';
  if (typeof v === 'object' && 'richText' in v) return v.richText.map((t) => t.text).join('').trim();
  if (typeof v === 'object' && 'result' in v) return String(v.result ?? '').trim();
  return String(v).trim();
}

const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function monthOf(v: ExcelJS.CellValue): number {
  if (v instanceof Date) return v.getUTCMonth() + 1;
  const n = num(v);
  if (n >= 1 && n <= 12) return Math.round(n);
  const t = plain(text(v));
  const k = MONTHS.findIndex((m) => t.startsWith(plain(m).slice(0, 3)));
  return k + 1;
}

/** Lee la hoja de presupuesto; reconoce las columnas por su título. */
export async function parseBudgetFile(buf: ArrayBuffer): Promise<{ rows: ZoneMonth[]; skipped: number }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets.find((w) => /presup/i.test(w.name)) ?? wb.worksheets.find((w) => w.name !== 'Instrucciones');
  if (!ws) throw new Error('El archivo no tiene una hoja con datos');

  const col: Record<string, number> = {};
  ws.getRow(1).eachCell((c, i) => {
    const h = plain(text(c.value));
    const prev = /anterior|ano pasado|real ant/.test(h);
    if (h.startsWith('zona')) col.zone = i;
    else if (h.startsWith('mes')) col.month = i;
    else if (h.startsWith('margen')) return;
    else if (h.includes('costo')) col.cost = i;
    else if (h.includes('unid')) col[prev ? 'prev_units' : 'units'] = i;
    else if (/venta|valor|ppto|presupuesto|\$/.test(h)) col[prev ? 'prev_amount' : 'amount'] = i;
  });
  const missing = [['zone', 'Zona'], ['month', 'Mes'], ['amount', 'Presupuesto ventas']].filter(([k]) => !col[k]).map(([, l]) => l);
  if (missing.length) throw new Error(`En la hoja "${ws.name}" no encuentro las columnas: ${missing.join(', ')}`);

  const map = new Map<string, ZoneMonth>();
  let skipped = 0;
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const zone = text(row.getCell(col.zone).value);
    const month = monthOf(row.getCell(col.month).value);
    if (!zone && !month) return;
    if (!zone || !month || /^total/i.test(zone)) { skipped++; return; }
    const get = (k: string) => (col[k] ? Math.max(0, Math.round(num(row.getCell(col[k]).value))) : 0);
    const key = `${zone.toLowerCase()}|${month}`;
    const p = map.get(key);
    const r: ZoneMonth = {
      zone, month,
      prev_units: get('prev_units') + (p?.prev_units ?? 0), prev_amount: get('prev_amount') + (p?.prev_amount ?? 0),
      units: get('units') + (p?.units ?? 0), amount: get('amount') + (p?.amount ?? 0), cost: get('cost') + (p?.cost ?? 0),
    };
    map.set(key, r);
  });
  return { rows: [...map.values()], skipped };
}
