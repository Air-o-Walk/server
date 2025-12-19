/**
 * @file logica.js
 * @description Logica del Negocio, clase con todas las funciones que comunica la api con la base de datos
 * @author Maria Algora
 * @author Santiago Aguirre
 * @author Christopher Yoris
 * @author Meryame Ait Boumlik
 * @version 3.1
 * @since 2025-08-30
 */

const jwt = require('jsonwebtoken');
const db = require('./config/database');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { bienvenida } = require('./config/correo.js');
const turf = require('@turf/turf'); // Necesario para test de punto en polígono

//const FileLogger = require('./logger');

// Activa el logger
//new FileLogger('mi_log.txt');


/**
 * Registra un nuevo usuario en el sistema a partir de una solicitud previa.
 *
 * El proceso realiza las siguientes acciones:
 * - Obtiene la solicitud más reciente asociada al email proporcionado.
 * - Asigna el rol por defecto "walker".
 * - Genera y cifra la contraseña a partir del DNI.
 * - Crea automáticamente el nombre de usuario.
 * - Inserta el usuario en la base de datos.
 * - Envía un correo con las credenciales de acceso.
 * - Elimina la solicitud de aplicación asociada.
 *
 * @async
 * @function registerUser
 * @param {string} email Email del solicitante registrado previamente en applications.
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {Promise<Object>} result.success Indica si el registro fue exitoso.
 * @returns {Promise<Object>} result.message Mensaje descriptivo del resultado.
 *
 * @throws {Error} Si ocurre un error inesperado durante el proceso de registro.
 *
 * @author Maria Algora
 */
async function registerUser(email) {
    try {

        /* Al colocar las variable en corchetes extrae solamente lo primero que se encuentre en el array de
            respuesta de MySQL, evitando tener que hacer la descontruccion despues
        */

        //1) Obtener la aplicación más reciente por email
        const [apps] = await db.query(
            'SELECT id, first_name, last_name, email, dni, town_hall_id FROM applications WHERE email = ? ORDER BY id DESC LIMIT 1',
            [email]
        );

        if (apps.length === 0) return { success: false, message: 'Solicitud no encontrada para ese email' };

        const app = apps[0];
        const applicationId = app.id;
        const firstName = app.first_name;
        const lastName = app.last_name;
        let dni = app.dni;
        const townHallId = app.town_hall_id;

        //2) Buscar el rol por defecto
        const [roles] = await db.query(
            'SELECT id FROM roles WHERE name = ?',
            ['walker']
        );

        if (roles.length === 0) {
            return {
                success: false,
                message: 'Error: Rol no encontrado'
            };
        }

        const roleId = roles[0].id;


        //3) Cifrar la contraseña
        const rawPassword = dni.slice(0, -1); //Quito la letra
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        //4) Crear nombre usuario con la inicial del nombre y las primeras letras del apellido/s
        const preparar = s =>
            s.normalize('NFD')                   // Separa letras de acentos
                .replace(/[\u0300-\u036f]/g, '')      // Elimina los acentos
                .replace(/[^a-zA-Z]/g, '')            // Elimina cualquier cosa que no sea una letra
                .toLowerCase();                      // Convierte todo a minúsculas

        const crearUsername = (firstName, lastName) => {
            const inicialesNombre = firstName.split(/\s+/).map(p => p[0]).join(''); //Separa nombres en array, toma primera letra y los junta (si hubiera más de uno)
            const apellidos = lastName.split(/\s+/); // Poner apellidos en array cuando haya un spacio '\s' o más '+'
            const inicialesApellido = apellidos.length === 1 ? apellidos[0].slice(0, 4) : apellidos[0].slice(0, 3) + apellidos[1][0]; // 1 aprllido -> tomo 4 letras; 2 apellidos -> tomo 3 y 1 letras
            return `${preparar(inicialesNombre)}.${preparar(inicialesApellido)}`;
        };

        let username = crearUsername(firstName, lastName);		
		
        // Crear el nuevo usuario
        const [nuevoUsuario] = await db.query(
            `INSERT INTO users (username, email, password, role_id, points, active_hours, total_distance, town_hall_id) 
             VALUES (?, ?, ?, ?, 0, 0, 0, ?)`,
            [username, email, hashedPassword, roleId, townHallId]
        );

        if (nuevoUsuario.affectedRows !== 1) {
            return { success: false, message: 'Error al insertar usuario' };
        }

        //Enviar correo
        await sendMail({
            to: email,
            firstName,
            username,
            rawPassword
        });

        //Borro formulario
        await deleteApplication(applicationId);

        return {
            success: true,
            message: 'Usuario registrado correctamente'
        };

    } catch (error) {
        console.error('Error en registerUser:', error);
        return {
            success: false,
            message: 'Error al registrar usuario' + error
        };
    }
}


/**
 * 2. loginUser(username, password)
 * Autentica un usuario y genera un token de sesión
 * 
 * username, password ---> loginUser() ---> {success, token, userId} || error "Usuario no encontrado" || error "Contraseña incorrecta"
 */
async function loginUser(username, password) {
    try {
        // Buscar usuario por email
        const [users] = await db.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            return {
                success: false,
                message: 'Error: Usuario no encontrado'
            };
        }

        const user = users[0];

        // Verificar contraseña
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return {
                success: false,
                message: 'Error: Contraseña incorrecta'
            };
        }

        // Generar token de sesión
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            process.env.JWT_SECRET || 'secret_key_default',
            { expiresIn: '24h' }
        );

        return {
            success: true,
            token: token,
            userId: user.id
        };

    } catch (error) {
        console.error('Error en loginUser:', error);
        return {
            success: false,
            message: 'Error al iniciar sesión'
        };
    }
}

/**
 * Autentica un usuario mediante nombre de usuario y contraseña.
 *
 * El proceso realiza las siguientes acciones:
 * - Busca el usuario en la base de datos por su nombre de usuario.
 * - Verifica la contraseña cifrada mediante bcrypt.
 * - Genera un token JWT de sesión con una validez de 24 horas.
 *
 * @async
 * @function loginUser
 * @param {string} username Nombre de usuario.
 * @param {string} password Contraseña en texto plano.
 * @returns {Promise<Object>} Resultado de la autenticación.
 * @returns {Promise<Object>} result.success Indica si la autenticación fue exitosa.
 * @returns {Promise<Object>} [result.token] Token JWT generado si la autenticación es correcta.
 * @returns {Promise<Object>} [result.userId] Identificador del usuario autenticado.
 * @returns {Promise<Object>} [result.message] Mensaje de error en caso de fallo.
 *
 * @throws {Error} Si ocurre un error inesperado durante el proceso de autenticación.
 *
 * @author Santiago Aguirres
 */

async function getUser(userId) {
    try {
        // Buscar usuario con información de ayuntamiento y rol
        const [users] = await db.query(
            `SELECT u.id, u.username, u.email, u.points, u.active_hours, u.total_distance, u.photo_url,
                    th.name as town_hall_name, th.province,
                    r.name as role_name
             FROM users u
             LEFT JOIN town_halls th ON u.town_hall_id = th.id
             LEFT JOIN roles r ON u.role_id = r.id
             WHERE u.id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return {
                success: false,
                message: 'Error: Usuario no encontrado'
            };
        }

        const user = users[0];

        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                points: user.points,
                active_hours: user.active_hours,
                total_distance: user.total_distance,
                photo_url: user.photo_url,
                town_hall: {
                    name: user.town_hall_name,
                    province: user.province
                },
                role: user.role_name
            }
        };

    } catch (error) {
        console.error('Error en getUser:', error);
        return {
            success: false,
            message: 'Error al obtener usuario'
        };
    }
}

/**
 * Vincula un nodo/sensor a un usuario, evitando duplicados y manejando reactivación.
 *
 * El proceso realiza las siguientes acciones:
 * - Verifica que el usuario exista.
 * - Comprueba si ya existe un nodo con el mismo nombre.
 * - Inserta un nuevo nodo si no existe.
 * - Reactiva el nodo si estaba inactivo.
 * - Devuelve error si el nodo ya está activo con otro usuario o si ya está vinculado al mismo usuario.
 *
 * @async
 * @function linkNodeToUser
 * @param {number} userId ID del usuario al que se quiere vincular el nodo.
 * @param {string} nodeName Nombre del nodo/sensor a vincular.
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {Promise<Object>} result.success Indica si la operación fue exitosa.
 * @returns {Promise<Object>} [result.message] Mensaje descriptivo de la operación o error.
 * @returns {Promise<Object>} [result.nodeId] ID del nodo vinculado o reactivado, si aplica.
 *
 * @throws {Error} Si ocurre un error inesperado durante el proceso de vinculación.
 *
 * @author Meryame Ait Boumlik
 */

async function linkNodeToUser(userId, nodeName) {
    try {
        // 1. User exists?
        const [users] = await db.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return { success: false, message: 'Error: Usuario no encontrado' };
        }

        // 2. Check EXISTING NODE by name regardless of status
        const [existingNodes] = await db.query(
            `SELECT id, user_id, status
             FROM nodes
             WHERE name = ?`,
            [nodeName]
        );

        const now = Date.now();

        // CASE A → No node with this name exists → INSERT NEW
        if (existingNodes.length === 0) {
            const [result] = await db.query(
                `INSERT INTO nodes (user_id, name, status, lastStatusUpdate)
                 VALUES (?, ?, 'active', ?)`,
                [userId, nodeName, now]
            );

            return {
                success: true,
                message: 'Nodo vinculado correctamente',
                nodeId: result.insertId
            };
        }

        // Node exists
        const nodo = existingNodes[0];

        // CASE B → Node is ACTIVE by another user → ERROR
        if (nodo.status === 'active' && nodo.user_id !== userId) {
            return {
                success: false,
                message: 'Error: Este beacon ya está vinculado por otro usuario'
            };
        }

        // CASE C → Node is INACTIVE → REACTIVATE IT
        if (nodo.status === 'inactive') {
            await db.query(
                `UPDATE nodes 
                 SET user_id = ?, status = 'active', lastStatusUpdate = ?
                 WHERE id = ?`,
                [userId, now, nodo.id]
            );

            return {
                success: true,
                message: 'Nodo vinculado correctamente (reactivado)',
                nodeId: nodo.id
            };
        }

        // CASE D → Node is ACTIVE for SAME user → ALREADY LINKED
        if (nodo.user_id === userId) {
            return {
                success: false,
                message: 'El usuario ya tiene este nodo vinculado'
            };
        }

    } catch (error) {
        console.error('Error en linkNodeToUser:', error);
        return { success: false, message: 'Error al vincular nodo' };
    }
}


/**
 * Actualiza las horas activas y la distancia total recorrida de un usuario.
 *
 * El proceso realiza las siguientes acciones:
 * - Verifica que el usuario exista.
 * - Calcula los nuevos valores de horas activas y distancia total sumando los proporcionados.
 * - Actualiza los valores en la base de datos.
 *
 * @async
 * @function updateUserActivity
 * @param {number} userId ID del usuario cuya actividad se desea actualizar.
 * @param {number} time Tiempo activo a sumar (en horas o unidades definidas).
 * @param {number} distance Distancia recorrida a sumar (en unidades definidas, p.ej. metros o km).
 * @returns {Promise<Object>} Resultado de la actualización.
 * @returns {Promise<Object>} result.success Indica si la operación fue exitosa.
 * @returns {Promise<Object>} result.message Mensaje descriptivo del resultado o error.
 * @returns {Promise<Object>} [result.active_hours] Nuevas horas activas del usuario, si la actualización fue exitosa.
 * @returns {Promise<Object>} [result.total_distance] Nueva distancia total del usuario, si la actualización fue exitosa.
 *
 * @throws {Error} Si ocurre un error inesperado durante la actualización de la actividad.
 *
 * @author IDK
 */

async function updateUserActivity(userId, time, distance) {
    try {
        // Verificar que el usuario existe
        const [users] = await db.query(
            'SELECT id, active_hours, total_distance FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return {
                success: false,
                message: 'Error: Usuario no encontrado'
            };
        }

        const user = users[0];

        // Calcular nuevos valores
        const newActiveHours = user.active_hours + time;
        const newTotalDistance = user.total_distance + distance;
		

        // Actualizar la base de datos
        await db.query(
            `UPDATE users 
             SET active_hours = ?, total_distance = ? 
             WHERE id = ?`,
            [newActiveHours, newTotalDistance, userId]
        );

        return {
            success: true,
            message: 'Actividad actualizada correctamente',
            active_hours: newActiveHours,
            total_distance: newTotalDistance
        };

    } catch (error) {
        console.error('Error en updateUserActivity:', error);
        return {
            success: false,
            message: 'Error al actualizar actividad'
        };
    }
}


/**
 * Devuelve el nodo actualmente vinculado a un usuario.
 *
 * El proceso realiza las siguientes acciones:
 * - Verifica que el usuario exista.
 * - Busca un nodo activo vinculado al usuario.
 * - Devuelve el nodo si existe o un mensaje de error si no hay nodo vinculado.
 *
 * @async
 * @function getLinkedNodeOfUser
 * @param {number} userId ID del usuario del que se desea obtener el nodo vinculado.
 * @returns {Promise<Object>} Resultado de la consulta.
 * @returns {Promise<Object>} result.success Indica si la operación fue exitosa.
 * @returns {Promise<Object>} [result.node] Objeto con la información del nodo vinculado si existe.
 * @returns {Promise<Object>} [result.message] Mensaje descriptivo de error si no hay nodo vinculado o si el usuario no existe.
 *
 * @throws {Error} Si ocurre un error inesperado durante la consulta.
 *
 * @author Meryame Ait Boumlik
 */

async function getLinkedNodeOfUser(userId) {
    try {
        // Verificar usuario
        const [users] = await db.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return {
                success: false,
                message: 'Usuario no encontrado'
            };
        }

        // Buscar nodo activo
        const [rows] = await db.query(
            `SELECT id, name, status, lastStatusUpdate
             FROM nodes 
             WHERE user_id = ? AND status = 'active'
             LIMIT 1`,
            [userId]
        );

        if (rows.length === 0) {
            return {
                success: false,
                message: 'El usuario no tiene un nodo vinculado'
            };
        }

        return {
            success: true,
            node: rows[0]
        };

    } catch (error) {
        console.error('Error en getLinkedNodeOfUser:', error);
        return {
            success: false,
            message: 'Error interno al obtener nodo'
        };
    }
}

/**
 * Elimina la vinculación del nodo activo de un usuario.
 *
 * El proceso realiza las siguientes acciones:
 * - Verifica que el usuario exista.
 * - Busca el nodo activo vinculado al usuario.
 * - Desvincula el nodo actualizando su estado a 'inactive' y eliminando la relación con el usuario.
 *
 * @async
 * @function unlinkNodeFromUser
 * @param {number} userId ID del usuario cuyo nodo se desea desvincular.
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {Promise<Object>} result.success Indica si la operación fue exitosa.
 * @returns {Promise<Object>} [result.message] Mensaje descriptivo del resultado o error.
 *
 * @throws {Error} Si ocurre un error inesperado durante la desvinculación del nodo.
 *
 * @author Meryame Ait Boumlik
 */

async function unlinkNodeFromUser(userId) {
    try {

        // Verificar usuario
        const [users] = await db.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return { success: false, message: 'Usuario no encontrado' };
        }

        // Buscar nodo vinculado
        const [rows] = await db.query(
            `SELECT id FROM nodes 
             WHERE user_id = ? AND status = 'active'
             LIMIT 1`,
            [userId]
        );

        if (rows.length === 0) {
            return { success: false, message: 'El usuario no tiene nodo vinculado' };
        }

        const nodeId = rows[0].id;

        // DESVINCULAR EL NODO
        await db.query(
            `UPDATE nodes
             SET user_id = NULL,
                 status = 'inactive',
                 lastStatusUpdate = NOW()
             WHERE id = ?`,
            [nodeId]
        );

        return { success: true, message: 'Nodo desvinculado correctamente' };

    } catch (error) {
        console.error('Error en unlinkNodeFromUser:', error);
        return { success: false, message: 'Error interno al desvincular nodo' };
    }
}

/**
 * Calcula el estado general de la calidad del aire y genera un mensaje resumen
 * usando las mediciones del nodo vinculado en las últimas 8 horas.
 *
 * El proceso realiza las siguientes acciones:
 * - Obtiene el nodo vinculado al usuario mediante `getLinkedNodeOfUser`.
 * - Consulta las mediciones de los últimos 8 horas (O3, NO2, CO).
 * - Clasifica la calidad del aire usando `clasificarCalidadDelAire`.
 * - Devuelve un estado general (`status`) y un mensaje resumen (`summaryText`).
 * - Si no hay mediciones recientes, asume que la calidad del aire es buena.
 *
 * @async
 * @function calidad_del_aire_cara_y_mensaje
 * @param {number} userId ID del usuario para el que se calcula la calidad del aire.
 * @returns {Promise<Object>} Resultado del cálculo de la calidad del aire.
 * @returns {Promise<Object>} result.success Indica si la operación fue exitosa.
 * @returns {Promise<Object>} [result.status] Estado general de la calidad del aire ('buena', 'regular', 'mala', etc.).
 * @returns {Promise<Object>} [result.summaryText] Mensaje resumen explicativo de la calidad del aire.
 * @returns {Promise<Object>} [result.message] Mensaje de error si la operación falla o no hay nodo vinculado.
 *
 * @throws {Error} Si ocurre un error inesperado durante el cálculo de la calidad del aire.
 *
 * @author Meryame Ait Boumlik
 */
async function calidad_del_aire_cara_y_mensaje(userId) {
    try {
        // Reutilizamos getLinkedNodeOfUser para saber qué nodo mirar
        const nodoRes = await getLinkedNodeOfUser(userId);
        if (!nodoRes.success) {
            return {
                success: false,
                message: nodoRes.message
            };
        }

        const nodeId = nodoRes.node.id;

        // Medidas de las últimas 8 horas
        const [rows] = await db.query(
            `SELECT timestamp, o3_value, no2_value, co_value
             FROM measurements
             WHERE node_id = ?
               AND timestamp >= NOW() - INTERVAL 8 HOUR
             ORDER BY timestamp ASC`,
            [nodeId]
        );

        if (rows.length === 0) {
            return {
                success: true,
                status: 'buena',
                summaryText: 'No hay mediciones recientes; asumimos que la calidad del aire ha sido buena.'
            };
        }

        const { status, summaryText } = clasificarCalidadDelAire(rows);

        return {
            success: true,
            status,
            summaryText
        };

    } catch (error) {
        console.error('Error en calidad_del_aire_cara_y_mensaje:', error);
        return {
            success: false,
            message: 'Error al calcular la calidad del aire'
        };
    }
}

/**
 * Obtiene el tiempo activo acumulado por un usuario en las últimas 8 horas.
 *
 * El proceso realiza las siguientes acciones:
 * - Consulta la tabla `daily_stats` para sumar las horas activas del usuario
 *   en las últimas 8 horas.
 * - Devuelve el total de horas acumuladas.
 *
 * @async
 * @function get_tiempo
 * @param {number} userId ID del usuario cuyo tiempo activo se desea consultar.
 * @returns {Promise<Object>} Resultado de la consulta.
 * @returns {Promise<Object>} result.success Indica si la operación fue exitosa.
 * @returns {Promise<Object>} [result.timeHours] Total de horas activas acumuladas en las últimas 8 horas.
 * @returns {Promise<Object>} [result.message] Mensaje de error si la operación falla.
 *
 * @throws {Error} Si ocurre un error inesperado durante la consulta.
 *
 * @author Meryame Ait Boumlik
 */
async function get_tiempo(userId) {
    try {
        const [rows] = await db.query(
            `SELECT COALESCE(SUM(active_hours), 0) AS total_hours
             FROM daily_stats
             WHERE user_id = ?
               AND timestamp >= NOW() - INTERVAL 8 HOUR`,
            [userId]
        );

        return {
            success: true,
            timeHours: rows[0].total_hours
        };

    } catch (error) {
        console.error('Error en get_tiempo:', error);
        return {
            success: false,
            message: 'Error al obtener tiempo activo'
        };
    }
}

/**
 * Obtiene la distancia total recorrida por un usuario en las últimas 8 horas.
 *
 * El proceso realiza las siguientes acciones:
 * - Consulta la tabla `daily_stats` para sumar la distancia recorrida por el usuario
 *   en las últimas 8 horas.
 * - Devuelve la distancia total acumulada en kilómetros.
 *
 * @async
 * @function get_distancia
 * @param {number} userId ID del usuario cuya distancia se desea consultar.
 * @returns {Promise<Object>} Resultado de la consulta.
 * @returns {Promise<Object>} result.success Indica si la operación fue exitosa.
 * @returns {Promise<Object>} [result.distanceKm] Distancia total recorrida en las últimas 8 horas.
 * @returns {Promise<Object>} [result.message] Mensaje de error si la operación falla.
 *
 * @throws {Error} Si ocurre un error inesperado durante la consulta.
 *
 * @author Meryame Ait Boumlik
 */

async function get_distancia(userId) {
    try {
        const [rows] = await db.query(
            `SELECT COALESCE(SUM(distance), 0) AS total_distance
             FROM daily_stats
             WHERE user_id = ?
               AND timestamp >= NOW() - INTERVAL 8 HOUR`,
            [userId]
        );

        return {
            success: true,
            distanceKm: rows[0].total_distance
        };

    } catch (error) {
        console.error('Error en get_distancia:', error);
        return {
            success: false,
            message: 'Error al obtener distancia'
        };
    }
}

/**
 * Obtiene la suma de puntos de un usuario en las últimas 8 horas.
 *
 * El proceso realiza las siguientes acciones:
 * - Consulta la tabla `daily_stats` para sumar los puntos obtenidos por el usuario
 *   en las últimas 8 horas.
 * - Devuelve el total de puntos acumulados.
 *
 * @async
 * @function get_puntos
 * @param {number} userId ID del usuario cuyos puntos se desean consultar.
 * @returns {Promise<Object>} Resultado de la consulta.
 * @returns {Promise<Object>} result.success Indica si la operación fue exitosa.
 * @returns {Promise<Object>} [result.points] Total de puntos obtenidos en las últimas 8 horas.
 * @returns {Promise<Object>} [result.message] Mensaje de error si la operación falla.
 *
 * @throws {Error} Si ocurre un error inesperado durante la consulta.
 *
 * @author Meryame Ait Boumlik
 */
async function get_puntos(userId) {
    try {
        const [rows] = await db.query(
            `SELECT COALESCE(SUM(points), 0) AS total_points
             FROM daily_stats
             WHERE user_id = ?
               AND timestamp >= NOW() - INTERVAL 8 HOUR`,
            [userId]
        );

        return {
            success: true,
            points: rows[0].total_points
        };

    } catch (error) {
        console.error('Error en get_puntos:', error);
        return {
            success: false,
            message: 'Error al obtener puntos'
        };
    }
}


/**
 * Obtiene los valores necesarios para dibujar la gráfica de calidad del aire
 * y calcula el índice normalizado (0–1) por instante.
 *
 * El proceso realiza las siguientes acciones:
 * - Obtiene el nodo vinculado al usuario mediante `getLinkedNodeOfUser`.
 * - Consulta las mediciones de O3, NO2 y CO de las últimas 8 horas.
 * - Calcula el índice normalizado por cada instante.
 * - Devuelve un objeto con los arrays de timestamps, valores de contaminantes e índice normalizado.
 *
 * @async
 * @function valores_grafica
 * @param {number} userId ID del usuario cuyos datos de calidad del aire se desean consultar.
 * @returns {Promise<Object>} Resultado de la consulta.
 * @returns {Promise<Object>} result.success Indica si la operación fue exitosa.
 * @returns {Promise<Object>} [result.graph] Objeto con los datos para la gráfica.
 * @returns {Array<string>} result.graph.timestamps Array de etiquetas de tiempo (hh:mm).
 * @returns {Array<number>} result.graph.index Array del índice normalizado (0–1+) por instante.
 * @returns {Array<number>} result.graph.o3 Array de valores de O3.
 * @returns {Array<number>} result.graph.no2 Array de valores de NO2.
 * @returns {Array<number>} result.graph.co Array de valores de CO.
 * @returns {Promise<Object>} [result.message] Mensaje de error si la operación falla o no hay nodo vinculado.
 *
 * @throws {Error} Si ocurre un error inesperado durante la obtención de datos para la gráfica.
 *
 * @author Meryame Ait Boumlik
 */

async function valores_grafica(userId) {
    try {
        const nodoRes = await getLinkedNodeOfUser(userId);
        if (!nodoRes.success) {
            return {
                success: false,
                message: nodoRes.message
            };
        }

        const nodeId = nodoRes.node.id;

        const [rows] = await db.query(
            `SELECT timestamp, o3_value, no2_value, co_value
             FROM measurements
             WHERE node_id = ?
               AND timestamp >= NOW() - INTERVAL 8 HOUR
             ORDER BY timestamp ASC`,
            [nodeId]
        );

        const timestamps = [];
        const o3 = [];
        const no2 = [];
        const co = [];
        const index = [];   

        rows.forEach(row => {
            // Timestamp label
            const date = new Date(row.timestamp);
            const label = date.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });
            timestamps.push(label);

            // Raw values
            const o3v = row.o3_value || 0;
            const no2v = row.no2_value || 0;
            const cov = row.co_value || 0;

            o3.push(o3v);
            no2.push(no2v);
            co.push(cov);

            // NORMALIZED INDEX (0–1+)
            const idx = Math.max(
                o3v / 100,
                no2v / 100,
                cov / 2
            );

            index.push(idx);
        });

        return {
            success: true,
            graph: { timestamps, index, o3, no2, co }
        };

    } catch (error) {
        console.error('Error en valores_grafica:', error);
        return {
            success: false,
            message: 'Error al obtener valores para la gráfica'
        };
    }
}


/**
 * Obtiene un resumen completo de la calidad del aire para un usuario.
 *
 * Combina múltiples métricas:
 * - Estado general de la calidad del aire y mensaje resumen.
 * - Tiempo activo acumulado en las últimas 8 horas.
 * - Distancia recorrida en las últimas 8 horas.
 * - Puntos obtenidos en las últimas 8 horas.
 * - Datos necesarios para dibujar la gráfica de calidad del aire.
 *
 * @async
 * @function getAirQualitySummary
 * @param {number} userId ID del usuario para el que se genera el resumen.
 * @returns {Promise<Object>} Resultado del resumen completo.
 * @returns {Promise<Object>} result.success Indica si la operación fue exitosa.
 * @returns {Promise<Object>} [result.status] Estado general de la calidad del aire ('buena', 'regular', 'mala', etc.).
 * @returns {Promise<Object>} [result.summaryText] Mensaje resumen de la calidad del aire.
 * @returns {Promise<Object>} [result.timeHours] Tiempo activo acumulado en las últimas 8 horas.
 * @returns {Promise<Object>} [result.distanceKm] Distancia total recorrida en las últimas 8 horas.
 * @returns {Promise<Object>} [result.points] Puntos obtenidos en las últimas 8 horas.
 * @returns {Promise<Object>} [result.graph] Datos para la gráfica de calidad del aire (timestamps, valores de contaminantes e índice normalizado).
 * @returns {Promise<Object>} [result.message] Mensaje de error si alguna de las consultas falla.
 *
 * @throws {Error} Si ocurre un error inesperado durante la generación del resumen.
 *
 * @author Meryame Ait Boumlik
 */
async function getAirQualitySummary(userId) {
    try {
        const [
            calidad,
            tiempo,
            distancia,
            puntos,
            grafica
        ] = await Promise.all([
            calidad_del_aire_cara_y_mensaje(userId),
            get_tiempo(userId),
            get_distancia(userId),
            get_puntos(userId),
            valores_grafica(userId)
        ]);

        // Si alguna parte falla, devolvemos ese error
        if (!calidad.success) return calidad;
        if (!tiempo.success) return tiempo;
        if (!distancia.success) return distancia;
        if (!puntos.success) return puntos;
        if (!grafica.success) return grafica;

        return {
            success: true,
            status: calidad.status,
            summaryText: calidad.summaryText,
            timeHours: tiempo.timeHours,
            distanceKm: distancia.distanceKm,
            points: puntos.points,
            graph: grafica.graph
        };

    } catch (error) {
        console.error('Error en getAirQualitySummary:', error);
        return {
            success: false,
            message: 'Error interno al generar el resumen de calidad del aire'
        };
    }
}

/**
 * Clasifica la calidad del aire según los valores de O₃, NO₂ y CO.
 *
 * El proceso realiza las siguientes acciones:
 * - Recorre las mediciones proporcionadas.
 * - Calcula un índice normalizado por medición basado en O₃, NO₂ y CO.
 * - Determina el estado general de la calidad del aire y genera un mensaje resumen.
 *
 * @function clasificarCalidadDelAire
 * @param {Array<Object>} measurements Array de objetos de medición.
 * @param {number} measurements[].o3_value Valor de O₃ de la medición.
 * @param {number} measurements[].no2_value Valor de NO₂ de la medición.
 * @param {number} measurements[].co_value Valor de CO de la medición.
 * @returns {Object} Resultado de la clasificación.
 * @returns {string} result.status Estado general de la calidad del aire ('buena', 'regular', 'picos', 'mala').
 * @returns {string} result.summaryText Mensaje descriptivo del estado de la calidad del aire.
 *
 * @author Meryame Ait Boumlik
 */
function clasificarCalidadDelAire(measurements) {
    let maxIndex = 0;

    measurements.forEach(m => {
        const o3 = m.o3_value || 0;
        const no2 = m.no2_value || 0;
        const co = m.co_value || 0;

        const idx = Math.max(
            o3 / 100,
            no2 / 100,
            co / 2
        );

        if (idx > maxIndex) maxIndex = idx;
    });

    let status, summaryText;

    if (maxIndex < 0.3) {
        status = "buena";
        summaryText = "La calidad del aire ha sido buena.";
    }
    else if (maxIndex < 0.5) {
        status = "regular";
        summaryText = "La calidad del aire ha sido aceptable.";
    }
    else if (maxIndex < 0.8) {
        status = "picos";
        summaryText = "Se han detectado varios picos de contaminación.";
    }
    else {
        status = "mala";
        summaryText = "La calidad del aire ha sido mala.";
    }

    return { status, summaryText };
}

/**
 * Inserta una medición de un nodo en la tabla `measurements`.
 *
 * El proceso realiza las siguientes acciones:
 * - Verifica que el nodo exista en la base de datos.
 * - Inserta una nueva fila en la tabla `measurements` con los valores proporcionados.
 *
 * @async
 * @function insertMeasurement
 * @param {number} nodeId ID del nodo que realiza la medición.
 * @param {number} co Valor de CO de la medición.
 * @param {number} o3 Valor de O₃ de la medición.
 * @param {number} no2 Valor de NO₂ de la medición.
 * @param {number} latitude Latitud donde se realizó la medición.
 * @param {number} longitude Longitud donde se realizó la medición.
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {Promise<Object>} result.success Indica si la inserción fue exitosa.
 * @returns {Promise<Object>} [result.message] Mensaje descriptivo del resultado o error.
 *
 * @throws {Error} Si ocurre un error inesperado durante la inserción.
 *
 * @author Meryame Ait Boumlik
 */
async function insertMeasurement(nodeId, co, o3, no2, latitude, longitude) {
    try {

        // Verify that node exists
        const [nodes] = await db.query(
            `SELECT id FROM nodes WHERE id = ?`,
            [nodeId]
        );

        if (nodes.length === 0) {
            return { success: false, message: "Nodo no encontrado" };
        }

        // Insert measurement
        await db.query(
            `INSERT INTO measurements 
             (node_id, timestamp, co_value, o3_value, no2_value, latitude, longitude)
             VALUES (?, NOW(), ?, ?, ?, ?, ?)`,
            [nodeId, co, o3, no2, latitude, longitude]
        );

        return { success: true, message: "Medición insertada correctamente" };

    } catch (error) {
        console.error("Error en insertMeasurement:", error);
        return { success: false, message: "Error al insertar medición" };
    }
}

/**
 * Registra una nueva entrada en la tabla `daily_stats` de un usuario.
 *
 * El proceso realiza las siguientes acciones:
 * - Inserta una nueva fila en la tabla `daily_stats` con las horas activas,
 *   distancia recorrida y puntos obtenidos.
 *
 * @async
 * @function addDailyStats
 * @param {number} userId ID del usuario al que se le añaden las estadísticas.
 * @param {number} activeHours Horas activas del usuario.
 * @param {number} distance Distancia recorrida por el usuario (en km o la unidad usada en la tabla).
 * @param {number} points Puntos obtenidos por el usuario.
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {Promise<Object>} result.success Indica si la inserción fue exitosa.
 * @returns {Promise<Object>} [result.message] Mensaje descriptivo del resultado o error.
 *
 * @throws {Error} Si ocurre un error inesperado durante la inserción.
 *
 * @author Meryame Ait Boumlik
 */
async function addDailyStats(userId, activeHours, distance, points) {
    try {
        await db.query(
            `INSERT INTO daily_stats (user_id, timestamp, active_hours, distance, points)
             VALUES (?, NOW(), ?, ?, ?)`,
             [userId, activeHours, distance, points]
        );

        return {
            success: true,
            message: "Daily stats añadidas correctamente"
        };

    } catch (error) {
        console.error("Error addDailyStats:", error);
        return {
            success: false,
            message: "Error al añadir daily stats"
        };
    }
}

/**
 * Devuelve la lista de ayuntamientos (id y nombre) ordenados alfabéticamente.
 *
 * El proceso realiza las siguientes acciones:
 * - Consulta la tabla `town_halls` para obtener todos los registros.
 * - Devuelve un array de objetos con `id` y `name`.
 *
 * @async
 * @function getAyuntamientos
 * @returns {Promise<Object>} Resultado de la consulta.
 * @returns {Promise<Object>} result.success Indica si la operación fue exitosa.
 * @returns {Promise<Object>} [result.data] Array de objetos con los ayuntamientos.
 * @returns {Array<{id: string, name: string}>} result.data Lista de ayuntamientos con id y nombre.
 * @returns {Promise<Object>} [result.message] Mensaje de error si la operación falla.
 *
 * @throws {Error} Si ocurre un error inesperado durante la consulta.
 *
 * @author Maria Algora
 */

	async function getAyuntamientos() {
		try {
			console.log('🔍 Iniciando getAyuntamientos...');

			const [ayt] = await db.query(
				`SELECT id, name FROM town_halls ORDER BY name ASC`
			);

			console.log('📊 Resultado de la consulta:', ayt);
			console.log('📋 Tipo de resultado:', typeof ayt);
			console.log('🔢 Es array?', Array.isArray(ayt));
			console.log('📏 Longitud del resultado:', ayt ? ayt.length : 'null');

			//Creo un array de objetos
			const data = Array.isArray(ayt)
				? ayt.map(r => ({ id: String(r.id), name: r.name }))
				: [];

			console.log('✅ Datos procesados:', data);

			return {
				success: true,
				data
			};

		} catch (error) {
			console.error('❌ Error en getAyuntamientos:', error);
			console.error('🔍 Stack trace:', error.stack);
			return {
				success: false,
				message: 'Error al obtener los ayuntamientos: ' + error.message
			};
		}
	}

/**
 * Guarda una nueva solicitud en la tabla `applications`.
 *
 * El proceso realiza las siguientes acciones:
 * - Valida que todos los campos obligatorios estén presentes.
 * - Verifica que el email no esté registrado en la tabla `users`.
 * - Inserta la solicitud en la tabla `applications`.
 * - Si la inserción es exitosa, llama a `registerUser` para crear el usuario automáticamente.
 *
 * @async
 * @function apply
 * @param {Object} params Objeto con los datos de la solicitud.
 * @param {string} params.firstName Nombre del solicitante.
 * @param {string} params.lastName Apellido del solicitante.
 * @param {string} params.email Email del solicitante.
 * @param {string} params.dni DNI del solicitante.
 * @param {string} params.phone Teléfono del solicitante.
 * @param {number} params.townHallId ID del ayuntamiento asociado.
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {boolean} result.success Indica si la operación fue exitosa.
 * @returns {string} result.message Mensaje descriptivo del resultado o error.
 *
 * @throws {Error} Si ocurre un error inesperado durante la inserción de la solicitud.
 *
 * @author Maria Algora
 */
async function apply({ firstName, lastName, email, dni, phone, townHallId }) {
    try {
        // Validaciones básicas
        if (!firstName || !lastName || !email || !dni || !phone || !townHallId) {
            return { success: false, message: 'Faltan campos obligatorios' };
        }

        // Comprobar si el email ya existe
        const [existingByEmail] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingByEmail.length > 0) {
            return { success: false, message: 'Email ya registrado' };
        }


        // Insertar usuario
        const [result] = await db.query(
            `INSERT INTO applications (email, dni, first_name, last_name, town_hall_id)
   VALUES (?, ?, ?, ?, ?)`,
            [email, dni, firstName, lastName, townHallId]
        );

        if (result.affectedRows === 1) {
			registerUser(email)
            return {
                success: true,
                message: 'Solicitud insertada'
            };
        } else {
            return {
                success: false,
                message: 'Error al insertar solicitud'
            };
        }
    } catch (error) {
        console.error('Error en apply:', error);
        return {
            success: false,
            message: 'Error en apply'
        };
    }
}

/**
 * Elimina una solicitud de la tabla `applications` por su ID.
 *
 * @async
 * @function deleteApplication
 * @param {number} applicationId ID de la solicitud a eliminar.
 * @returns {Promise<boolean>} `true` si la eliminación fue exitosa, `false` en caso contrario.
 *
 * @throws {Error} Si ocurre un error inesperado durante la eliminación.
 *
 * @author Maria Algora
 */
async function deleteApplication(applicationId) {
    try {
        const [result] = await db.query(
            'DELETE FROM applications WHERE id = ?',
            [applicationId]
        );
        return result.affectedRows === 1;
    } catch (error) {
        console.error('Error borrando application:', error);
        return false;
    }
}

/**
 * Envía un correo de bienvenida a un usuario utilizando la función `bienvenida` de `config/correo.js`.
 *
 * @async
 * @function sendMail
 * @param {Object} params Objeto con los datos del correo.
 * @param {string} params.to Email del destinatario.
 * @param {string} params.firstName Nombre del destinatario.
 * @param {string} params.username Nombre de usuario del destinatario.
 * @param {string} params.rawPassword Contraseña en texto plano del usuario.
 * @returns {Promise<void>} No devuelve ningún valor; captura errores internamente y los registra en consola.
 *
 * @throws {Error} Si ocurre un error inesperado al enviar el correo.
 *
 * @author Maria Algora
 */
async function sendMail({ to, firstName, username, rawPassword }) {
    try {
        await bienvenida({
            to,
            firstName,
            username,
            rawPassword
        });
    } catch (error) {
        console.error('Error enviando email:', error);
    }
}

/**
 * Obtiene los puntos totales de un usuario.
 *
 * El proceso realiza las siguientes acciones:
 * - Verifica que el usuario exista en la tabla `users`.
 * - Devuelve los puntos acumulados del usuario.
 *
 * @async
 * @function getPoints
 * @param {number} userId ID del usuario.
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {boolean} result.success Indica si la operación fue exitosa.
 * @returns {number} [result.points] Puntos del usuario, disponible si `success` es true.
 * @returns {string} [result.message] Mensaje descriptivo en caso de error.
 *
 * @throws {Error} Si ocurre un error inesperado durante la consulta.
 *
 * @author Santiago Aguirre
 */
async function getPoints(userId) {
    try {
        // Verificar que el usuario existe y obtener sus puntos
        const [users] = await db.query(
            'SELECT points FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return {
                success: false,
                message: 'Error: Usuario no encontrado'
            };
        }

        return {
            success: true,
            points: users[0].points
        };

    } catch (error) {
        console.error('Error en getPoints:', error);
        return {
            success: false,
            message: 'Error al obtener puntos'
        };
    }
}

/**
 * Suma puntos al total de un usuario.
 *
 * El proceso realiza las siguientes acciones:
 * - Verifica que el usuario exista en la tabla `users`.
 * - Calcula el nuevo total de puntos sumando `pointsToAdd`.
 * - Actualiza la tabla `users` con el nuevo total de puntos.
 *
 * @async
 * @function addPoints
 * @param {number} userId ID del usuario al que se le añadirán puntos.
 * @param {number} pointsToAdd Cantidad de puntos a añadir.
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {boolean} result.success Indica si la operación fue exitosa.
 * @returns {number} [result.totalPoints] Total de puntos del usuario tras la suma, disponible si `success` es true.
 * @returns {string} result.message Mensaje descriptivo del resultado o error.
 *
 * @throws {Error} Si ocurre un error inesperado durante la actualización de puntos.
 *
 * @author Santiago Aguirre
 */
async function addPoints(userId, pointsToAdd) {
    try {
        // Verificar que el usuario existe
        const [users] = await db.query(
            'SELECT points FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return {
                success: false,
                message: 'Error: Usuario no encontrado'
            };
        }

        const currentPoints = users[0].points;
        const newTotalPoints = currentPoints + pointsToAdd;

        // Actualizar los puntos del usuario
        await db.query(
            'UPDATE users SET points = ? WHERE id = ?',
            [newTotalPoints, userId]
        );

        return {
            success: true,
            message: 'Puntos añadidos correctamente',
            totalPoints: newTotalPoints
        };

    } catch (error) {
        console.error('Error en addPoints:', error);
        return {
            success: false,
            message: 'Error al añadir puntos'
        };
    }
}

/**
 * Servicio para la gestión y consulta de nodos.
 *
 * Obtiene los nodos registrados en el sistema y permite filtrar por tipo:
 * - `"todos"`: devuelve todos los nodos.
 * - `"inactivos"`: nodos que no han actualizado su estado en más de un mes.
 * - `"erroneos"`: nodos con mediciones fuera de los rangos esperados o con poca variabilidad.
 *
 * @async
 * @function getNodos
 * @param {string} [tipo='todos'] Tipo de consulta: 'todos', 'inactivos' o 'erroneos'.
 * @returns {Promise<Object>} Resultado de la consulta.
 * @returns {boolean} result.success Indica si la operación fue exitosa.
 * @returns {Array<Object>} [result.nodos] Lista de nodos según el filtro aplicado.
 * @returns {string} [result.message] Mensaje descriptivo en caso de error o filtro inválido.
 * @returns {string} [result.error] Stack trace del error si ocurre algún fallo.
 *
 * Cada nodo devuelto tiene la siguiente estructura:
 * @typedef {Object} Nodo
 * @property {number} id ID del nodo.
 * @property {string} name Nombre del nodo.
 * @property {string|null} username Nombre de usuario vinculado, si lo hay.
 * @property {string} status Estado actual del nodo ('active' o 'inactive').
 * @property {Date} lastStatusUpdate Última actualización de estado.
 *
 * @author Maria Algora
 */
async function getNodos(tipo = 'todos') {
    try {
        let query = `
            SELECT 
                n.id,
                n.name,
                u.username,
                n.status,
                n.lastStatusUpdate
            FROM nodes n
            LEFT JOIN users u ON n.user_id = u.id
        `;

        const [todosNodos] = await db.query(query);

        if (tipo === 'todos') {
            return {
                success: true,
                nodos: todosNodos
            };
        }

        if (tipo === 'inactivos') {
            const UN_MES_MS = 30 * 24 * 60 * 60 * 1000;
            const ahora = Date.now();

            const nodosInactivos = todosNodos.filter(nodo => {
                const last = new Date(nodo.lastStatusUpdate).getTime();
                return (ahora - last) > UN_MES_MS;
            });

            return {
                success: true,
                nodos: nodosInactivos
            };
        }

        if (tipo === 'erroneos') {
            const queryErroneos = `WITH mediciones_recientes AS (
    SELECT 
        node_id,
        co_value,
        o3_value, 
        no2_value,
        timestamp
    FROM measurements 
    WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 7 DAY)
)
SELECT 
    n.id
FROM nodes n
LEFT JOIN mediciones_recientes m ON n.id = m.node_id
WHERE (
    m.co_value > 50 OR m.co_value < 0 OR
    m.o3_value > 500 OR m.o3_value < 0 OR
    m.no2_value > 500 OR m.no2_value < 0

    OR (
        SELECT COUNT(DISTINCT m2.co_value) 
        FROM mediciones_recientes m2 
        WHERE m2.node_id = n.id
    ) <= 2
    OR (
        SELECT COUNT(DISTINCT m2.o3_value) 
        FROM mediciones_recientes m2 
        WHERE m2.node_id = n.id
    ) <= 2
    OR (
        SELECT COUNT(DISTINCT m2.no2_value) 
        FROM mediciones_recientes m2 
        WHERE m2.node_id = n.id
    ) <= 2

    OR (
        SELECT MAX(m2.co_value) - MIN(m2.co_value)
        FROM mediciones_recientes m2 
        WHERE m2.node_id = n.id
    ) > 100
    OR (
        SELECT MAX(m2.o3_value) - MIN(m2.o3_value)
        FROM mediciones_recientes m2 
        WHERE m2.node_id = n.id
    ) > 500
    OR (
        SELECT MAX(m2.no2_value) - MIN(m2.no2_value)
        FROM mediciones_recientes m2 
        WHERE m2.node_id = n.id
    ) > 300
)
GROUP BY n.id
HAVING COUNT(m.node_id) >= 4`;

            const [nodosErroneosIds] = await db.query(queryErroneos);
            const idsErroneos = nodosErroneosIds.map(item => item.id);
            const nodosErroneos = todosNodos.filter(nodo =>
                idsErroneos.includes(nodo.id)
            );

            return {
                success: true,
                nodos: nodosErroneos
            };
        }

        return {
            success: false,
            message: 'Tipo de informe no válido'
        };

    } catch (error) {
        return {
            success: false,
            message: error && error.message ? error.message : 'Error desconocido',
            error: error && error.stack ? error.stack : error ? String(error) : null,
            nodos: []
        };
    }
}

/**
 * Actualiza el perfil de un usuario.
 *
 * Permite modificar el nombre de usuario, el email y/o la contraseña. 
 * La contraseña actual es requerida si se desea establecer una nueva.
 *
 * @async
 * @function updateUser
 * @param {number} userId - ID del usuario a actualizar.
 * @param {Object} updateData - Objeto con los campos a actualizar.
 * @param {string} [updateData.username] - Nuevo nombre de usuario.
 * @param {string} [updateData.email] - Nuevo email.
 * @param {string} [updateData.current_password] - Contraseña actual, necesaria si se cambia la contraseña.
 * @param {string} [updateData.new_password] - Nueva contraseña a establecer.
 *
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {boolean} result.success Indica si la actualización fue exitosa.
 * @returns {string} result.message Mensaje descriptivo sobre la operación o el error ocurrido.
 *
 *
 * @author Maria Algora
 */

async function updateUser(userId, updateData) {
    try {
        const { username, email, current_password, new_password } = updateData;

        // Verificar que el usuario existe
        const [users] = await db.query(
            'SELECT id, username, email, password FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return {
                success: false,
                message: 'Error: Usuario no encontrado'
            };
        }

        const user = users[0];
        const updates = [];
        const values = [];

        // Validar que se esté enviando al menos un campo a actualizar
        if (!username && !email && !new_password) {
            return {
                success: false,
                message: 'Error: Se debe proporcionar al menos un campo para actualizar'
            };
        }

        // Actualizar username
        if (username && username !== user.username) {
            // Verificar que el nuevo username no esté en uso por otro usuario
            const [existingUsername] = await db.query(
                'SELECT id FROM users WHERE username = ? AND id != ?',
                [username, userId]
            );

            if (existingUsername.length > 0) {
                return {
                    success: false,
                    message: 'Error: El nombre de usuario ya está en uso'
                };
            }

            updates.push('username = ?');
            values.push(username);
        }

        // Actualizar email
        if (email && email !== user.email) {
            // Validar formato de email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return {
                    success: false,
                    message: 'Error: Formato de email inválido'
                };
            }

            // Verificar que el nuevo email no esté en uso por otro usuario
            const [existingEmail] = await db.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, userId]
            );

            if (existingEmail.length > 0) {
                return {
                    success: false,
                    message: 'Error: El email ya está en uso'
                };
            }

            updates.push('email = ?');
            values.push(email);
        }

        // Actualizar password
        if (new_password) {
            if (!current_password) {
                return {
                    success: false,
                    message: 'Error: La contraseña actual es requerida para cambiar la contraseña'
                };
            }

            // Verificar contraseña actual
            const passwordMatch = await bcrypt.compare(current_password, user.password);
            if (!passwordMatch) {
                return {
                    success: false,
                    message: 'Error: La contraseña actual es incorrecta'
                };
            }

            // Validar fortaleza de la nueva contraseña
            if (new_password.length < 6) {
                return {
                    success: false,
                    message: 'Error: La nueva contraseña debe tener al menos 6 caracteres'
                };
            }

            // Hashear nueva contraseña
            const hashedPassword = await bcrypt.hash(new_password, 10);
            updates.push('password = ?');
            values.push(hashedPassword);
        }

        // Si no hay cambios reales
        if (updates.length === 0) {
            return {
                success: false,
                message: 'Error: No sev detectaron cambios para actualizar'
            };
        }

        // Agregar userId al final de los valores para la condición WHERE
        values.push(userId);

        // Actualizar en la base de datos
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        await db.query(query, values);
		
		return {
    		success: true,
    		message: 'Usuario actualizado correctamente'
		};

    } catch (error) {
        console.error('Error en updateUser:', error);
        return {
            success: false,
            message: 'Error al actualizar usuario: ' + error.message
        };
    }
}

/**
 * Obtiene todas las recompensas activas disponibles.
 *
 * Solo devuelve premios con `active > 0` y `quantity_available > 0`, ordenados por `points_required`.
 *
 * @async
 * @function getPrizes
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {boolean} result.success Indica si la consulta fue exitosa.
 * @returns {Array<Object>} [result.prizes] Lista de premios (solo si success=true). Cada premio contiene:
 *   @property {number} id - ID del premio.
 *   @property {string} name - Nombre del premio.
 *   @property {string} description - Descripción del premio.
 *   @property {number} points_required - Puntos necesarios para canjearlo.
 *   @property {number} quantity_available - Cantidad disponible actualmente.
 *   @property {number} initial_quantity - Cantidad inicial del premio.
 *   @property {number} active - Indicador de si el premio está activo.
 * @returns {string} [result.message] Mensaje de error en caso de fallo.
 *
 *
 * @author Santiago Aguirre
 */
async function getPrizes() {
    try {
        // Obtener solo premios activos (active > 0) con stock disponible
        const [prizes] = await db.query(
            `SELECT id, name, description, points_required, 
                    quantity_available, initial_quantity, active
             FROM prizes
             WHERE active > 0 AND quantity_available > 0
             ORDER BY points_required ASC`
        );

        return {
            success: true,
            prizes: prizes
        };

    } catch (error) {
        console.error('Error en getPrizes:', error);
        return {
            success: false,
            message: 'Error al obtener premios'
        };
    }
}

/**
 * Canjea puntos del usuario por un premio.
 *
 * Valida que el usuario exista, que tenga suficientes puntos, que el premio esté activo y tenga stock.
 * Actualiza los puntos del usuario, reduce el stock del premio y genera un cupón único.
 *
 * @async
 * @function redeemPrize
 * @param {number} userId - ID del usuario que quiere canjear el premio.
 * @param {number} prizeId - ID del premio que se desea canjear.
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {boolean} result.success Indica si el canje fue exitoso.
 * @returns {string} [result.message] Mensaje informativo del resultado.
 * @returns {string} [result.couponCode] Código de cupón generado (solo si success=true).
 * @returns {string} [result.prizeName] Nombre del premio canjeado (solo si success=true).
 * @returns {number} [result.pointsSpent] Puntos utilizados para el canje (solo si success=true).
 * @returns {number} [result.remainingPoints] Puntos restantes del usuario (solo si success=true).
 * @returns {number} [result.pointsNeeded] Puntos necesarios (solo si success=false por puntos insuficientes).
 * @returns {number} [result.currentPoints] Puntos actuales del usuario (solo si success=false por puntos insuficientes).
 *
 * @author Santiago Aguirre
 */
async function redeemPrize(userId, prizeId) {
    try {
        // 1. Verificar que el usuario existe y obtener sus puntos
        const [users] = await db.query(
            'SELECT id, points FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return {
                success: false,
                message: 'Error: Usuario no encontrado'
            };
        }

        const userPoints = users[0].points;

        // 2. Verificar que el premio existe, está activo y tiene stock
        const [prizes] = await db.query(
            `SELECT id, name, points_required, quantity_available, active
             FROM prizes
             WHERE id = ?`,
            [prizeId]
        );

        if (prizes.length === 0) {
            return {
                success: false,
                message: 'Error: Premio no encontrado'
            };
        }

        const prize = prizes[0];

        // 3. Validar que el premio está activo
        if (prize.active <= 0) {
            return {
                success: false,
                message: 'Error: Este premio no está disponible'
            };
        }

        // 4. Validar que hay stock disponible
        if (prize.quantity_available <= 0) {
            return {
                success: false,
                message: 'Error: Premio agotado'
            };
        }

        // 5. Validar que el usuario tiene suficientes puntos
        if (userPoints < prize.points_required) {
            return {
                success: false,
                message: 'Error: Puntos insuficientes',
                pointsNeeded: prize.points_required,
                currentPoints: userPoints
            };
        }

        // 6. Generar código de cupón único
        const couponCode = generateCouponCode();

        // 7. Iniciar transacción (todo o nada)
        await db.query('START TRANSACTION');

        try {
            // 8. Restar puntos al usuario
            const newPoints = userPoints - prize.points_required;
            await db.query(
                'UPDATE users SET points = ? WHERE id = ?',
                [newPoints, userId]
            );

            // 9. Reducir stock del premio
            await db.query(
                'UPDATE prizes SET quantity_available = quantity_available - 1 WHERE id = ?',
                [prizeId]
            );

            // 10. Registrar la redención en winners
            await db.query(
                `INSERT INTO winners (user_id, prize_id, coupon_code, redemption_date)
                 VALUES (?, ?, ?, NOW())`,
                [userId, prizeId, couponCode]
            );

            // 11. Confirmar transacción
            await db.query('COMMIT');

            return {
                success: true,
                message: 'Premio canjeado exitosamente',
                couponCode: couponCode,
                prizeName: prize.name,
                pointsSpent: prize.points_required,
                remainingPoints: newPoints
            };

        } catch (transactionError) {
            // Si algo falla, revertir todo
            await db.query('ROLLBACK');
            throw transactionError;
        }

    } catch (error) {
        console.error('Error en redeemPrize:', error);
        return {
            success: false,
            message: 'Error al canjear premio'
        };
    }
}

/**
 * Obtiene el historial de premios canjeados por un usuario.
 *
 * Valida que el usuario exista y devuelve todos los canjes realizados junto con la información del premio.
 *
 * @async
 * @function getRedemptionHistory
 * @param {number} userId - ID del usuario.
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {boolean} result.success - Indica si la consulta fue exitosa.
 * @returns {Array<Object>} [result.redemptions] - Lista de canjes realizados por el usuario.
 * @returns {number} result.redemptions[].id - ID del registro de canje.
 * @returns {string} result.redemptions[].coupon_code - Código de cupón generado.
 * @returns {Date|string} result.redemptions[].redemption_date - Fecha del canje.
 * @returns {string} result.redemptions[].prize_name - Nombre del premio canjeado.
 * @returns {string} result.redemptions[].description - Descripción del premio.
 * @returns {number} result.redemptions[].points_required - Puntos requeridos para canjear el premio.
 * @returns {string} result.redemptions[].image_url - URL de la imagen del premio.
 * @returns {string} [result.message] - Mensaje de error en caso de fallo.
 *
 * @author Santiago Aguirre
 */
async function getRedemptionHistory(userId) {
    try {
        // Verificar que el usuario existe
        const [users] = await db.query(
            'SELECT id FROM users WHERE id = ?',
            [userId]
        );

        if (users.length === 0) {
            return {
                success: false,
                message: 'Error: Usuario no encontrado'
            };
        }

        // Obtener historial de canjes con información del premio
        const [redemptions] = await db.query(
            `SELECT w.id, w.coupon_code, w.redemption_date,
                    p.name as prize_name, p.description, p.points_required, p.image_url
             FROM winners w
             INNER JOIN prizes p ON w.prize_id = p.id
             WHERE w.user_id = ?
             ORDER BY w.redemption_date DESC`,
            [userId]
        );

        return {
            success: true,
            redemptions: redemptions
        };

    } catch (error) {
        console.error('Error en getRedemptionHistory:', error);
        return {
            success: false,
            message: 'Error al obtener historial'
        };
    }
}

/**
 * Genera un código de cupón único en formato XXX-YYYY-ZZZZ.
 *
 * El código está compuesto por tres bloques separados por guiones:
 * - Bloque 1: 4 caracteres alfabéticos y/o numéricos
 * - Bloque 2: 4 caracteres alfabéticos y/o numéricos
 * - Bloque 3: 4 caracteres alfabéticos y/o numéricos
 *
 * Ejemplo de salida: "AB12-3F4G-ZX9Q"
 *
 * @function generateCouponCode
 * @name generateCouponCode
 * @returns {string} Código de cupón único generado aleatoriamente.
 * 
 * @author Santiago Aguirre
 */
function generateCouponCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    
    // Generar 3 bloques separados por guiones
    for (let block = 0; block < 3; block++) {
        if (block > 0) code += '-';
        
        const blockLength = block === 1 ? 4 : 4; // Todos 4 caracteres
        for (let i = 0; i < blockLength; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    }
    
    return code;
}

/**
 * Obtiene todas las mediciones registradas en la base de datos.
 *
 * Devuelve todas las filas de la tabla `measurements` con todos sus campos.
 *
 * @async
 * @function getMeasurements
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {boolean} result.success - Indica si la consulta fue exitosa.
 * @returns {Array<Object>} [result.measurements] - Lista de mediciones.
 * @returns {number} result.measurements[].id - ID de la medición.
 * @returns {number} result.measurements[].node_id - ID del nodo al que pertenece la medición.
 * @returns {Date|string} result.measurements[].timestamp - Fecha y hora de la medición.
 * @returns {number} result.measurements[].co_value - Valor de CO medido.
 * @returns {number} result.measurements[].o3_value - Valor de O₃ medido.
 * @returns {number} result.measurements[].no2_value - Valor de NO₂ medido.
 * @returns {number} result.measurements[].latitude - Latitud donde se realizó la medición.
 * @returns {number} result.measurements[].longitude - Longitud donde se realizó la medición.
 * @returns {string} [result.message] - Mensaje de error en caso de fallo.
 *
 * @author Santiago Aguirre
 */
async function getMeasurements() {
    try {
        // Obtener todas las medidas disponibles
        const [measurements] = await db.query(
            `SELECT * FROM measurements`
        );

        return {
            success: true,
            measurements: measurements
        };

    } catch (error) {
        console.error('Error en getMeasurements:', error);
        return {
            success: false,
            message: 'Error al obtener medidas'
        };
    }
}

/**
 * Recupera la contraseña de un usuario de forma temporal.
 *
 * Flujo:
 * 1. Busca al usuario por email.
 * 2. Genera una contraseña temporal fija (modo testing).
 * 3. Hashea la contraseña temporal y actualiza la base de datos.
 * 4. Intenta enviar un correo con la contraseña temporal.
 * 5. Siempre devuelve success al frontend por motivos de seguridad,
 *    aunque el correo no exista.
 *
 * @async
 * @function recoverPassword
 * @param {string} email - Correo electrónico del usuario.
 * @returns {Promise<{success: boolean, message: string}>} Resultado de la operación.
 * @returns {boolean} result.success - Indica si la operación fue exitosa.
 * @returns {string} result.message - Mensaje informativo o de error.
 *
 * @author Christopher Yoris
 */
async function recoverPassword(email) {
    try {
        // 1. Buscar usuario por email
        const [users] = await db.query(
            "SELECT id, username FROM users WHERE email = ?",
            [email]
        );

        // Seguridad: siempre devolvemos success aunque el correo no exista
        if (users.length === 0) {
            return { success: true, message: "Si el correo existe, se enviará una contraseña temporal." };
        }

        const user = users[0];

        // 2. Contraseña temporal fija (modo testing)
        const tempPassword = generarPasswordTemporal(); // → "Password1234."

        // 3. Hashear la contraseña temporal
        const hashed = await bcrypt.hash(tempPassword, 10);

        // 4. Actualizar la contraseña del usuario en la base de datos
        await db.query(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashed, user.id]
        );

        // 5. Enviar email (placeholder, no funcionará hasta configurar SMTP)
        try {
            await enviarCorreoRecuperacion(email, user.username, tempPassword);
        } catch (emailError) {
            console.warn("⚠ SMTP no configurado aún — contraseña temporal generada igualmente.");
        }

        return {
            success: true,
            message: "Si el correo existe, se enviará una contraseña temporal."
        };

    } catch (error) {
        console.error("Error en recoverPassword:", error);
        return { success: false, message: "Error interno en recuperación" };
    }
}


// Contraseña temporal FIJA para testing
function generarPasswordTemporal() {
    return "Password1234."; 
}


/**
 * Envía un correo electrónico de recuperación de contraseña a un usuario.
 *
 * Este servicio utiliza Nodemailer para enviar un email con la contraseña temporal generada.
 * Se debe configurar correctamente el usuario y contraseña SMTP para que funcione.
 *
 * @async
 * @function enviarCorreoRecuperacion
 * @param {string} to - Correo electrónico del destinatario.
 * @param {string} username - Nombre de usuario del destinatario.
 * @param {string} tempPassword - Contraseña temporal a incluir en el correo.
 * @returns {Promise<void>} Promesa que se resuelve cuando el correo es enviado.
 *
 * @author Christopher Yoris
 */
async function enviarCorreoRecuperacion(to, username, tempPassword) {

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "PENDIENTE_DE_CONFIGURAR",
            pass: "PENDIENTE_DE_CONFIGURAR"
        }
    });

    const html = `
        <h2>Recuperación de contraseña</h2>
        <p>Hola <strong>${username}</strong>,</p>
        <p>Tu nueva contraseña temporal es:</p>
        <h3>${tempPassword}</h3>
        <p>Inicia sesión y cámbiala cuando quieras.</p>
    `;

    return transporter.sendMail({
        from: "Air-o-Walk <PENDIENTE_DE_CONFIGURAR>",
        to,
        subject: "Tu contraseña temporal",
        html
    });
}



async function generateFakeMeasurements(count) {
    try {
        const insertedMeasurements = [];

        // Definimos el polígono de Gandía
        const polygonCoords = [
            /*[38.9724930637672, -0.18638220396700872],
            [38.9682187335428, -0.17812575220471538],
            [38.96532307289798, -0.18112093279103245],
            [38.962657122009325, -0.1844708058210799],
            [38.9651392174368, -0.1891409229276754],
			[38.9724930637672, -0.18638220396700872]*/
			
			
			/*[39.023155258881275, -0.17927570751465835],
            [38.95718024141943, -0.12495451134952293],
            [38.952280521097805, -0.18181862524944353],
            [38.99636580750054, -0.23080682309674352],
            [39.023155258881275, -0.17927570751465835]*/
			
			
			[38.97619486753026, -0.18349714625501487],
            [38.97333777022671, -0.17411600294874113],
            [38.96897671527094, -0.17846807974031142],
            [38.97160841849363, -0.18649524360031886],
            [38.97619486753026, -0.18349714625501487]
        ];
        const polygon = turf.polygon([polygonCoords.map(c => [c[1], c[0]])]); // [lng, lat]

        // Bounding box del polígono
        const bbox = turf.bbox(polygon); // [minX, minY, maxX, maxY]

        // Fecha actual y hace 3 días
        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

        for (let i = 0; i < count; i++) {
            // Valores aleatorios de gases			
            const co_value = parseFloat(( 2 * 0.5).toFixed(2));
            const o3_value = parseFloat(( 100 * 0.5).toFixed(1));
            const no2_value = parseFloat(( 100 * 0.5).toFixed(1));

            // Coordenadas aleatorias dentro del polígono
            let lat, lng;
            let point;
            do {
                lng = bbox[0] + Math.random() * (bbox[2] - bbox[0]);
                lat = bbox[1] + Math.random() * (bbox[3] - bbox[1]);
                point = turf.point([lng, lat]);
            } while (!turf.booleanPointInPolygon(point, polygon));

            // Node_id fijo
            const nodeId = 153;

            // Timestamp aleatorio últimos 3 días
            const randomTime = new Date(threeDaysAgo.getTime() + Math.random() * (now.getTime() - threeDaysAgo.getTime()));
            const timestamp = randomTime.toISOString().slice(0, 19).replace('T', ' ');

            // Insertamos usando insertMeasurement
			let result = await db.query(
				`INSERT INTO measurements 
				 (node_id, timestamp, co_value, o3_value, no2_value, latitude, longitude)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [nodeId, timestamp, co_value, o3_value, no2_value, lat, lng]
        );
            insertedMeasurements.push({
                nodeId, co_value, o3_value, no2_value, latitude: lat, longitude: lng, timestamp, success: result.success
            });
        }

        return {
            success: true,
            measurements: insertedMeasurements
        };

    } catch (error) {
        console.error('Error en generateFakeMeasurements:', error);
        return {
            success: false,
            message: 'Error al generar e insertar mediciones fake' + error
        };
    }
}


/**
 * Obtiene la medición más cercana a unas coordenadas específicas.
 *
 * Consulta todas las mediciones en la base de datos, calcula la distancia
 * a cada una desde la ubicación objetivo y devuelve la medición más cercana.
 *
 * @async
 * @function getNearestMeasurement
 * @param {number} latTarget - Latitud de referencia.
 * @param {number} lonTarget - Longitud de referencia.
 * @returns {Promise<Object>} Resultado de la operación.
 * @returns {boolean} result.success - Indica si la operación fue exitosa.
 * @returns {Object} [result.data] - Valores de la medición más cercana.
 * @returns {number} result.data.o3_value - Valor de O₃ de la medición más cercana.
 * @returns {number} result.data.no2_value - Valor de NO₂ de la medición más cercana.
 * @returns {string} [result.message] - Mensaje de error en caso de fallo.
 * 
 * @author Maria Algora
 */
async function getNearestMeasurement(latTarget, lonTarget) {
    try {
        const [rows] = await db.query(
            `SELECT id, node_id, timestamp, co_value, o3_value, no2_value, 
                    latitude, longitude FROM measurements`
        );

        if (rows.length === 0) {
            return { success: false, message: "No hay mediciones" };
        }

        const measurementsWithDistance = rows.map(row => {
            const distance = calculateDistance(latTarget, lonTarget, row.latitude, row.longitude);
            return { o3_value: row.o3_value, no2_value: row.no2_value, distance_km: distance };
        });

        const nearest = measurementsWithDistance.sort((a, b) => a.distance_km - b.distance_km)[0];

        return { 
            success: true, 
            data: { 
                o3_value: nearest.o3_value, 
                no2_value: nearest.no2_value 
            } 
        };
    } catch (error) {
        console.error("Error:", error);
        return { success: false, message: "Error en consulta" };
    }
}

/**
 * Calcula la distancia en kilómetros entre dos coordenadas geográficas
 * usando la fórmula del haversine.
 *
 * @function calculateDistance
 * @param {number} lat1 - Latitud del primer punto en grados.
 * @param {number} lon1 - Longitud del primer punto en grados.
 * @param {number} lat2 - Latitud del segundo punto en grados.
 * @param {number} lon2 - Longitud del segundo punto en grados.
 * @returns {number} Distancia entre los dos puntos en kilómetros.
 * 
 * @author Maria Algora
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}




// Exportar todas las funciones
module.exports = {
    registerUser,
    loginUser,
    getUser,
    linkNodeToUser,
    updateUserActivity,
	getLinkedNodeOfUser,
	unlinkNodeFromUser,
	calidad_del_aire_cara_y_mensaje,
    get_tiempo,
    get_distancia,
    get_puntos,
    valores_grafica,
    getAirQualitySummary,
	insertMeasurement,
	addDailyStats,
	apply,
    deleteApplication,
    sendMail,
	getPoints,
	addPoints,
	getAyuntamientos,
	getNodos,
	updateUser,
	getPrizes,
	redeemPrize,
	getRedemptionHistory,
	getMeasurements,
	recoverPassword,
	generateFakeMeasurements,
	getNearestMeasurement
};