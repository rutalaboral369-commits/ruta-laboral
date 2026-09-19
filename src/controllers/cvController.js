import { parseCvFile } from '../services/parserService.js';
import { calculateSkillMatch } from '../services/matchingService.js';
import { rewriteCVVariant, OPTION_DEFINITIONS } from '../services/aiService.js';

export async function uploadAndProcessCv(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const extractedData = await parseCvFile(req.file.buffer, req.file.mimetype);

    return res.status(200).json({
      message: 'CV procesado exitosamente',
      extractedData
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export function matchSkills(req, res) {
  try {
    const { candidateSkills, requiredSkills } = req.body;
    
    if (!candidateSkills || !requiredSkills) {
      return res.status(400).json({ error: 'Faltan parámetros de habilidades' });
    }

    const matchResult = calculateSkillMatch(candidateSkills, requiredSkills);

    return res.status(200).json({
      result: matchResult
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

export function getOptions(req, res) {
  return res.status(200).json({ options: OPTION_DEFINITIONS });
}

export async function rewriteCv(req, res) {
  try {
    const { rawText, optionId } = req.body;

    if (!rawText || !optionId) {
      return res.status(400).json({ error: 'Falta el texto del CV o el ID de la variante seleccionada' });
    }

    const variant = await rewriteCVVariant(rawText, optionId);

    return res.status(200).json({
      variant
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
