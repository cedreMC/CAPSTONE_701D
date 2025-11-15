const request = require('supertest');
const app = require('../js/app');
const mysql = require('mysql2/promise');

let connection;

// 🔹 Antes de correr las pruebas
beforeAll(async () => {
  connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '1@d&838VyO', // tu contraseña real de MySQL
    database: 'myweb' // cámbiala por la tuya
  });

  // Limpia los correos usados en las pruebas
  await connection.execute("DELETE FROM usuarios WHERE email IN ('carlos@example.com', 'pedro@example.com', 'luis@example.com')");
});

// 🔹 Después de todas las pruebas
afterAll(async () => {
  await connection.end();
});

describe('Pruebas de la API de registro de usuario', () => {
  it('Debería devolver 400 si faltan campos obligatorios', async () => {
    const response = await request(app)
      .post('/usuarios')
      .send({
        nombre: 'Carlos',
        email: 'carlos@example.com'
        // Falta contraseña
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Faltan campos requeridos');
  });

  it('Debería devolver 201 al registrar un usuario exitoso', async () => {
    const response = await request(app)
      .post('/usuarios')
      .send({
        nombre: 'Carlos',
        email: 'carlos@example.com',
        contraseña: '12345678'
      });

    expect(response.statusCode).toBe(201);
    expect(response.text).toBe('Usuario creado exitosamente');
  });

  it('Debería devolver 409 si el email ya está registrado', async () => {
    // Aseguramos que el usuario exista
    await request(app)
      .post('/usuarios')
      .send({
        nombre: 'Pedro',
        email: 'pedro@example.com',
        contraseña: '12345678'
      });

    const response = await request(app)
      .post('/usuarios')
      .send({
        nombre: 'Ana',
        email: 'pedro@example.com',
        contraseña: '12345678'
      });

    expect(response.statusCode).toBe(409);
    expect(response.body.error).toBe('El email ya está registrado');
  });

  it('Debería devolver 400 si la contraseña es demasiado corta', async () => {
    const response = await request(app)
      .post('/usuarios')
      .send({
        nombre: 'Luis',
        email: 'luis@example.com',
        contraseña: '123' // corta
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('La contraseña es demasiado corta');
  });
});
