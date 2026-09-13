/* ==========================================================================
   IT-Lexikon – App-Steuerung (Navigation, Rendering, Interaktion)
   ========================================================================== */

const GROUP_LABEL = { coding: 'App-Coding', files: 'Dateien & Downloads' };

let state = {
  view: 'home',
  detailReturnView: 'home',
  detailStack: [],
  flashScope: 'all',
  flashQueue: [],
  flashIndex: 0,
  flashSession: { correct: 0, wrong: 0 },
  quizScope: 'all',
  quizLen: 10,
  quizQuestions: [],
  quizIndex: 0,
  quizScore: 0,
  termsScope: 'all',
  termsQuery: '',
};

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* ---------------------------------- Init ---------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  applyTheme(getSettings().theme || 'system');
  initNav();
  initHome();
  initFlashcards();
  initQuiz();
  initTerms();
  initSettings();
  initHeaderSettings();
  renderHome();
  registerServiceWorker();
});

/* -------------------------------- Navigation -------------------------------- */

const HEADER_TITLES = { home:'IT-Lexikon', flashcards:'Karteikarten', quiz:'Quiz', terms:'Begriffe', detail:'', settings:'Einstellungen' };

function switchView(view){
  state.view = view;
  state.detailStack = [];
  $$('.view').forEach(v => v.classList.remove('active'));
  $('#view-' + view).classList.add('active');
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  $('#btn-back').hidden = view !== 'detail' && view !== 'settings';
  if (view !== 'detail' && view !== 'settings') $('#header-title').textContent = HEADER_TITLES[view];
  if (view === 'home') renderHome();
  if (view === 'terms') renderTermsList();
  window.scrollTo(0, 0);
}

function switchViewSilent(view){
  state.view = view;
  $$('.view').forEach(v => v.classList.remove('active'));
  $('#view-' + view).classList.add('active');
  $$('.nav-btn').forEach(b => b.classList.remove('active'));
  $('#btn-back').hidden = false;
  window.scrollTo(0, 0);
}

function initNav(){
  $$('.nav-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      const view = btn.dataset.view;
      if (view === 'flashcards') resetFlashUI();
      if (view === 'quiz') resetQuizUI();
      switchView(view);
      btn.blur();
    });
  });
  $('#btn-back').addEventListener('click', () => {
    if (state.view === 'detail' && state.detailStack.length) {
      const term = state.detailStack.pop();
      renderDetail(term);
    } else {
      switchView(state.detailReturnView);
    }
  });
}

function initHeaderSettings(){
  $('#btn-settings').addEventListener('click', () => {
    if (state.view !== 'detail' && state.view !== 'settings') state.detailReturnView = state.view;
    renderSettings();
    switchViewSilent('settings');
    $('#header-title').textContent = 'Einstellungen';
  });
}

function applyTheme(theme){
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  setSetting('theme', theme);
}

function showToast(msg){
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.hidden = true; }, 2200);
}

/* ----------------------------------- Home ----------------------------------- */

function initHome(){
  $$('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      resetFlashUI();
      switchView('flashcards');
      setFlashScope(card.dataset.group);
      startFlashcardSession(card.dataset.group);
    });
  });
  $$('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      if (action === 'flashcards') resetFlashUI();
      if (action === 'quiz') resetQuizUI();
      switchView(action);
    });
  });
}

function renderHome(){
  const codingCount = TERMS.filter(t => t.group === 'coding').length;
  const filesCount = TERMS.filter(t => t.group === 'files').length;
  $('#count-coding').textContent = codingCount + ' Begriffe';
  $('#count-files').textContent = filesCount + ' Begriffe';

  const daily = getDailyStats();
  const goal = getDailyGoal();
  $('#home-daily-value').textContent = `${Math.min(daily.learned, goal)} / ${goal}`;
  $('#home-daily-bar').style.width = Math.min(100, Math.round((daily.learned / goal) * 100)) + '%';

  const overall = getOverallStats();
  const streak = getStreak();
  const quizStats = getQuizStats();
  $('#stat-learned').textContent = overall.known;
  $('#stat-streak').textContent = streak.count || 0;
  $('#stat-errorrate').textContent = overall.errorRate + '%';
  $('#stat-quizacc').textContent = quizStats.accuracy + '%';

  $('#overall-bar').style.width = Math.round((overall.known / overall.total) * 100) + '%';
  $('#overall-text').textContent = `${overall.known} / ${overall.total} Begriffe gelernt`;
  $('#legend-known').textContent = overall.known;
  $('#legend-unknown').textContent = overall.notKnown;

  const hour = new Date().getHours();
  const greet = hour < 11 ? 'Guten Morgen. ' : hour < 18 ? 'Hallo. ' : 'Guten Abend. ';
  $('#greeting-text').textContent = greet + 'Was möchtest du heute lernen?';
}

/* -------------------------------- Flashcards -------------------------------- */

function initFlashcards(){
  $$('#flash-scope-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => setFlashScope(chip.dataset.scope));
  });
  $('#btn-flash-start').addEventListener('click', () => startFlashcardSession(state.flashScope));
  $('#btn-flash-close').addEventListener('click', () => { resetFlashUI(); switchView('home'); });
  $('#btn-flash-again').addEventListener('click', () => startFlashcardSession(state.flashScope));
  $('#btn-flash-home').addEventListener('click', () => { resetFlashUI(); switchView('home'); });
  $('#btn-known').addEventListener('click', () => answerFlashcard(true));
  $('#btn-not-known').addEventListener('click', () => answerFlashcard(false));

  const card = $('#flip-card');
  card.addEventListener('click', () => {
    if (card._suppressClick) { card._suppressClick = false; return; }
    card.classList.toggle('flipped');
  });
  setupSwipe(card);
}

function setFlashScope(scope){
  state.flashScope = scope;
  $$('#flash-scope-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.scope === scope));
}

function resetFlashUI(){
  $('#flash-setup').hidden = false;
  $('#flash-session').hidden = true;
  $('#flash-summary').hidden = true;
}

function startFlashcardSession(scope, fixedTerms){
  state.flashScope = scope || 'all';
  const filterFn = t => state.flashScope === 'all' ? true : t.group === state.flashScope;
  const queue = fixedTerms || buildStudyQueue(filterFn);
  const size = fixedTerms ? fixedTerms.length : Math.min(10, queue.length);
  state.flashQueue = queue.slice(0, size);
  state.flashIndex = 0;
  state.flashSession = { correct: 0, wrong: 0 };

  if (!state.flashQueue.length) {
    showToast('Keine Begriffe in diesem Bereich gefunden.');
    return;
  }

  $('#flash-setup').hidden = true;
  $('#flash-summary').hidden = true;
  $('#flash-session').hidden = false;
  renderFlashcard();
}

function renderFlashcard(){
  const term = state.flashQueue[state.flashIndex];
  const card = $('#flip-card');
  card.classList.remove('flipped');
  card.style.transition = '';
  card.style.transform = '';
  card.style.opacity = '';

  $('#flash-progress-label').textContent = `${state.flashIndex + 1} / ${state.flashQueue.length}`;
  $('#flash-progress-bar').style.width = Math.round((state.flashIndex / state.flashQueue.length) * 100) + '%';

  $('#flash-front-badge').textContent = term.category;
  $('#flash-front-term').textContent = getDisplayName(term);
  $('#flash-front-hint').textContent = term.group === 'files'
    ? 'Wofür wird diese Dateiendung verwendet?'
    : `Was bedeutet ${term.term}?`;

  const rows = [];
  if (term.englishName) rows.push(fbRow('Vollständiger Name', term.englishName, true));
  if (term.germanName) rows.push(fbRow('Deutsch', term.germanName));
  rows.push(fbRow(term.group === 'files' ? 'Verwendung' : 'Erklärung', term.explanation));
  if (term.example) rows.push(fbRow('Beispiel', term.example));
  if (term.note) rows.push(`<div class="fb-note">${escapeHtml(term.note)}</div>`);
  $('#flash-back-content').innerHTML = rows.join('');
}

function fbRow(label, value, big){
  return `<div class="fb-row"><div class="fb-label">${escapeHtml(label)}</div><div class="fb-value${big ? ' big' : ''}">${escapeHtml(value)}</div></div>`;
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function answerFlashcard(known){
  const term = state.flashQueue[state.flashIndex];
  const result = recordAnswer(term.id, known);
  if (known) state.flashSession.correct++;
  else state.flashSession.wrong++;
  if (result.justReachedGoal) showToast('Tagesziel erreicht.');

  state.flashIndex++;
  if (state.flashIndex >= state.flashQueue.length) {
    showFlashSummary();
  } else {
    renderFlashcard();
  }
}

function showFlashSummary(){
  $('#flash-session').hidden = true;
  $('#flash-summary').hidden = false;
  $('#sum-correct').textContent = state.flashSession.correct;
  $('#sum-wrong').textContent = state.flashSession.wrong;
}

function setupSwipe(card){
  let startX = 0, startY = 0, dx = 0, dragging = false, moved = false;

  const onDown = e => {
    const p = pointer(e);
    startX = p.x; startY = p.y; dx = 0; dragging = true; moved = false;
  };
  const onMove = e => {
    if (!dragging) return;
    const p = pointer(e);
    dx = p.x - startX;
    const dy = p.y - startY;
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      moved = true;
      card.classList.add('dragging');
      card.style.transform = `translateX(${dx}px) rotate(${dx / 18}deg)`;
      const t = Math.min(1, Math.abs(dx) / 100);
      $('#swipe-right').style.opacity = dx > 0 ? t : 0;
      $('#swipe-left').style.opacity = dx < 0 ? t : 0;
    }
  };
  const onUp = () => {
    if (!dragging) return;
    dragging = false;
    card.classList.remove('dragging');
    $('#swipe-right').style.opacity = 0;
    $('#swipe-left').style.opacity = 0;
    if (moved && Math.abs(dx) > 90) {
      card._suppressClick = true;
      const dir = dx > 0 ? 1 : -1;
      card.style.transition = 'transform .3s ease, opacity .3s ease';
      card.style.transform = `translateX(${dir * 500}px) rotate(${dir * 24}deg)`;
      card.style.opacity = '0';
      setTimeout(() => answerFlashcard(dir > 0), 260);
    } else if (moved) {
      card._suppressClick = true;
      card.style.transition = 'transform .25s ease';
      card.style.transform = '';
    }
  };

  card.addEventListener('pointerdown', onDown);
  card.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

function pointer(e){
  return { x: e.clientX, y: e.clientY };
}

/* ----------------------------------- Quiz ----------------------------------- */

function initQuiz(){
  $$('#quiz-scope-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.quizScope = chip.dataset.scope;
      $$('#quiz-scope-chips .chip').forEach(c => c.classList.toggle('active', c === chip));
    });
  });
  $$('#quiz-length-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.quizLen = Number(chip.dataset.len);
      $$('#quiz-length-chips .chip').forEach(c => c.classList.toggle('active', c === chip));
    });
  });
  $('#btn-quiz-start').addEventListener('click', () => startQuiz());
  $('#btn-quiz-close').addEventListener('click', () => { resetQuizUI(); switchView('home'); });
  $('#btn-quiz-again').addEventListener('click', () => startQuiz());
  $('#btn-quiz-home').addEventListener('click', () => { resetQuizUI(); switchView('home'); });
  $('#btn-quiz-next').addEventListener('click', () => nextQuizQuestion());
}

function resetQuizUI(){
  $('#quiz-setup').hidden = false;
  $('#quiz-session').hidden = true;
  $('#quiz-summary').hidden = true;
}

function startQuiz(){
  state.quizQuestions = generateQuiz(state.quizLen, state.quizScope);
  state.quizIndex = 0;
  state.quizScore = 0;
  if (!state.quizQuestions.length) {
    showToast('Nicht genug Begriffe für ein Quiz in diesem Bereich.');
    return;
  }
  $('#quiz-setup').hidden = true;
  $('#quiz-summary').hidden = true;
  $('#quiz-session').hidden = false;
  renderQuizQuestion();
}

function renderQuizQuestion(){
  const q = state.quizQuestions[state.quizIndex];
  $('#quiz-progress-label').textContent = `Frage ${state.quizIndex + 1} / ${state.quizQuestions.length}`;
  $('#quiz-progress-bar').style.width = Math.round((state.quizIndex / state.quizQuestions.length) * 100) + '%';
  $('#quiz-question').textContent = q.question;
  $('#quiz-feedback').hidden = true;

  const optionsEl = $('#quiz-options');
  optionsEl.innerHTML = '';
  q.options.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = opt;
    btn.addEventListener('click', () => selectQuizOption(idx));
    optionsEl.appendChild(btn);
  });
}

function selectQuizOption(idx){
  const q = state.quizQuestions[state.quizIndex];
  const buttons = $$('#quiz-options .quiz-option');
  buttons.forEach(b => b.disabled = true);
  buttons[q.correctIndex].classList.add('correct');
  const correct = idx === q.correctIndex;
  if (!correct) buttons[idx].classList.add('wrong');
  else state.quizScore++;

  recordAnswer(q.term.id, correct);

  const titleEl = $('#quiz-feedback-title');
  titleEl.textContent = correct ? 'Richtig' : 'Falsch';
  titleEl.classList.toggle('is-correct', correct);
  titleEl.classList.toggle('is-wrong', !correct);
  $('#quiz-feedback-text').textContent = q.reveal;
  $('#quiz-feedback').hidden = false;
}

function nextQuizQuestion(){
  state.quizIndex++;
  if (state.quizIndex >= state.quizQuestions.length) {
    finishQuiz();
  } else {
    renderQuizQuestion();
  }
}

function finishQuiz(){
  recordQuizResult(state.quizScore, state.quizQuestions.length, state.quizScope);
  $('#quiz-session').hidden = true;
  $('#quiz-summary').hidden = false;
  const pct = Math.round((state.quizScore / state.quizQuestions.length) * 100);
  $('#quiz-score').textContent = `${state.quizScore} / ${state.quizQuestions.length} richtig`;
  $('#quiz-score-bar').style.width = pct + '%';
}

/* ---------------------------------- Terms ---------------------------------- */

function initTerms(){
  $('#search-input').addEventListener('input', e => {
    state.termsQuery = e.target.value.trim().toLowerCase();
    renderTermsList();
  });
  $$('#terms-scope-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.termsScope = chip.dataset.scope;
      $$('#terms-scope-chips .chip').forEach(c => c.classList.toggle('active', c === chip));
      renderTermsList();
    });
  });
}

function matchesQuery(term, q){
  if (!q) return true;
  const haystack = [getDisplayName(term), term.englishName, term.germanName, term.explanation, term.category]
    .filter(Boolean).join(' ').toLowerCase();
  return haystack.includes(q);
}

const CHECK_ICON = '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M5 13l4 4 10-10" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function renderTermsList(){
  const scope = state.termsScope;
  const q = state.termsQuery;
  const categories = scope === 'coding' ? CODING_CATEGORIES : scope === 'files' ? FILE_CATEGORIES : CODING_CATEGORIES.concat(FILE_CATEGORIES);

  const listEl = $('#terms-list');
  listEl.innerHTML = '';
  let totalShown = 0;

  categories.forEach(cat => {
    const items = TERMS.filter(t => t.category === cat && (scope === 'all' || t.group === scope) && matchesQuery(t, q));
    if (!items.length) return;
    totalShown += items.length;
    const groupLabel = (scope === 'all') ? `${GROUP_LABEL[items[0].group]} · ${cat}` : cat;
    const title = document.createElement('div');
    title.className = 'terms-group-title';
    title.textContent = groupLabel;
    listEl.appendChild(title);

    items.forEach(term => {
      const row = document.createElement('div');
      row.className = 'term-row';
      const progress = getProgress(term.id);
      const badgeText = getDisplayName(term).replace(/^\./, '').slice(0, 4).toUpperCase();
      row.innerHTML = `
        <div class="term-row-badge">${escapeHtml(badgeText)}</div>
        <div class="term-row-main">
          <div class="term-row-title">${escapeHtml(getDisplayName(term))}</div>
          <div class="term-row-sub">${escapeHtml(term.englishName || term.germanName || '')}</div>
        </div>
        ${progress.known ? `<div class="term-row-known">${CHECK_ICON}</div>` : ''}
      `;
      row.addEventListener('click', () => {
        state.detailReturnView = 'terms';
        state.detailStack = [];
        renderDetail(term);
      });
      listEl.appendChild(row);
    });
  });

  $('#terms-empty').hidden = totalShown > 0;
}

/* ---------------------------------- Detail ---------------------------------- */

function renderDetail(term){
  switchViewSilent('detail');
  $('#header-title').textContent = getDisplayName(term);

  const related = (term.relatedTerms || []).map(id => getTermById(id)).filter(Boolean);

  const sections = [];
  if (term.englishName) sections.push(detailSection('Vollständiger Name', term.englishName, true));
  if (term.germanName) sections.push(detailSection('Deutsche Übersetzung', term.germanName));
  sections.push(detailSection(term.group === 'files' ? 'Verwendung' : 'Einfache Erklärung', term.explanation));
  if (term.example) sections.push(detailSection('Beispiel', term.example));
  if (term.note) sections.push(`<div class="detail-section"><div class="fb-note">${escapeHtml(term.note)}</div></div>`);

  const relatedHtml = related.length ? `
    <div class="detail-section">
      <div class="detail-label">Ähnliche Begriffe</div>
      <div class="related-chips">
        ${related.map(r => `<button class="related-chip" data-id="${r.id}">${escapeHtml(getDisplayName(r))}</button>`).join('')}
      </div>
    </div>` : '';

  $('#detail-content').innerHTML = `
    <div class="detail-hero">
      <div class="detail-term">${escapeHtml(getDisplayName(term))}</div>
      <div class="detail-badges">
        <span class="detail-badge">${escapeHtml(GROUP_LABEL[term.group])}</span>
        <span class="detail-badge">${escapeHtml(term.category)}</span>
      </div>
    </div>
    ${sections.join('')}
    ${relatedHtml}
    <button class="primary-btn" id="btn-learn-card">Als Karteikarte lernen</button>
  `;

  $('#btn-learn-card').addEventListener('click', () => {
    switchView('flashcards');
    startFlashcardSession(term.group, [term]);
  });

  $$('.related-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.detailStack.push(term);
      renderDetail(getTermById(chip.dataset.id));
    });
  });
}

function detailSection(label, value, big){
  return `<div class="detail-section"><div class="detail-label">${escapeHtml(label)}</div><div class="detail-value${big ? ' big' : ''}">${escapeHtml(value)}</div></div>`;
}

/* --------------------------------- Settings --------------------------------- */

function initSettings(){
  $('#goal-select').addEventListener('change', e => {
    setDailyGoal(Number(e.target.value));
  });
  $$('#theme-chips .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      applyTheme(chip.dataset.theme);
      updateThemeChips();
    });
  });
  $('#btn-reset-progress').addEventListener('click', () => {
    if (confirm('Möchtest du wirklich deinen gesamten Lernfortschritt löschen? Das kann nicht rückgängig gemacht werden.')) {
      resetAllProgress();
      renderHome();
      showToast('Lernfortschritt wurde zurückgesetzt.');
    }
  });
  updateThemeChips();
}

function updateThemeChips(){
  const current = getSettings().theme || 'system';
  $$('#theme-chips .chip').forEach(c => c.classList.toggle('active', c.dataset.theme === current));
}

function renderSettings(){
  $('#goal-select').value = String(getDailyGoal());
  updateThemeChips();
}

/* ------------------------------ Service Worker ------------------------------ */

function registerServiceWorker(){
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(err => console.warn('Service Worker konnte nicht registriert werden:', err));
    });
  }
}
