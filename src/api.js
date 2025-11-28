const request = require('supertest');

// Mock de logica.js para tests aislados
jest.mock('../logica', () => ({
  registerUser: jest.fn(),
  loginUser: jest.fn(),
  getUser: jest.fn(),
  linkNodeToUser: jest.fn(),
  updateUserActivity: jest.fn(),
  getAirQualitySummary: jest.fn().mockResolvedValue({ success: true, status: 'buena', summaryText: 'Aire bueno' }),
  insertMeasurement: jest.fn().mockResolvedValue({ success: true, message: 'Medición insertada' }),
  getPoints: jest.fn().mockResolvedValue({ success: true, points: 100 }),
  addPoints: jest.fn().mockResolvedValue({ success: true, totalPoints: 120 }),
  getPrizes: jest.fn().mockResolvedValue({ success: true, prizes: [{ id: 1, name: 'Premio' }] }),
  redeemPrize: jest.fn().mockResolvedValue({ success: true, couponCode: 'ABC-123' })
}));

const app = require('../api');

// Variables globales para los tests
let createdUserId;
let authToken;
let nodeId;

describe('API de Monitoreo Ambiental - Tests', () => {

  // Configurar mocks antes de cada test
  beforeEach(() => {
    const logica = require('../logica');
    
    // Configurar mocks para casos exitosos por defecto
    logica.registerUser.mockResolvedValue({ success: true, message: 'Usuario registrado correctamente' });
    logica.loginUser.mockResolvedValue({ success: true, token: 'mock-token', userId: 123 });
    logica.getUser.mockResolvedValue({ 
      success: true, 
      user: { 
        id: 123, 
        username: 'testuser', 
        email: 'test@example.com', 
        points: 0,
        active_hours: 0,
        total_distance: 0 
      } 
    });
    logica.linkNodeToUser.mockResolvedValue({ success: true, message: 'Nodo vinculado correctamente', nodeId: 456 });
    logica.updateUserActivity.mockResolvedValue({ success: true, active_hours: 2.5, total_distance: 5.3 });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

    // Test 1: Verificar que la API está funcionando
    describe('GET /', () => {
        it('Debe retornar información de la API', async () => {
            const response = await request(app).get('/');
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('version');
            expect(response.body).toHaveProperty('endpoints');
        });
    });

    // Test 2: Registrar un nuevo usuario
    describe('POST /register', () => {
        it('Debe registrar un nuevo usuario correctamente', async () => {
            const newUser = {
                username: `testuser_${Date.now()}`,
                email: `test_${Date.now()}@example.com`,
                password: 'password123',
                townHallId: 1
            };

            const response = await request(app)
                .post('/register')
                .send(newUser);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Usuario registrado correctamente');
        });

        it('Debe rechazar registro sin campos obligatorios', async () => {
            const logica = require('../logica');
            logica.registerUser.mockResolvedValueOnce({ success: false, message: 'Faltan campos obligatorios' });

            const incompleteUser = {
                username: 'testuser',
                email: 'test@example.com'
                // Faltan password y townHallId
            };

            const response = await request(app)
                .post('/register')
                .send(incompleteUser);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it('Debe rechazar usuario duplicado', async () => {
            const logica = require('../logica');
            logica.registerUser.mockResolvedValueOnce({ success: false, message: 'Error: Usuario o email ya existe' });

// Primer registro
            const user = {
                username: `duplicate_${Date.now()}`,
                email: `duplicate_${Date.now()}@example.com`,
                password: 'password123',
                townHallId: 1
            };

// Segundo registro (duplicado)
            const response = await request(app)
                .post('/register')
                .send(user);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('ya existe');
        });
    });

    // Test 3: Login
    describe('POST /login', () => {
        it('Debe hacer login correctamente con credenciales válidas', async () => {
            const response = await request(app)
                .post('/login')
                .send({
                    username: 'testuser',
                    password: 'password123'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('userId');

            // Guardar para tests posteriores
            authToken = response.body.token;
            createdUserId = response.body.userId;
        });

        it('Debe rechazar login con usuario inexistente', async () => {
            const logica = require('../logica');
            logica.loginUser.mockResolvedValueOnce({ success: false, message: 'Error: Usuario no encontrado' });

            const response = await request(app)
                .post('/login')
                .send({
                    username: 'USUARIO_NO_EXISTE',
                    password: 'password123'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('no encontrado');
        });

        it('Debe rechazar login con contraseña incorrecta', async () => {
            const logica = require('../logica');
            logica.loginUser.mockResolvedValueOnce({ success: false, message: 'Error: Contraseña incorrecta' });

            const response = await request(app)
                .post('/login')
                .send({
                    username: 'testuser',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('incorrecta');
        });
    });

    // Test 4: Obtener usuario
    describe('GET /user/:userId', () => {
        it('Debe obtener información de un usuario existente', async () => {
            const response = await request(app).get(`/user/${createdUserId}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.user).toHaveProperty('username');
            expect(response.body.user).toHaveProperty('email');
            expect(response.body.user).toHaveProperty('points');
            expect(response.body.user.username).toBe('testuser');
        });

        it('Debe retornar error para usuario inexistente', async () => {
            const logica = require('../logica');
            logica.getUser.mockResolvedValueOnce({ success: false, message: 'Error: Usuario no encontrado' });

            const response = await request(app).get('/user/99999');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    // Test 5: Vincular nodo
    describe('POST /node/link', () => {
        it('Debe vincular un nodo a un usuario', async () => {
            const response = await request(app)
                .post('/node/link')
                .send({
                    userId: createdUserId,
                    nodeName: `Sensor_Arduino_${Date.now()}`
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('nodeId');
            expect(response.body.message).toBe('Nodo vinculado correctamente');
            
            nodeId = response.body.nodeId;
        });

        it('Debe rechazar vincular nodo sin campos obligatorios', async () => {
            const logica = require('../logica');
            logica.linkNodeToUser.mockResolvedValueOnce({ success: false, message: 'Faltan campos obligatorios' });

            const response = await request(app)
                .post('/node/link')
                .send({
                    userId: 1
                    // Falta nodeName
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });

    // Test 6: Actualizar actividad
    describe('PUT /user/activity', () => {
        it('Debe actualizar la actividad de un usuario', async () => {
            const response = await request(app)
                .put('/user/activity')
                .send({
                    userId: createdUserId,
                    time: 2.5,
                    distance: 5.3
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.active_hours).toBe(2.5);
            expect(response.body.total_distance).toBe(5.3);
        });

        it('Debe acumular actividad correctamente', async () => {
            const logica = require('../logica');
            logica.updateUserActivity
                .mockResolvedValueOnce({ success: true, active_hours: 1.0, total_distance: 2.0 })
                .mockResolvedValueOnce({ success: true, active_hours: 2.5, total_distance: 5.0 });

            // Primera actualización
            await request(app).put('/user/activity').send({
                userId: createdUserId,
                time: 1.0,
                distance: 2.0
            });

            // Segunda actualización
            const response = await request(app).put('/user/activity').send({
                userId: createdUserId,
                time: 1.5,
                distance: 3.0
            });

            expect(response.status).toBe(200);
            expect(response.body.active_hours).toBe(2.5);
            expect(response.body.total_distance).toBe(5.0);
        });
    });

    // Test 7: Endpoint no existente
    describe('Rutas no existentes', () => {
        it('Debe retornar 404 para endpoint no existente', async () => {
            const response = await request(app).get('/ruta/inexistente');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });


    // Test 8: Obtener calidad del aire
    describe('GET /usuario/calidad-aire-resumen', () => {
        it('Debe retornar resumen de calidad del aire', async () => {
            const response = await request(app)
                .get('/usuario/calidad-aire-resumen')
                .query({ userId: createdUserId });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('summaryText');
        });
    });

    // Test 9: Insertar mediciones
    describe('POST /measurements', () => {
        it('Debe insertar mediciones de un nodo', async () => {
            const response = await request(app)
                .post('/measurements')
                .send({
                    nodeId: nodeId,
                    co: 0.3,
                    o3: 0.02,
                    no2: 0.01,
                    latitude: 40.4168,
                    longitude: -3.7038
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });
    });

    // Test 10: Obtener puntos
    describe('GET /points/:userId', () => {
        it('Debe obtener los puntos de un usuario', async () => {
            const response = await request(app).get(`/points/${createdUserId}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('points');
        });
    });

    // Test 11: Sumar puntos
    describe('PUT /points', () => {
        it('Debe sumar puntos a un usuario', async () => {
            const response = await request(app)
                .put('/points')
                .send({
                    userId: createdUserId,
                    points: 20
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('totalPoints');
        });
    });

    // Test 12: Obtener premios
    describe('GET /prizes', () => {
        it('Debe retornar lista de premios disponibles', async () => {
            const response = await request(app).get('/prizes');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('prizes');
        });
    });

    // Test 13: Canjear premio
    describe('POST /redeem', () => {
        it('Debe canjear premio con puntos suficientes', async () => {
            const response = await request(app)
                .post('/redeem')
                .send({
                    userId: createdUserId,
                    prizeId: 1
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});