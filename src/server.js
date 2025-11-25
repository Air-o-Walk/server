require('dotenv').config();
const app = require('./api');

const PORT = process.env.PORT || 3000;

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`📡 API disponible en: http://localhost:${PORT}`);
    console.log(`📍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});


app.get('/estadoNodos', (req, res) => {
  res.sendFile(path.join(__dirname, 'estadoNodos.html'));
});