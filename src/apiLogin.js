/* añadir estas lineas a la api
const apiLogin = require('./apiLogin');
app.use('/api', apiLogin);*/


const express = require('express');
const { buscarUsuarioPorUsername } = require('./LogicaLogin');
const router = express.Router();

router.get('/login', async (req, res) => {
    try {
        const { usuario, contrasena } = req.query; 

        const usuarioEncontrado = await buscarUsuarioPorUsername(usuario); 

        if (!usuarioEncontrado) {
            return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        if (contrasena !== usuarioEncontrado.password) { 
            return res.status(401).json({ success: false, error: 'Credenciales inválidas' });
        }

        res.json({ success: true, message: 'Login exitoso' });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ success: false, error: 'Error interno del servidor' });
    }
});

module.exports = router;