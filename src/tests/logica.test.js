const logica = require('../logica');
const db = require('../config/database');

// Variables globales para los tests
let testUserId;
let testUsername;
let testUserPassword;

describe('Lógica de Negocio - Tests de Funciones', () => {

    // Limpiar datos de test después de todos los tests
    afterAll(async () => {
        // Cerrar conexión a la base de datos
        await db.end();
    });

    // ==========================================
    // TESTS DE registerUser()
    // ==========================================
    describe('registerUser(username, email, password, townHallId)', () => {
        
        it('Debe registrar un nuevo usuario correctamente', async () => {
            const username = `testuser_${Date.now()}`;
            const email = `test_${Date.now()}@example.com`;
            const password = 'securePassword123';
            const townHallId = 1;

            const resultado = await logica.registerUser(username, email, password, townHallId);

            expect(resultado.success).toBe(true);
            expect(resultado.message).toBe('Usuario registrado correctamente');

            // Guardar para tests posteriores
            testUsername = username;
            testUserPassword = password;
        });

        it('Debe rechazar usuario con email duplicado', async () => {
            const username = `user1_${Date.now()}`;
            const email = `duplicate_${Date.now()}@example.com`;
            const password = 'password123';
            const townHallId = 1;

            // Primer registro
            await logica.registerUser(username, email, password, townHallId);

            // Segundo registro con mismo email
            const resultado = await logica.registerUser(
                `user2_${Date.now()}`, 
                email, 
                password, 
                townHallId
            );

            expect(resultado.success).toBe(false);
            expect(resultado.message).toContain('ya existe');
        });

        it('Debe rechazar usuario con username duplicado', async () => {
            const username = `duplicateuser_${Date.now()}`;
            const email1 = `email1_${Date.now()}@example.com`;
            const email2 = `email2_${Date.now()}@example.com`;
            const password = 'password123';
            const townHallId = 1;

            // Primer registro
            await logica.registerUser(username, email1, password, townHallId);

            // Segundo registro con mismo username
            const resultado = await logica.registerUser(username, email2, password, townHallId);

            expect(resultado.success).toBe(false);
            expect(resultado.message).toContain('ya existe');
        });

        it('Debe inicializar puntos, horas y distancia en 0', async () => {
            const username = `newuser_${Date.now()}`;
            const email = `newuser_${Date.now()}@example.com`;
            const password = 'password123';
            const townHallId = 1;

            const registroResult = await logica.registerUser(username, email, password, townHallId);
            expect(registroResult.success).toBe(true);

            // Hacer login para obtener el userId
            const loginResult = await logica.loginUser(username, password);
            const userResult = await logica.getUser(loginResult.userId);

            expect(userResult.user.points).toBe(0);
            expect(userResult.user.active_hours).toBe(0);
            expect(userResult.user.total_distance).toBe(0);
        });

        it('Debe cifrar la contraseña correctamente', async () => {
            const username = `encrypttest_${Date.now()}`;
            const email = `encrypt_${Date.now()}@example.com`;
            const password = 'myPlainPassword';
            const townHallId = 1;

            await logica.registerUser(username, email, password, townHallId);

            // Verificar que se puede hacer login (la contraseña está cifrada correctamente)
            const loginResult = await logica.loginUser(username, password);
            expect(loginResult.success).toBe(true);
        });
    });

    // ==========================================
    // TESTS DE loginUser()
    // ==========================================
    describe('loginUser(username, password)', () => {
        
        beforeAll(async () => {
            // Crear un usuario de prueba
            const username = `logintest_${Date.now()}`;
            const email = `logintest_${Date.now()}@example.com`;
            const password = 'testPassword123';
            await logica.registerUser(username, email, password, 1);
            
            testUsername = username;
            testUserPassword = password;
        });

        it('Debe hacer login correctamente con credenciales válidas', async () => {
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
            const resultado = await logica.loginUser('UsuarioNoExiste', 'password123');

            expect(resultado.success).toBe(false);
            expect(resultado.message).toContain('no encontrado');
        });

        it('Debe rechazar login con contraseña incorrecta', async () => {
            const resultado = await logica.loginUser(testUsername, 'wrongPassword');

            expect(resultado.success).toBe(false);
            expect(resultado.message).toContain('incorrecta');
        });

        it('Debe generar un token JWT válido', async () => {
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
        
        let userId;

        beforeAll(async () => {
            // Crear usuario para tests
            const username = `getuser_${Date.now()}`;
            const email = `getuser_${Date.now()}@example.com`;
            const password = 'password123';
            await logica.registerUser(username, email, password, 1);
            
            const loginResult = await logica.loginUser(username, password);
            userId = loginResult.userId;
        });

        it('Debe obtener información completa del usuario', async () => {
            const resultado = await logica.getUser(userId);

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
            const resultado = await logica.getUser(userId);

            expect(resultado.user.town_hall).toHaveProperty('name');
            expect(resultado.user.town_hall).toHaveProperty('province');
        });

        it('Debe incluir el rol del usuario', async () => {
            const resultado = await logica.getUser(userId);

            expect(resultado.user.role).toBe('walker');
        });

        it('Debe retornar error para usuario inexistente', async () => {
            const resultado = await logica.getUser(999999);

            expect(resultado.success).toBe(false);
            expect(resultado.message).toContain('no encontrado');
        });

        it('NO debe incluir la contraseña en la respuesta', async () => {
            const resultado = await logica.getUser(userId);

            expect(resultado.user).not.toHaveProperty('password');
        });
    });

    // ==========================================
    // TESTS DE linkNodeToUser()
    // ==========================================
    describe('linkNodeToUser(userId, nodeName)', () => {
        
        let userId;

        beforeAll(async () => {
            // Crear usuario para tests
            const username = `nodeuser_${Date.now()}`;
            const email = `nodeuser_${Date.now()}@example.com`;
            const password = 'password123';
            await logica.registerUser(username, email, password, 1);
            
            const loginResult = await logica.loginUser(username, password);
            userId = loginResult.userId;
        });

        it('Debe vincular un nodo correctamente', async () => {
            const nodeName = `Arduino_Sensor_${Date.now()}`;
            const resultado = await logica.linkNodeToUser(userId, nodeName);

            expect(resultado.success).toBe(true);
            expect(resultado.message).toBe('Nodo vinculado correctamente');
            expect(resultado).toHaveProperty('nodeId');
            expect(typeof resultado.nodeId).toBe('number');
        });

        it('Debe crear nodo con status "active" por defecto', async () => {
            const nodeName = `Sensor_${Date.now()}`;
            const resultado = await logica.linkNodeToUser(userId, nodeName);

            expect(resultado.success).toBe(true);

            // Verificar en la base de datos
            const [nodes] = await db.query(
                'SELECT status FROM nodes WHERE id = ?',
                [resultado.nodeId]
            );
            expect(nodes[0].status).toBe('active');
        });

        it('Debe permitir vincular múltiples nodos al mismo usuario', async () => {
            const node1 = await logica.linkNodeToUser(userId, `Node1_${Date.now()}`);
            const node2 = await logica.linkNodeToUser(userId, `Node2_${Date.now()}`);

            expect(node1.success).toBe(true);
            expect(node2.success).toBe(true);
            expect(node1.nodeId).not.toBe(node2.nodeId);
        });

        it('Debe rechazar vincular nodo a usuario inexistente', async () => {
            const resultado = await logica.linkNodeToUser(999999, 'SensorTest');

            expect(resultado.success).toBe(false);
            expect(resultado.message).toContain('no encontrado');
        });

        it('Debe almacenar timestamp actual', async () => {
            const beforeTimestamp = Date.now();
            const resultado = await logica.linkNodeToUser(userId, `TimedNode_${Date.now()}`);
            const afterTimestamp = Date.now();

            expect(resultado.success).toBe(true);

            // Verificar que el timestamp está dentro del rango
            const [nodes] = await db.query(
                'SELECT lastStatusUpdate FROM nodes WHERE id = ?',
                [resultado.nodeId]
            );
            const nodeTimestamp = nodes[0].lastStatusUpdate;
            expect(nodeTimestamp).toBeGreaterThanOrEqual(beforeTimestamp);
            expect(nodeTimestamp).toBeLessThanOrEqual(afterTimestamp);
        });
    });

    // ==========================================
    // TESTS DE updateUserActivity()
    // ==========================================
    describe('updateUserActivity(userId, time, distance)', () => {
        
        let userId;

        beforeAll(async () => {
            // Crear usuario para tests
            const username = `activityuser_${Date.now()}`;
            const email = `activityuser_${Date.now()}@example.com`;
            const password = 'password123';
            await logica.registerUser(username, email, password, 1);
            
            const loginResult = await logica.loginUser(username, password);
            userId = loginResult.userId;
        });

        it('Debe actualizar actividad correctamente', async () => {
            const resultado = await logica.updateUserActivity(userId, 2.5, 5.0);

            expect(resultado.success).toBe(true);
            expect(resultado.message).toBe('Actividad actualizada correctamente');
            expect(resultado.active_hours).toBe(2.5);
            expect(resultado.total_distance).toBe(5.0);
        });

        it('Debe acumular tiempo y distancia correctamente', async () => {
            // Primera actualización
            await logica.updateUserActivity(userId, 1.0, 2.0);
            
            // Segunda actualización
            const resultado = await logica.updateUserActivity(userId, 1.5, 3.0);
			
			//Hay que tomar en cuenta que updateUserActivity siempre suma, y nunca remplaza, enctonces de la parte anterior
			//se suma 2.5 + 1 + 1.5 = 5, y asu vez = 5 + 2 + 3 = 10.
            expect(resultado.success).toBe(true);
            expect(resultado.active_hours).toBe(5.0);
            expect(resultado.total_distance).toBe(10.0);
        });

        it('Debe permitir valores decimales', async () => {
            const resultado = await logica.updateUserActivity(userId, 0.75, 1.23);

            expect(resultado.success).toBe(true);
            expect(typeof resultado.active_hours).toBe('number');
            expect(typeof resultado.total_distance).toBe('number');
        });

        it('Debe rechazar actualización para usuario inexistente', async () => {
            const resultado = await logica.updateUserActivity(999999, 1.0, 2.0);

            expect(resultado.success).toBe(false);
            expect(resultado.message).toContain('no encontrado');
        });

        it('Debe manejar valores cero correctamente', async () => {
            const resultado = await logica.updateUserActivity(userId, 0, 0);

            expect(resultado.success).toBe(true);
            // Los valores no deben cambiar
        });

        it('Debe persistir los cambios en la base de datos', async () => {
            const time = 3.5;
            const distance = 7.8;

            await logica.updateUserActivity(userId, time, distance);

            // Verificar directamente en la base de datos
            const [users] = await db.query(
                'SELECT active_hours, total_distance FROM users WHERE id = ?',
                [userId]
            );

            expect(users[0].active_hours).toBeGreaterThanOrEqual(time);
            expect(users[0].total_distance).toBeGreaterThanOrEqual(distance);
        });
    });

    // ==========================================
    // TESTS DE INTEGRACIÓN
    // ==========================================
    describe('Tests de Integración - Flujo Completo', () => {
        
        it('Debe completar el flujo: registro → login → obtener perfil → vincular nodo → actualizar actividad', async () => {
            // 1. Registro
            const username = `integration_${Date.now()}`;
            const email = `integration_${Date.now()}@example.com`;
            const password = 'password123';
            
            const registerResult = await logica.registerUser(username, email, password, 1);
            expect(registerResult.success).toBe(true);

            // 2. Login
            const loginResult = await logica.loginUser(username, password);
            expect(loginResult.success).toBe(true);
            const userId = loginResult.userId;

            // 3. Obtener perfil
            const userResult = await logica.getUser(userId);
            expect(userResult.success).toBe(true);
            expect(userResult.user.username).toBe(username);

            // 4. Vincular nodo
            const nodeResult = await logica.linkNodeToUser(userId, 'IntegrationSensor');
            expect(nodeResult.success).toBe(true);

            // 5. Actualizar actividad
            const activityResult = await logica.updateUserActivity(userId, 1.5, 3.0);
            expect(activityResult.success).toBe(true);

            // 6. Verificar que la actividad se actualizó
            const finalUser = await logica.getUser(userId);
            expect(finalUser.user.active_hours).toBe(1.5);
            expect(finalUser.user.total_distance).toBe(3.0);
        });
    });
});