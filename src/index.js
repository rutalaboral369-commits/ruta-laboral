const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const mamut = require('mammoth');
const { Ollama } = require('ollama');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, BorderStyle } = require('docx');

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
    promptInstruction: 'Reescribe el perfil profesional y adapta la redacción con un tono directivo y estratégico, sin alterar fechas, cargos ni datos reales del CV fuente.'
  },
  {
    id: 'technical',
    title: 'Técnico / Especialista',
    description: 'Énfasis detallado en arquitectura de software, stack tecnológico, herramientas y metodologías.',
    promptInstruction: 'Optimiza la redacción técnica destacando el stack y metodologías usadas, manteniendo intactas las fechas, empresas y cargos originales.'
  },
  {
    id: 'results',
    title: 'Orientado a Resultados y Métricas',
    description: 'Orientado a logros cuantitativos, métricas de desempeño, reducciones de tiempo y retorno de inversión.',
    promptInstruction: 'Refuerza los logros existentes con un tono orientado a impacto y métricas, respetando estrictamente los datos, fechas y cargos del CV fuente sin inventar información.'
  },
  {
    id: 'ats',
    title: 'Moderno y Conciso (Optimizado para ATS)',
    description: 'Formato estructurado, sintácticamente impecable y limpio optimizado para algoritmos de filtrado automático.',
    promptInstruction: 'Estructura el contenido de manera limpia, directa y profesional para superar filtros ATS, conservando rigurosamente fechas, nombres y cargos originales.'
  },
  {
    id: 'consultant',
    title: 'Consultoría / Asesoría',
    description: 'Enfoque en resolución de problemas complejos, consultoría cliente-proveedor, entregables y consultoría estratégica.',
    promptInstruction: 'Adapta el tono hacia consultoría senior y gestión de soluciones, manteniendo estrictamente los datos, fechas y cargos originales del CV fuente.'
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

    const prompt = `Actúa estrictamente como un motor de formateo y optimización de CVs. 
Tu única tarea es reescribir y organizar el siguiente CV fuente en español.

INSTRUCCIÓN DE ADAPTACIÓN:
${selectedOpt.promptInstruction}

REGLAS DE FIDELIDAD ABSOLUTA (ESTRICTAS):
1. PROHIBIDO alterar fechas, periodos, nombres de empresas o cargos del CV fuente. Deben copiarse exactamente como aparecen en el original.
2. PROHIBIDO inventar métricas, habilidades o logros que no estén explícitamente en el texto fuente.
3. En HABILIDADES TÉCNICAS, lista únicamente las tecnologías y herramientas agrupadas por categoría (ej: Cloud, IaC, Lenguajes). No conviertas las habilidades en viñetas de logros.
4. PROHIBIDO agregar notas conversacionales, comentarios o secciones de "NOTAS" al final del documento.
5. Usa la siguiente estructura obligatoria en Markdown limpio (sin delimitadores \`\`\`):

# Nombre Completo
Correo | Teléfono | Ubicación | LinkedIn

## PERFIL PROFESIONAL
(Texto)

## HABILIDADES TÉCNICAS
- **Categoría:** Tecnologías y herramientas

## EXPERIENCIA LABORAL
### Puesto — Empresa
Fechas | Ubicación
- Logro 1

## CERTIFICACIONES
- Certificación

## IDIOMAS
- Idioma

## EDUCACIÓN
- Título | Institución | Años

## PROYECTOS DESTACADOS
### Nombre del Proyecto
- Descripción

CV FUENTE:
"""
${rawText}
"""`;

    const response = await ollama.generate({
      model: 'qwen2.5:1.5b',
      prompt: prompt,
      stream: false
    });

    let cleanedContent = (response.response || '').trim();
    cleanedContent = cleanedContent.replace(/^```(?:markdown)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // Eliminar cualquier bloque parásito de notas o explicaciones que la IA agregue al final
    const notesIndex = cleanedContent.search(/\n(#{1,3}\s*)?NOTAS?:?/i);
    if (notesIndex !== -1) {
      cleanedContent = cleanedContent.substring(0, notesIndex).trim();
    }

    res.json({
      variant: {
        id: selectedOpt.id,
        title: selectedOpt.title,
        description: selectedOpt.description,
        content: cleanedContent
      }
    });

  } catch (err) {
    console.error("Error en /api/cv/rewrite:", err);
    res.status(500).json({ error: 'Error en generación con IA Local: ' + err.message });
  }
});

app.post('/api/cv/download-docx', async (req, res) => {
  try {
    const { markdown } = req.body;
    if (!markdown) {
      return res.status(400).json({ error: 'No se proporcionó texto en markdown.' });
    }

    const lines = markdown.split('\n');
    const docChildren = [];
    let lastLine = '';
    const seenSections = new Set();

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('```')) return;

      if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
        const normalizedHeading = trimmed.toLowerCase();
        if (seenSections.has(normalizedHeading)) return;
        seenSections.add(normalizedHeading);
      }

      if (trimmed === lastLine && (trimmed.startsWith('- ') || trimmed.startsWith('* '))) return;
      lastLine = trimmed;

      if (trimmed.startsWith('# ')) {
        docChildren.push(new Paragraph({
          children: [new TextRun({ text: trimmed.replace('# ', '').toUpperCase(), bold: true, size: 36, color: "0F172A", font: "Arial" })],
          spacing: { after: 120 }
        }));
      } else if (trimmed.startsWith('## ')) {
        docChildren.push(new Paragraph({
          children: [new TextRun({ text: trimmed.replace('## ', '').toUpperCase(), bold: true, size: 24, color: "1E3A8A", font: "Arial" })],
          border: { bottom: { color: "2563EB", space: 4, value: BorderStyle.SINGLE, size: 12 } },
          spacing: { before: 240, after: 120 }
        }));
      } else if (trimmed.startsWith('### ')) {
        docChildren.push(new Paragraph({
          children: [new TextRun({ text: trimmed.replace('### ', ''), bold: true, size: 22, color: "334155", font: "Arial" })],
          spacing: { before: 160, after: 80 }
        }));
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const bulletText = trimmed.replace(/^[-*]\s+/, '');
        const parts = bulletText.split(/(\*\*.*?\*\*)/g);
        const runs = parts.map(part => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return new TextRun({ text: part.slice(2, -2), bold: true, size: 20, font: "Arial", color: "0F172A" });
          }
          return new TextRun({ text: part, size: 20, font: "Arial", color: "334155" });
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
            return new TextRun({ text: part.slice(2, -2), bold: true, size: 20, font: "Arial", color: "0F172A" });
          }
          return new TextRun({ text: part, size: 20, font: "Arial", color: "334155" });
        });
        docChildren.push(new Paragraph({
          children: runs,
          spacing: { after: 100 }
        }));
      }
    });

    const doc = new Document({
      sections: [{
        properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
        children: docChildren
      }]
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', 'attachment; filename=CV_Profesional.docx');
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
