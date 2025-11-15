// ✨ Limpia el "at Object.log" y mejora impresión de objetos
const originalLog = console.log;
console.log = (...args) => {
  const formattedArgs = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  );
  process.stdout.write(formattedArgs.join(' ') + '\n');
};

// ==========================
//  Dependencias y configuración
// ==========================
const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Mock de base de datos
jest.mock('../js/db', () => ({
  query: jest.fn()
}));

const db = require('../js/db');
const app = express();
app.use(bodyParser.json());

// ==========================
//  Rutas simuladas del API
// ==========================
app.put('/usuarios/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, email } = req.body;

  if (!nombre || !email) {
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }

  db.query(
    'UPDATE usuarios SET nombre=?, email=? WHERE id=?',
    [nombre, email, id],
    err => {
      if (err) return res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
      res.json({ success: true, message: 'Usuario actualizado correctamente' });
    }
  );
});

app.delete('/usuarios/:id', (req, res) => {
  const { id } = req.params;
  db.query('DELETE FROM usuarios WHERE id=?', [id], err => {
    if (err) return res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  });
});

// ==========================
//  Colores ANSI
// ==========================
const color = {
  reset: '\x1b[0m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  gray: '\x1b[90m'
};

// ==========================
//  Funciones auxiliares
// ==========================
function logStep(action, expected) {
  console.log(`${color.yellow}➡️  ${action} (espera: '${expected}')${color.reset}`);
}

function logDataSent(data) {
  console.log(`${color.cyan}📤 Datos enviados:${color.reset} ${JSON.stringify(data, null, 2)}`);
}

// ==========================
//  Suite de pruebas
// ==========================
describe(`${color.cyan}👤 API de Usuarios${color.reset}`, () => {
  beforeAll(() => console.log(`${color.cyan}\n🚀 Iniciando suite de pruebas de Usuarios...\n${color.reset}`));
  afterAll(() => console.log(`${color.cyan}\n🏁 Suite de pruebas finalizada.\n${color.reset}`));

  beforeEach(() => {
    jest.clearAllMocks();
    console.log(`${color.gray}----------------------------------------${color.reset}`);
    console.log(`${color.blue}🔄 Iniciando nueva prueba...${color.reset}`);
  });

  afterEach(() => {
    console.log(`${color.green}✅ Prueba finalizada.${color.reset}`);
    console.log(`${color.gray}----------------------------------------\n${color.reset}`);
  });

  // ======================================
  // 🔹 EDITAR USUARIO
  // ======================================
  test('✅ debería actualizar un usuario correctamente', async () => {
    logStep('Debería actualizar un usuario correctamente', 'Usuario actualizado correctamente');
    db.query.mockImplementation((sql, params, callback) => callback(null));

    const data = { nombre: 'Juan Pérez', email: 'juan@example.com' };
    logDataSent(data);

    const res = await request(app).put('/usuarios/1').send(data);

    console.log(`${color.magenta}🧠 Respuesta recibida:${color.reset} ${JSON.stringify(res.body, null, 2)}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Usuario actualizado correctamente');
  });

  test('💥 debería manejar error de la base de datos al actualizar usuario', async () => {
    logStep('Debería manejar error de base de datos al actualizar usuario', 'Error al actualizar usuario');
    db.query.mockImplementation((sql, params, callback) => callback(new Error('DB Error')));

    const data = { nombre: 'María López', email: 'maria@example.com' };
    logDataSent(data);

    const res = await request(app).put('/usuarios/2').send(data);

    console.log(`${color.magenta}🧠 Respuesta recibida:${color.reset} ${JSON.stringify(res.body, null, 2)}`);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Error al actualizar usuario');
  });

  // ======================================
  // 🔹 ELIMINAR USUARIO
  // ======================================
  test('✅ debería eliminar un usuario correctamente', async () => {
    logStep('Debería eliminar un usuario correctamente', 'Usuario eliminado correctamente');
    db.query.mockImplementation((sql, params, callback) => callback(null));

    console.log(`${color.cyan}📤 ID enviado:${color.reset} 1`);
    const res = await request(app).delete('/usuarios/1');

    console.log(`${color.magenta}🧠 Respuesta recibida:${color.reset} ${JSON.stringify(res.body, null, 2)}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Usuario eliminado correctamente');
  });

  test('💥 debería manejar error de base de datos al eliminar usuario', async () => {
    logStep('Debería manejar error de base de datos al eliminar usuario', 'Error al eliminar usuario');
    db.query.mockImplementation((sql, params, callback) => callback(new Error('DB Error')));

    console.log(`${color.cyan}📤 ID enviado:${color.reset} 3`);
    const res = await request(app).delete('/usuarios/3');

    console.log(`${color.magenta}🧠 Respuesta recibida:${color.reset} ${JSON.stringify(res.body, null, 2)}`);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Error al eliminar usuario');
  });
});





// describe('Pruebas de la API de usuarios', () => {
//   it('GET /usuarios debe devolver lista y código 200', async () => {
//     const response = await request(app).get('/usuarios');
//     expect(response.statusCode).toBe(200);
//     expect(Array.isArray(response.body)).toBe(true);
//   });
// });
