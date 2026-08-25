export function renderDashboardCss(): string {
  return `
:root {
  --bg: #0b1020;
  --bg2: #121a33;
  --card: #121a2a;
  --line: #253150;
  --text: #e7ebff;
  --muted: #aab6de;
}
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; }
body {
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  background: linear-gradient(180deg, var(--bg), #0a1124);
  color: var(--text);
}
.page {
  width: 100%;
  height: 100vh;
  padding: 12px;
}
#root {
  width: 100%;
  height: 100%;
}
.layout {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(360px, 1fr);
  gap: 12px;
  min-height: 0;
}
.left-col {
  min-height: 0;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: 12px;
}
.side {
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: 12px;
}
.panel {
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: var(--bg2);
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
}
.panel-head {
  padding: 10px 12px;
  border-bottom: 1px solid var(--line);
  color: var(--muted);
  font-size: 13px;
}
.panel-highlight {
  border-color: #3f5ea3;
  box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.2) inset;
}
.risk-ok {
  border-color: #2f5a3d;
}
.risk-warning {
  border-color: #8b6c2a;
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.25) inset;
}
.risk-critical {
  border-color: #7d2f2f;
  box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.28) inset;
}
.graph-wrap {
  flex: 1;
  min-height: 0;
}
.timeline-wrap {
  padding: 10px 12px;
}
.timeline-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
}
.player-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.btn {
  cursor: pointer;
  height: 36px;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--text);
  padding: 0 12px;
}
.btn.primary {
  background: #15315f;
  border-color: #21579f;
}
.player-btn { min-width: 84px; }
.pill {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 7px 12px;
  color: var(--muted);
}
.range { width: 100%; }
.json {
  margin: 0;
  padding: 14px;
  flex: 1;
  min-height: 0;
  overflow: auto;
  font-size: 13px;
  line-height: 1.45;
}
.recent-mini {
  max-height: 20vh;
  overflow: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.table th, .table td {
  border-bottom: 1px solid var(--line);
  padding: 6px;
  text-align: left;
}
.insights {
  padding: 10px 12px;
  border-top: 1px solid var(--line);
}
.last-event {
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 8px;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}
.stat {
  border: 1px solid var(--line);
  background: #151f3d;
  border-radius: 8px;
  padding: 7px 8px;
}
.stat-label { font-size: 11px; color: var(--muted); }
.stat-value { font-size: 14px; font-weight: 700; }
.hint-list {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.45;
}
.trace-wrap {
  padding: 10px 12px;
  max-height: 20vh;
  overflow: auto;
}
.trace-list {
  margin: 0;
  padding-left: 18px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5;
}
@media (max-width: 1100px) {
  html, body { overflow: auto; }
  .page { height: auto; min-height: 100vh; }
  .layout { height: auto; grid-template-columns: 1fr; }
  .left-col, .side { grid-template-rows: auto; }
}
`.trim();
}
