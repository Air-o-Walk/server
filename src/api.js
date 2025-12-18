require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logica = require('./logica');
/*const FileLogger = require('./logger');
// Activa el logger
new FileLogger('mi_log.txt');*/
const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
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
            'DELETE /application/:applicationId': 'Borra solicitud',
			'GET /informeNodos/': 'Estado nodos'
        }
    });
});

/**
 * POST /register
 * Registrar un nuevo usuario
 * Body: {email}
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
 * POST /recover
 * Recuperación de contraseña: genera una temporal y la envía por email
 */
app.post('/recover', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Falta el email"
            });
        }

        const resultado = await logica.recoverPassword(email);

        if (resultado.success) {
            return res.status(200).json(resultado);
        } else {
            return res.status(400).json(resultado);
        }

    } catch (error) {
        console.error("Error en /recover:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor"
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
 * GET /node/ofUser/:userId
 * Hecho por Meryame Ait Boumlik
 * Devuelve el nodo vinculado de un usuario (si existe)
 */
app.get('/node/ofUser/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const resultado = await logica.getLinkedNodeOfUser(userId);

        // Siempre 200 porque no es un error funcional
        return res.status(200).json(resultado);

    } catch (error) {
        console.error('Error en /node/ofUser/:userId:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * DELETE /node/ofUser/:userId
 * Hecho por Meryame Ait Boumlik
 * Desvincula el nodo del usuario (si existe)
 */
app.delete('/node/ofUser/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        console.log(" DELETE RECEIVED for userId =", userId); 

        const resultado = await logica.unlinkNodeFromUser(userId);

        return res.status(200).json(resultado);

    } catch (error) {
        console.error('Error en DELETE /node/ofUser/:userId:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});
/**
 * GET /usuario/calidad-aire-resumen
 * Hecho por Meryame Ait Boumlik
 * Query: userId
 * Devuelve estado, mensaje, tiempo, distancia, puntos y datos de gráfica
 */
app.get('/usuario/calidad-aire-resumen', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Falta parámetro obligatorio: userId'
            });
        }

        const resultado = await logica.getAirQualitySummary(userId);

        const statusCode = resultado.success ? 200 : 404;
        return res.status(statusCode).json(resultado);

    } catch (error) {
        console.error('Error en GET /usuario/calidad-aire-resumen:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});
/**
 * POST /measurements
 * Hecho por Meryame Ait Boumlik
 * Body: { nodeId, co, o3, no2, latitude, longitude }
 */
app.post('/measurements', async (req, res) => {
    try {
        const { nodeId, co, o3, no2, latitude, longitude } = req.body;

        if (!nodeId || co === undefined || o3 === undefined || no2 === undefined) {
            return res.status(400).json({
                success: false,
                message: "Faltan campos obligatorios: nodeId, co, o3, no2"
            });
        }

        const resultado = await logica.insertMeasurement(
            nodeId, co, o3, no2, latitude || null, longitude || null
        );

        const statusCode = resultado.success ? 201 : 400;
        return res.status(statusCode).json(resultado);

    } catch (error) {
        console.error("Error en POST /measurements:", error);
        return res.status(500).json({ success: false, message: "Error interno" });
    }
});
/**
 * POST /user/daily-stats
 * Hecho por Meryame Ait Boumlik
 * Inserta en daily_stats:
 *  - active_hours
 *  - distance
 *  - points
 * Se usa para registrar el resultado de un recorrido.
 */
app.post('/user/daily-stats', async (req, res) => {
    try {
        const { userId, activeHours, distance, points } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "Falta userId"
            });
        }

        const resultado = await logica.addDailyStats(
            userId,
            activeHours || 0,
            distance || 0,
            points || 0
        );

        return res.status(resultado.success ? 200 : 400).json(resultado);

    } catch (error) {
        console.error("Error en POST /user/daily-stats:", error);
        return res.status(500).json({
            success: false,
            message: "Error interno del servidor"
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
            res.status(200).json(resultado.data);
            //Paso solo el objeto, no el success(V/F)
        } else {
            res.status(404).json(resultado);
        }
    } catch (error) {
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

/**
 * GET /puntos
 * Obtiene los puntos totales de un usuario
 * Query: userId
 */
app.get('/points/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Falta parámetro obligatorio: userId'
            });
        }
        
        const resultado = await logica.getPoints(userId);
        
        const statusCode = resultado.success ? 200 : 404;
        return res.status(statusCode).json(resultado);
        
    } catch (error) {
        console.error('Error en GET /points:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});


/**
 * PUT /puntos
 * Suma puntos al total de un usuario
 * Body: { userId, points }
 */
app.put('/points', async (req, res) => {
    try {
        const { userId, points } = req.body;

        if (!userId || points === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios: userId, points'
            });
        }

        // Validar que points sea un número positivo
        if (typeof points !== 'number' || points < 0) {
            return res.status(400).json({
                success: false,
                message: 'El campo points debe ser un número positivo'
            });
        }

        const resultado = await logica.addPoints(userId, points);

        const statusCode = resultado.success ? 200 : 404;
        return res.status(statusCode).json(resultado);

    } catch (error) {
        console.error('Error en PUT /puntos:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * Hecho por Maria Algora
 * GET /informeNodos/todos → Todos los nodos
GET /informeNodos/inactivos → Nodos inactivos >24h
GET /informeNodos/erroneos → Nodos con lecturas erróneas
 * Obtener información de los nodos
 * Params: {todos, inactivos, erroneos}
 */
app.get('/informeNodos/:tipo', async (req, res) => {
    try {
        const { tipo } = req.params;
        const resultado = await logica.getNodos(tipo);

        if (resultado.success) {
            res.status(200).json(resultado);
        } else {
            res.status(404).json(resultado);
        }

    } catch (error) {
        console.error('Error en /informeNodos', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});


/**
 * PUT /user/:userId
 * Actualiza pedil
 * Params: userId
 */
app.put('/user/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const updateData = req.body;

        const result = await logica.updateUser(userId, updateData);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: result.user
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('Error en PUT /users/:userId:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * GET /prizes
 * Obtiene todos los premios activos disponibles
 */
app.get('/prizes', async (req, res) => {
    try {
        console.log('GET /prizes - Obteniendo premios disponibles');
        
        const resultado = await logica.getPrizes();

        const statusCode = resultado.success ? 200 : 500;
        return res.status(statusCode).json(resultado);

    } catch (error) {
        console.error('Error en GET /prizes:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * POST /redeem
 * Canjea puntos por un premio
 * Body: { userId, prizeId }
 */
app.post('/redeem', async (req, res) => {
    try {
        console.log('POST /redeem - Recibida solicitud de canje');
        console.log('Body:', req.body);
        
        const { userId, prizeId } = req.body;

        // Validar campos obligatorios
        if (!userId || !prizeId) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios: userId, prizeId'
            });
        }

        // Validar que sean números
        if (isNaN(userId) || isNaN(prizeId)) {
            return res.status(400).json({
                success: false,
                message: 'userId y prizeId deben ser números válidos'
            });
        }

        const resultado = await logica.redeemPrize(userId, prizeId);

        const statusCode = resultado.success ? 200 : 400;
        return res.status(statusCode).json(resultado);

    } catch (error) {
        console.error('Error en POST /redeem:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * GET /redemptions/:userId
 * Obtiene el historial de canjes de un usuario
 * Params: userId
 */
app.get('/redemptions/:userId', async (req, res) => {
    try {
        console.log('GET /redemptions/:userId - Obteniendo historial');
        
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Falta parámetro obligatorio: userId'
            });
        }

        const resultado = await logica.getRedemptionHistory(userId);

        const statusCode = resultado.success ? 200 : 404;
        return res.status(statusCode).json(resultado);

    } catch (error) {
        console.error('Error en GET /redemptions/:userId:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});


/**

 * GET /measurements
 * Obtiene las medidas
 * Params: userId
 */
app.get('/measurements', async (req, res) => {
    try {
        console.log('GET /redemptions - Obteniendo mediciones');

        const resultado = await logica.getMeasurements();

        const statusCode = resultado.success ? 200 : 404;
        return res.status(statusCode).json(resultado);

    } catch (error) {
        console.error('Error en GET /measurements', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

/**
 * POST /measurements
 * Vincular un nodo a un usuario
 * Body: { userId, nodeName }
 */
app.post('/measurements/fake', async (req, res) => {
    try {
        const { number } = req.body;

        // Validar que todos los campos estén presentes
        if (!number) {
            return res.status(400).json({
                success: false,
                message: 'Faltan campos obligatorios: number'
            });
        }

        const resultado = await logica.generateFakeMeasurements(number);

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

// GET /measurements/closest/:latitude/:longitude
// hecho por Maria
// params: latitude, longitude
app.get('/measurements/closest/:latitude/:longitude', async (req, res) => {
    try {
        const { latitude, longitude } = req.params; 
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        
        if (isNaN(lat) || isNaN(lon)) {
            return res.status(400).json({ success: false, message: "Coordenadas inválidas" });
        }

        const result = await logica.getNearestMeasurement(lat, lon);

        if (!result.success) {
            return res.status(404).json({ success: false, message: result.message });
        }

        return res.status(200).json({
            success: true,
            data: result.data
        });
    } catch (error) {
        console.error("Error en GET /measurements/closest:", error);
        return res.status(500).json({ success: false, message: "Error interno" });
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