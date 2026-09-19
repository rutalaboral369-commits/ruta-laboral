const fs = require('fs');
const PDFParser = require('pdf2json');
const mammoth = require('mammoth');

const extractTextFromPDF = (filePath) => {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(this, 1);

    pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
    pdfParser.on("pdfParser_dataReady", () => {
      const rawText = pdfParser.getRawTextContent();
      resolve(rawText);
    });

    pdfParser.loadPDF(filePath);
  });
};

const safeDecodeURI = (str) => {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return unescape(str);
  }
};

exports.uploadCv = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo' });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const originalName = req.file.originalname.toLowerCase();
    let extractedText = '';

    if (mimeType === 'application/pdf' || originalName.endsWith('.pdf')) {
      try {
        extractedText = await extractTextFromPDF(filePath);
        extractedText = safeDecodeURI(extractedText);
      } catch (pdfErr) {
        console.error('Error con pdf2json:', pdfErr);
        throw new Error('No se pudo procesar la estructura interna del PDF.');
      }
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
      originalName.endsWith('.docx')
    ) {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value;
      } catch (docxErr) {
        console.error('Error con mammoth:', docxErr);
        throw new Error('No se pudo extraer el texto del archivo Word (.docx).');
      }
    } else {
      extractedText = fs.readFileSync(filePath, 'utf8');
    }

    // Limpieza del archivo temporal
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (!extractedText.trim()) {
      return res.status(422).json({ 
        error: 'El archivo no contiene texto extraíble.' 
      });
    }

    // Extracción de correo y teléfono vía Regex
    const emailMatch = extractedText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = extractedText.match(/(\+?\d{1,3}[\s-]?)?\(?\d{3,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4}/);

    const knownSkills = [
      'Node.js', 'Express', 'Docker', 'AWS', 'Python', 
      'JavaScript', 'TypeScript', 'React', 'SQL', 'Git', 'Linux'
    ];

    const foundSkills = knownSkills.filter(skill => 
      new RegExp(`\\b${skill.replace('.', '\\.')}\\b`, 'i').test(extractedText)
    );

    return res.status(200).json({
      message: 'CV procesado con éxito',
      extractedData: {
        email: emailMatch ? emailMatch[0] : null,
        phone: phoneMatch ? phoneMatch[0] : null,
        skills: foundSkills,
        rawLength: extractedText.length
      }
    });

  } catch (error) {
    console.error('Error en uploadCv:', error.message);
    return res.status(500).json({ error: error.message || 'Error al procesar el archivo de CV' });
  }
};

exports.matchCv = (req, res) => {
  try {
    const { candidateSkills = [], requiredSkills = [] } = req.body;

    const candidateNormalized = candidateSkills.map(s => s.toLowerCase());
    const matchedSkills = [];
    const missingSkills = [];

    requiredSkills.forEach(skill => {
      if (candidateNormalized.includes(skill.toLowerCase())) {
        matchedSkills.push(skill);
      } else {
        missingSkills.push(skill);
      }
    });

    const score = requiredSkills.length > 0 
      ? Math.round((matchedSkills.length / requiredSkills.length) * 100) 
      : 0;

    return res.status(200).json({
      result: {
        matchScore: `${score}%`,
        matchedSkills,
        missingSkills
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'Error calculando coincidencia' });
  }
};
