require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logica = require('./logica');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de bienvenida
app.get('/', (req, res) => {
    res.json({
        message: 'API de Monitoreo Ambiental',
        version: '1.0.0',
        endpoints: {
            'POST /register': 'Registrar nuevo usuario',
            'POST /login': 'Iniciar sesión',
            'GET /user/:userId': 'Obtener información de usuario',
            'POST /node/link': 'Vincular nodo a usuario',
            'PUT /user/activity': 'Actualizar actividad de usuario',
            'GET /getAyuntamientos': 'Lista de ayuntamientos',
            'POST /apply': 'Crear solicitud',
            'DELETE /application/:applicationId': 'Borra solicitud'
        }
    });
});

/**
 * POST /register
 * Registrar un nuevo usuario
 * Body: {}
 */
app.post('/register', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios: email'
            });
        }

        const resultado = await logica.registerUser(email);

        if (resultado.success) {
            res.status(201).json(resultado);
        } else {
            res.status(400).json(resultado);
        }

    } catch (error) {
        console.error('Error en /register:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * POST /login
 * Iniciar sesión
 * Body: { email, password }
 */
app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validar que todos los campos estén presentes
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios: email, password'
            });
        }

        const resultado = await logica.loginUser(username, password);

        if (resultado.success) {
            res.status(200).json(resultado);
        } else {
            res.status(401).json(resultado);
        }

    } catch (error) {
        console.error('Error en /login:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * GET /user/:userId
 * Obtener información de un usuario
 * Params: userId
 */
app.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const resultado = await logica.getUser(userId);

        if (resultado.success) {
            res.status(200).json(resultado);
        } else {
            res.status(404).json(resultado);
        }

    } catch (error) {
        console.error('Error en /user/:userId:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * POST /node/link
 * Vincular un nodo a un usuario
 * Body: { userId, nodeName }
 */
app.post('/node/link', async (req, res) => {
    try {
        const { userId, nodeName } = req.body;

        // Validar que todos los campos estén presentes
        if (!userId || !nodeName) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios: userId, nodeName'
            });
        }

        const resultado = await logica.linkNodeToUser(userId, nodeName);

        if (resultado.success) {
            res.status(201).json(resultado);
        } else {
            res.status(404).json(resultado);
        }

    } catch (error) {
        console.error('Error en /node/link:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * PUT /user/activity
 * Actualizar actividad de un usuario
 * Body: { userId, time, distance }
 */
app.put('/user/activity', async (req, res) => {
    try {
        const { userId, time, distance } = req.body;

        // Validar que todos los campos estén presentes
        if (!userId || time === undefined || distance === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios: userId, time, distance'
            });
        }

        const resultado = await logica.updateUserActivity(userId, time, distance);

        if (resultado.success) {
            res.status(200).json(resultado);
        } else {
            res.status(404).json(resultado);
        }

    } catch (error) {
        console.error('Error en /user/activity:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * GET /getAyuntamientos
 * Hecho por Maria Algora
 * Obtener ayuntamientos
 * Body: id, name
 */
app.get('/getAyuntamientos', async (req, res) => {
    try {
        const resultado = await logica.getAyuntamientos();

        if (resultado.success) {
            res.status(200).json({
                success: true,
                data: resultado.data
            });
        } else {
            // Si no se encuentran ayuntamientos o hay error en la lógica
            res.status(404).json({
                success: false,
                message: resultado.message // Usar el mensaje de la lógica
            });
        }
    } catch (error) {
        console.error('Error en /getAyuntamientos:', error);
        // Solo para errores inesperados del servidor
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});



/* POST /apply
*  Hecho por Maria Algora
* Guardar datos del registro antes de crear la cuenta
* Body: firstName, lastName, email, dni, phone, townHallId
*/
app.post('/apply', async (req, res) => {
    try {
        const { firstName, lastName, email, dni, phone, townHallId } = req.body;

        const resultado = await logica.apply({
            firstName, lastName, email, dni, phone, townHallId
        });

        if (resultado.success) {
            res.status(200).json(resultado);
        } else {
            res.status(400).json(resultado);
        }
    } catch (error) {
        console.error('Error en /apply:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * DELETE /application/:applicationId
 * Hecho por Maria Algora
 * Elimina solicitudes por ID
 */
app.delete('/application/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;

        if (!applicationId) {
            return res.status(400).json({ success: false, message: 'Falta applicationId' });
        }

        const deleted = await logica.deleteApplication(applicationId);

        if (deleted) {
            return res.status(200).json({ success: true, message: 'Solicitud eliminada' });
        } else {
            return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
        }
    } catch (error) {
        console.error('Error en DELETE /application/:applicationId:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// Manejador de rutas no encontradas
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado'
    });
});

// NO iniciamos el servidor aquí, solo exportamos la app
// El servidor se inicia en server.js
module.exports = app;