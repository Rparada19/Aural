import PDFDocument from 'pdfkit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { areaLabel } from './areas.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const FONT = (f) => path.join(DIR, 'public', 'fonts', f);
const LOGO = path.join(DIR, 'assets', 'logo-blanco.png');
const C = { navy: '#041E42', ink: '#1B2A44', gray: '#5B6478', line: '#DCE3EC', bg: '#EEF2F7', signal: '#1FA59A', signalBg: '#E3F5F2', amber: '#B7791F', amberBg: '#FDF2DF', err: '#B42318', errBg: '#FCE9E7' };
const M = 48;
const fdate = (d) => (d ? new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota' }) : '');

export function newDoc(title) {
  const doc = new PDFDocument({ size: 'A4', margins: { top: M, bottom: M + 10, left: M, right: M }, bufferPages: true, info: { Title: title, Author: 'Aural · Programa de servicio' } });
  doc.registerFont('book', FONT('Gotham-Book.ttf'));
  doc.registerFont('medium', FONT('Gotham-Medium.ttf'));
  doc.registerFont('bold', FONT('Gotham-Bold.ttf'));
  return doc;
}

const W = (doc) => doc.page.width - M * 2;
const ensure = (doc, h) => { if (doc.y + h > doc.page.height - M - 20) doc.addPage(); };

function h2(doc, t) {
  ensure(doc, 60);
  doc.moveDown(0.8).font('bold').fontSize(13).fillColor(C.navy).text(t);
  doc.moveDown(0.35);
}

function para(doc, t, opts = {}) {
  if (!t) return;
  doc.font(opts.font || 'book').fontSize(opts.size || 10).fillColor(opts.color || C.ink).text(String(t), { lineGap: 2.5, ...opts.o });
}

function bullets(doc, items, color = C.signal) {
  for (const it of items) {
    const [title, sub] = Array.isArray(it) ? it : [it, ''];
    ensure(doc, 34);
    const y = doc.y;
    doc.save().rect(M, y + 1, 3, sub ? 26 : 12).fill(color).restore();
    doc.font('medium').fontSize(10).fillColor(C.navy).text(String(title || ''), M + 12, y, { width: W(doc) - 12, lineGap: 2 });
    if (sub) doc.font('book').fontSize(9).fillColor(C.gray).text(String(sub), M + 12, doc.y, { width: W(doc) - 12, lineGap: 2 });
    doc.moveDown(0.5);
  }
  doc.x = M;
}

function box(doc, fill, title, lines, titleColor) {
  const pad = 12;
  doc.font('book').fontSize(9.5);
  const body = lines.join('\n');
  const h = pad * 2 + 12 + doc.heightOfString(body, { width: W(doc) - pad * 2, lineGap: 2 });
  ensure(doc, h + 6);
  const y = doc.y;
  doc.save().roundedRect(M, y, W(doc), h, 8).fill(fill).restore();
  doc.font('bold').fontSize(10).fillColor(titleColor).text(title, M + pad, y + pad);
  doc.font('book').fontSize(9.5).fillColor(C.ink).text(body, M + pad, doc.y + 2, { width: W(doc) - pad * 2, lineGap: 2 });
  doc.y = y + h + 8; doc.x = M;
}

export function renderReport(doc, person, ev) {
  const r = ev.report || {};
  const p = r.plan || {};
  const top = doc.y;
  // Encabezado
  doc.save().rect(0, 0, doc.page.width, 150).fill(C.navy).restore();
  try { doc.image(LOGO, M, 34, { height: 26 }); } catch { /* sin logo */ }
  doc.font('book').fontSize(9).fillColor('#B9C6D6').text('Informe de evaluación de servicio', M, 74);
  doc.font('bold').fontSize(20).fillColor('#FFFFFF').text(person.name, M, 88, { width: W(doc) - 110 });
  doc.font('book').fontSize(9.5).fillColor('#D5DDE8').text([areaLabel(person.area), person.sede, person.cargo].filter(Boolean).join(' · '), M, doc.y + 2, { width: W(doc) - 110 });
  // Puntaje
  const sx = doc.page.width - M - 90;
  doc.save().roundedRect(sx, 46, 90, 76, 10).fill('#FFFFFF').restore();
  doc.font('bold').fontSize(30).fillColor(C.navy).text(String(r.puntaje_global ?? '—'), sx, 58, { width: 90, align: 'center' });
  doc.font('medium').fontSize(8.5).fillColor(C.gray).text(r.nivel || 'de 100', sx, 96, { width: 90, align: 'center' });
  doc.y = 170 + (top > M ? 0 : 0); doc.x = M;
  para(doc, `Enviada el ${fdate(ev.submitted_at)} · Analizada el ${fdate(ev.analyzed_at)}`, { size: 8.5, color: C.gray });
  doc.moveDown(0.6);

  h2(doc, 'Conclusiones');
  para(doc, r.resumen, { size: 10.5 });

  if (r.alertas?.length) { doc.moveDown(0.6); box(doc, C.errBg, 'Alertas', r.alertas.map((a) => `• ${a}`), C.err); }

  if (r.modulos?.length) {
    h2(doc, 'Resultado por módulo');
    for (const m of r.modulos) {
      ensure(doc, 44);
      const y = doc.y;
      doc.font('medium').fontSize(9.5).fillColor(C.navy).text(m.modulo, M, y, { width: W(doc) - 40 });
      doc.font('bold').fontSize(10).fillColor(C.navy).text(String(m.puntaje), M + W(doc) - 36, y, { width: 36, align: 'right' });
      const by = Math.max(doc.y, y + 13) + 3;
      doc.save().roundedRect(M, by, W(doc), 5, 2.5).fill(C.bg).roundedRect(M, by, (W(doc) * Math.max(0, Math.min(100, m.puntaje))) / 100, 5, 2.5).fill(C.signal).restore();
      doc.y = by + 9; doc.x = M;
      para(doc, m.comentario, { size: 8.8, color: C.gray });
      doc.moveDown(0.5);
    }
  }

  h2(doc, 'Fortalezas');
  bullets(doc, (r.fortalezas || []).map((f) => [f.titulo, f.evidencia]), C.signal);
  h2(doc, 'Oportunidades de mejora');
  bullets(doc, (r.oportunidades || []).map((f) => [f.titulo, [f.evidencia, f.impacto].filter(Boolean).join(' — ')]), C.amber);

  if (r.autopercepcion) { h2(doc, 'Autopercepción frente al desempeño'); para(doc, r.autopercepcion); }

  if (p.objetivo || p.semanas?.length) {
    ensure(doc, 220);
    doc.moveDown(1.2).font('bold').fontSize(16).fillColor(C.navy).text('Plan de trabajo', M);
    doc.moveDown(0.3);
    para(doc, p.objetivo, { font: 'medium', size: 11 });
    for (const s of p.semanas || []) {
      doc.moveDown(0.5);
      box(doc, C.bg, `${s.semana}: ${s.foco}`, [...(s.acciones || []).map((a) => `• ${a}`), `Cómo lo mediremos: ${s.indicador}`], C.navy);
    }
    if (p.sesiones_1a1?.length) {
      h2(doc, 'Guía para las sesiones uno a uno');
      for (const s of p.sesiones_1a1) box(doc, '#FFFFFF', s.tema, (s.preguntas_guia || []).map((g) => `• ${g}`), C.navy);
    }
    if (p.mensaje) { doc.moveDown(0.4); box(doc, C.signalBg, 'Mensaje para el profesional', [p.mensaje], '#0E6B63'); }
  }
}

export function footer(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    const y = doc.page.height - M + 8;
    doc.font('book').fontSize(7.5).fillColor(C.gray)
      .text(`Aural · Programa de servicio · Documento confidencial de uso interno · Página ${i + 1} de ${range.count}`, M, y, { width: W(doc), align: 'center', lineBreak: false });
  }
}
