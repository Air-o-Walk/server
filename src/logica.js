const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./config/database');

/**
 * 1. registerUser(username, email, password, townHallId)
 * Registra un nuevo usuario en el sistema
 * 
 * username, email, password, townHallId ---> registerUser() ---> {success, message} || error "Usuario o email ya existe"
 */
async function registerUser(username, email, password, townHallId) {
    try {

        /* Al colocar las variable en corchetes extrae solamente lo primero que se encuentre en el array de
            respuesta de MySQL, evitando tener que hacer la descontruccion despues
        */

        // Verificar si el usuario o email ya existen
        const [existingUsers] = await db.query(
            'SELECT * FROM users WHERE email = ? OR username = ?',
            [email, username]
        );

        if (existingUsers.length > 0) {
            return {
                success: false,
                message: 'Error: Usuario o email ya existe'
            };
        }

        // Buscar el rol por defecto "citizen"
        const [roles] = await db.query(
            'SELECT id FROM roles WHERE name = ?',
            ['walker']
        );

        if (roles.length === 0) {
            return {
                success: false,
                message: 'Error: Rol citizen no encontrado'
            };
        }

        const roleId = roles[0].id;

        // Cifrar la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear el nuevo usuario
        await db.query(
            `INSERT INTO users (username, email, password, role_id, points, active_hours, total_distance, town_hall_id) 
             VALUES (?, ?, ?, ?, 0, 0, 0, ?)`,
            [username, email, hashedPassword, roleId, townHallId]
        );

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
 * Vincula un nodo/sensor a un usuario
 * 
 * userId, nodeName ---> linkNodeToUser() ---> {success, message, nodeId} || error "Usuario no encontrado"
 */
async function linkNodeToUser(userId, nodeName) {
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

        // Obtener timestamp actual en milisegundos
        const currentTimestamp = Date.now();

        // Crear el nuevo nodo
        const [result] = await db.query(
            `INSERT INTO nodes (user_id, name, status, lastStatusUpdate) 
             VALUES (?, ?, 'active', ?)`,
            [userId, nodeName, currentTimestamp]
        );

        return {
            success: true,
            message: 'Nodo vinculado correctamente',
            nodeId: result.insertId
        };

    } catch (error) {
        console.error('Error en linkNodeToUser:', error);
        return {
            success: false,
            message: 'Error al vincular nodo'
        };
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
    getNodos
};