const request = require('supertest');
const app = require('../js/app');  // Reemplazar la ruta


describe('Pruebas de la API de usuarios', () => {
  it('GET /usuarios debe devolver lista y código 200', async () => {
    const response = await request(app).get('/usuarios');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
