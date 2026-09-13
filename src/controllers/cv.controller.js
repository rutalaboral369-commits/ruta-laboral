const pdfParse = require('pdf-parse');

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
      // Soporte para archivos de texto plano (.txt / .md)
      extractedText = req.file.buffer.toString('utf-8');
    }

    return res.status(200).json({
      status: 'success',
      fileName: req.file.originalname,
      textLength: extractedText.length,
      previewText: extractedText.substring(0, 300)
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Error al procesar el archivo de CV',
      details: error.message
    });
  }
};

module.exports = { parseCV };
