const express = require('express');
const multer = require('multer');
const { parseCV } = require('../controllers/cv.controller');
const { matchJob } = require('../services/jobMatcher.service');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/status', (req, res) => {
  res.status(200).json({
    module: 'CV Analyzer',
    status: 'Ready for upload and processing'
  });
});

router.post('/upload', upload.single('cv'), parseCV);

router.post('/match', (req, res) => {
  const { candidateSkills, requiredSkills } = req.body;

  if (!candidateSkills || !requiredSkills) {
    return res.status(400).json({ 
      error: 'Se requieren candidateSkills y requiredSkills en el cuerpo de la petición.' 
    });
  }

  const matchResult = matchJob(candidateSkills, requiredSkills);

  return res.status(200).json({
    status: 'success',
    result: matchResult
  });
});

module.exports = router;
