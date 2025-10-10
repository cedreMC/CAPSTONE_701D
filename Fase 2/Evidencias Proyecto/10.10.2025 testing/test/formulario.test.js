const request = require('supertest');
const app = require('../js/app');  // Asegúrate de que la ruta sea correcta

jest.mock('nodemailer');  // Mock para nodemailer

describe('Pruebas de la API de solicitar servicio', () => {

  it('Debería devolver 400 si faltan datos obligatorios', async () => {
    const response = await request(app)
      .post('/solicitar-servicio')
      .send({
        nombre: 'Carlos',
        correo: 'carlos@example.com',
        telefono: '1234567890'
        // Falta el campo "servicio"
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
        servicio: 'Limpieza General',  // Servicio no válido
        mensaje: 'Necesito una revisión.'
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.message).toBe('Servicio no válido');
  });

  it('Debería devolver 200 y enviar un correo cuando todos los datos son correctos', async () => {
    const sendMailMock = jest.fn().mockResolvedValue('Correo enviado');
    const nodemailer = require('nodemailer');
    nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

    const response = await request(app)
      .post('/solicitar-servicio')
      .send({
        nombre: 'Carlos',
        correo: 'carlos@example.com',
        telefono: '1234567890',
        servicio: 'Limpieza Residencial',
        mensaje: 'Necesito una revisión de la instalación.'
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Solicitud enviada con éxito');
    expect(sendMailMock).toHaveBeenCalledTimes(1);  // Verifica que se haya intentado enviar un correo
  });

});
