const express = require('express');
const cvRoutes = require('./routes/cv.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Ruta Laboral API funcionando con Express',
    hotReload: true,
    timestamp: new Date().toISOString()
  });
});

app.use('/api/cv', cvRoutes);

app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en puerto ${PORT}`);
});
