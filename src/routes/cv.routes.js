const express = require('express');
const multer = require('multer');
const { parseCV } = require('../controllers/cv.controller');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/status', (req, res) => {
  res.status(200).json({
    module: 'CV Analyzer',
    status: 'Ready for upload and processing'
  });
});

router.post('/upload', upload.single('cv'), parseCV);

module.exports = router;
