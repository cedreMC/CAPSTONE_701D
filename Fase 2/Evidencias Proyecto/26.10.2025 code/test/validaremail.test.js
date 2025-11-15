const { validarEmailCampo } = require('../js/validaciones');

describe('Pruebas unitarias de validarEmailCampo()', () => {
  it('Debería devolver error si el email está vacío', () => {
    const resultado = validarEmailCampo('');
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBe('El email es requerido');
  });

  it('Debería devolver error si el formato del email es incorrecto', () => {
    const resultado = validarEmailCampo('usuario@correo');
    expect(resultado.valido).toBe(false);
    expect(resultado.error).toBe('El formato del email no es válido');
  });

  it('Debería ser válido para un email correcto', () => {
    const resultado = validarEmailCampo('usuario@example.com');
    expect(resultado.valido).toBe(true);
    expect(resultado.error).toBeNull();
  });
});
