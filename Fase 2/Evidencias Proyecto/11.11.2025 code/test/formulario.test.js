// test/formulario.test.js
const request = require('supertest');

// 🧠 Antes de importar la app, asegurar entorno de test
process.env.NODE_ENV = 'test';

// 🧠 1) Mock de la base de datos (compatible con db.promise())
jest.mock('../js/db', () => {
  // Mock normal
  const mockDbQuery = jest.fn((sql, values, cb) => {
    cb(null, []);
  });

  // Mock para db.promise().query()
  const mockPromiseQuery = jest.fn(async (sql, values) => {
    // Simular comportamiento según el tipo de query
    if (/SELECT/i.test(sql)) {
      if (values && values[0] === 'Limpieza General') {
        // Servicio inválido → no devuelve nada
        return [[]];
      }
      // Servicio válido
      return [[{ id: 1, nombre: 'Limpieza Residencial', precio_base: 15000 }]];
    }

    if (/INSERT INTO/i.test(sql)) {
      return [{ insertId: 123 }];
    }

    return [[]];
  });

  return {
    query: mockDbQuery,
    promise: () => ({ query: mockPromiseQuery }),
    __mockQuery: mockDbQuery,
    __mockPromiseQuery: mockPromiseQuery
  };
});

// 🧠 2) Mock de nodemailer (sin enviar correos)
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true)
  })
}));

// 🧠 3) Importar app y db después de mocks
const app = require('../js/app');
const db = require('../js/db');

describe('Pruebas de la API de solicitar servicio', () => {
  beforeEach(() => {
    db.__mockQuery.mockClear();
    db.__mockPromiseQuery.mockClear();
  });

  it('Debería devolver 400 si faltan datos obligatorios', async () => {
    const response = await request(app)
      .post('/solicitar-servicio')
      .send({
        nombre: 'Carlos',
        correo: 'carlos@example.com'
        // Falta teléfono y servicio
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
    expect(response.body.message).toMatch(/no válido/i);
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
    expect(response.body.message).toMatch(/Solicitud enviada/i);
    expect(response.body.success).toBe(true);

    // Verifica que hubo un insert
    expect(db.__mockPromiseQuery).toHaveBeenCalled();
    const [sql, values] = db.__mockPromiseQuery.mock.calls.find(call =>
      /INSERT INTO/i.test(call[0])
    );

    expect(sql).toMatch(/INSERT INTO\s+solicitudes/i);
    expect(values).toEqual(expect.arrayContaining([
      expect.any(String), // correo_usuario
      body.nombre,
      body.correo,
      body.telefono,
      body.servicio
    ]));
  });
});

afterAll(async () => {
  const db = require('../js/db');
  try {
    if (db.end) await db.end();             // Si es conexión simple (mysql)
    if (db.promise && db.promise().end) await db.promise().end(); // Si usas mysql2/promise
  } catch (err) {
    console.warn('⚠️ No se pudo cerrar la conexión DB:', err.message);
  }
});


