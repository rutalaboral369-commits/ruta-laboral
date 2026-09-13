const matchJob = (candidateSkills, requiredSkills) => {
  if (!requiredSkills || requiredSkills.length === 0) {
    return { matchScore: '0%', matchedSkills: [], missingSkills: [] };
  }

  const normalizedCandidate = candidateSkills.map(s => s.toLowerCase());
  
  const matched = requiredSkills.filter(skill => 
    normalizedCandidate.includes(skill.toLowerCase())
  );

  const missing = requiredSkills.filter(skill => 
    !normalizedCandidate.includes(skill.toLowerCase())
  );

  const score = Math.round((matched.length / requiredSkills.length) * 100);

  return {
    matchScore: `${score}%`,
    matchedSkills: matched,
    missingSkills: missing
  };
};

module.exports = { matchJob };
