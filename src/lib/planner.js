const clamp = (value, minimum = 1, maximum = 5) => Math.min(maximum, Math.max(minimum, Number(value) || minimum));

export function scoreTask(task) {
  const impact = clamp(task.impact);
  const urgency = clamp(task.urgency);
  const confidence = clamp(task.confidence);
  const effort = clamp(task.effort);
  const risk = clamp(task.risk);
  const blockedPenalty = task.blocked ? 6 : 0;
  return Number((impact * 2.4 + urgency * 1.8 + confidence - effort * 1.2 - risk * 0.8 - blockedPenalty).toFixed(2));
}

export function validateIntake(intake) {
  const errors = [];
  if (!String(intake?.project || '').trim()) errors.push('Project name is required.');
  if (String(intake?.project || '').length > 100) errors.push('Project name exceeds 100 characters.');
  if (!String(intake?.outcome || '').trim()) errors.push('A concrete outcome is required.');
  if (String(intake?.outcome || '').length > 500) errors.push('Outcome exceeds 500 characters.');
  if (String(intake?.audience || '').length > 200) errors.push('Audience exceeds 200 characters.');
  if (String(intake?.constraints || '').length > 500) errors.push('Constraints exceed 500 characters.');
  if (intake?.startDate) {
    const rawDate = String(intake.startDate);
    const parsedDate = new Date(`${rawDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== rawDate) errors.push('Start date must be a real date using YYYY-MM-DD.');
  }
  if (!Array.isArray(intake?.tasks) || intake.tasks.filter((task) => String(task.title || '').trim()).length === 0) errors.push('Add at least one task.');
  if ((intake?.tasks?.length || 0) > 20) errors.push('A plan accepts at most 20 tasks.');
  for (const [index, task] of (intake?.tasks || []).entries()) {
    if (String(task.title || '').length > 200) errors.push(`Task ${index + 1} title exceeds 200 characters.`);
    if (String(task.note || '').length > 300) errors.push(`Task ${index + 1} note exceeds 300 characters.`);
    if (String(task.blocker || '').length > 200) errors.push(`Task ${index + 1} blocker exceeds 200 characters.`);
  }
  return errors;
}

export function validateWorkspace(value, { requireComplete = false } = {}) {
  const errors = [];
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ['Workspace must be a JSON object.'];
  if (value.version != null && value.version !== 1) errors.push('Workspace version must be 1.');
  const intake = value.intake || value;
  if (!intake || typeof intake !== 'object' || Array.isArray(intake)) return [...errors, 'Workspace intake must be an object.'];
  if (!Array.isArray(intake.tasks)) errors.push('Workspace tasks must be an array.');
  if ((intake.tasks?.length || 0) > 20) errors.push('A workspace accepts at most 20 tasks.');
  if (String(intake.project || '').length > 100) errors.push('Project name exceeds 100 characters.');
  if (String(intake.outcome || '').length > 500) errors.push('Outcome exceeds 500 characters.');
  if (String(intake.audience || '').length > 200) errors.push('Audience exceeds 200 characters.');
  if (String(intake.constraints || '').length > 500) errors.push('Constraints exceed 500 characters.');
  if (intake.startDate) {
    const rawDate = String(intake.startDate);
    const parsedDate = new Date(`${rawDate}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== rawDate) errors.push('Start date must be a real date using YYYY-MM-DD.');
  }
  for (const [index, task] of (intake.tasks || []).entries()) {
    if (!task || typeof task !== 'object' || Array.isArray(task)) { errors.push(`Task ${index + 1} must be an object.`); continue; }
    if (String(task.title || '').length > 200) errors.push(`Task ${index + 1} title exceeds 200 characters.`);
    if (String(task.note || '').length > 300) errors.push(`Task ${index + 1} note exceeds 300 characters.`);
    if (String(task.blocker || '').length > 200) errors.push(`Task ${index + 1} blocker exceeds 200 characters.`);
  }
  if (requireComplete) errors.push(...validateIntake(intake));
  return [...new Set(errors)];
}

export function buildPlan(intake) {
  const errors = validateIntake(intake);
  if (errors.length) throw new Error(errors.join(' '));
  const tasks = intake.tasks
    .filter((task) => String(task.title || '').trim())
    .map((task, index) => ({ ...task, id: task.id || `task-${index + 1}`, score: scoreTask(task) }))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));
  const actionable = tasks.filter((task) => !task.blocked);
  const blocked = tasks.filter((task) => task.blocked);
  const selected = actionable.slice(0, 6);
  const deferred = actionable.slice(6);
  const startDate = String(intake.startDate || new Date().toISOString().slice(0, 10));
  const days = [0, 1, 2].map((day) => {
    const date = new Date(`${startDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + day);
    return {
    day: day + 1,
    date: date.toISOString().slice(0, 10),
    objective: day === 0 ? 'Remove uncertainty and produce the first observable result.' : day === 1 ? 'Complete the highest-leverage execution path.' : 'Verify the result, package evidence, and choose the next constraint.',
    tasks: selected.filter((_, index) => index % 3 === day),
  };
  });
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    project: String(intake.project).trim(),
    outcome: String(intake.outcome).trim(),
    audience: String(intake.audience || '').trim(),
    constraints: String(intake.constraints || '').trim(),
    startDate,
    decisionRule: 'Prioritize impact, urgency, and confidence; penalize effort, risk, and blocked work.',
    days,
    blocked,
    deferred,
    assumptions: [
      'Scores express operator judgment, not measured business value.',
      'The three-day allocation is a starting plan and must be revised when evidence changes.',
      'Blocked tasks require a named unblocker before entering execution.',
    ],
  };
}

export function planToMarkdown(plan) {
  const lines = [`# ${plan.project} — Three-Day Execution Plan`, '', `**Outcome:** ${plan.outcome}`];
  if (plan.audience) lines.push(`**User/audience:** ${plan.audience}`);
  if (plan.constraints) lines.push(`**Constraints:** ${plan.constraints}`);
  lines.push('', `> ${plan.decisionRule}`, '');
  for (const day of plan.days) {
    lines.push(`## Day ${day.day} — ${day.date}`, '', day.objective, '');
    if (!day.tasks.length) lines.push('- Preserve capacity for verification and newly discovered blockers.');
    for (const task of day.tasks) lines.push(`- [ ] **${task.title}** — score ${task.score}${task.note ? ` — ${task.note}` : ''}`);
    lines.push('');
  }
  lines.push('## Blocked', '');
  lines.push(...(plan.blocked.length ? plan.blocked.map((task) => `- ${task.title}${task.blocker ? ` — unblocker: ${task.blocker}` : ''}`) : ['- None declared.']));
  lines.push('', '## Deferred', '');
  lines.push(...(plan.deferred.length ? plan.deferred.map((task) => `- ${task.title} — score ${task.score}`) : ['- None.']));
  lines.push('', '## Evidence boundary', '', ...plan.assumptions.map((value) => `- ${value}`));
  return lines.join('\n');
}

function icsEscape(value) {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function dateStamp(date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function planToIcs(plan, startDate = null) {
  const calendarStart = startDate || new Date(`${plan.startDate || new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const entries = [];
  for (const day of plan.days) {
    const date = new Date(calendarStart);
    date.setUTCDate(date.getUTCDate() + day.day - 1);
    date.setUTCHours(9, 0, 0, 0);
    const end = new Date(date.getTime() + 60 * 60 * 1000);
    entries.push('BEGIN:VEVENT', `UID:${String(plan.project).replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 80)}-${day.day}@quickarity`, `DTSTAMP:${dateStamp(new Date())}`, `DTSTART:${dateStamp(date)}`, `DTEND:${dateStamp(end)}`, `SUMMARY:${icsEscape(plan.project)} — Day ${day.day}`, `DESCRIPTION:${icsEscape(day.objective)}`, 'END:VEVENT');
  }
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Quickarity//Execution Plan//EN', ...entries, 'END:VCALENDAR'].join('\r\n');
}
