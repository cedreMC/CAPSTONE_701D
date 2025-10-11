const request = require('supertest');
const app = require('../js/app');  // Asegúrate de que la ruta sea correcta

describe('Pruebas de la API de registro de usuario', () => {

  it('Debería devolver 400 si faltan campos obligatorios', async () => {
    const response = await request(app)
      .post('/usuarios')
      .send({
        nombre: 'Carlos',
        email: 'carlos@example.com'
        // Falta la contraseña
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Faltan campos requeridos');
  });

  it('Debería devolver 201 al registrar un usuario exitoso', async () => {
    // Intentamos registrar un usuario con datos válidos
    const response = await request(app)
      .post('/usuarios')
      .send({
        nombre: 'Carlos',
        email: 'carlos@example.com',
        contraseña: '12345678'  // Contraseña válida
      });

    expect(response.statusCode).toBe(201);
    expect(response.text).toBe('Usuario creado exitosamente');
  });

  it('Debería devolver 409 si el email ya está registrado', async () => {
    // Primero, registramos un usuario con un email específico
    await request(app)
      .post('/usuarios')
      .send({
        nombre: 'Pedro',
        email: 'pedro@example.com',
        contraseña: '12345678'
      });

    // Ahora, intentamos registrar otro usuario con el mismo email
    const response = await request(app)
      .post('/usuarios')
      .send({
        nombre: 'Ana',
        email: 'pedro@example.com',  // Email ya registrado
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
        contraseña: '123'  // Contraseña demasiado corta
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('La contraseña es demasiado corta');
  });
});
