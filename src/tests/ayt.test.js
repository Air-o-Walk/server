const request = require('supertest');
const app = require('../api'); // Tu app principal
const logica = require('../logica');

// Mock de la lógica
jest.mock('../logica', () => ({
    getAyuntamientos: jest.fn(),
    // ... otros métodos que uses
    registerUser: jest.fn(),
    loginUser: jest.fn(),
    apply: jest.fn(),
    deleteApplication: jest.fn()
}));

describe('GET /getAyuntamientos', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('debería devolver una lista de ayuntamientos con status 200 si la lógica es correcta', async () => {
        const mockData = [
            { id: '1', name: 'Ayuntamiento 1' },
            { id: '2', name: 'Ayuntamiento 2' }
        ];

        const mockResponse = {
            success: true,
            data: mockData
        };

        logica.getAyuntamientos.mockResolvedValue(mockResponse);

        const response = await request(app).get('/getAyuntamientos');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            data: mockData
        });
    });

    it('debería devolver un error 404 si no se encuentran ayuntamientos', async () => {
        const mockErrorResponse = {
            success: false,
            message: 'No se encontraron ayuntamientos'
        };

        logica.getAyuntamientos.mockResolvedValue(mockErrorResponse);

        const response = await request(app).get('/getAyuntamientos');

        expect(response.status).toBe(404);
        expect(response.body).toEqual(mockErrorResponse);
    });

    it('debería devolver un error 500 si hay un error en el servidor', async () => {
        logica.getAyuntamientos.mockRejectedValue(new Error('Error de base de datos'));

        const response = await request(app).get('/getAyuntamientos');

        expect(response.status).toBe(500);
        expect(response.body).toEqual({
            success: false,
            message: 'Error interno del servidor'
        });
    });
});

// Test para verificar que el endpoint existe
describe('Verificación de rutas', () => {
    it('debería encontrar la ruta /getAyuntamientos', async () => {
        const response = await request(app).get('/getAyuntamientos');
        // No debería devolver 404
        expect(response.status).not.toBe(404);
        expect(response.body.message).not.toBe('Endpoint no encontrado');
    });
});