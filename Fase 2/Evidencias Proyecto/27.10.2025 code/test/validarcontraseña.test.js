const { validarContraseña } = require('../js/validaciones');

describe('Pruebas unitarias de validarContraseña()', () => {
  it('Debería devolver error si la contraseña está vacía', () => {
    const resultado = validarContraseña('');
    expect(resultado).toBe('La contraseña es requerida');
  });

  it('Debería devolver error si la contraseña tiene menos de 8 caracteres', () => {
    const resultado = validarContraseña('12345');
    expect(resultado).toBe('La contraseña debe tener al menos 8 caracteres');
  });

  it('Debería devolver null si la contraseña cumple los requisitos', () => {
    const resultado = validarContraseña('12345678');
    expect(resultado).toBeNull();
  });
});
