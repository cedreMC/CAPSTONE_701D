const request = require('supertest');
const app = require('../js/app'); // Ajusta la ruta si es necesario
// A
describe('Pruebas de la API de login', () => {
  // Antes de todas las pruebas, asegurar que el usuario exista
  beforeAll(async () => {
    // Verificamos si el usuario ya existe
    const checkUser = await request(app)
      .get('/usuarios') // Esta ruta debe existir para listar usuarios (puedes adaptarla)
      .query({ email: 'pablo@example.com' });

    // Si la API no tiene ruta GET, simplemente intenta crear siempre
    if (!checkUser.body || checkUser.body.length === 0) {
      await request(app)
        .post('/registro')
        .send({
          nombre: 'Pablo Boisset',
          email: 'pablo@example.com',
          contraseña: '12345678'
        });
    }
  });

  it('Debería devolver 400 si email o contraseña están vacíos', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        email: '',
        contraseña: ''
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Faltan email o contraseña');
  });

  it('Debería devolver 200 para login exitoso con credenciales correctas', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        email: 'pablo@example.com',
        contraseña: '12345678'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Login exitoso');
  });

  it('Debería devolver 401 si el usuario no existe', async () => {
    const response = await request(app)
      .post('/login')
      .send({
        email: 'usuario@noexiste.com',
        contraseña: '12345678'
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBe('Usuario no encontrado');
  });

  it('Debería devolver 401 si la contraseña es incorrecta', async () => {
    // Asegura que el usuario esté creado (en caso de que se haya borrado)
    await request(app)
      .post('/registro')
      .send({
        nombre: 'Pablo Boisset',
        email: 'pablo@example.com',
        contraseña: '12345678'
      });

    const response = await request(app)
      .post('/login')
      .send({
        email: 'pablo@example.com',
        contraseña: 'incorrecta'
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBe('Contraseña incorrecta');
  });
});
