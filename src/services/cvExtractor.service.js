const extractCVData = (rawText) => {
  // RegEx para correo electrónico
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = rawText.match(emailRegex) || [];

  // RegEx para número telefónico
  const phoneRegex = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g;
  const phones = rawText.match(phoneRegex) || [];

  // Detección simple de habilidades técnicas
  const commonSkills = ['Node.js', 'Express', 'Docker', 'JavaScript', 'Python', 'PostgreSQL', 'Git', 'AWS', 'React'];
  const foundSkills = commonSkills.filter(skill => 
    new RegExp(`\\b${skill}\\b`, 'i').test(rawText)
  );

  return {
    email: emails[0] || null,
    phone: phones[0] || null,
    skills: foundSkills,
    characterCount: rawText.length
  };
};

module.exports = { extractCVData };
