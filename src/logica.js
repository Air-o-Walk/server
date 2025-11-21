const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./config/database');
const nodemailer = require('nodemailer');
const { bienvenida } = require('./config/correo.js');

/**
 * 1. registerUser(username, email, password, townHallId)
 * Hecho por Maria Algora
 * Registra un nuevo usuario en el sistema
 * username, email, password, townHallId ---> registerUser() ---> {success, message} || error "Usuario o email ya existe"
 */
async function registerUser(email) {
    try {

        /* Al colocar las variable en corchetes extrae solamente lo primero que se encuentre en el array de
            respuesta de MySQL, evitando tener que hacer la descontruccion despues
        */

        //1) Obtener la aplicación más reciente por email
        const [apps] = await db.query(
            'SELECT id, first_name, last_name, email, dni, townhall_id FROM applications WHERE email = ? ORDER BY id DESC LIMIT 1',
            [email]
        );

        if (apps.length === 0) return { success: false, message: 'Solicitud no encontrada para ese email' };

        const app = apps[0];
        const applicationId = app.id;
        const firstName = app.first_name;
        const lastName = app.last_name;
        let dni = app.dni;
        const townHallId = app.townhall_id;

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
            return `${preparar(iniciales)}.${preparar(inicialesApellido)}`;
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
/*
*6. getAyuntamientos
*Hecho por Maria Algora
*Devuelve id y nombre del ayuntamiento
* ---> getAyuntamientos() ---> { success: true, data: [ {id, name}, ... ] } || { success: false, message }
*/
async function getAyuntamientos() {
    try {
        const [ayt] = await db.query(
            `SELECT id, name
       FROM town_halls
       ORDER BY name ASC`
        );

        //Creo un array de objetos
        const data = Array.isArray(ayt)
            ? ayt.map(r => ({ id: String(r.id), name: r.name }))
            : [];

        return {
            success: true,
            data
        };

    } catch (error) {
        console.error('Error en getAyuntamientos:', error);
        return {
            success: false,
            message: 'Error al obtener los ayuntamientos'
        };
    }
}

/* 7. apply
*Hecho por Maria Algora
*Guarda solicitud en applications
* firstName, lastName, email, dni, phone, townHallId -> apply ->
*/
async function apply(firstName, lastName, email, dni, phone, townHallId) {
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
            `INSERT INTO applications (email, dni, first_name, last_name, townhall_id)
   VALUES (?, ?, ?, ?, ?)`,
            [email, dni, firstName, lastName, townHallId]
        );

        if (result.affectedRows === 1) {
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
/* 8. deleteApplication
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

/* 9. sendMail
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

// Exportar todas las funciones
module.exports = {
    registerUser,
    loginUser,
    getUser,
    linkNodeToUser,
    updateUserActivity,
    getAyuntamientos,
    apply,
    deleteApplication,
    sendMail
};