const mysql = require('mysql2/promise');

// Configuración de la conexión a MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'Cw15tYyfb_Cxa3k%',
    database: process.env.DB_NAME || 'sagucre_biometria',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Verificar la conexión
pool.getConnection()
    .then(connection => {
        console.log('Conexión a MySQL exitosa');
        connection.release();
    })
    .catch(err => {
        console.error('Error al conectar a MySQL:', err.message);
    });

module.exports = pool;