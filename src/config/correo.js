// correo.js
//Hecho por Maria Algora

const FileLogger = require('../logger');
new FileLogger('mi_log.txt');

const nodemailer = require('nodemailer');

const configuracionCorreo = nodemailer.createTransport({
  host: 'api.sagucre.upv.edu.es',
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465, // true si 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


async function verificarConexion() {
  try {
    await configuracionCorreo .verify();
    console.log('SMTP conectado');
  } catch (err) {
    console.warn('No se pudo verificar SMTP:', err.message);
  }
}

async function bienvenida({ to, firstName, username, rawPassword }) {
  const contenido = {
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Gracias por crear tu cuenta',
    html: `
      <p>Hola ${firstName},</p>
      <p>Tu cuenta ha sido creada. Aquí tienes tus credenciales:</p>
      <ul>
        <li><strong>Usuario:</strong> ${username}</li>
        <li><strong>Contraseña:</strong> ${rawPassword}</li>
      </ul>
      <p>Por favor cambia la contraseña al iniciar sesión.</p>
    `
  };

  return configuracionCorreo.sendMail(contenido);
}

module.exports = { bienvenida, verificarConexion };
