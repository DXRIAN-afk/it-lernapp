/* ==========================================================================
   Quiz-Generator – erstellt abwechslungsreiche Multiple-Choice-Fragen
   ========================================================================== */

function shuffleArr(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeOptions(correctValue, pool, field, count = 4){
  const candidates = shuffleArr(pool.filter(t => t[field] && t[field] !== correctValue));
  const distractors = candidates.slice(0, count - 1).map(t => t[field]);
  const options = shuffleArr([correctValue, ...distractors]);
  return { options, correctIndex: options.indexOf(correctValue) };
}

function qFullName(term, pool){
  const codingPool = pool.filter(t => t.group === 'coding' && t.englishName);
  const { options, correctIndex } = makeOptions(term.englishName, codingPool, 'englishName');
  return {
    term, type:'fullname',
    question: `Was bedeutet ${term.term}?`,
    options, correctIndex,
    reveal: `${term.germanName} – ${term.explanation}`,
  };
}

function qMeaning(term, pool){
  const samePool = pool.filter(t => t.group === term.group);
  const { options, correctIndex } = makeOptions(term.explanation, samePool, 'explanation');
  return {
    term, type:'meaning',
    question: `Wofür wird ${getDisplayName(term)} häufig verwendet?`,
    options, correctIndex,
    reveal: term.example ? `Beispiel: ${term.example}` : term.explanation,
  };
}

function qExtensionFromDescription(term, pool){
  const filesPool = pool.filter(t => t.group === 'files');
  const { options, correctIndex } = makeOptions(term.extension, filesPool, 'extension');
  return {
    term, type:'extension',
    question: `Welche Dateiendung passt zu dieser Beschreibung?\n„${term.explanation}“`,
    options, correctIndex,
    reveal: `${term.extension} – ${term.englishName} (${term.germanName})`,
  };
}

function generateQuestionForTerm(term, pool){
  const generators = [];
  if (term.group === 'coding' && term.englishName) generators.push(() => qFullName(term, pool));
  generators.push(() => qMeaning(term, pool));
  if (term.group === 'files') generators.push(() => qExtensionFromDescription(term, pool));
  const gen = generators[Math.floor(Math.random() * generators.length)];
  return gen();
}

function generateQuiz(count, groupFilter){
  const pool = TERMS.filter(t => groupFilter === 'all' || !groupFilter ? true : t.group === groupFilter);
  const prioritized = buildStudyQueue(t => (groupFilter === 'all' || !groupFilter) ? true : t.group === groupFilter);
  const candidates = shuffleArr(prioritized.slice(0, Math.max(count * 3, 20)));
  const chosen = candidates.slice(0, Math.min(count, candidates.length));
  return chosen.map(term => generateQuestionForTerm(term, pool));
}
