import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'DUMMY_KEY');

export const OPTION_DEFINITIONS = [
  { id: 1, title: "Executive / Managerial", description: "Enfoque en liderazgo, gestión de equipos, estrategia, presupuesto e impacto de negocio." },
  { id: 2, title: "Technical / Specialist", description: "Énfasis técnico detallado en arquitecturas, herramientas, APIs, lenguajes y metodologías." },
  { id: 3, title: "Results & Metrics Driven", description: "Orientado a logros cuantificables, optimización de KPIs, porcentajes de mejora y retorno." },
  { id: 4, title: "Modern & Concise (ATS-Friendly)", description: "Formato limpio, moderno y estructurado específicamente para pasar filtros ATS." },
  { id: 5, title: "Consultant / Advisory", description: "Destaca la resolución de problemas de negocio, consultoría integral y valor para el cliente." }
];

export async function rewriteCVVariant(rawText, optionId) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY no está configurada en el archivo .env');
  }

  const selected = OPTION_DEFINITIONS.find(o => o.id === parseInt(optionId));
  if (!selected) {
    throw new Error('Opción de variante no válida');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `
Eres un reclutador experto y redactor profesional de currículums.
Tu tarea es reescribir y optimizar el siguiente CV según el enfoque específico solicitado.

ENFOQUE SOLICITADO:
- Estilo: ${selected.title}
- Objetivo: ${selected.description}

CV ORIGINAL DE ENTRADA:
"""
${rawText}
"""

INSTRUCCIONES DE FORMATO:
1. Retén los datos reales de la persona (experiencia, fechas, empresas, tecnologías).
2. Mejora la redacción usando verbos de acción fuertes y un tono profesional impecable.
3. Devuelve el resultado en texto estructurado claro (con secciones como PERFIL PROFESIONAL, EXPERIENCIA DESTACADA, COMPETENCIAS TÉCNICAS, EDUCACIÓN).
4. No agregues explicaciones fuera del CV. Devuelve directamente la versión final optimizada.
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return {
    optionId: selected.id,
    title: selected.title,
    description: selected.description,
    content: response.text()
  };
}
