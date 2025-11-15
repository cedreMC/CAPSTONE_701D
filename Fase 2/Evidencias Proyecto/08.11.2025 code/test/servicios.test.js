const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Mock de base de datos
jest.mock('../js/db', () => ({
  query: jest.fn()
}));

const db = require('../js/db');

// Importar el app principal
const app = express();
app.use(bodyParser.json());

// Simular las rutas mínimas que probaremos
app.post('/servicios', (req, res) => {
  const { nombre, precio_base } = req.body;

  if (!nombre || !precio_base) {
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }

  db.query('INSERT INTO servicios (nombre, precio_base) VALUES (?, ?)', [nombre, precio_base], err => {
    if (err) return res.status(500).json({ success: false, message: 'Error al agregar servicio' });
    res.json({ success: true, message: 'Servicio agregado correctamente' });
  });
});

app.put('/servicios/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, precio_base, activo } = req.body;

  db.query(
    'UPDATE servicios SET nombre=?, precio_base=?, activo=? WHERE id=?',
    [nombre, precio_base, activo, id],
    err => {
      if (err) return res.status(500).json({ success: false, message: 'Error al actualizar servicio' });
      res.json({ success: true, message: 'Servicio actualizado correctamente' });
    }
  );
});

app.delete('/servicios/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM servicios WHERE id=?', [id], err => {
    if (err) return res.status(500).json({ success: false, message: 'Error al eliminar servicio' });
    res.json({ success: true, message: 'Servicio eliminado correctamente' });
  });
});

describe('🧩 API de Servicios', () => {
  beforeEach(() => jest.clearAllMocks());

  // AGREGAR SERVICIO
  test('debería agregar un servicio correctamente', async () => {
    db.query.mockImplementation((sql, params, callback) => callback(null)); // sin error

    const res = await request(app)
      .post('/servicios')
      .send({ nombre: 'Limpieza Premium', precio_base: 50000 });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Servicio agregado correctamente');
  });

  // DATOS INCOMPLETOS
  test('debería fallar si faltan datos al agregar servicio', async () => {
    const res = await request(app)
      .post('/servicios')
      .send({ nombre: 'Incompleto' });

    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Datos incompletos');
  });

  // MODIFICAR SERVICIO
  test('debería modificar un servicio correctamente', async () => {
    db.query.mockImplementation((sql, params, callback) => callback(null));

    const res = await request(app)
      .put('/servicios/1')
      .send({ nombre: 'Limpieza Residencial', precio_base: 25000, activo: 1 });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Servicio actualizado correctamente');
  });

  // ELIMINAR SERVICIO
  test('debería eliminar un servicio correctamente', async () => {
    db.query.mockImplementation((sql, params, callback) => callback(null));

    const res = await request(app).delete('/servicios/1');

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Servicio eliminado correctamente');
  });
});
