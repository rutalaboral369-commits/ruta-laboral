const express = require('express');
const cors = require('cors');
const path = require('path');
const cvRoutes = require('./routes/cv.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir la carpeta public con ruta absoluta estricta
const publicPath = path.resolve(__dirname, '../public');
app.use(express.static(publicPath));

// Ruta explícita para la raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

app.use('/api/cv', cvRoutes);

module.exports = app;
