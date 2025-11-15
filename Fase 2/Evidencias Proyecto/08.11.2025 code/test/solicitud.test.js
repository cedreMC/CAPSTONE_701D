const { validarSolicitud } = require('../js/validaciones');

describe('validarSolicitud()', () => {
  it('devuelve errores si faltan campos', () => {
    const resultado = validarSolicitud({ fullName: '', email: '', phone: '', service: '' });
    expect(Object.keys(resultado)).toContain('fullName');
    expect(Object.keys(resultado)).toContain('email');
    expect(Object.keys(resultado)).toContain('phone');
    expect(Object.keys(resultado)).toContain('service');
  });

  it('devuelve objeto vacío si todo es válido', () => {
    const resultado = validarSolicitud({
      fullName: 'Juan Pérez',
      email: 'juan@example.com',
      phone: '999999999',
      service: 'Limpieza Industrial'
    });
    expect(resultado).toEqual({});
  });
});
