const pdfParse = require('pdf-parse');
const { extractCVData } = require('../services/cvExtractor.service');

const parseCV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha adjuntado ningún archivo.' });
    }

    let extractedText = '';

    if (req.file.mimetype === 'application/pdf' || req.file.originalname.endsWith('.pdf')) {
      const pdfData = await pdfParse(req.file.buffer);
      extractedText = pdfData.text;
    } else {
      extractedText = req.file.buffer.toString('utf-8');
    }

    const structuredData = extractCVData(extractedText);

    return res.status(200).json({
      status: 'success',
      fileName: req.file.originalname,
      extractedData: structuredData,
      previewText: extractedText.substring(0, 200)
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error al procesar el archivo de CV',
      details: error.message
    });
  }
};

module.exports = { parseCV };
