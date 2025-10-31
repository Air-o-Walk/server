const request = require('supertest');
const express = require('express');
const apiLogin = require('../apiLogin');

// Mock de la función de base de datos - simula LogicaLogin para no usar la base de datos real
jest.mock('../LogicaLogin', () => ({
    buscarUsuarioPorUsername: jest.fn()
}));

const { buscarUsuarioPorUsername } = require('../LogicaLogin');

// Configurar app de Express para testing
const app = express();
app.use(express.json());
app.use('/api', apiLogin);

// Grupo de tests para el endpoint de login
describe('GET /api/login', () => {
    
    // Limpiar todos los mocks antes de cada test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Test 1: Login exitoso cuando las credenciales son correctas
    test('login exitoso con credenciales válidas', async () => {
        // Simular que la base de datos devuelve un usuario válido
        buscarUsuarioPorUsername.mockResolvedValue({
            id: 1,
            username: 'testuser',
            password: 'testpass',
            active: true
        });

        // Hacer petición GET con parámetros en la URL
        const response = await request(app)
            .get('/api/login')
            .query({
                usuario: 'testuser',      // parámetro usuario
                contrasena: 'testpass'    // parámetro contrasena
            });

        // Verificar que responde con éxito
        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            message: 'Login exitoso'
        });
    });

    // Test 2: Login falla cuando el usuario no existe
    test('login falla con usuario incorrecto', async () => {
        // Simular que la base de datos NO encuentra el usuario
        buscarUsuarioPorUsername.mockResolvedValue(null);

        const response = await request(app)
            .get('/api/login')
            .query({
                usuario: 'usuarioinexistente',
                contrasena: 'cualquierpass'
            });

        // Verificar que responde con error de autenticación
        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            success: false,
            error: 'Credenciales inválidas'
        });
    });

    // Test 3: Login falla cuando la contraseña es incorrecta
    test('login falla con contraseña incorrecta', async () => {
        // Simular usuario válido pero contraseña diferente
        buscarUsuarioPorUsername.mockResolvedValue({
            id: 1,
            username: 'testuser',
            password: 'passwordcorrecta', // contraseña en BD
            active: true
        });

        const response = await request(app)
            .get('/api/login')
            .query({
                usuario: 'testuser',
                contrasena: 'passwordincorrecta' // contraseña incorrecta
            });

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            success: false,
            error: 'Credenciales inválidas'
        });
    });

    // Test 4: Login falla cuando falta el parámetro usuario
    test('login falla sin usuario', async () => {
        const response = await request(app)
            .get('/api/login')
            .query({
                contrasena: 'testpass' // solo contraseña, falta usuario
            });

        expect(response.status).toBe(401);
    });

    // Test 5: Login falla cuando falta el parámetro contrasena
    test('login falla sin contrasena', async () => {
        const response = await request(app)
            .get('/api/login')
            .query({
                usuario: 'testuser' // solo usuario, falta contraseña
            });

        expect(response.status).toBe(401);
    });

    // Test 6: Login falla cuando hay error en la base de datos
    test('error de servidor en la base de datos', async () => {
        // Simular error en la base de datos
        buscarUsuarioPorUsername.mockRejectedValue(new Error('Error de conexión'));

        const response = await request(app)
            .get('/api/login')
            .query({
                usuario: 'testuser',
                contrasena: 'testpass'
            });

        // Verificar que responde con error interno del servidor
        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            success: false,
            error: 'Error interno del servidor'
        });
    });
});