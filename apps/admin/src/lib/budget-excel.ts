import ExcelJS from 'exceljs';

export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export interface TemplateClient {
  id: string; name: string; nit: string | null; zone: string | null; rep: string | null;
  amounts: number[]; units: number[];
}

const HEAD = ['NIT', 'Cliente', 'Zona', 'Comercial'];

/** Plantilla: una hoja de valor y otra de unidades, un cliente por fila, un mes por columna. */
export async function buildTemplate(year: number, clients: TemplateClient[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Aural · Wholesale';

  const help = wb.addWorksheet('Instrucciones');
  help.columns = [{ width: 100 }];
  [
    `Presupuesto wholesale ${year}`,
    '',
    '1. En la hoja "Valor" escribe cuánto debe comprar cada cliente cada mes, en pesos y sin puntos ni signos.',
    '2. En la hoja "Unidades" escribe cuántos audífonos debe comprar cada mes.',
    '3. No cambies las columnas NIT ni Cliente: con ellas el portal reconoce a cada centro.',
    '4. Para un cliente nuevo, agrega una fila al final con su NIT y nombre tal como está creado en el portal.',
    '5. Las celdas vacías se cargan en cero. Guarda el archivo y súbelo en Presupuestos → Subir Excel.',
  ].forEach((t, i) => {
    const r = help.addRow([t]);
    if (i === 0) r.font = { bold: true, size: 14 };
  });

  for (const [name, key] of [['Valor', 'amounts'], ['Unidades', 'units']] as const) {
    const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] });
    ws.columns = [
      { width: 16 }, { width: 38 }, { width: 18 }, { width: 22 },
      ...MONTHS.map(() => ({ width: name === 'Valor' ? 14 : 8 })),
      { width: name === 'Valor' ? 16 : 10 },
    ];
    const head = ws.addRow([...HEAD, ...MONTHS, 'Total']);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF041E42' } }; });

    clients.forEach((c, i) => {
      const n = i + 2;
      const r = ws.addRow([c.nit ?? '', c.name, c.zone ?? '', c.rep ?? '', ...c[key].map((v) => v || null)]);
      r.getCell(17).value = { formula: `SUM(E${n}:P${n})` };
      if (name === 'Valor') for (let col = 5; col <= 17; col++) r.getCell(col).numFmt = '#,##0';
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export interface ParsedRow { nit: string; name: string; amounts: number[]; units: number[] }

function num(v: ExcelJS.CellValue): number {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'result' in v) return num(v.result as ExcelJS.CellValue);
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

/** Lee las hojas Valor y Unidades; busca las columnas por su encabezado. */
export async function parseBudgetFile(buf: ArrayBuffer): Promise<ParsedRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const rows = new Map<string, ParsedRow>();
  const sheets = wb.worksheets.filter((w) => w.name !== 'Instrucciones');
  if (sheets.length === 0) throw new Error('El archivo no tiene hojas con datos');

  for (const ws of sheets) {
    const isUnits = /unid/i.test(ws.name);
    const header = ws.getRow(1);
    const col: Record<string, number> = {};
    header.eachCell((c, i) => {
      const h = text(c.value).toLowerCase();
      if (h.startsWith('nit')) col.nit = i;
      else if (h.startsWith('cliente') || h === 'nombre' || h === 'centro') col.name = i;
      else MONTHS.forEach((m, k) => { if (h.startsWith(m.toLowerCase())) col[`m${k}`] = i; });
    });
    if (!col.name && !col.nit) throw new Error(`En la hoja "${ws.name}" no encuentro las columnas NIT o Cliente`);
    if (!MONTHS.some((_, k) => col[`m${k}`])) throw new Error(`En la hoja "${ws.name}" no encuentro las columnas de los meses (Ene, Feb, …)`);

    ws.eachRow((row, n) => {
      if (n === 1) return;
      const nit = col.nit ? text(row.getCell(col.nit).value) : '';
      const name = col.name ? text(row.getCell(col.name).value) : '';
      if (!nit && !name) return;
      const key = nit.replace(/\D/g, '') || name.toLowerCase();
      const r = rows.get(key) ?? { nit, name, amounts: Array(12).fill(0), units: Array(12).fill(0) };
      MONTHS.forEach((_, k) => {
        if (col[`m${k}`]) (isUnits ? r.units : r.amounts)[k] = Math.max(0, Math.round(num(row.getCell(col[`m${k}`]).value)));
      });
      rows.set(key, r);
    });
  }
  return [...rows.values()];
}
