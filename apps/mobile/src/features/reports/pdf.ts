import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

async function assetToDataUri(mod: number): Promise<string> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  const ext = (uri.split('.').pop() ?? 'png').toLowerCase();
  const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${base64}`;
}

async function urlToDataUri(url: string): Promise<string | null> {
  try {
    const filename = `${FileSystem.cacheDirectory}img-${Date.now()}.bin`;
    const { uri } = await FileSystem.downloadAsync(url, filename);
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const ext = url.split('?')[0]?.split('.').pop()?.toLowerCase() ?? 'png';
    const mime = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
    return `data:${mime};base64,${base64}`;
  } catch {
    return null;
  }
}

function mdToHtml(md: string): string {
  let html = md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^---$/gm, '<hr />')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\s*)+/gs, (m) => `<ul>${m}</ul>`);
  html = html.split(/\n\n+/).map((p) => p.includes('<') ? p : `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('\n');
  return html;
}

export async function generateReportPdf(report: {
  title: string;
  patientName: string;
  patientCedula?: string | null;
  doctorName?: string | null;
  audiologistName?: string | null;
  visitorName?: string | null;
  generatedAt: string;
  audiometryUrl?: string | null;
  logoaudiometryUrl?: string | null;
  body?: string | null;
}) {
  const logoUri = await assetToDataUri(require('../../../assets/logo.png'));
  const audio = report.audiometryUrl ? await urlToDataUri(report.audiometryUrl) : null;
  const logoAudio = report.logoaudiometryUrl ? await urlToDataUri(report.logoaudiometryUrl) : null;

  const dateStr = new Date(report.generatedAt).toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<style>
  @page {
    size: A4;
    margin: 100px 40px 60px 40px;
    @top-left {
      content: element(pageHeader);
    }
    @bottom-center {
      content: "Aural · Conéctate a tu vida · Página " counter(page) " de " counter(pages);
      font-size: 9px;
      color: #706F6F;
    }
  }
  body { font-family: -apple-system, "Helvetica Neue", system-ui, sans-serif; color: #1A1A1A; font-size: 12pt; line-height: 1.5; }
  #pageHeader { position: running(pageHeader); display: flex; align-items: center; padding-bottom: 8px; border-bottom: 2px solid #041E42; width: 100%; }
  #pageHeader img { height: 44px; }
  h1 { font-size: 17pt; margin: 0 0 6px; color: #041E42; }
  h2 { font-size: 13pt; margin: 18px 0 8px; color: #041E42; border-bottom: 1px solid #E5E7EB; padding-bottom: 4px; }
  h3 { font-size: 11.5pt; margin: 12px 0 6px; color: #041E42; }
  p { font-size: 11pt; line-height: 1.55; margin: 6px 0; }
  ul { font-size: 11pt; line-height: 1.55; padding-left: 18px; }
  li { margin-bottom: 4px; }
  strong { font-weight: 700; color: #041E42; }
  .meta-card { background: #F7F8FA; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; font-size: 10.5pt; margin-top: 4px; }
  .meta-card .row { display: flex; margin-bottom: 4px; }
  .meta-card .row:last-child { margin-bottom: 0; }
  .meta-card .label { width: 110px; color: #706F6F; font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
  .meta-card .value { color: #041E42; }
  .exam-grid { display: flex; gap: 12px; margin-top: 8px; page-break-inside: avoid; }
  .exam-grid figure { flex: 1; margin: 0; border: 1px solid #E5E7EB; border-radius: 6px; padding: 6px; }
  .exam-grid figcaption { font-size: 9pt; color: #706F6F; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; margin-bottom: 4px; }
  .exam-grid img { width: 100%; height: auto; display: block; }
  hr { border: 0; border-top: 1px solid #E5E7EB; margin: 16px 0; }
  .date-right { float: right; font-size: 9.5pt; color: #706F6F; }
</style>
</head>
<body>
  <div id="pageHeader"><img src="${logoUri}" /></div>

  <div>
    <span class="date-right">${dateStr}</span>
    <h1>${report.title}</h1>
  </div>

  <div class="meta-card">
    <div class="row"><span class="label">Paciente</span><span class="value">${report.patientName}${report.patientCedula ? ` · CC ${report.patientCedula}` : ''}</span></div>
    ${report.doctorName ? `<div class="row"><span class="label">Dr(a). tratante</span><span class="value">${report.doctorName}</span></div>` : ''}
    ${report.audiologistName ? `<div class="row"><span class="label">Audióloga</span><span class="value">${report.audiologistName}</span></div>` : ''}
    ${report.visitorName ? `<div class="row"><span class="label">Visitador</span><span class="value">${report.visitorName}</span></div>` : ''}
  </div>

  ${(audio || logoAudio) ? `
  <h2>Exámenes</h2>
  <div class="exam-grid">
    ${audio ? `<figure><figcaption>Audiometría</figcaption><img src="${audio}" /></figure>` : ''}
    ${logoAudio ? `<figure><figcaption>Logoaudiometría</figcaption><img src="${logoAudio}" /></figure>` : ''}
  </div>` : ''}

  ${report.body ? mdToHtml(report.body) : '<p><em>Informe no generado.</em></p>'}
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Guardar o compartir informe' });
  }
}
