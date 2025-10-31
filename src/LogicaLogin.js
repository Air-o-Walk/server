const { Database } = require('./database');

async function buscarUsuarioPorUsername(username) {
    try {
        const database = new Database();
        const [rows] = await database.pool.execute(
            `SELECT * FROM users WHERE username = ?`,
            [username]
        );
        return rows[0] || null;
    } catch (error) {
        console.error('Error buscando usuario por username:', error);
        throw error;
    }
}

module.exports = { buscarUsuarioPorUsername };