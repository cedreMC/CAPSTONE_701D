const request = require('supertest');
const app = require('../js/app');  // Reemplazar la ruta



describe('Pruebas de la API de login', () => {
    it('Debería devolver 400 si email o contraseña están vacíos', async () => {
    const response = await request(app)
        .post('/login')
        .send({
            email: '',          // email vacío
            contraseña: ''      // contraseña vacía
        });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Faltan email o contraseña');
});

    it('Debería devolver 200 para login exitoso con credenciales correctas', async () => {
        const response = await request(app)
        .post('/login')
        .send({
            email: 'pablo@example.com',
            contraseña: '12345678' // Contraseña correcta
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
        const response = await request(app)
        .post('/login')
        .send({
            email: 'pablo@example.com',
            contraseña: 'incorrecta' // Contraseña incorrecta
        });

        expect(response.statusCode).toBe(401);
        expect(response.body.error).toBe('Contraseña incorrecta');
    });
});