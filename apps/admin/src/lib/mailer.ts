import nodemailer from 'nodemailer';

/**
 * Correo saliente por Brevo. Las credenciales viven en el entorno:
 *   BREVO_SMTP_USER   usuario SMTP de Brevo
 *   BREVO_SMTP_PASS   clave SMTP (no la API key del panel)
 *   MAIL_FROM         remitente, por defecto no-reply del dominio
 *
 * Si faltan, no se lanza excepción: el envío queda registrado como
 * pendiente y la interfaz lo dice. Es preferible a fallar en silencio o
 * a hacer creer que el correo salió.
 */
export function mailerReady(): boolean {
  return Boolean(process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS);
}

export interface MailResult {
  ok: boolean;
  error?: string;
  messageId?: string;
}

export async function sendMail(to: string, subject: string, text: string): Promise<MailResult> {
  if (!mailerReady()) {
    return { ok: false, error: 'Falta configurar el correo saliente (BREVO_SMTP_USER y BREVO_SMTP_PASS)' };
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER!,
      pass: process.env.BREVO_SMTP_PASS!,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.MAIL_FROM ?? '"Aural" <no-reply@auralbusinessintelligence.com>',
      to,
      subject,
      text,
      html: text
        .split('\n\n')
        .map((p) => `<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#10233f">${p.replace(/\n/g, '<br>')}</p>`)
        .join(''),
    });
    return { ok: true, messageId: info.messageId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Error al enviar' };
  }
}

/** Reemplaza {{nombre}}, {{centro}}, {{fecha}} y demás marcadores. */
export function fillTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}
