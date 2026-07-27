import { buildPlan, planToIcs, planToMarkdown, validateIntake, validateWorkspace } from './lib/planner.js';

const KEY = 'quickarity.workspace.v1';
const today = () => new Date().toISOString().slice(0, 10);
const createTask = (title = '') => ({
  id: crypto.randomUUID(), title, note: '', impact: 3, urgency: 3,
  confidence: 3, effort: 3, risk: 2, blocked: false, blocker: '',
});
const createDefault = () => ({
  project: '', outcome: '', audience: '', constraints: '', startDate: today(), tasks: [createTask()],
});
const saved = (() => {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || 'null');
    return validateWorkspace(value || {}).length ? null : value;
  } catch {
    return null;
  }
})();
const state = { intake: saved?.intake || createDefault(), plan: saved?.plan || null, error: '' };
const app = document.querySelector('#app');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[char]));
const safeFilename = (value, fallback) => String(value || fallback).trim().replace(/[^a-zA-Z0-9._-]+/g, '-').slice(0, 100) || fallback;

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, intake: state.intake, plan: state.plan }));
  } catch {
    state.error = 'Browser storage is full. Export the workspace before leaving.';
  }
}

function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}

function taskMarkup(item, index) {
  return `<article class="task" data-id="${item.id}">
    <div class="task-top"><strong>Task ${index + 1}</strong><button class="link danger remove-task" ${state.intake.tasks.length === 1 ? 'disabled' : ''}>Remove</button></div>
    <input data-field="title" value="${escapeHtml(item.title)}" maxlength="200" placeholder="Specific executable task"/>
    <input data-field="note" value="${escapeHtml(item.note)}" maxlength="300" placeholder="Evidence, dependency, or expected result"/>
    <div class="scores">${['impact', 'urgency', 'confidence', 'effort', 'risk'].map((field) => `<label>${field}<input data-field="${field}" type="number" min="1" max="5" value="${item[field]}"/></label>`).join('')}</div>
    <label class="check"><input data-field="blocked" type="checkbox" ${item.blocked ? 'checked' : ''}/> Blocked</label>
    ${item.blocked ? `<input data-field="blocker" value="${escapeHtml(item.blocker)}" maxlength="200" placeholder="Named unblocker / dependency"/>` : ''}
  </article>`;
}

function planMarkup(plan) {
  return `<div class="result-header">
    <div><h2>${escapeHtml(plan.project)}</h2><p>${escapeHtml(plan.outcome)}</p></div>
    <div class="exports"><button id="markdown">Markdown</button><button id="json">Plan JSON</button><button id="calendar">Calendar</button></div>
  </div>
  <p class="rule">${escapeHtml(plan.decisionRule)}</p>
  <div class="days">${plan.days.map((day) => `<article><h3>Day ${day.day}</h3><time datetime="${day.date}">${day.date}</time><p>${escapeHtml(day.objective)}</p>${day.tasks.length ? `<ul>${day.tasks.map((item) => `<li><strong>${escapeHtml(item.title)}</strong><span>score ${item.score}</span>${item.note ? `<small>${escapeHtml(item.note)}</small>` : ''}</li>`).join('')}</ul>` : '<p class="muted">Capacity reserved for verification and new blockers.</p>'}</article>`).join('')}</div>
  <div class="secondary-results"><article><h3>Blocked</h3>${plan.blocked.length ? plan.blocked.map((item) => `<p>${escapeHtml(item.title)} — ${escapeHtml(item.blocker || 'unblocker not named')}</p>`).join('') : '<p>None.</p>'}</article><article><h3>Deferred</h3>${plan.deferred.length ? plan.deferred.map((item) => `<p>${escapeHtml(item.title)} — ${item.score}</p>`).join('') : '<p>None.</p>'}</article></div>
  <details><summary>Evidence boundary</summary><ul>${plan.assumptions.map((value) => `<li>${escapeHtml(value)}</li>`).join('')}</ul></details>`;
}

function render() {
  save();
  app.innerHTML = `<main>
    <header><div><h1>Quickarity</h1><p>Convert competing work into a bounded three-day execution decision.</p></div><span class="badge">Local-first · no account required</span></header>
    <div class="workspace-actions">
      <button id="example">Load example</button>
      <label class="button">Import workspace<input id="workspace-import" hidden type="file" accept=".json,application/json"/></label>
      <button id="workspace-export">Export workspace</button>
      <button id="reset" class="danger">Reset</button>
    </div>
    <div class="layout">
      <section class="form-panel">
        <label>Project<input id="project" maxlength="100" value="${escapeHtml(state.intake.project)}" placeholder="e.g. TraceCrumb pilot"/></label>
        <label>Observable outcome<textarea id="outcome" maxlength="500" placeholder="What must be true after three days?">${escapeHtml(state.intake.outcome)}</textarea></label>
        <label>Target user or audience<input id="audience" maxlength="200" value="${escapeHtml(state.intake.audience)}"/></label>
        <label>Start date<input id="startDate" type="date" value="${escapeHtml(state.intake.startDate || today())}"/></label>
        <label>Constraints<textarea id="constraints" maxlength="500" placeholder="Time, access, budget, dependencies, non-goals">${escapeHtml(state.intake.constraints)}</textarea></label>
        <div class="task-heading"><h2>Candidate tasks</h2><button id="add-task" ${state.intake.tasks.length >= 20 ? 'disabled' : ''}>Add task</button></div>
        ${state.intake.tasks.map(taskMarkup).join('')}
        ${state.error ? `<p class="error" role="alert">${escapeHtml(state.error)}</p>` : ''}
        <button class="primary" id="generate">Generate bounded plan</button>
      </section>
      <section class="result-panel">${state.plan ? planMarkup(state.plan) : '<div class="empty"><h2>No plan yet</h2><p>Quickarity ranks declared work; it does not invent market evidence or pretend scores are measurements.</p></div>'}</section>
    </div>
    <footer>Core planning is deterministic and works offline after the static application loads.</footer>
  </main>`;
  bind();
}

function loadExample() {
  state.intake = {
    project: 'Founder validation sprint',
    outcome: 'Deliver three source-linked artifacts and obtain one specific correction',
    audience: 'Technical founders validating a developer tool',
    constraints: 'Three days; public sources only; no automated sending',
    startDate: today(),
    tasks: [
      { id: crypto.randomUUID(), title: 'Select three evidence-rich targets', note: 'Each must pass reachability and usefulness gates', impact: 5, urgency: 5, confidence: 4, effort: 2, risk: 2, blocked: false, blocker: '' },
      { id: crypto.randomUUID(), title: 'Produce first bounded artifact', note: 'One function, direct source links, explicit unknowns', impact: 5, urgency: 5, confidence: 4, effort: 4, risk: 2, blocked: false, blocker: '' },
      { id: crypto.randomUUID(), title: 'Automate outreach sending', note: 'Blocked until human approval and relationship review', impact: 2, urgency: 1, confidence: 2, effort: 4, risk: 5, blocked: true, blocker: 'human approval gate' },
      { id: crypto.randomUUID(), title: 'Polish portfolio visuals', note: 'Defer until artifact usefulness is tested', impact: 2, urgency: 1, confidence: 4, effort: 3, risk: 1, blocked: false, blocker: '' },
    ],
  };
  state.plan = null; state.error = ''; render();
}

function bind() {
  document.querySelector('#example').addEventListener('click', loadExample);
  document.querySelector('#workspace-export').addEventListener('click', () => {
    const name = safeFilename(state.intake.project, 'quickarity-workspace');
    download(JSON.stringify({ version: 1, intake: state.intake, plan: state.plan }, null, 2), `${name}.quickarity.json`, 'application/json');
  });
  document.querySelector('#workspace-import').addEventListener('change', async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) throw new Error('Workspace file exceeds 2 MB.');
      const value = JSON.parse(await file.text());
      const errors = validateWorkspace(value);
      if (errors.length) throw new Error(errors.join(' '));
      const intake = value.intake || value;
      state.intake = { ...createDefault(), ...intake, tasks: intake.tasks.map((task) => ({ ...createTask(), ...task, id: task.id || crypto.randomUUID() })) };
      state.plan = value.plan || null;
      state.error = '';
    } catch (error) {
      state.error = `Import failed: ${error.message}`;
    }
    render();
  });
  document.querySelector('#reset').addEventListener('click', () => {
    if (!window.confirm('Reset this workspace? Export it first if you need a copy.')) return;
    localStorage.removeItem(KEY);
    state.intake = createDefault(); state.plan = null; state.error = ''; render();
  });
  for (const field of ['project', 'outcome', 'audience', 'constraints', 'startDate']) {
    document.querySelector(`#${field}`).addEventListener('input', (event) => {
      state.intake[field] = event.target.value;
      state.plan = null;
      save();
    });
  }
  document.querySelector('#add-task').addEventListener('click', () => { state.intake.tasks.push(createTask()); state.plan = null; render(); });
  document.querySelectorAll('.task').forEach((element) => {
    const id = element.dataset.id;
    const item = state.intake.tasks.find((value) => value.id === id);
    element.querySelectorAll('[data-field]').forEach((input) => input.addEventListener('change', (event) => {
      const field = event.target.dataset.field;
      item[field] = event.target.type === 'checkbox'
        ? event.target.checked
        : ['impact', 'urgency', 'confidence', 'effort', 'risk'].includes(field)
          ? Number(event.target.value)
          : event.target.value;
      state.plan = null;
      render();
    }));
    element.querySelector('.remove-task').addEventListener('click', () => {
      state.intake.tasks = state.intake.tasks.filter((value) => value.id !== id);
      state.plan = null;
      render();
    });
  });
  document.querySelector('#generate').addEventListener('click', () => {
    const errors = validateIntake(state.intake);
    if (errors.length) state.error = errors.join(' ');
    else { state.error = ''; state.plan = buildPlan(state.intake); }
    render();
  });
  if (state.plan) {
    const name = safeFilename(state.plan.project, 'quickarity-plan');
    document.querySelector('#markdown').addEventListener('click', () => download(planToMarkdown(state.plan), `${name}.md`, 'text/markdown'));
    document.querySelector('#json').addEventListener('click', () => download(JSON.stringify(state.plan, null, 2), `${name}.json`, 'application/json'));
    document.querySelector('#calendar').addEventListener('click', () => download(planToIcs(state.plan), `${name}.ics`, 'text/calendar'));
  }
}

render();
