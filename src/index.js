const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mamut = require('mammoth');
const { Ollama } = require('ollama');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

const app = express();
const PORT = process.env.PORT || 3000;

const ollama = new Ollama({ host: 'http://127.0.0.1:11434' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

const upload = multer({ dest: 'uploads/' });

async function extractTextFromPDF(dataBuffer) {
  if (typeof pdfParse === 'function') {
    return await pdfParse(dataBuffer);
  } else if (pdfParse && typeof pdfParse.default === 'function') {
    return await pdfParse.default(dataBuffer);
  } else {
    const parse = require('pdf-parse');
    return await parse(dataBuffer);
  }
}

const CV_OPTIONS = [
  {
    id: 'executive',
    title: 'Ejecutivo / Directivo',
    description: 'Enfoque en liderazgo de equipos, visión estratégica, gestión de proyectos e impacto de negocio.',
    promptInstruction: 'Reescribe el CV adoptando un tono directivo y de alto nivel. Reestructura el perfil y las experiencias enfatizando liderazgo de equipos, toma de decisiones estratégicas, alineación con objetivos de negocio (OKRs/KPIs), gestión de presupuestos o recursos, e impacto organizacional.'
  },
  {
    id: 'technical',
    title: 'Técnico / Especialista',
    description: 'Énfasis detallado en arquitectura de software, stack tecnológico, herramientas y metodologías.',
    promptInstruction: 'Reescribe el CV enfocándote en la profundidad técnica. Detalla arquitecturas, lenguajes, frameworks, herramientas de infraestructura, automatización, patrones de diseño y metodologías utilizadas en cada rol, resaltando la maestría técnica y resolución de problemas complejos.'
  },
  {
    id: 'results',
    title: 'Orientado a Resultados y Métricas',
    description: 'Orientado a logros cuantitativos, métricas de desempeño, reducciones de tiempo y retorno de inversión.',
    promptInstruction: 'Reescribe las descripciones de experiencia y perfil enfocado agresivamente en MÉTRICAS Y RESULTADOS. Inicia cada punto con verbos de alto impacto (ej: "Optimizó", "Aceleró", "Redujo") y destaca en **negrita** cada porcentaje, cifra monetaria, reducción de tiempo o logro medible.'
  },
  {
    id: 'ats',
    title: 'Moderno y Conciso (Optimizado para ATS)',
    description: 'Formato estructurado, sintácticamente impecable y limpio optimizado para algoritmos de filtrado automático.',
    promptInstruction: 'Reescribe el CV para superar sistemas de seguimiento de candidatos (ATS). Utiliza frases cortas, directas y viñetas claras. Organiza las habilidades clave usando términos estandarizados de la industria y elimina redundancias o florituras.'
  },
  {
    id: 'consultant',
    title: 'Consultoría / Asesoría',
    description: 'Enfoque en resolución de problemas complejos, consultoría cliente-proveedor, entregables y consultoría estratégica.',
    promptInstruction: 'Reescribe el CV como el perfil de un Consultor Senior. Enfatiza la capacidad de diagnóstico, diseño de soluciones a la medida, gestión de partes interesadas (stakeholders), entregables clave y la transformación de procesos de negocio.'
  }
];

app.get('/api/cv/options', (req, res) => {
  res.json({ options: CV_OPTIONS });
});

app.post('/api/cv/upload', upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se subió ningún archivo.' });
    }

    const filePath = req.file.path;
    const ext = path.extname(req.file.originalname).toLowerCase();
    const allowedExtensions = ['.pdf', '.docx', '.txt'];

    if (!allowedExtensions.includes(ext)) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Formato de archivo no permitido. Solo se aceptan archivos PDF (.pdf), Word (.docx) y Texto (.txt).' });
    }

    let text = '';

    if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await extractTextFromPDF(dataBuffer);
      text = pdfData.text || '';
    } else if (ext === '.docx') {
      const result = await mamut.extractRawText({ path: filePath });
      text = result.value || '';
    } else if (ext === '.txt') {
      text = fs.readFileSync(filePath, 'utf8');
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'No se pudo extraer texto del archivo proporcionado.' });
    }

    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

    const commonSkills = ['Node.js', 'Express', 'Docker', 'AWS', 'Python', 'React', 'JavaScript', 'SQL', 'Git', 'TypeScript', 'Java', 'Linux', 'Kubernetes', 'CI/CD'];
    const detectedSkills = commonSkills.filter(s => new RegExp(`\\b${s}\\b`, 'i').test(text));

    res.json({
      success: true,
      extractedData: {
        rawText: text,
        email: emailMatch ? emailMatch[0] : null,
        phone: phoneMatch ? phoneMatch[0] : null,
        skills: detectedSkills
      }
    });

  } catch (err) {
    res.status(500).json({ error: 'Error al procesar el archivo CV: ' + err.message });
  }
});

app.post('/api/cv/rewrite', async (req, res) => {
  try {
    const { rawText, optionId } = req.body;

    if (!rawText || !optionId) {
      return res.status(400).json({ error: 'Texto base u opción no proporcionados.' });
    }

    const selectedOpt = CV_OPTIONS.find(o => o.id === optionId);
    if (!selectedOpt) {
      return res.status(400).json({ error: 'Opción no válida.' });
    }

    const prompt = `Actúa como un experto consultor de carrera y redactor profesional de CVs.
Reescribe en español el siguiente CV adaptando la redacción de forma marcada al enfoque: '${selectedOpt.title}'.

INSTRUCCIÓN ESPECÍFICA DE PERSONA:
${selectedOpt.promptInstruction}

REGLAS DE FORMATO Y CONTENIDO (ESTRICTAS):
- Basa TODA la información ÚNICAMENTE en el CV fuente. NO inventes enlaces, correos, sitios web ni datos que no existan en el texto original.
- Mantiene exactamente UNA sola vez cada sección: CONTACTO, PERFIL PROFESIONAL, HABILIDADES TÉCNICAS, EXPERIENCIA PROFESIONAL, CERTIFICACIONES, EDUCACIÓN y PROYECTOS.
- Genera la respuesta directamente en Markdown sin introducciones, saludos ni notas explicativas.

CV FUENTE:
"""
${rawText}
"""`;

    const response = await ollama.generate({
      model: 'qwen2.5:1.5b',
      prompt: prompt,
      stream: false
    });

    res.json({
      variant: {
        id: selectedOpt.id,
        title: selectedOpt.title,
        description: selectedOpt.description,
        content: response.response.trim()
      }
    });

  } catch (err) {
    res.status(500).json({ error: 'Error en generación con IA Local: ' + err.message });
  }
});

// Endpoint para generar un archivo .docx nativo y limpio
app.post('/api/cv/download-docx', async (req, res) => {
  try {
    const { markdown } = req.body;
    if (!markdown) {
      return res.status(400).json({ error: 'No se proporcionó texto en markdown.' });
    }

    const lines = markdown.split('\n');
    const docChildren = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      if (trimmed.startsWith('# ')) {
        docChildren.push(new Paragraph({
          text: trimmed.replace('# ', ''),
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 120 }
        }));
      } else if (trimmed.startsWith('## ')) {
        docChildren.push(new Paragraph({
          text: trimmed.replace('## ', ''),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 }
        }));
      } else if (trimmed.startsWith('### ')) {
        docChildren.push(new Paragraph({
          text: trimmed.replace('### ', ''),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 150, after: 80 }
        }));
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const bulletText = trimmed.substring(2);
        const parts = bulletText.split(/(\*\*.*?\*\*)/g);
        const runs = parts.map(part => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRun({ text: part.slice(2, -2), bold: true });
          }
          return new TextRun({ text: part });
        });
        docChildren.push(new Paragraph({
          children: runs,
          bullet: { level: 0 },
          spacing: { after: 60 }
        }));
      } else {
        const parts = trimmed.split(/(\*\*.*?\*\*)/g);
        const runs = parts.map(part => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRun({ text: part.slice(2, -2), bold: true });
          }
          return new TextRun({ text: part });
        });
        docChildren.push(new Paragraph({
          children: runs,
          spacing: { after: 100 }
        }));
      }
    });

    const doc = new Document({
      sections: [{
        properties: {},
        children: docChildren
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=CV_Optimizado.docx');
    res.send(buffer);

  } catch (err) {
    res.status(500).json({ error: 'Error al generar Word: ' + err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.url}` });
});

app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
