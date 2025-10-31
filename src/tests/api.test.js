const request = require('supertest');
const app = require('../api');

// Variables globales para los tests
let createdUserId;
let authToken;
let nodeId;

describe('API de Monitoreo Ambiental - Tests', () => {

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
            const user = {
                username: `duplicate_${Date.now()}`,
                email: `duplicate_${Date.now()}@example.com`,
                password: 'password123',
                townHallId: 1
            };

            // Primer registro
            await request(app).post('/register').send(user);

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
        beforeAll(async () => {
            // Crear un usuario para hacer login
            const testUser = {
                username: `logintest_${Date.now()}`,
                email: `logintest_${Date.now()}@example.com`,
                password: 'password123',
                townHallId: 1
            };
            await request(app).post('/register').send(testUser);
        });

        it('Debe hacer login correctamente con credenciales válidas', async () => {
            // Primero registrar
            const user = {
                username: `user_${Date.now()}`,
                email: `user_${Date.now()}@example.com`,
                password: 'password123',
                townHallId: 1
            };
            await request(app).post('/register').send(user);

            // Luego login
            const response = await request(app)
                .post('/login')
                .send({
                    username: user.username,
                    password: user.password
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('userId');

            // Guardar para tests posteriores
            authToken = response.body.token;
            createdUserId = response.body.userId;
        });

        it('Debe rechazar login con email inexistente', async () => {
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
            // Crear usuario
            const user = {
                username: `wrongpass_${Date.now()}`,
                email: `wrongpass_${Date.now()}@example.com`,
                password: 'correctpassword',
                townHallId: 1
            };
            await request(app).post('/register').send(user);

            // Intentar login con contraseña incorrecta
            const response = await request(app)
                .post('/login')
                .send({
                    username: user.username,
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
            // Crear y hacer login primero
            const user = {
                username: `getuser_${Date.now()}`,
                email: `getuser_${Date.now()}@example.com`,
                password: 'password123',
                townHallId: 1
            };
            await request(app).post('/register').send(user);
            const loginResponse = await request(app).post('/login').send({
                username: user.username,
                password: user.password
            });

            const userId = loginResponse.body.userId;

            const response = await request(app).get(`/user/${userId}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.user).toHaveProperty('username');
            expect(response.body.user).toHaveProperty('email');
            expect(response.body.user).toHaveProperty('points');
            expect(response.body.user.username).toBe(user.username);
        });

        it('Debe retornar error para usuario inexistente', async () => {
            const response = await request(app).get('/user/99999');

            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });

    // Test 5: Vincular nodo
    describe('POST /node/link', () => {
        it('Debe vincular un nodo a un usuario', async () => {
            // Crear usuario primero
            const user = {
                username: `nodetest_${Date.now()}`,
                email: `nodetest_${Date.now()}@example.com`,
                password: 'password123',
                townHallId: 1
            };
            await request(app).post('/register').send(user);
            const loginResponse = await request(app).post('/login').send({
                username: user.username,
                password: user.password
            });

            const userId = loginResponse.body.userId;

            const response = await request(app)
                .post('/node/link')
                .send({
                    userId: userId,
                    nodeName: `Sensor_Arduino_${Date.now()}`
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body).toHaveProperty('nodeId');
            expect(response.body.message).toBe('Nodo vinculado correctamente');
        });

        it('Debe rechazar vincular nodo sin campos obligatorios', async () => {
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
            // Crear usuario primero
            const user = {
                username: `activity_${Date.now()}`,
                email: `activity_${Date.now()}@example.com`,
                password: 'password123',
                townHallId: 1
            };
            await request(app).post('/register').send(user);
            const loginResponse = await request(app).post('/login').send({
                username: user.username,
                password: user.password
            });

            const userId = loginResponse.body.userId;

            const response = await request(app)
                .put('/user/activity')
                .send({
                    userId: userId,
                    time: 2.5,
                    distance: 5.3
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.active_hours).toBe(2.5);
            expect(response.body.total_distance).toBe(5.3);
        });

        it('Debe acumular actividad correctamente', async () => {
            // Crear usuario
            const user = {
                username: `accumulate_${Date.now()}`,
                email: `accumulate_${Date.now()}@example.com`,
                password: 'password123',
                townHallId: 1
            };
            await request(app).post('/register').send(user);
            const loginResponse = await request(app).post('/login').send({
                username: user.username,
                password: user.password
            });

            const userId = loginResponse.body.userId;

            // Primera actualización
            await request(app).put('/user/activity').send({
                userId: userId,
                time: 1.0,
                distance: 2.0
            });

            // Segunda actualización
            const response = await request(app).put('/user/activity').send({
                userId: userId,
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
});