const jwt = require('jsonwebtoken');
const db = require('./config/database');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const { bienvenida } = require('./config/correo.js');



/**
 * 1. registerUser(email)
 * Hecho por Maria Algora
 * Registra un nuevo usuario en el sistema
 * email ---> registerUser() ---> {success, message} || error "Usuario o email ya existe"
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

		console.log("ANTES DE INSERTAR USUARIO")
		

		console.log(townHallId)
				console.log("DESPUES DE TOWNHALL")

		
		
        // Crear el nuevo usuario
        const [nuevoUsuario] = await db.query(
            `INSERT INTO users (username, email, password, role_id, points, active_hours, total_distance, town_hall_id) 
             VALUES (?, ?, ?, ?, 0, 0, 0, ?)`,
            [username, email, hashedPassword, roleId, townHallId]
        );
		
		console.log("DESPUES DE INSERTAR USUARIO")


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
 * 3. getUser(userId)
 * Obtiene la información de un usuario
 * 
 * userId ---> getUser() ---> {success, user: {username, email, points, active_hours, total_distance, town_hall, role}} || error "Usuario no encontrado"
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
 * 4. linkNodeToUser(userId, nodeName)
 * Vincula un nodo/sensor a un usuario evitando duplicados
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
 * 5. updateUserActivity(userId, time, distance)
 * Actualiza las horas activas y distancia recorrida de un usuario
 * 
 * userId, time, distance ---> updateUserActivity() ---> {success, message, active_hours, total_distance} || error "Usuario no encontrado"
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
 * getLinkedNodeOfUser(userId)
 * Hecho por Meryame Ait Boumlik
 * Devuelve el nodo vinculado actualmente a un usuario
 * userId ---> getLinkedNodeOfUser() ---> {success, node} || {success:false}
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
 * unlinkNodeFromUser(userId)
 * Hecho por Meryame Ait Boumlik
 * Elimina la vinculación del nodo activo de un usuario
 * userId ---> unlinkNodeFromUser() ---> {success:true} || {success:false}
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
 * calidad_del_aire_cara_y_mensaje(userId)
 * Hecho por Meryame Ait Boumlik
 * Calcula el estado general de la calidad del aire y un mensaje resumen usando las mediciones del nodo vinculado en las últimas 8 horas.
 * Diseño: userId → calidad_del_aire_cara_y_mensaje() →  {success, status, summaryText}
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
 * get_tiempo(userId)
 * Hecho por Meryame Ait Boumlik
 * Obtiene el tiempo activo acumulado por el usuario en las últimas 8 horas desde la tabla daily_stats.
 * Diseño: userId → get_tiempo() → {success, timeHours}
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
 * get_distancia(userId)
 * Hecho por Meryame Ait Boumlik
 * Obtiene la suma de distancia recorrida por el usuario en las últimas 8 horas desde la tabla daily_stats.
 * Diseño: userId → get_distancia() → {success, distanceKm}
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
 * get_puntos(userId)
 * Hecho por Meryame Ait Boumlik
 * Obtiene la suma de puntos del usuario en las últimas 8 horas
 * desde la tabla daily_stats.
 * Diseño: userId → get_puntos() → {success, points} 
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
 * valores_grafica(userId)
 * Hecho por Meryame Ait Boumlik
 * Obtiene los valores necesarios para dibujar la gráfica de calidad del aire
 * (O₃, NO₂, CO y horas) de las últimas 8 horas del nodo vinculado al usuario.
 * Diseño: userId → valores_grafica() → {success, graph:{[timestamps], [o3], [no2], [co]}}
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

        rows.forEach(row => {
            const date = new Date(row.timestamp);
            const label = date.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
            });

            timestamps.push(label);
            o3.push(row.o3_value || 0);
            no2.push(row.no2_value || 0);
            co.push(row.co_value || 0);
        });

        return {
            success: true,
            graph: {
                timestamps,
                o3,
                no2,
                co
            }
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
 * getAirQualitySummary(userId)
 * Hecho por Meryame Ait Boumlik
 * Obtiene el resumen completo de calidad del aire para un usuario.
 * Combina: estado del aire, tiempo activo, distancia, puntos y datos de gráfica.
 * Diseño: userId → getAirQualitySummary() → {success, status, summaryText, timeHours, distanceKm, points, graph}
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
 * clasificarCalidadDelAire(measurements)
 * Hecho por Meryame Ait Boumlik
 * Clasifica la calidad del aire según umbrales de O₃, NO₂ y CO.
 * Diseño: measurements[] → clasificarCalidadDelAire() → {status, summaryText}
 */
function clasificarCalidadDelAire(measurements) {
    let o3High = 0, o3Mid = 0;
    let no2High = 0, no2Mid = 0;
    let coHigh = 0, coMid = 0;

    measurements.forEach(m => {
        const o3 = m.o3_value || 0;
        const no2 = m.no2_value || 0;
        const co = m.co_value || 0;

        // O3 (µg/m3) 
        if (o3 > 300) o3High++;
        else if (o3 > 200) o3Mid++;

        // NO2 (µg/m3)
        if (no2 > 188) no2High++;
        else if (no2 > 94) no2Mid++;

        // CO (ppm)
        if (co > 15) coHigh++;
        else if (co > 5) coMid++;
    });

    const total = measurements.length;
    let status;
    let summaryText;

    if (o3High === 0 && no2High === 0 && coHigh === 0 &&
        o3Mid < total * 0.2 &&
        no2Mid < total * 0.2 &&
        coMid < total * 0.2) {

        status = 'buena';
        summaryText = 'La calidad del aire ha sido buena durante tu recorrido.';
    }
    else if (o3High === 0 && no2High === 0 && coHigh === 0) {
        status = 'regular';
        summaryText = 'La calidad del aire ha sido aceptable, con algunos valores moderados.';
    }
    else if (o3High < total * 0.3 &&
             no2High < total * 0.3 &&
             coHigh < total * 0.3) {

        status = 'picos';
        summaryText = 'En general el aire ha sido razonable, pero con varios picos de contaminación.';
    }
    else {
        status = 'mala';
        summaryText ='La calidad del aire ha sido mala en varios momentos de tu recorrido.';
    }

    return { status, summaryText };
}
/**
 * insertMeasurement(nodeId, co, o3, no2, latitude, longitude)
 * Hecho por Meryame Ait Boumlik
 * Inserta una medición de un nodo en la tabla measurements.
 * Diseño: (nodeId, co, o3, no2, lat, lon) → insertMeasurement() → guarda fila o error.
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
 * addDailyStats(userId, activeHours, distance, points)
 * Hecho por Meryame Ait Boumlik
 * Registra una nueva entrada en daily_stats.
 * Diseño: (userId, hours, distance, points) → addDailyStats() → inserta fila o error.
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

/*
*. getAyuntamientos
*Hecho por Maria Algora
*Devuelve id y nombre del ayuntamiento
* ---> getAyuntamientos() ---> { success: true, data: [ {id, name}, ... ] } || { success: false, message }
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
/* . apply
*Hecho por Maria Algora
*Guarda solicitud en applications
* firstName, lastName, email, dni, phone, townHallId -> apply ->
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
/* . deleteApplication
 * Hecho por Maria Algora
 * Elimina una solicitud de applications por id.
 * applicationId -> deleteapplication ->
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

/* . sendMail
 * Hecho por Maria Algora
 * Envía correo de bienvenida usando la función `bienvenida` de config/correo.js
 * to, firstName, username, rawPassword -> sendEmail ->
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
 * getPoints(userId)
 * Obtiene los puntos totales de un usuario
 * 
 * userId ---> getPoints() ---> {success: true, points: number} || {success: false, message: string}
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
 * addPoints(userId, points)
 * Suma puntos al total del usuario
 * 
 * userId, points ---> addPoints() ---> {success: true, message: string, totalPoints: number} || {success: false, message: string}
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

//Hecho por Maria ALgora
//Muestra estados de los nodos
/**
 * Servicio para la gestión y consulta de nodos
 * Ahora actualiza automáticamente ambos estados: inactive -> active y active -> inactive
 */
async function getNodos(tipo = 'todos') {
    try {
        const UMBRALES = {
            CO_MAX: 50,
            O3_MAX: 500,
            NO2_MAX: 500,
            HORAS_INACTIVIDAD: 24,
            INTERVALO_MEDICIONES: 24,
            HORAS_RECIENTES: 1 // Para considerar un nodo como activo reciente
        };

        // Validar tipo de consulta
        const tiposValidos = ['todos', 'inactivos', 'erroneos'];
        if (!tiposValidos.includes(tipo)) {
            return {
                success: false,
                message: 'Tipo de informe no válido',
                nodos: []
            };
        }

        // 1. PRIMERO: Actualizar estados automáticamente en ambas direcciones
        
        // 1a. Activar nodos que tienen mediciones recientes (inactive -> active)
        const activateQuery = `
            UPDATE nodes 
            SET status = 'active',
                lastStatusUpdate = NOW()
            WHERE status = 'inactive'
            AND id IN (
                SELECT DISTINCT node_id 
                FROM measurements 
                WHERE timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
            )
        `;
        
        const [activateResult] = await db.query(activateQuery, [UMBRALES.HORAS_RECIENTES]);

        // 1b. Desactivar nodos inactivos por más de 24h (active -> inactive)
        const deactivateQuery = `
            UPDATE nodes 
            SET status = 'inactive',
                lastStatusUpdate = NOW()
            WHERE 
                (lastStatusUpdate IS NULL OR TIMESTAMPDIFF(HOUR, lastStatusUpdate, NOW()) > ?)
                AND status = 'active'
        `;
        
        const [deactivateResult] = await db.query(deactivateQuery, [UMBRALES.HORAS_INACTIVIDAD]);

        // 2. LUEGO: Consultar los nodos según el tipo solicitado
        if (tipo === 'todos') {
            const query = `
                SELECT 
                    n.id,
                    n.name,
                    u.username,
                    n.status,
                    n.lastStatusUpdate,
                    TIMESTAMPDIFF(HOUR, n.lastStatusUpdate, NOW()) as horas_desde_actualizacion,
                    EXISTS (
                        SELECT 1 FROM measurements m 
                        WHERE m.node_id = n.id 
                        AND m.timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                    ) as tiene_mediciones_recientes
                FROM nodes n
                LEFT JOIN users u ON n.user_id = u.id
                ORDER BY n.name ASC
            `;

            const [nodos] = await db.query(query, [UMBRALES.HORAS_RECIENTES]);
            return {
                success: true,
                nodos: nodos,
                actualizados: {
                    activados: activateResult.affectedRows,
                    desactivados: deactivateResult.affectedRows
                }
            };
        }

        // Nodos inactivos (>24 horas)
        if (tipo === 'inactivos') {
            const query = `
                SELECT 
                    n.id,
                    n.name,
                    u.username,
                    n.status,
                    n.lastStatusUpdate,
                    TIMESTAMPDIFF(HOUR, n.lastStatusUpdate, NOW()) as horas_inactivo,
                    EXISTS (
                        SELECT 1 FROM measurements m 
                        WHERE m.node_id = n.id 
                        AND m.timestamp >= DATE_SUB(NOW(), INTERVAL ? HOUR)
                    ) as tiene_mediciones_recientes
                FROM nodes n
                LEFT JOIN users u ON n.user_id = u.id
                WHERE 
                    n.status = 'inactive'
                ORDER BY horas_inactivo DESC
            `;

            const [nodosInactivos] = await db.query(query, [UMBRALES.HORAS_RECIENTES]);
            return {
                success: true,
                nodos: nodosInactivos,
                actualizados: {
                    activados: activateResult.affectedRows,
                    desactivados: deactivateResult.affectedRows
                }
            };
        }

        // Nodos con lecturas erróneas
        if (tipo === 'erroneos') {
            // 1. Nodos con valores fuera de rango
        const queryOutOfRange = `
            SELECT DISTINCT n.id, n.name, n.status, u.username
            FROM nodes n
			LEFT JOIN users u ON n.user_id = u.id
            JOIN measurements m ON n.id = m.node_id
            WHERE (
                m.co_value < 0 OR m.co_value > 50 OR
                m.o3_value < 0 OR m.o3_value > 500 OR
                m.no2_value < 0 OR m.no2_value > 500
            )
            AND m.timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `;
        const [outOfRange] = await db.query(queryOutOfRange);

        // 2. Nodos con valores fijos (p.ej. CO)
        const queryFixed = `
             SELECT 
        n.id, 
        n.name, 
        n.status,
		u.username
    FROM nodes n
	LEFT JOIN users u ON n.user_id = u.id
    JOIN measurements m ON n.id = m.node_id
    WHERE m.timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    GROUP BY n.id, n.name, n.status
    HAVING 
        COUNT(*) >= 3
        AND (
            COUNT(DISTINCT m.co_value) <= 2
            OR COUNT(DISTINCT m.o3_value) <= 2
            OR COUNT(DISTINCT m.no2_value) <= 2
        )
        `;
        const [fixedValues] = await db.query(queryFixed);

        // 3. Nodos con cambios bruscos (p.ej. CO)
        const queryAbrupt = `
    SELECT 
        n.id, 
        n.name, 
        n.status,
		u.username
    FROM nodes n
	LEFT JOIN users u ON n.user_id = u.id
    JOIN measurements m ON n.id = m.node_id
    WHERE m.timestamp >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
    GROUP BY n.id, n.name, n.status
    HAVING 
        (MAX(m.co_value)  - MIN(m.co_value))  > 100
        OR (MAX(m.o3_value)  - MIN(m.o3_value))  > 100
        OR (MAX(m.no2_value) - MIN(m.no2_value)) > 100
        `;
        const [abruptChanges] = await db.query(queryAbrupt);

        // Junta todos los nodos y elimina duplicados por id
        const allNodes = [...outOfRange, ...fixedValues, ...abruptChanges];
        const seen = new Set();
        const erroneousNodes = [];
        for (const node of allNodes) {
            if (!seen.has(node.id)) {
                erroneousNodes.push(node);
                seen.add(node.id);
            }
        }
		return { success: true, nodos: erroneousNodes };
    }

    } catch (error) {
        console.error('Error en getNodos:', error);
        return {
            success: false,
            message: 'Error al generar informe',
            nodos: []
        };
    }
}

//Hecho por Maria ALgora
//Actualiza el perfil
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
                message: 'Error: No se detectaron cambios para actualizar'
            };
        }

        // Agregar userId al final de los valores para la condición WHERE
        values.push(userId);

        // Actualizar en la base de datos
        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        await db.query(query, values);

    } catch (error) {
        console.error('Error en updateUser:', error);
        return {
            success: false,
            message: 'Error al actualizar usuario: ' + error.message
        };
    }
}

/**
 * AUTOR: SANTIAGO AGUIRRE
 * getPrizes()
 * Obtiene todas las recompensas activas disponibles
 * 
 * ---> getPrizes() ---> {success: true, prizes: [...]} || {success: false, message: string}
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
 * AUTOR: SANTIAGO AGUIRRE
 * redeemPrize(userId, prizeId)
 * Canjea puntos del usuario por un premio
 * Valida puntos suficientes, stock disponible y actualiza todo
 * 
 * userId, prizeId ---> redeemPrize() ---> {success: true, couponCode, remainingPoints} || {success: false, message}
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
 * AUTOR: SANTIAGO AGUIRRE
 * getRedemptionHistory(userId)
 * Obtiene el historial de premios canjeados por un usuario
 * 
 * userId ---> getRedemptionHistory() ---> {success: true, redemptions: [...]}
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
 * AUTOR: SANTIAGO AGUIRRE
 * Función auxiliar para generar códigos de cupón únicos
 * Formato: XXX-YYYY-ZZZZ (ejemplo: ABC-1234-XY9Z)
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


async function getNodos(tipo = 'todos') {
    try {
        const CO_MAX = 50;        // CO máximo en ppm
        const O3_MAX = 500;      // Ozono máximo en μg/m³
        const NO2_MAX = 500;     // NO2 máximo en μg/m³

        let query = `
            SELECT 
                n.id,
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

        //El criterio son 24h inactividad
        if (tipo === 'inactivos') {
            const nodosInactivos = todosNodos.filter(nodo => {
                const horasInactivo = (new Date() - new Date(nodo.lastStatusUpdate)) / (1000 * 60 * 60);
                return horasInactivo > 24;
            });

            return {
                success: true,
                nodos: nodosInactivos
            };
        }

        //El criterio son valores extremos, mediciones identicas y cambios bruscos
        if (tipo === 'erroneos') {
            const queryErroneos = `WITH mediciones_recientes AS (
                SELECT 
                    node_id,
                    co_value,
                    o3_value, 
                    no2_value,
                    timestamp
                FROM measurements 
                WHERE timestamp >= DATE_SUB(NOW(), INTERVAL 4 HOUR)
            )
            SELECT DISTINCT n.id
            FROM nodes n
            LEFT JOIN mediciones_recientes m ON n.id = m.node_id
            WHERE (
                -- 1. VALORES IRREALES
                m.co_value > 50 OR m.co_value < 0 OR
                m.o3_value > 500 OR m.o3_value < 0 OR
                m.no2_value > 500 OR m.no2_value < 0

                -- 2. LECTURAS FIJAS (SOLO 2 VALORES DISTINTOS EN 4H)
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
                
                -- 3. CAMBIOS BRUSCOS
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
            HAVING COUNT(m.id) >= 4`;

            //Tomo los ID de los erroneos
            const [nodosErroneosIds] = await db.query(queryErroneos);
            const idsErroneos = nodosErroneosIds.map(item => item.id);
            //Y de todos los nodos tomos filtro pot id para listar solo los erroneos
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
        console.error('Error en getNodos:', error);
        return {
            success: false,
            message: 'Error al generar informe'
        };
    }
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
	getRedemptionHistory
    updateUserActivity,
    getNodos
};