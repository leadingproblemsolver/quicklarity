const KEY = 'quickarity.workspace.v1';
export function saveWorkspace(value) { localStorage.setItem(KEY, JSON.stringify(value)); }
export function loadWorkspace() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
export function download(content, filename, type = 'text/plain') { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url); }
