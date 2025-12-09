function validarEmailCampo(email) {
  if (email === '') {
    return { valido: false, error: 'El email es requerido' };
  }

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return { valido: false, error: 'El formato del email no es válido' };
  }

  return { valido: true, error: null };
}

function validarContraseña(contraseña) {
  if (contraseña === '') {
    return 'La contraseña es requerida';
  }

  if (contraseña.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres';
  }

  return null; // Sin errores
}

function validarSolicitud({ fullName, email, phone, service }) {
  const errores = {};
  if (!fullName) errores.fullName = 'El nombre completo es requerido';
  if (!email) errores.email = 'El correo electrónico es requerido';
  else if (!isValidEmail(email)) errores.email = 'Ingresa un correo electrónico válido';
  if (!phone) errores.phone = 'El teléfono es requerido';
  if (!service) errores.service = 'Selecciona un servicio';

  return errores;
}
function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// ✅ Exporta ambas en un solo objeto
module.exports = { validarEmailCampo, validarContraseña, validarSolicitud, isValidEmail };
