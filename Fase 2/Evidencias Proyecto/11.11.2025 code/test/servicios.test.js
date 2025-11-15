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
app.post('/servicios', (req, res) => {
  const { nombre, precio_base } = req.body;

  if (!nombre || !precio_base) {
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }

  if (isNaN(precio_base) || precio_base < 0) {
    return res.status(400).json({ success: false, message: 'El precio debe ser un número válido' });
  }

  db.query('INSERT INTO servicios (nombre, precio_base) VALUES (?, ?)', [nombre, precio_base], err => {
    if (err) return res.status(500).json({ success: false, message: 'Error al agregar servicio' });
    res.json({ success: true, message: 'Servicio agregado correctamente' });
  });
});

app.put('/servicios/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, precio_base } = req.body;

  if (!nombre || !precio_base) {
    return res.status(400).json({ success: false, message: 'Datos incompletos' });
  }

  db.query(
    'UPDATE servicios SET nombre=?, precio_base=? WHERE id=?',
    [nombre, precio_base, id],
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

app.get('/servicios', (req, res) => {
  db.query('SELECT * FROM servicios', [], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Error al obtener servicios' });
    res.json({ success: true, data: results });
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
describe(`${color.cyan}🧩 API de Servicios${color.reset}`, () => {
  beforeAll(() => console.log(`${color.cyan}\n🚀 Iniciando suite de pruebas de Servicios...\n${color.reset}`));
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
  // 🔹 CREAR SERVICIO
  // ======================================
  test('✅ debería agregar un servicio correctamente', async () => {
    logStep('Debería agregar un servicio correctamente', 'Servicio agregado correctamente');
    db.query.mockImplementation((sql, params, callback) => callback(null));

    const data = { nombre: 'Limpieza Premium', precio_base: 50000 };
    logDataSent(data);

    const res = await request(app).post('/servicios').send(data);

    console.log(`${color.magenta}🧠 Respuesta recibida:${color.reset} ${JSON.stringify(res.body, null, 2)}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Servicio agregado correctamente');
  });

  test('⚠️ debería fallar si faltan datos al agregar servicio', async () => {
    logStep('Debería fallar si faltan datos al agregar servicio', 'Debe devolver código 400');
    const data = { nombre: 'Incompleto' };
    logDataSent(data);

    const res = await request(app).post('/servicios').send(data);

    console.log(`${color.magenta}🧠 Respuesta recibida:${color.reset} ${JSON.stringify(res.body, null, 2)}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('Datos incompletos');
  });

  test('⚠️ debería fallar si el precio no es numérico', async () => {
    logStep('Debería rechazar un servicio con precio no numérico', 'Debe devolver código 400');
    const data = { nombre: 'Servicio Inválido', precio_base: 'abc' };
    logDataSent(data);

    const res = await request(app).post('/servicios').send(data);

    console.log(`${color.magenta}🧠 Respuesta recibida:${color.reset} ${JSON.stringify(res.body, null, 2)}`);
    expect(res.statusCode).toBe(400);
    expect(res.body.message).toBe('El precio debe ser un número válido');
  });

  test('💥 debería manejar error de la base de datos al agregar servicio', async () => {
    logStep('Debería manejar error de base de datos al agregar servicio', 'Error al agregar servicio');
    db.query.mockImplementation((sql, params, callback) => callback(new Error('DB Error')));

    const data = { nombre: 'Limpieza Vehicular', precio_base: 30000 };
    logDataSent(data);

    const res = await request(app).post('/servicios').send(data);

    console.log(`${color.magenta}🧠 Respuesta recibida:${color.reset} ${JSON.stringify(res.body, null, 2)}`);
    expect(res.statusCode).toBe(500);
    expect(res.body.message).toBe('Error al agregar servicio');
  });

  // ======================================
  // 🔹 ACTUALIZAR SERVICIO
  // ======================================
  test('✅ debería modificar un servicio correctamente', async () => {
    logStep('Debería modificar un servicio correctamente', 'Servicio actualizado correctamente');
    db.query.mockImplementation((sql, params, callback) => callback(null));

    const data = { nombre: 'Limpieza Residencial', precio_base: 25000 };
    logDataSent(data);

    const res = await request(app).put('/servicios/1').send(data);

    console.log(`${color.magenta}🧠 Respuesta recibida:${color.reset} ${JSON.stringify(res.body, null, 2)}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Servicio actualizado correctamente');
  });

  // ======================================
  // 🔹 ELIMINAR SERVICIO
  // ======================================
  test('✅ debería eliminar un servicio correctamente', async () => {
    logStep('Debería eliminar un servicio correctamente', 'Servicio eliminado correctamente');
    db.query.mockImplementation((sql, params, callback) => callback(null));

    console.log(`${color.cyan}📤 ID enviado:${color.reset} 1`);
    const res = await request(app).delete('/servicios/1');

    console.log(`${color.magenta}🧠 Respuesta recibida:${color.reset} ${JSON.stringify(res.body, null, 2)}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toBe('Servicio eliminado correctamente');
  });
});
