import nodemailer from 'nodemailer';

const configured = () => Boolean(process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS);

const transporter = () => nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
  port: Number(process.env.SMTP_PORT || 2525),
  connectionTimeout: 15000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
  secure: false,
  auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASS },
});

let tx;
export async function sendMail(to, subject, text, html) {
  tx ||= transporter();
  await tx.sendMail({ from: process.env.MAIL_FROM || '"Aural" <no-reply@auralbusinessintelligence.com>', to, subject, text, html });
}

export async function sendLoginLink(to, name, link, invite = false) {
  if (!configured()) {
    console.log(`[mail no configurado] Enlace para ${to}: ${link}`);
    return false;
  }
  const first = (name || '').split(' ')[0].replace(/[<>&"]/g, '');
  const saludo = first ? `Hola ${first},` : 'Hola,';
  const intro = invite
    ? 'Te invitamos a realizar tu evaluación de servicio Aural. Es un espacio para conocer tus fortalezas y construir juntos un plan de crecimiento.'
    : 'Usa este enlace para entrar al espacio de evaluación de servicio Aural.';
  await transporter().sendMail({
    from: process.env.MAIL_FROM || '"Aural" <no-reply@auralbusinessintelligence.com>',
    to,
    subject: invite ? 'Tu evaluación de servicio Aural' : 'Tu enlace de acceso · Aural',
    text: `${saludo}\n\n${intro}\n\n${link}\n\nEl enlace es personal y vence en 7 días.`,
    html: `<div style="font-family:Arial,sans-serif;color:#041E42;max-width:520px;margin:auto;padding:24px">
      <p>${saludo}</p><p>${intro}</p>
      <p style="margin:28px 0"><a href="${link}" style="background:#041E42;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Entrar</a></p>
      <p style="color:#706F6F;font-size:13px">El enlace es personal y vence en 7 días. Si no lo solicitaste, ignora este correo.</p></div>`,
  });
  return true;
}

export { configured as mailConfigured };
