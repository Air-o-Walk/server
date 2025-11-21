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

/**
 * 6. updateUser(userId, updateData)
 * Actualiza la información del perfil de usuario (username, email, password)
 * 
 * userId, {username, email, current_password, new_password} ---> updateUser() ---> {success, message, user} || error
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

// Exportar todas las funciones
module.exports = {
    registerUser,
    loginUser,
    getUser,
    linkNodeToUser,
    updateUserActivity
};