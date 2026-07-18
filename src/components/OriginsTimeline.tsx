import { type CSSProperties, useMemo, useState } from "react";
import { originTimelineEntries, originTimelineMilestones, peopleById } from "../data/genealogy";
import type { Person } from "../data/types";

interface OriginsTimelineProps {
  selectedId: string | null;
  onSelect: (personId: string) => void;
  onHover: (person: Person | null) => void;
}

interface ChronologyEvent {
  id: string;
  year: number;
  yearLabel: string;
  sortOrder: number;
  kind: "birth" | "death" | "milestone" | "undated";
  title: string;
  detail: string;
  color: string;
  personId?: string;
  relatedPersonIds?: string[];
  lane: number;
}

const timelineRowHeight = 116;

const chronologyEvents: ChronologyEvent[] = [
  ...originTimelineEntries.flatMap((entry, lane): ChronologyEvent[] => {
    const person = peopleById.get(entry.personId);
    const events: ChronologyEvent[] = [{
      id: `${entry.id}-birth`,
      year: entry.birthYear,
      yearLabel: `Year ${entry.birthYear}`,
      sortOrder: 0,
      kind: "birth",
      title: entry.id === "noah-sons" ? "Shem born" : `${person?.name ?? entry.title} born`,
      detail: entry.id === "noah-sons" ? "Calculated from Genesis 11:10" : entry.lifeLabel,
      color: entry.color,
      personId: entry.personId,
      lane,
    }];

    if (entry.endYear && entry.endAge && entry.endTitle) {
      events.push({
        id: `${entry.id}-death`,
        year: entry.endYear,
        yearLabel: `Year ${entry.endYear}`,
        sortOrder: 1,
        kind: "death",
        title: entry.endTitle,
        detail: `Age ${entry.endAge}`,
        color: entry.color,
        personId: entry.personId,
        lane,
      });
    }

    return events;
  }),
  {
    id: "ham-japheth-undated",
    year: 1558,
    yearLabel: "Date not stated",
    sortOrder: 0.5,
    kind: "undated" as const,
    title: "Ham and Japheth",
    detail: "Genesis names them among Noah’s sons but does not give enough information to calculate their birth or death years.",
    color: "#68766f",
    relatedPersonIds: ["ham", "japheth"],
    lane: 10,
  },
  ...originTimelineMilestones.map((milestone): ChronologyEvent => ({
    id: milestone.id,
    year: milestone.year,
    yearLabel: `Year ${milestone.year}`,
    sortOrder: 2,
    kind: "milestone",
    title: "The Flood begins",
    detail: "Noah is 600. Methuselah’s recorded lifespan also reaches this year; Genesis does not say that he died in the Flood.",
    color: milestone.color,
    personId: milestone.anchorPersonId,
    lane: originTimelineEntries.findIndex((entry) => entry.personId === milestone.anchorPersonId),
  })),
].sort((a, b) => a.year - b.year || a.sortOrder - b.sortOrder);

const lifeSpans = originTimelineEntries.flatMap((entry, lane) => {
  const start = chronologyEvents.findIndex((event) => event.id === `${entry.id}-birth`);
  const end = chronologyEvents.findIndex((event) => event.id === `${entry.id}-death`);
  if (start < 0 || end < 0) return [];
  return [{ ...entry, lane, start, length: end - start }];
});

export function OriginsTimeline({ selectedId, onSelect, onHover }: OriginsTimelineProps) {
  const [focusedPersonId, setFocusedPersonId] = useState<string | null>(null);
  const activePersonId = focusedPersonId ?? selectedId;
  const rangeLabel = useMemo(() => {
    const lastYear = Math.max(...chronologyEvents.map((event) => event.year));
    return `Year 0–${lastYear}`;
  }, []);

  const beginHover = (personId: string) => {
    setFocusedPersonId(personId);
    onHover(peopleById.get(personId) ?? null);
  };
  const endHover = () => {
    setFocusedPersonId(null);
    onHover(null);
  };

  return (
    <section className="origins-chronology" aria-label="Origins chronology, with years counted from Adam">
      <header className="origins-chronology-summary">
        <div>
          <span>Genesis chronology</span>
          <strong>Lives overlapping across more than two millennia</strong>
          <p>Each colored rail joins a person’s birth and death. Select any event to read that person’s biblical texts.</p>
        </div>
        <dl>
          <div><dt>Span</dt><dd>{rangeLabel}</dd></div>
          <div><dt>Recorded lives</dt><dd>{originTimelineEntries.length}</dd></div>
          <div><dt>Flood</dt><dd>Year 1656</dd></div>
        </dl>
      </header>

      <aside className="origins-chronology-note">
        <strong>How to read this</strong>
        <span>Years are counted from Adam using the ages in Genesis 5. Shem’s dates are calculated with Genesis 11:10. Cain’s line, Ham, and Japheth lack enough age information to place fully on this timeline.</span>
      </aside>

      <div
        className="origins-chronology-stage"
        style={{ "--origin-event-row": `${timelineRowHeight}px` } as CSSProperties}
      >
        <div className="origin-life-rails" aria-hidden="true">
          {lifeSpans.map((life) => (
            <i
              className={activePersonId === life.personId ? "active" : ""}
              key={life.id}
              style={{
                "--timeline-color": life.color,
                "--life-lane": `${8 + life.lane * 8}px`,
                "--life-start": `${(life.start + 0.5) * timelineRowHeight}px`,
                "--life-length": `${life.length * timelineRowHeight}px`,
              } as CSSProperties}
            />
          ))}
        </div>

        <ol className="origin-event-list">
          {chronologyEvents.map((event) => {
            const isActive = Boolean(event.personId && activePersonId === event.personId);
            const eventStyle = {
              "--timeline-color": event.color,
              "--event-lane": `${8 + event.lane * 8}px`,
            } as CSSProperties;

            return (
              <li className={`${event.kind} ${isActive ? "active" : ""}`} key={event.id} style={eventStyle}>
                <span className="origin-event-year">{event.yearLabel}</span>
                <span className="origin-event-stem" aria-hidden="true"><i /></span>
                {event.kind === "undated" ? (
                  <article className="origin-event-card">
                    <span>{event.kind}</span>
                    <strong>{event.title}</strong>
                    <small>{event.detail}</small>
                    <div className="origin-undated-people">
                      {event.relatedPersonIds?.map((personId) => {
                        const person = peopleById.get(personId);
                        return person ? (
                          <button
                            type="button"
                            key={personId}
                            className={selectedId === personId ? "active" : ""}
                            onClick={() => onSelect(personId)}
                            onFocus={() => beginHover(personId)}
                            onBlur={endHover}
                            onMouseEnter={() => beginHover(personId)}
                            onMouseLeave={endHover}
                          >
                            {person.name}
                          </button>
                        ) : null;
                      })}
                    </div>
                  </article>
                ) : (
                  <button
                    type="button"
                    className="origin-event-card"
                    onClick={() => event.personId && onSelect(event.personId)}
                    onFocus={() => event.personId && beginHover(event.personId)}
                    onBlur={endHover}
                    onMouseEnter={() => event.personId && beginHover(event.personId)}
                    onMouseLeave={endHover}
                  >
                    <span>{event.kind === "milestone" ? "Flood" : event.kind}</span>
                    <strong>{event.title}</strong>
                    <small>{event.detail}</small>
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
