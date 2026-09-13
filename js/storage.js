/* ==========================================================================
   IT-Lexikon – Lokaler Speicher (localStorage)
   Verwaltet Lernfortschritt, Streak, Tagesziel und Quiz-Ergebnisse.
   ========================================================================== */

const STORAGE_KEY = 'itlernapp:v1';

/* familiarity 0..5 -> Wiederholungs-Intervall in Minuten */
const SRS_INTERVALS_MIN = [0, 10, 60*24, 60*24*3, 60*24*7, 60*24*14];

function todayStr(d = new Date()){
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function defaultState(){
  return {
    progress: {},          // id -> { familiarity, correctCount, wrongCount, known, lastSeen, dueAt }
    dailyGoal: 10,
    streak: { count: 0, lastDate: null },
    dailyStats: { date: todayStr(), learned: 0, correct: 0, wrong: 0, goalReachedShown: false },
    quizResults: [],        // { date, correct, total, mode }
    settings: { theme: 'system' },
    createdAt: Date.now(),
  };
}

let _state = null;

function loadState(){
  if (_state) return _state;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      _state = Object.assign(defaultState(), parsed);
      _state.progress = parsed.progress || {};
      _state.dailyStats = parsed.dailyStats || defaultState().dailyStats;
      _state.streak = parsed.streak || defaultState().streak;
      _state.settings = Object.assign(defaultState().settings, parsed.settings || {});
    } else {
      _state = defaultState();
    }
  } catch(e) {
    console.warn('Konnte Speicher nicht laden, starte neu.', e);
    _state = defaultState();
  }
  rolloverDayIfNeeded();
  return _state;
}

function saveState(){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
  } catch(e) {
    console.warn('Konnte Fortschritt nicht speichern.', e);
  }
}

function rolloverDayIfNeeded(){
  const today = todayStr();
  if (_state.dailyStats.date !== today) {
    const wasYesterday = isYesterday(_state.dailyStats.date, today);
    if (_state.dailyStats.learned > 0 && wasYesterday) {
      _state.streak.count = (_state.streak.count || 0) + 1;
    } else if (_state.dailyStats.learned === 0) {
      _state.streak.count = 0;
    }
    _state.streak.lastDate = _state.dailyStats.date;
    _state.dailyStats = { date: today, learned: 0, correct: 0, wrong: 0, goalReachedShown: false };
    saveState();
  }
}

function isYesterday(dateStr, todayStrVal){
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T00:00:00');
  const t = new Date(todayStrVal + 'T00:00:00');
  const diff = Math.round((t - d) / 86400000);
  return diff === 1;
}

/* ---------------------------- Progress / SRS ---------------------------- */

function getProgress(id){
  const s = loadState();
  return s.progress[id] || { familiarity:0, correctCount:0, wrongCount:0, known:false, lastSeen:null, dueAt:0 };
}

function getAllProgressEntries(){
  const s = loadState();
  return TERMS.map(t => ({ term:t, progress:getProgress(t.id) }));
}

function recordAnswer(id, correct){
  const s = loadState();
  const p = Object.assign({ familiarity:0, correctCount:0, wrongCount:0, known:false, lastSeen:null, dueAt:0 }, s.progress[id]);
  const now = Date.now();
  if (correct) {
    p.familiarity = Math.min(5, p.familiarity + 1);
    p.correctCount++;
    s.dailyStats.correct++;
  } else {
    p.familiarity = Math.max(0, p.familiarity - 2);
    p.wrongCount++;
    s.dailyStats.wrong++;
  }
  p.known = p.familiarity >= 2;
  p.lastSeen = now;
  p.dueAt = now + SRS_INTERVALS_MIN[p.familiarity] * 60000;
  s.progress[id] = p;

  s.dailyStats.learned++;

  const goalWasReached = s.dailyStats.learned >= s.dailyGoal;
  let justReachedGoal = false;
  if (goalWasReached && !s.dailyStats.goalReachedShown) {
    s.dailyStats.goalReachedShown = true;
    justReachedGoal = true;
  }
  saveState();
  return { progress:p, justReachedGoal };
}

/* --------------------------------- Quiz --------------------------------- */

function recordQuizResult(correct, total, mode){
  const s = loadState();
  s.quizResults.push({ date: Date.now(), correct, total, mode });
  saveState();
}

function getQuizStats(){
  const s = loadState();
  const results = s.quizResults;
  const totalCorrect = results.reduce((a,r)=>a+r.correct,0);
  const totalQuestions = results.reduce((a,r)=>a+r.total,0);
  return {
    rounds: results.length,
    totalCorrect,
    totalQuestions,
    accuracy: totalQuestions ? Math.round((totalCorrect/totalQuestions)*100) : 0,
    recent: results.slice(-5).reverse(),
  };
}

/* -------------------------------- Settings -------------------------------- */

function getSettings(){ return loadState().settings; }
function setSetting(key, value){
  const s = loadState();
  s.settings[key] = value;
  saveState();
}

function getDailyGoal(){ return loadState().dailyGoal; }
function setDailyGoal(n){
  const s = loadState();
  s.dailyGoal = n;
  saveState();
}

function getDailyStats(){ return loadState().dailyStats; }
function getStreak(){ return loadState().streak; }

/* ------------------------------- Statistik ------------------------------- */

function getOverallStats(){
  const entries = getAllProgressEntries();
  const total = entries.length;
  const known = entries.filter(e => e.progress.known).length;
  const seen = entries.filter(e => e.progress.lastSeen).length;
  const wrongTotal = entries.reduce((a,e)=>a+e.progress.wrongCount,0);
  const correctTotal = entries.reduce((a,e)=>a+e.progress.correctCount,0);
  const errorRate = (wrongTotal+correctTotal) ? Math.round((wrongTotal/(wrongTotal+correctTotal))*100) : 0;
  return { total, known, notKnown: total-known, seen, errorRate, correctTotal, wrongTotal };
}

function resetAllProgress(){
  _state = defaultState();
  saveState();
}
