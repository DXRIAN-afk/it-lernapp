/* ==========================================================================
   Einfaches Spaced-Repetition-System (SRS)
   Begriffe, die fällig sind oder oft falsch beantwortet wurden, werden
   bevorzugt in die Lernwarteschlange aufgenommen.
   ========================================================================== */

function buildStudyQueue(filterFn){
  const now = Date.now();
  let terms = TERMS.filter(t => filterFn ? filterFn(t) : true);

  const scored = terms.map(t => {
    const p = getProgress(t.id);
    const overdue = p.dueAt ? Math.max(0, now - p.dueAt) : 1;
    const neverSeen = p.lastSeen ? 0 : 1;
    const weaknessScore = (5 - p.familiarity) + p.wrongCount * 1.5 + neverSeen * 3 + (overdue > 0 ? 2 : 0);
    return { term:t, progress:p, weaknessScore, isDue: !p.lastSeen || p.dueAt <= now };
  });

  const due = scored.filter(s => s.isDue);
  const notDue = scored.filter(s => !s.isDue);

  due.sort((a,b) => b.weaknessScore - a.weaknessScore + (Math.random()-0.5));
  notDue.sort((a,b) => b.weaknessScore - a.weaknessScore);

  return due.concat(notDue).map(s => s.term);
}

function getWeakTerms(limit = 10, filterFn){
  const now = Date.now();
  let terms = TERMS.filter(t => filterFn ? filterFn(t) : true);
  const scored = terms.map(t => {
    const p = getProgress(t.id);
    return { term:t, progress:p, weaknessScore: (5 - p.familiarity) + p.wrongCount * 1.5 };
  }).filter(s => s.progress.lastSeen);
  scored.sort((a,b) => b.weaknessScore - a.weaknessScore);
  return scored.slice(0, limit).map(s => s.term);
}
