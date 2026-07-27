import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPlan, planToIcs, planToMarkdown, scoreTask, validateIntake, validateWorkspace } from '../src/lib/planner.js';

const intake = { project: 'Pilot', outcome: 'Deliver one verified artifact', audience: 'Founder', constraints: 'Three days', tasks: [
  { title: 'Build artifact', impact: 5, urgency: 5, confidence: 4, effort: 3, risk: 2 },
  { title: 'Polish logo', impact: 1, urgency: 1, confidence: 5, effort: 2, risk: 1 },
  { title: 'Waiting for API', impact: 5, urgency: 5, confidence: 2, effort: 2, risk: 4, blocked: true, blocker: 'credential' },
] };

test('scores higher-value tasks above cosmetic work', () => assert.ok(scoreTask(intake.tasks[0]) > scoreTask(intake.tasks[1])));
test('rejects empty project and tasks', () => assert.equal(validateIntake({ tasks: [] }).length, 3));
test('builds deterministic three-day allocation and separates blockers', () => { const plan = buildPlan(intake); assert.equal(plan.days.length, 3); assert.equal(plan.blocked[0].title, 'Waiting for API'); assert.equal(plan.days[0].tasks[0].title, 'Build artifact'); });
test('exports markdown and calendar', () => { const plan = buildPlan(intake); assert.match(planToMarkdown(plan), /Evidence boundary/); assert.match(planToIcs(plan, new Date('2026-01-01T00:00:00Z')), /BEGIN:VEVENT/); });

test('calendar export escapes user-controlled property injection', () => {
  const plan = buildPlan({ ...intake, project: 'Pilot\nATTENDEE:evil@example.com' });
  const output = planToIcs(plan, new Date('2026-01-01T00:00:00Z'));
  assert.doesNotMatch(output, /\r\nATTENDEE:/);
  assert.match(output, /Pilot\\nATTENDEE/);
});


test('preserves an explicit start date across plan and calendar exports', () => {
  const plan = buildPlan({ ...intake, startDate: '2026-08-10' });
  assert.equal(plan.days[0].date, '2026-08-10');
  assert.match(planToIcs(plan), /DTSTART:20260810T090000Z/);
});

test('validates portable workspace contracts', () => {
  assert.deepEqual(validateWorkspace({ version: 1, intake: { ...intake, startDate: '2026-08-10' } }), []);
  assert.deepEqual(validateWorkspace({ version: 1, intake: { project:'', outcome:'', tasks:[] } }), []);
  assert.match(validateWorkspace({ version: 2, intake }).join(' '), /version/);
});


test('rejects impossible calendar dates', () => assert.match(validateIntake({ ...intake, startDate: '2026-99-99' }).join(' '), /real date/));
