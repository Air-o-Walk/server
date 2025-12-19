/**
 * @file api.js
 * @description API principal de Monitoreo Ambiental. 
 * Proporciona endpoints REST para gestión de usuarios, nodos, mediciones, premios y canjes.
 * 
 * Características principales:
 * - Registro, logsin y recuperación de contraseña de usuarios.
 * - Vinculación y gestión de nodos a usuarios.
 * - Inserción y consulta de mediciones ambientales.
 * - Gestión de puntos y canje de premios.
 * - Consultas de historial de canjes y resumen de calidad de aire.
 * 
 * @author Maria Algora
 * @author Meryame Ait Boumlik
 * @author Santiago Aguirre
 * @author Christopher Yoris
 * 
 * @version 1.0.0
 * @since 2025-12-19
 */


require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logica = require('./logica');
/*const FileLogger = require('./logger');
// Activa el logger
new FileLogger('mi_log.txt');*/
const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Middlewares principales de la API.
 * 
 * - CORS: permite solicitudes desde cualquier origen con métodos GET, POST, PUT, DELETE
 *   y cabeceras 'Content-Type' y 'Authorization'.
 * - express.json(): parsea el body de las solicitudes con formato JSON.
 * - express.urlencoded(): parsea el body de las solicitudes con formato URL-encoded.
 * 
 * @module middlewares
 */app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Ruta raíz de la API.
 * 
 * Devuelve un mensaje de bienvenida, la versión de la API y un resumen de los endpoints disponibles.
 * 
 * @name GET /
 * @function
 * @returns {Object} JSON con la información de la API y sus endpoints.
 * @returns {string} return.message - Mensaje de bienvenida.
 * @returns {string} return.version - Versión de la API.
 * @returns {Object.<string, string>} return.endpoints - Lista de endpoints y su descripción.
 */
app.get('/', (req, res) => {
    res.json({
        message: 'API de Monitoreo Ambiental',
        version: '1.0.0',
        endpoints: {
            'POST /register': 'Registrar nuevo usuario',
            'POST /login': 'Iniciar sesión',
            'POST /recover': 'Recuperar contraseña',
            'GET /user/:userId': 'Obtener información de usuario',
            'POST /node/link': 'Vincular nodo a usuario',
            'PUT /user/activity': 'Actualizar actividad del usuario',
            'GET /node/ofUser/:userId': 'Obtener nodo vinculado de un usuario',
            'DELETE /node/ofUser/:userId': 'Desvincular nodo del usuario',
            'GET /usuario/calidad-aire-resumen': 'Resumen de calidad del aire para un usuario',
            'POST /measurements': 'Insertar nueva medición',
            'POST /user/daily-stats': 'Añadir estadísticas diarias de usuario',
            'GET /getAyuntamientos': 'Obtener lista de ayuntamientos',
            'POST /apply': 'Crear solicitud de registro',
            'DELETE /application/:applicationId': 'Eliminar solicitud por ID',
            'GET /points/:userId': 'Obtener puntos totales de un usuario',
            'PUT /points': 'Añadir puntos a un usuario',
            'GET /informeNodos/:tipo': 'Obtener informe de nodos (todos/inactivos/erróneos)',
            'PUT /user/:userId': 'Actualizar perfil de usuario',
            'GET /prizes': 'Obtener premios activos disponibles',
            'POST /redeem': 'Canjear puntos por un premio',
            'GET /redemptions/:userId': 'Historial de canjes de usuario',
            'GET /measurements': 'Obtener todas las mediciones',
            'POST /measurements/fake': 'Generar mediciones falsas',
            'GET /measurements/closest/:latitude/:longitude': 'Obtener medición más cercana'
        }
    });
});

/**
 * Registrar un nuevo usuario.
 * 
 * Endpoint para crear un usuario a partir de un correo electrónico.
 * Valida que se envíe el campo obligatorio `email` y devuelve el resultado de la operación.
 * 
 * @name POST /register
 * @function
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {string} req.body.email - Correo electrónico del nuevo usuario.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si el registro fue exitoso.
 * @returns {string} return.message - Mensaje descriptivo del resultado.
 *
 * @author Maria Algora
 * @author Santiago Aguirre
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
 * Iniciar sesión de un usuario.
 * 
 * Endpoint para autenticar un usuario mediante su nombre de usuario y contraseña.
 * Valida que se envíen los campos obligatorios y devuelve el resultado de la autenticación.
 * 
 * @name POST /login
 * @function
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {string} req.body.username - Nombre de usuario o email.
 * @param {string} req.body.password - Contraseña del usuario.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si la autenticación fue exitosa.
 * @returns {string} return.message - Mensaje descriptivo del resultado.
 * 
 * @author Maria Algora
 * @author Santiago Aguirre
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
 * Recuperación de contraseña de un usuario.
 * 
 * Endpoint que permite generar una contraseña temporal y enviarla por correo electrónico.
 * Por motivos de seguridad, siempre devuelve `success: true` aunque el email no exista.
 * 
 * @name POST /recover
 * @function
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {string} req.body.email - Correo electrónico del usuario.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si la operación se realizó correctamente.
 * @returns {string} return.message - Mensaje descriptivo del resultado.
 * 
 * @author Christopher Yoris
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
 * Obtener información de un usuario por su ID.
 * 
 * Endpoint que devuelve los datos de un usuario específico.
 * 
 * @name GET /user/:userId
 * @function
 * @param {Object} req.params - Parámetros de la URL.
 * @param {number|string} req.params.userId - ID del usuario a consultar.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si la operación fue exitosa.
 * @returns {Object} [return.data] - Información del usuario (si success es true).
 * @returns {string} [return.message] - Mensaje descriptivo en caso de error.
 * 
 * @author Santiago Aguirre
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
 * Vincula un nodo a un usuario específico.
 * 
 * Endpoint que asocia un nodo al usuario indicado mediante su ID.
 * 
 * @name POST /node/link
 * @function
 * @param {Object} req.body - Datos enviados en el cuerpo de la solicitud.
 * @param {number|string} req.body.userId - ID del usuario al que se vinculará el nodo.
 * @param {string} req.body.nodeName - Nombre del nodo a vincular.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si la operación fue exitosa.
 * @returns {string} [return.message] - Mensaje descriptivo del resultado.
 * 
 * @author Meryame Ait Boumlik
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
 * Actualiza la actividad diaria de un usuario.
 * 
 * Endpoint que registra el tiempo y la distancia recorrida por un usuario.
 * 
 * @name PUT /user/activity
 * @function
 * @param {Object} req.body - Datos enviados en el cuerpo de la solicitud.
 * @param {number|string} req.body.userId - ID del usuario.
 * @param {number} req.body.time - Tiempo de actividad en minutos.
 * @param {number} req.body.distance - Distancia recorrida en metros.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si la actualización fue exitosa.
 * @returns {string} [return.message] - Mensaje descriptivo del resultado.
 *
 * @author Meryame Ait Boumlik
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
 * Obtiene el nodo vinculado a un usuario específico.
 * 
 * Endpoint que devuelve la información del nodo asociado a un usuario dado.
 * Siempre retorna un código 200, incluso si el usuario no tiene nodo vinculado.
 * 
 * @name GET /node/ofUser/:userId
 * @function
 * @param {Object} req.params - Parámetros de la ruta.
 * @param {number|string} req.params.userId - ID del usuario.
 * @returns {Object} JSON con la información del nodo vinculado.
 * @returns {boolean} return.success - Indica si la operación fue exitosa.
 * @returns {Object} [return.node] - Datos del nodo vinculado, si existe.
 * @returns {string} [return.message] - Mensaje descriptivo en caso de fallo.
 * 
 * @author Meryame Ait Boumlik
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
 * Elimina la vinculación de un nodo asociado a un usuario específico.
 * 
 * Endpoint que desvincula el nodo de un usuario dado. Siempre retorna un código 200
 * junto con el resultado de la operación, incluso si no existía nodo vinculado.
 * 
 * @name DELETE /node/ofUser/:userId
 * @function
 * @param {Object} req.params - Parámetros de la ruta.
 * @param {number|string} req.params.userId - ID del usuario.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si la operación fue exitosa.
 * @returns {string} return.message - Mensaje descriptivo del resultado.
 * 
 * @author Meryame Ait Boumlik
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
 * Obtiene un resumen de la calidad del aire y la actividad de un usuario.
 * 
 * Endpoint que devuelve información resumida sobre:
 * - Estado general del usuario
 * - Mensajes relacionados
 * - Tiempo de actividad
 * - Distancia recorrida
 * - Puntos obtenidos
 * - Datos de gráfica de rendimiento/actividad
 * 
 * @name GET /usuario/calidad-aire-resumen
 * @function
 * @param {Object} req.query - Parámetros de consulta.
 * @param {number|string} req.query.userId - ID del usuario.
 * @returns {Object} JSON con el resumen de calidad del aire y actividad del usuario.
 * @returns {boolean} return.success - Indica si la operación fue exitosa.
 * @returns {string} return.message - Mensaje descriptivo del resultado.
 * @returns {Object} [return.data] - Datos del resumen del usuario, incluyendo métricas y gráficas.
 * 
 * @author Meryame Ait Boumlik
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
 * Inserta una nueva medición ambiental en la base de datos.
 * 
 * Registra valores de CO, O3, NO2 y opcionalmente la ubicación del nodo.
 * 
 * @name POST /measurements
 * @function
 * @param {Object} req.body - Datos de la medición.
 * @param {number|string} req.body.nodeId - ID del nodo que envía la medición.
 * @param {number} req.body.co - Valor de CO registrado.
 * @param {number} req.body.o3 - Valor de O3 registrado.
 * @param {number} req.body.no2 - Valor de NO2 registrado.
 * @param {number} [req.body.latitude] - Latitud del nodo (opcional).
 * @param {number} [req.body.longitude] - Longitud del nodo (opcional).
 * @returns {Object} JSON indicando éxito o fallo de la inserción.
 * @returns {boolean} return.success - True si la medición se insertó correctamente.
 * @returns {string} return.message - Mensaje descriptivo del resultado.
 * 
 * @author Meryame Ait Boumlik
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
 * Registra estadísticas diarias de un usuario tras un recorrido.
 * 
 * Inserta en la tabla daily_stats las horas activas, distancia recorrida y puntos obtenidos.
 * 
 * @name POST /user/daily-stats
 * @function
 * @param {Object} req.body - Datos de las estadísticas del usuario.
 * @param {number|string} req.body.userId - ID del usuario.
 * @param {number} [req.body.activeHours=0] - Horas activas del usuario.
 * @param {number} [req.body.distance=0] - Distancia recorrida por el usuario.
 * @param {number} [req.body.points=0] - Puntos obtenidos en el recorrido.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - True si se insertaron correctamente los datos.
 * @returns {string} return.message - Mensaje descriptivo del resultado.
 * 
 * @author Meryame Ait Boumlik
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
 * Obtiene la lista de ayuntamientos.
 *
 * No requiere parámetros.
 * Devuelve un array de objetos con id y name de cada ayuntamiento.
 *
 * @name GET /getAyuntamientos
 * @function
 * @returns {Object[]} Array de ayuntamientos {id, name}.
 * @returns {number} [status] 200 si se obtienen correctamente, 404 si hay error de datos, 500 si error interno.
 *
 * @author Maria Algora
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

/**
 * POST /apply
 * Guarda temporalmente los datos de registro de un usuario antes de crear la cuenta.
 *
 * Body: { firstName, lastName, email, dni, phone, townHallId }
 *
 * @name POST /apply
 * @function
 * @param {Object} req.body - Datos del formulario de registro.
 * @param {string} req.body.firstName - Nombre del usuario.
 * @param {string} req.body.lastName - Apellido del usuario.
 * @param {string} req.body.email - Correo electrónico del usuario.
 * @param {string} req.body.dni - DNI del usuario.
 * @param {string} req.body.phone - Teléfono de contacto.
 * @param {number|string} req.body.townHallId - ID del ayuntamiento.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - True si se guardaron correctamente los datos.
 * @returns {string} return.message - Mensaje descriptivo del resultado.
 *
 * @author Maria Algora
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
 * Elimina una solicitud de registro por su ID.
 *
 * Params:
 *  - applicationId: ID de la solicitud a eliminar.
 *
 * @name DELETE /application/:applicationId
 * @function
 * @param {string|number} req.params.applicationId - ID de la solicitud.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - True si la solicitud fue eliminada.
 * @returns {string} return.message - Mensaje indicando éxito o fallo.
 *
 * @status 200 - Eliminación exitosa.
 * @status 400 - Falta applicationId.
 * @status 404 - Solicitud no encontrada.
 * @status 500 - Error interno del servidor.
 *
 * @author Maria Algora
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
 * GET /points/:userId
 * Obtiene el total de puntos acumulados por un usuario.
 *
 * @name GET /points/:userId
 * @function
 * @param {string|number} req.params.userId - ID del usuario.
 * @returns {Object} JSON con el total de puntos del usuario.
 * @returns {boolean} return.success - True si la consulta fue exitosa.
 * @returns {number} return.points - Total de puntos del usuario.
 * @returns {string} return.message - Mensaje opcional.
 *
 * @status 200 - Consulta exitosa.
 * @status 400 - Falta userId.
 * @status 404 - Usuario no encontrado.
 * @status 500 - Error interno del servidor.
 *
 * @author Santiago Aguirre
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
 * PUT /points
 * Suma puntos al total de un usuario.
 *
 * Body:
 *  - userId: ID del usuario.
 *  - points: cantidad de puntos a añadir (número positivo).
 *
 * @name PUT /points
 * @function
 * @param {string|number} req.body.userId - ID del usuario.
 * @param {number} req.body.points - Puntos a añadir.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - True si la operación fue exitosa.
 * @returns {string} return.message - Mensaje indicando éxito o fallo.
 *
 * @status 200 - Puntos añadidos correctamente.
 * @status 400 - Falta algún campo obligatorio o points no es válido.
 * @status 404 - Usuario no encontrado.
 * @status 500 - Error interno del servidor.
 *
 * @author Santiago Aguirre
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
 * Obtener información de los nodos de monitoreo ambiental según el tipo solicitado.
 * 
 * Endpoint que permite consultar todos los nodos, solo los inactivos por más de 24 horas
 * o aquellos con lecturas erróneas, según el parámetro `tipo`.
 * 
 * @name GET /informeNodos/:tipo
 * @function
 * @param {Object} req.params - Parámetros de la ruta.
 * @param {string} req.params.tipo - Tipo de informe: "todos", "inactivos" o "erroneos".
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si la consulta fue exitosa.
 * @returns {Array} return.data - Lista de nodos según el tipo solicitado.
 * @returns {string} return.message - Mensaje descriptivo en caso de error o información adicional.
 * 
 * @status 200 - Consulta exitosa.
 * @status 404 - No se encontraron nodos del tipo solicitado.
 * @status 500 - Error interno del servidor.
 * 
 * @author Maria Algora
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
 * Actualizar los datos de un usuario específico.
 * 
 * Endpoint que permite modificar información de un usuario identificado por su `userId`.
 * Los datos a actualizar se envían en el cuerpo de la solicitud.
 * 
 * @name PUT /user/:userId
 * @function
 * @param {Object} req.params - Parámetros de la ruta.
 * @param {number} req.params.userId - ID del usuario a actualizar.
 * @param {Object} req.body - Datos a actualizar del usuario.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si la actualización fue exitosa.
 * @returns {string} return.message - Mensaje descriptivo del resultado.
 * @returns {Object} [return.data] - Datos del usuario actualizados, presente solo si success es true.
 * 
 * @status 200 - Actualización exitosa.
 * @status 400 - Error en la validación de los datos enviados.
 * @status 500 - Error interno del servidor.
 * 
 * @author Maria Algora
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
 * Obtener todos los premios activos disponibles.
 * 
 * Endpoint que devuelve la lista de premios actualmente activos que los usuarios pueden canjear.
 * 
 * @name GET /prizes
 * @function
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si la operación fue exitosa.
 * @returns {string} return.message - Mensaje descriptivo del resultado, si aplica.
 * @returns {Array<Object>} [return.data] - Lista de premios activos, presente solo si success es true.
 * 
 * @status 200 - Operación exitosa, se devuelven los premios.
 * @status 500 - Error interno del servidor.
 * 
 * @author Santiago Aguirre
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
 * Canjear puntos de un usuario por un premio.
 * 
 * Endpoint que permite a un usuario canjear sus puntos acumulados por un premio específico.
 * Valida que los campos obligatorios estén presentes y sean números válidos antes de procesar el canje.
 * 
 * @name POST /redeem
 * @function
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {number} req.body.userId - ID del usuario que desea canjear puntos.
 * @param {number} req.body.prizeId - ID del premio que se desea canjear.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si el canje fue exitoso.
 * @returns {string} return.message - Mensaje descriptivo del resultado.
 * 
 * @status 200 - Canje realizado correctamente.
 * @status 400 - Campos obligatorios faltantes o inválidos, o canje no permitido.
 * @status 500 - Error interno del servidor.
 * 
 * @author Santiago Aguirre
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
 * Obtener historial de canjes de un usuario.
 * 
 * Endpoint que devuelve todos los premios que un usuario ha canjeado.
 * Valida que se proporcione el userId como parámetro.
 * 
 * @name GET /redemptions/:userId
 * @function
 * @param {string} req.params.userId - ID del usuario.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si la consulta fue exitosa.
 * @returns {Array} return.data - Lista de canjes realizados por el usuario.
 * @returns {string} return.message - Mensaje descriptivo del resultado.
 * 
 * @status 200 - Historial obtenido correctamente.
 * @status 400 - Falta parámetro obligatorio userId.
 * @status 404 - Usuario o historial no encontrado.
 * @status 500 - Error interno del servidor.
 * 
 * @author Santiago Aguirre
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
 * Obtener todas las mediciones registradas.
 * 
 * Endpoint que devuelve las mediciones de calidad ambiental registradas en la base de datos.
 * No requiere parámetros obligatorios.
 * 
 * @name GET /measurements
 * @function
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si la consulta fue exitosa.
 * @returns {Array} return.data - Lista de mediciones registradas.
 * @returns {string} return.message - Mensaje descriptivo del resultado.
 * 
 * @status 200 - Medidas obtenidas correctamente.
 * @status 404 - No se encontraron mediciones.
 * @status 500 - Error interno del servidor.
 * 
 * @author Santiago Aguirre
 */
app.get('/measurements', async (req, res) => {
    try {
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
 * Generar mediciones falsas para pruebas.
 * 
 * Endpoint que permite crear un número determinado de mediciones simuladas
 * en la base de datos. Útil para pruebas y desarrollo.
 * 
 * @name POST /measurements/fake
 * @function
 * @param {Object} req.body - Cuerpo de la solicitud.
 * @param {number} req.body.number - Cantidad de mediciones falsas a generar.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si la operación se realizó correctamente.
 * @returns {string} return.message - Mensaje descriptivo del resultado.
 * 
 * @status 201 - Mediciones generadas correctamente.
 * @status 400 - Faltan campos obligatorios o número inválido.
 * @status 404 - No se pudieron generar las mediciones.
 * @status 500 - Error interno del servidor.
 * 
 * @author Santiago Aguirre
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

/**
 * Obtener la medición más cercana a unas coordenadas dadas.
 * 
 * Endpoint que recibe latitud y longitud como parámetros y devuelve la medición
 * más próxima registrada en la base de datos.
 * 
 * @name GET /measurements/closest/:latitude/:longitude
 * @function
 * @param {string} req.params.latitude - Latitud en grados decimales.
 * @param {string} req.params.longitude - Longitud en grados decimales.
 * @returns {Object} JSON con el resultado de la operación.
 * @returns {boolean} return.success - Indica si la consulta fue exitosa.
 * @returns {Object} return.data - Medición más cercana encontrada.
 * @returns {string} return.message - Mensaje descriptivo en caso de error.
 * 
 * @status 200 - Medición encontrada correctamente.
 * @status 400 - Coordenadas inválidas o faltantes.
 * @status 404 - No se encontró ninguna medición cercana.
 * @status 500 - Error interno del servidor.
 * 
 * @author Maria Algora
 */
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



/**
 * Manejador de rutas no encontradas.
 * 
 * Captura cualquier solicitud a endpoints no definidos y devuelve un error 404.
 * 
 * @function
 * @param {Object} req - Objeto de solicitud HTTP.
 * @param {Object} res - Objeto de respuesta HTTP.
 * @returns {Object} JSON indicando que el endpoint no existe.
 */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado'
    });
});

// NO iniciamos el servidor aquí, solo exportamos la app
// El servidor se inicia en server.js
module.exports = app;