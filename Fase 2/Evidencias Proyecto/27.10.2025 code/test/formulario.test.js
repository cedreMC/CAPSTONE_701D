// test/formulario.test.js
const request = require('supertest');

// 🧠 1) Mock de la base de datos (definido DENTRO de jest.mock)
jest.mock('../js/db', () => {
  const mockDbQuery = jest.fn((sql, values, cb) => cb(null, { insertId: 123 }));

  return {
    query: mockDbQuery,
    __mockQuery: mockDbQuery // 👈 para verificarlo en el test
  };
});

// 🧠 2) Mock de nodemailer (sin asserts)
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true)
  })
}));

// 🧠 3) Importar después de los mocks
const app = require('../js/app');
const db = require('../js/db'); // para acceder a __mockQuery

describe('Pruebas de la API de solicitar servicio', () => {

  beforeEach(() => {
    db.__mockQuery.mockClear();
    process.env.NODE_ENV = 'test'; // asegura entorno de test
  });

  it('Debería devolver 400 si faltan datos obligatorios', async () => {
    const response = await request(app)
      .post('/solicitar-servicio')
      .send({
        nombre: 'Carlos',
        correo: 'carlos@example.com',
        telefono: '1234567890'
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Faltan datos obligatorios');
  });

  it('Debería devolver 400 si el servicio seleccionado no es válido', async () => {
    const response = await request(app)
      .post('/solicitar-servicio')
      .send({
        nombre: 'Carlos',
        correo: 'carlos@example.com',
        telefono: '1234567890',
        servicio: 'Limpieza General', // no válido
        mensaje: 'Necesito una revisión.'
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Servicio no válido');
  });

  it('Debería devolver 200 y guardar los datos cuando todo es correcto', async () => {
    const body = {
      nombre: 'Carlos',
      correo: 'carlos@example.com',
      telefono: '1234567890',
      servicio: 'Limpieza Residencial',
      mensaje: 'Necesito una revisión de la instalación.'
    };

    const response = await request(app)
      .post('/solicitar-servicio')
      .send(body);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Solicitud enviada con éxito');

    // ✅ Verifica que se "guardó"
    expect(db.__mockQuery).toHaveBeenCalledTimes(1);
    const [sql, values] = db.__mockQuery.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO\s+solicitudes/i);
    expect(values[1]).toBe(body.nombre);
    expect(values[2]).toBe(body.correo);
    expect(values[3]).toBe(body.telefono);
    expect(values[4]).toBe(body.servicio);
  });
});
