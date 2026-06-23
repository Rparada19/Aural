import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: 'afbfac001@smtp-brevo.com',
    pass: 'xsmtpsib-270a950a55d80cf16f6d66f20b22e728ea5929733c... PEGAR_CLAVE_COMPLETA',
  },
});

try {
  const info = await transporter.sendMail({
    from: '"Aural" <no-reply@auralbusinessintelligence.com>',
    to: 'paradarafael9@gmail.com',
    subject: 'Test Aural SMTP',
    text: 'Si llega este correo, el SMTP funciona.',
  });
  console.log('OK message id:', info.messageId);
  console.log('response:', info.response);
} catch (e) {
  console.log('ERROR:', e.message);
  console.log('full:', e);
}
