import React from 'react';
import { Background, Controls, ReactFlow } from 'reactflow';
import type { BudgetStatusView, GraphModel, Summary, TimelineEventEntry, TraceSummary } from './types.ts';

interface TimelinePanelProps {
  events: TimelineEventEntry[];
  cursor: number;
  onCursorChange: (value: number) => void;
  onPlay: () => void;
  onBack: () => void;
  onStep: () => void;
  onClear: () => void;
}

export function TimelinePanel(props: TimelinePanelProps): JSX.Element {
  const { events, cursor, onCursorChange, onPlay, onBack, onStep, onClear } = props;
  return (
    <div className="panel">
      <div className="panel-head">Timeline</div>
      <div className="timeline-wrap">
        <div className="player-row">
          <button className="btn player-btn primary" onClick={onPlay}>▶ Play</button>
          <button className="btn player-btn" onClick={onBack}>⏮ Back</button>
          <button className="btn player-btn" onClick={onStep}>⏭ Step</button>
          <button className="btn player-btn" onClick={onClear}>🧹 Clear</button>
          <span className="pill">events: {events.length}</span>
        </div>
        <div className="timeline-row">
          <input
            className="range"
            type="range"
            min={0}
            max={Math.max(events.length - 1, 0)}
            value={cursor}
            onChange={(event) => onCursorChange(Number(event.target.value))}
          />
          <span>{cursor} / {Math.max(events.length - 1, 0)}</span>
        </div>
      </div>
    </div>
  );
}

export function GraphPanel({ graph }: { graph: GraphModel }): JSX.Element {
  return (
    <div className="panel">
      <div className="panel-head">Execution Graph</div>
      <div className="graph-wrap">
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          minZoom={0.2}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={18} size={1} color="#1f2c4f" />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}

export function SelectedEventPanel({ selected }: { selected: TimelineEventEntry | null }): JSX.Element {
  return (
    <div className="panel panel-highlight">
      <div className="panel-head">Selected Event</div>
      <pre className="json">{selected ? JSON.stringify(selected, null, 2) : '{}'}</pre>
    </div>
  );
}

export function RecentEventsPanel(props: { events: TimelineEventEntry[]; summary: Summary }): JSX.Element {
  const { events, summary } = props;
  return (
    <div className="panel">
      <div className="panel-head">Recent Events</div>
      <div className="recent-mini">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>type</th>
              <th>step</th>
            </tr>
          </thead>
          <tbody>
            {events.length > 0 ? (
              events.slice(-10).reverse().map((entry) => (
                <tr key={entry.index}>
                  <td>{entry.index}</td>
                  <td>{entry.event.type}</td>
                  <td>{entry.event.step}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3}>no events yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="insights">
        <div className="last-event">
          {summary.lastEventAt ? `last event: ${new Date(summary.lastEventAt).toLocaleTimeString()}` : 'no events yet'}
        </div>
        <div className="stats-grid">
          <MetricCard label="runs" value={summary.runStarted} />
          <MetricCard label="completed" value={summary.runCompleted} />
          <MetricCard label="failed" value={summary.runFailed} />
          <MetricCard label="stopped" value={summary.runStopped} />
          <MetricCard label="nodes" value={summary.nodes} />
          <MetricCard label="edges" value={summary.edges} />
        </div>
        <ul className="hint-list">
          <li>Play executa um novo run e reproduz a timeline.</li>
          <li>Back/Step navegam evento a evento.</li>
          <li>Use o slider para saltar para qualquer ponto da execução.</li>
        </ul>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export function ExecutionTracePanel({ traceSummary }: { traceSummary: TraceSummary }): JSX.Element {
  return (
    <div className="panel">
      <div className="panel-head">Execution Trace</div>
      <div className="trace-wrap">
        <div className="stat-label" style={{ marginBottom: '8px' }}>Recent nodes at current timeline point</div>
        <ol className="trace-list">
          {traceSummary.nodes.length > 0
            ? traceSummary.nodes.map((node, index) => <li key={`n-${index}-${node}`}>{node}</li>)
            : <li>No node execution yet</li>}
        </ol>
        <div className="stat-label" style={{ margin: '10px 0 8px' }}>Recent transitions</div>
        <ul className="trace-list">
          {traceSummary.edges.length > 0
            ? traceSummary.edges.map((edge, index) => <li key={`e-${index}-${edge}`}>{edge}</li>)
            : <li>No transitions yet</li>}
        </ul>
      </div>
    </div>
  );
}

export function BudgetPanel({ budget }: { budget: BudgetStatusView | null }): JSX.Element {
  if (!budget) {
    return (
      <div className="panel">
        <div className="panel-head">Budget</div>
        <div className="trace-wrap">No budget data yet</div>
      </div>
    );
  }
  const riskClass = budget.risk === 'critical' ? 'risk-critical' : budget.risk === 'warning' ? 'risk-warning' : 'risk-ok';
  return (
    <div className={`panel ${riskClass}`}>
      <div className="panel-head">Budget</div>
      <div className="trace-wrap">
        <div className="stats-grid">
          <BudgetMetric label="tokens" used={budget.used.tokens} limit={budget.limits.tokens} remaining={budget.remaining.tokens} />
          <BudgetMetric label="tools" used={budget.used.tools} limit={budget.limits.tools} remaining={budget.remaining.tools} />
          <BudgetMetric label="timeMs" used={budget.used.timeMs} limit={budget.limits.timeMs} remaining={budget.remaining.timeMs} />
          <BudgetMetric label="costUsd" used={budget.used.costUsd} limit={budget.limits.costUsd} remaining={budget.remaining.costUsd} />
        </div>
        {budget.exceeded.length > 0 ? (
          <div className="last-event">Exceeded: {budget.exceeded.join(', ')}</div>
        ) : null}
      </div>
    </div>
  );
}

function BudgetMetric({ label, used, limit, remaining }: { label: string; used: number; limit: number; remaining: number }): JSX.Element {
  const limitText = Number.isFinite(limit) ? String(limit) : '∞';
  const remainingText = Number.isFinite(remaining) ? String(remaining) : '∞';
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{used} / {limitText}</div>
      <div className="stat-label">remaining: {remainingText}</div>
    </div>
  );
}
