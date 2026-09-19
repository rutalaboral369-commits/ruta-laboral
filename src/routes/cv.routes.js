const express = require('express');
const multer = require('multer');
const router = express.Router();
const cvController = require('../controllers/cv.controller');

const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('cv'), cvController.uploadCv);
router.post('/match', cvController.matchCv);

module.exports = router;
