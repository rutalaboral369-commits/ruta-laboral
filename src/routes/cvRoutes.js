import express from 'express';
import multer from 'multer';
import { uploadAndProcessCv, matchSkills, rewriteCv, getOptions } from '../controllers/cvController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/upload', upload.single('cv'), uploadAndProcessCv);
router.post('/match', matchSkills);
router.get('/options', getOptions);
router.post('/rewrite', rewriteCv);

export default router;
