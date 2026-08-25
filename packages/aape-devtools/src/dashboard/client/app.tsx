import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BudgetPanel,
  ExecutionTracePanel,
  GraphPanel,
  RecentEventsPanel,
  SelectedEventPanel,
  TimelinePanel,
} from './panels.tsx';
import { buildBudgetStatus, buildGraph, buildSummary, buildTraceSummary } from './models.ts';
import type { DevtoolsEndpoints, TimelineEventEntry } from './types.ts';

export function App({ endpoints }: { endpoints: DevtoolsEndpoints }): JSX.Element {
  const [events, setEvents] = useState<TimelineEventEntry[]>([]);
  const [cursor, setCursor] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selected = events[cursor] ?? null;
  const graph = useMemo(() => buildGraph(events, cursor), [events, cursor]);
  const summary = useMemo(() => buildSummary(events), [events]);
  const traceSummary = useMemo(() => buildTraceSummary(events, cursor), [events, cursor]);
  const budget = useMemo(() => buildBudgetStatus(events, cursor), [events, cursor]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stepForward = useCallback(() => {
    setCursor((value) => Math.min(value + 1, Math.max(events.length - 1, 0)));
  }, [events.length]);

  const stepBackward = useCallback(() => {
    setCursor((value) => Math.max(value - 1, 0));
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    timerRef.current = setInterval(() => {
      setCursor((value) => {
        const next = Math.min(value + 1, Math.max(events.length - 1, 0));
        if (next === value) stopPlayback();
        return next;
      });
    }, 220);

    return () => {
      if (timerRef.current != null) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [events.length, isPlaying, stopPlayback]);

  useEffect(() => {
    let mounted = true;
    let source: EventSource | null = null;

    (async () => {
      const response = await fetch(endpoints.timeline);
      const data = (await response.json()) as { events?: TimelineEventEntry[] };
      if (!mounted) return;
      const nextEvents = data.events ?? [];
      setEvents(nextEvents);
      setCursor(Math.max(nextEvents.length - 1, 0));

      source = new EventSource(endpoints.events);
      source.addEventListener('pipeline', (message) => {
        const nextEntry = JSON.parse(message.data) as TimelineEventEntry;
        setEvents((previous) => {
          const next = [...previous, nextEntry];
          if (!isPlaying) setCursor(next.length - 1);
          return next;
        });
      });
    })();

    return () => {
      mounted = false;
      if (source) source.close();
      stopPlayback();
    };
  }, [endpoints.events, endpoints.timeline, isPlaying, stopPlayback]);

  const play = useCallback(async () => {
    stopPlayback();
    setCursor(Math.max(events.length - 1, 0));
    await fetch(`${endpoints.run}?count=${Math.floor(Math.random() * 10)}`);
    setIsPlaying(true);
  }, [endpoints.run, events.length, stopPlayback]);

  const clear = useCallback(async () => {
    await fetch(endpoints.clear, { method: 'POST' });
    setEvents([]);
    setCursor(0);
    stopPlayback();
  }, [endpoints.clear, stopPlayback]);

  return (
    <div className="layout">
      <div className="left-col">
        <GraphPanel graph={graph} />
        <RecentEventsPanel events={events} summary={summary} />
      </div>
      <div className="side">
        <BudgetPanel budget={budget} />
        <TimelinePanel
          events={events}
          cursor={cursor}
          onCursorChange={setCursor}
          onPlay={play}
          onBack={stepBackward}
          onStep={stepForward}
          onClear={clear}
        />
        <SelectedEventPanel selected={selected} />
        <ExecutionTracePanel traceSummary={traceSummary} />
      </div>
    </div>
  );
}
