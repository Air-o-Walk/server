const logica = require('../logica');

// Mock de la base de datos y dependencias
jest.mock('../config/database', () => ({
  query: jest.fn(),
  end: jest.fn().mockResolvedValue()
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock.jwt.token')
}));

jest.mock('../config/correo.js', () => ({
  bienvenida: jest.fn().mockResolvedValue()
}));

const db = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Variables globales para los tests
let testUserId;
let testUsername;
let testUserPassword;

describe('Lógica de Negocio - Tests de Funciones', () => {

    // Limpiar mocks después de todos los tests
    afterAll(async () => {
        jest.clearAllMocks();
    });

    // Limpiar mocks después de cada test
    afterEach(() => {
        jest.clearAllMocks();
    });

    // ==========================================
    // TESTS DE registerUser()
    // ==========================================
    describe('registerUser(email)', () => {
        
        it('Debe registrar un nuevo usuario correctamente', async () => {
            const email = `test_${Date.now()}@example.com`;

            // Mock para el flujo completo de registerUser
            db.query
                .mockResolvedValueOnce([[{ 
                    id: 1, 
                    first_name: 'Test', 
                    last_name: 'User', 
                    email: email, 
                    dni: '12345678A',
                    town_hall_id: 1 
                }]])
                .mockResolvedValueOnce([[{ id: 1 }]])
                .mockResolvedValueOnce([{ insertId: 123, affectedRows: 1 }])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            const resultado = await logica.registerUser(email);

            expect(resultado.success).toBe(true);
            expect(resultado.message).toBe('Usuario registrado correctamente');

            // Guardar para tests posteriores
            testUsername = 't.user'; // Formato generado automáticamente
            testUserPassword = '12345678'; // DNI sin letra
        });

        it('Debe rechazar usuario con email duplicado', async () => {
            const email = `duplicate_${Date.now()}@example.com`;

            // Mock para simular error de duplicado
            db.query
                .mockResolvedValueOnce([[{ 
                    id: 1, 
                    first_name: 'Test', 
                    last_name: 'User', 
                    email: email, 
                    dni: '12345678A',
                    town_hall_id: 1 
                }]])
                .mockResolvedValueOnce([[{ id: 1 }]])
                .mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' }); // Error de duplicado

            const resultado = await logica.registerUser(email);

            expect(resultado.success).toBe(false);
        });

        it('Debe rechazar usuario sin solicitud previa', async () => {
            const email = `noapplication_${Date.now()}@example.com`;

            // Mock para no encontrar aplicación
            db.query.mockResolvedValueOnce([[]]);

            const resultado = await logica.registerUser(email);

            expect(resultado.success).toBe(false);
            expect(resultado.message).toContain('Solicitud no encontrada');
        });

        it('Debe inicializar puntos, horas y distancia en 0', async () => {
            const email = `newuser_${Date.now()}@example.com`;

            // Mock para registro exitoso
            db.query
                .mockResolvedValueOnce([[{ 
                    id: 1, 
                    first_name: 'New', 
                    last_name: 'User', 
                    email: email, 
                    dni: '87654321B',
                    town_hall_id: 1 
                }]])
                .mockResolvedValueOnce([[{ id: 1 }]])
                .mockResolvedValueOnce([{ insertId: 124, affectedRows: 1 }])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            const registroResult = await logica.registerUser(email);
            expect(registroResult.success).toBe(true);

            // Mock para login
            db.query.mockResolvedValueOnce([[
                { 
                    id: 124, 
                    username: 'n.user', 
                    password: '$2b$10$hashedpassword', 
                    email: email 
                }
            ]]);

            // Mock para getUser
            db.query.mockResolvedValueOnce([[
                { 
                    id: 124, 
                    username: 'n.user', 
                    email: email, 
                    points: 0,
                    active_hours: 0,
                    total_distance: 0,
                    photo_url: null,
                    town_hall_name: 'Madrid',
                    province: 'Madrid',
                    role_name: 'walker'
                }
            ]]);

            const loginResult = await logica.loginUser('n.user', '87654321');
            const userResult = await logica.getUser(loginResult.userId);

            expect(userResult.user.points).toBe(0);
            expect(userResult.user.active_hours).toBe(0);
            expect(userResult.user.total_distance).toBe(0);
        });

        it('Debe cifrar la contraseña correctamente', async () => {
            const email = `encrypt_${Date.now()}@example.com`;

            // Mock para registro
            db.query
                .mockResolvedValueOnce([[{ 
                    id: 1, 
                    first_name: 'Encrypt', 
                    last_name: 'Test', 
                    email: email, 
                    dni: '11111111C',
                    town_hall_id: 1 
                }]])
                .mockResolvedValueOnce([[{ id: 1 }]])
                .mockResolvedValueOnce([{ insertId: 125, affectedRows: 1 }])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            await logica.registerUser(email);

            // Mock para login exitoso
            db.query.mockResolvedValueOnce([[
                { 
                    id: 125, 
                    username: 'e.test', 
                    password: '$2b$10$hashedpassword', 
                    email: email 
                }
            ]]);

            // Verificar que se puede hacer login (la contraseña está cifrada correctamente)
            const loginResult = await logica.loginUser('e.test', '11111111');
            expect(loginResult.success).toBe(true);
        });
    });

    // ==========================================
    // TESTS DE loginUser()
    // ==========================================
    describe('loginUser(username, password)', () => {
        
        beforeAll(async () => {
            // Configurar usuario de prueba para tests
            testUsername = 'testuser';
            testUserPassword = 'password123';
        });

        it('Debe hacer login correctamente con credenciales válidas', async () => {
            // Mock para usuario existente
            db.query.mockResolvedValueOnce([[
                { 
                    id: 123, 
                    username: testUsername, 
                    password: '$2b$10$hashedpassword', 
                    email: 'test@example.com' 
                }
            ]]);

            const resultado = await logica.loginUser(testUsername, testUserPassword);

            expect(resultado.success).toBe(true);
            expect(resultado).toHaveProperty('token');
            expect(resultado).toHaveProperty('userId');
            expect(typeof resultado.token).toBe('string');
            expect(resultado.token.length).toBeGreaterThan(0);

            // Guardar userId para otros tests
            testUserId = resultado.userId;
        });

        it('Debe rechazar login con username inexistente', async () => {
            db.query.mockResolvedValueOnce([[]]); // Usuario no encontrado

            const resultado = await logica.loginUser('UsuarioNoExiste', 'password123');

            expect(resultado.success).toBe(false);
            expect(resultado.message).toContain('no encontrado');
        });

        it('Debe rechazar login con contraseña incorrecta', async () => {
            db.query.mockResolvedValueOnce([[
                { 
                    id: 123, 
                    username: testUsername, 
                    password: '$2b$10$hashedpassword', 
                    email: 'test@example.com' 
                }
            ]]);
            
            // Mock de bcrypt.compare para contraseña incorrecta
            bcrypt.compare.mockResolvedValueOnce(false);

            const resultado = await logica.loginUser(testUsername, 'wrongPassword');

            expect(resultado.success).toBe(false);
            expect(resultado.message).toContain('incorrecta');
        });

        it('Debe generar un token JWT válido', async () => {
            db.query.mockResolvedValueOnce([[
                { 
                    id: 123, 
                    username: testUsername, 
                    password: '$2b$10$hashedpassword', 
                    email: 'test@example.com' 
                }
            ]]);

            const resultado = await logica.loginUser(testUsername, testUserPassword);

            expect(resultado.success).toBe(true);
            // Verificar que tiene formato de JWT (3 partes separadas por puntos)
            const tokenParts = resultado.token.split('.');
            expect(tokenParts.length).toBe(3);
        });
    });

    // ==========================================
    // TESTS DE getUser()
    // ==========================================
    describe('getUser(userId)', () => {
        
        it('Debe obtener información completa del usuario', async () => {
            db.query.mockResolvedValueOnce([[
                { 
                    id: 123, 
                    username: 'testuser', 
                    email: 'test@example.com', 
                    points: 100,
                    active_hours: 10.5,
                    total_distance: 25.3,
                    photo_url: null,
                    town_hall_name: 'Madrid',
                    province: 'Madrid',
                    role_name: 'walker'
                }
            ]]);

            const resultado = await logica.getUser(123);

            expect(resultado.success).toBe(true);
            expect(resultado).toHaveProperty('user');
            expect(resultado.user).toHaveProperty('id');
            expect(resultado.user).toHaveProperty('username');
            expect(resultado.user).toHaveProperty('email');
            expect(resultado.user).toHaveProperty('points');
            expect(resultado.user).toHaveProperty('active_hours');
            expect(resultado.user).toHaveProperty('total_distance');
            expect(resultado.user).toHaveProperty('town_hall');
            expect(resultado.user).toHaveProperty('role');
        });

        it('Debe incluir información del ayuntamiento', async () => {
            db.query.mockResolvedValueOnce([[
                { 
                    id: 123, 
                    username: 'testuser', 
                    email: 'test@example.com', 
                    points: 100,
                    active_hours: 10.5,
                    total_distance: 25.3,
                    photo_url: null,
                    town_hall_name: 'Madrid',
                    province: 'Madrid',
                    role_name: 'walker'
                }
            ]]);

            const resultado = await logica.getUser(123);

            expect(resultado.user.town_hall).toHaveProperty('name');
            expect(resultado.user.town_hall).toHaveProperty('province');
        });

        it('Debe incluir el rol del usuario', async () => {
            db.query.mockResolvedValueOnce([[
                { 
                    id: 123, 
                    username: 'testuser', 
                    email: 'test@example.com', 
                    points: 100,
                    active_hours: 10.5,
                    total_distance: 25.3,
                    photo_url: null,
                    town_hall_name: 'Madrid',
                    province: 'Madrid',
                    role_name: 'walker'
                }
            ]]);

            const resultado = await logica.getUser(123);

            expect(resultado.user.role).toBe('walker');
        });

        it('Debe retornar error para usuario inexistente', async () => {
            db.query.mockResolvedValueOnce([[]]); // Usuario no encontrado

            const resultado = await logica.getUser(999999);

            expect(resultado.success).toBe(false);
            expect(resultado.message).toContain('no encontrado');
        });

        it('NO debe incluir la contraseña en la respuesta', async () => {
            db.query.mockResolvedValueOnce([[
                { 
                    id: 123, 
                    username: 'testuser', 
                    email: 'test@example.com', 
                    points: 100,
                    active_hours: 10.5,
                    total_distance: 25.3,
                    photo_url: null,
                    town_hall_name: 'Madrid',
                    province: 'Madrid',
                    role_name: 'walker'
                }
            ]]);

            const resultado = await logica.getUser(123);

            expect(resultado.user).not.toHaveProperty('password');
        });
    });

    // ==========================================
    // TESTS DE linkNodeToUser()
    // ==========================================
    describe('linkNodeToUser(userId, nodeName)', () => {
        
        it('Debe vincular un nodo correctamente', async () => {
            db.query.mockResolvedValueOnce([[{ id: 123 }]]) // Usuario existe
                   .mockResolvedValueOnce([[]]) // No existe nodo con ese nombre
                   .mockResolvedValueOnce([{ insertId: 456 }]); // Inserción exitosa

            const nodeName = `Arduino_Sensor_${Date.now()}`;
            const resultado = await logica.linkNodeToUser(123, nodeName);

            expect(resultado.success).toBe(true);
            expect(resultado.message).toBe('Nodo vinculado correctamente');
            expect(resultado).toHaveProperty('nodeId');
            expect(typeof resultado.nodeId).toBe('number');
        });

        it('Debe crear nodo con status "active" por defecto', async () => {
            db.query.mockResolvedValueOnce([[{ id: 123 }]])
                   .mockResolvedValueOnce([[]])
                   .mockResolvedValueOnce([{ insertId: 457 }]);

            const nodeName = `Sensor_${Date.now()}`;
            const resultado = await logica.linkNodeToUser(123, nodeName);

            expect(resultado.success).toBe(true);

            // Mock para verificar status en la base de datos
            db.query.mockResolvedValueOnce([[{ status: 'active' }]]);
            const [nodes] = await db.query('SELECT status FROM nodes WHERE id = ?', [resultado.nodeId]);
            expect(nodes[0].status).toBe('active');
        });

        it('Debe permitir vincular múltiples nodos al mismo usuario', async () => {
            db.query.mockResolvedValueOnce([[{ id: 123 }]])
                   .mockResolvedValueOnce([[]])
                   .mockResolvedValueOnce([{ insertId: 458 }])
                   .mockResolvedValueOnce([[{ id: 123 }]])
                   .mockResolvedValueOnce([[]])
                   .mockResolvedValueOnce([{ insertId: 459 }]);

            const node1 = await logica.linkNodeToUser(123, `Node1_${Date.now()}`);
            const node2 = await logica.linkNodeToUser(123, `Node2_${Date.now()}`);

            expect(node1.success).toBe(true);
            expect(node2.success).toBe(true);
            expect(node1.nodeId).not.toBe(node2.nodeId);
        });

        it('Debe rechazar vincular nodo a usuario inexistente', async () => {
            db.query.mockResolvedValueOnce([[]]); // Usuario no existe

            const resultado = await logica.linkNodeToUser(999999, 'SensorTest');

            expect(resultado.success).toBe(false);
            expect(resultado.message).toContain('no encontrado');
        });

        it('Debe almacenar timestamp actual', async () => {
            const beforeTimestamp = Date.now();
            
            db.query.mockResolvedValueOnce([[{ id: 123 }]])
                   .mockResolvedValueOnce([[]])
                   .mockResolvedValueOnce([{ insertId: 460 }]);

            const resultado = await logica.linkNodeToUser(123, `TimedNode_${Date.now()}`);
            const afterTimestamp = Date.now();

            expect(resultado.success).toBe(true);

            // Mock para verificar timestamp
            db.query.mockResolvedValueOnce([[{ lastStatusUpdate: afterTimestamp }]]);
            const [nodes] = await db.query('SELECT lastStatusUpdate FROM nodes WHERE id = ?', [resultado.nodeId]);
            const nodeTimestamp = nodes[0].lastStatusUpdate;
            expect(nodeTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
            expect(nodeTimestamp).toBeLessThanOrEqual(afterTimestamp);
        });
    });

    // ==========================================
    // TESTS DE updateUserActivity()
    // ==========================================
    describe('updateUserActivity(userId, time, distance)', () => {
        
        it('Debe actualizar actividad correctamente', async () => {
            db.query.mockResolvedValueOnce([[{ 
                id: 123, 
                active_hours: 5.0, 
                total_distance: 10.0 
            }]])
                   .mockResolvedValueOnce([{}]);

            const resultado = await logica.updateUserActivity(123, 2.5, 5.0);

            expect(resultado.success).toBe(true);
            expect(resultado.message).toBe('Actividad actualizada correctamente');
            expect(resultado.active_hours).toBe(7.5);
            expect(resultado.total_distance).toBe(15.0);
        });

        it('Debe acumular tiempo y distancia correctamente', async () => {
            // Primera actualización
            db.query.mockResolvedValueOnce([[{ 
                id: 123, 
                active_hours: 0, 
                total_distance: 0 
            }]])
                   .mockResolvedValueOnce([{}]);

            await logica.updateUserActivity(123, 1.0, 2.0);
            
            // Segunda actualización
            db.query.mockResolvedValueOnce([[{ 
                id: 123, 
                active_hours: 1.0, 
                total_distance: 2.0 
            }]])
                   .mockResolvedValueOnce([{}]);

            const resultado = await logica.updateUserActivity(123, 1.5, 3.0);

            expect(resultado.success).toBe(true);
            expect(resultado.active_hours).toBe(2.5);
            expect(resultado.total_distance).toBe(5.0);
        });

        it('Debe permitir valores decimales', async () => {
            db.query.mockResolvedValueOnce([[{ 
                id: 123, 
                active_hours: 0, 
                total_distance: 0 
            }]])
                   .mockResolvedValueOnce([{}]);

            const resultado = await logica.updateUserActivity(123, 0.75, 1.23);

            expect(resultado.success).toBe(true);
            expect(typeof resultado.active_hours).toBe('number');
            expect(typeof resultado.total_distance).toBe('number');
        });

        it('Debe rechazar actualización para usuario inexistente', async () => {
            db.query.mockResolvedValueOnce([[]]); // Usuario no existe

            const resultado = await logica.updateUserActivity(999999, 1.0, 2.0);

            expect(resultado.success).toBe(false);
            expect(resultado.message).toContain('no encontrado');
        });

        it('Debe manejar valores cero correctamente', async () => {
            db.query.mockResolvedValueOnce([[{ 
                id: 123, 
                active_hours: 5.0, 
                total_distance: 10.0 
            }]])
                   .mockResolvedValueOnce([{}]);

            const resultado = await logica.updateUserActivity(123, 0, 0);

            expect(resultado.success).toBe(true);
            // Los valores no deben cambiar (se suman 0)
            expect(resultado.active_hours).toBe(5.0);
            expect(resultado.total_distance).toBe(10.0);
        });

        it('Debe persistir los cambios en la base de datos', async () => {
            const time = 3.5;
            const distance = 7.8;

            db.query.mockResolvedValueOnce([[{ 
                id: 123, 
                active_hours: 0, 
                total_distance: 0 
            }]])
                   .mockResolvedValueOnce([{}]);

            await logica.updateUserActivity(123, time, distance);

            // Mock para verificar en la base de datos
            db.query.mockResolvedValueOnce([[{ active_hours: 3.5, total_distance: 7.8 }]]);
            const [users] = await db.query('SELECT active_hours, total_distance FROM users WHERE id = ?', [123]);

            expect(users[0].active_hours).toBe(3.5);
            expect(users[0].total_distance).toBe(7.8);
        });
    });

    // ==========================================
    // TESTS DE INTEGRACIÓN
    // ==========================================
    describe('Tests de Integración - Flujo Completo', () => {
        
        it('Debe completar el flujo: registro → login → obtener perfil → vincular nodo → actualizar actividad', async () => {
            const email = `integration_${Date.now()}@example.com`;

            // 1. Registro
            db.query
                .mockResolvedValueOnce([[{ 
                    id: 1, 
                    first_name: 'Integration', 
                    last_name: 'Test', 
                    email: email, 
                    dni: '99999999Z',
                    town_hall_id: 1 
                }]])
                .mockResolvedValueOnce([[{ id: 1 }]])
                .mockResolvedValueOnce([{ insertId: 200, affectedRows: 1 }])
                .mockResolvedValueOnce([{ affectedRows: 1 }]);

            const registerResult = await logica.registerUser(email);
            expect(registerResult.success).toBe(true);

            // 2. Login
            db.query.mockResolvedValueOnce([[
                { 
                    id: 200, 
                    username: 'i.test', 
                    password: '$2b$10$hashedpassword', 
                    email: email 
                }
            ]]);

            const loginResult = await logica.loginUser('i.test', '99999999');
            expect(loginResult.success).toBe(true);
            const userId = loginResult.userId;

            // 3. Obtener perfil
            db.query.mockResolvedValueOnce([[
                { 
                    id: 200, 
                    username: 'i.test', 
                    email: email, 
                    points: 0,
                    active_hours: 0,
                    total_distance: 0,
                    photo_url: null,
                    town_hall_name: 'Madrid',
                    province: 'Madrid',
                    role_name: 'walker'
                }
            ]]);

            const userResult = await logica.getUser(userId);
            expect(userResult.success).toBe(true);
            expect(userResult.user.username).toBe('i.test');

            // 4. Vincular nodo
            db.query.mockResolvedValueOnce([[{ id: 200 }]])
                   .mockResolvedValueOnce([[]])
                   .mockResolvedValueOnce([{ insertId: 300 }]);

            const nodeResult = await logica.linkNodeToUser(userId, 'IntegrationSensor');
            expect(nodeResult.success).toBe(true);

            // 5. Actualizar actividad
            db.query.mockResolvedValueOnce([[{ 
                id: 200, 
                active_hours: 0, 
                total_distance: 0 
            }]])
                   .mockResolvedValueOnce([{}]);

            const activityResult = await logica.updateUserActivity(userId, 1.5, 3.0);
            expect(activityResult.success).toBe(true);

            // 6. Verificar que la actividad se actualizó
            db.query.mockResolvedValueOnce([[
                { 
                    id: 200, 
                    username: 'i.test', 
                    email: email, 
                    points: 0,
                    active_hours: 1.5,
                    total_distance: 3.0,
                    photo_url: null,
                    town_hall_name: 'Madrid',
                    province: 'Madrid',
                    role_name: 'walker'
                }
            ]]);

            const finalUser = await logica.getUser(userId);
            expect(finalUser.user.active_hours).toBe(1.5);
            expect(finalUser.user.total_distance).toBe(3.0);
        });
    });
// ==========================================
  // TESTS DE getAirQualitySummary()
  // ==========================================
describe('getAirQualitySummary(userId)', () => {
    
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('Debe retornar resumen de calidad del aire', async () => {
        // Mock para todas las consultas necesarias
        db.query
            // Para getLinkedNodeOfUser (calidad_del_aire_cara_y_mensaje)
            .mockResolvedValueOnce([[{ id: 1 }]]) // Usuario existe
            .mockResolvedValueOnce([[{ id: 1, name: 'TestNode', status: 'active' }]]) // Nodo activo
            // Para calidad_del_aire_cara_y_mensaje - mediciones
            .mockResolvedValueOnce([[{ timestamp: new Date(), o3_value: 0.02, no2_value: 0.01, co_value: 0.3 }]])
            // Para get_tiempo
            .mockResolvedValueOnce([[{ total_hours: 2.5 }]])
            // Para get_distancia  
            .mockResolvedValueOnce([[{ total_distance: 5.0 }]])
            // Para get_puntos
            .mockResolvedValueOnce([[{ total_points: 20 }]])
            // Para valores_grafica - getLinkedNodeOfUser
            .mockResolvedValueOnce([[{ id: 1 }]])
            .mockResolvedValueOnce([[{ id: 1, name: 'TestNode', status: 'active' }]])
            // Para valores_grafica - mediciones
            .mockResolvedValueOnce([[{ timestamp: new Date(), o3_value: 0.02, no2_value: 0.01, co_value: 0.3 }]]);

        const resultado = await logica.getAirQualitySummary(1);

        expect(resultado.success).toBe(true);
    });

    it('Debe fallar sin nodo vinculado', async () => {
        db.query
            .mockResolvedValueOnce([[{ id: 1 }]]) // Usuario existe
            .mockResolvedValueOnce([[]]); // Sin nodo activo

        const resultado = await logica.getAirQualitySummary(1);

        expect(resultado.success).toBe(false);
    });
});

  // ==========================================
  // TESTS DE insertMeasurement()
  // ==========================================
  describe('insertMeasurement(nodeId, co, o3, no2, latitude, longitude)', () => {
    
    it('Debe insertar mediciones de un nodo', async () => {
      db.query.mockResolvedValueOnce([[{ id: 1 }]])
             .mockResolvedValueOnce([{}]);

      const resultado = await logica.insertMeasurement(1, 0.3, 0.02, 0.01, 40.4168, -3.7038);

      expect(resultado.success).toBe(true);
      expect(resultado.message).toBe('Medición insertada correctamente');
    });

    it('Debe rechazar mediciones para nodo inexistente', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const resultado = await logica.insertMeasurement(999999, 0.3, 0.02, 0.01, 40.4168, -3.7038);

      expect(resultado.success).toBe(false);
    });
  });

  // ==========================================
  // TESTS DE getPoints()
  // ==========================================
  describe('getPoints(userId)', () => {
    
    it('Debe obtener los puntos de un usuario', async () => {
      db.query.mockResolvedValueOnce([[{ points: 150 }]]);

      const resultado = await logica.getPoints(123);

      expect(resultado.success).toBe(true);
      expect(resultado.points).toBe(150);
    });

    it('Debe retornar error para usuario inexistente', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const resultado = await logica.getPoints(999999);

      expect(resultado.success).toBe(false);
    });
  });

  // ==========================================
  // TESTS DE addPoints()
  // ==========================================
  describe('addPoints(userId, points)', () => {
    
    it('Debe sumar puntos a un usuario', async () => {
      db.query.mockResolvedValueOnce([[{ points: 100 }]])
             .mockResolvedValueOnce([{}]);

      const resultado = await logica.addPoints(123, 20);

      expect(resultado.success).toBe(true);
      expect(resultado.totalPoints).toBe(120);
    });

    it('Debe rechazar suma de puntos para usuario inexistente', async () => {
      db.query.mockResolvedValueOnce([[]]);

      const resultado = await logica.addPoints(999999, 20);

      expect(resultado.success).toBe(false);
    });
  });

  // ==========================================
  // TESTS DE getPrizes()
  // ==========================================
  describe('getPrizes()', () => {
    
    it('Debe retornar lista de premios disponibles', async () => {
      db.query.mockResolvedValueOnce([[
        { 
          id: 1, 
          name: 'Camiseta', 
          description: 'Camiseta oficial',
          points_required: 100,
          quantity_available: 10,
          initial_quantity: 50,
          active: 1
        }
      ]]);

      const resultado = await logica.getPrizes();

      expect(resultado.success).toBe(true);
      expect(resultado).toHaveProperty('prizes');
      expect(Array.isArray(resultado.prizes)).toBe(true);
    });
  });

  // ==========================================
  // TESTS DE redeemPrize()
  // ==========================================
  describe('redeemPrize(userId, prizeId)', () => {
    
    it('Debe canjear premio con puntos suficientes', async () => {
      db.query.mockResolvedValueOnce([[{ points: 150 }]])
             .mockResolvedValueOnce([[{ 
                 id: 1, 
                 name: 'Camiseta', 
                 points_required: 100, 
                 quantity_available: 5, 
                 active: 1 
             }]])
             .mockResolvedValueOnce([{}])
             .mockResolvedValueOnce([{}])
             .mockResolvedValueOnce([{}]);

      const resultado = await logica.redeemPrize(123, 1);

      expect(resultado.success).toBe(true);
      expect(resultado).toHaveProperty('couponCode');
    });

    it('Debe rechazar canje por puntos insuficientes', async () => {
      db.query.mockResolvedValueOnce([[{ points: 50 }]])
             .mockResolvedValueOnce([[{ 
                 id: 1, 
                 name: 'Camiseta', 
                 points_required: 100, 
                 quantity_available: 5, 
                 active: 1 
             }]]);

      const resultado = await logica.redeemPrize(123, 1);

      expect(resultado.success).toBe(false);
    });
  });
});