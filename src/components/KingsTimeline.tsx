import { useMemo } from "react";
import {
  dividedKingReigns,
  type KingReign,
  unitedKingReigns,
} from "../data/kings";
import { peopleById } from "../data/genealogy";
import type { Person } from "../data/types";

interface KingsTimelineProps {
  selectedId: string | null;
  onSelect: (personId: string) => void;
  onHover: (person: Person | null) => void;
}

interface TimelineRow {
  year: number;
  judah: KingReign[];
  israel: KingReign[];
  judahMilestone?: { title: string; text: string };
  israelMilestone?: { title: string; text: string };
}

function KingCard({
  reign,
  selectedId,
  onSelect,
  onHover,
}: {
  reign: KingReign;
  selectedId: string | null;
  onSelect: (personId: string) => void;
  onHover: (person: Person | null) => void;
}) {
  const person = peopleById.get(reign.personId);
  const title = reign.kingdom === "judah"
    ? reign.sex === "female" ? "Queen of Judah" : "King of Judah"
    : reign.kingdom === "israel"
      ? "King of Israel"
      : "United monarchy";

  return (
    <div className={`king-entry house-${reign.dynastyKey}`}>
      {reign.dynastyBreak && (
        <div className="dynasty-break">
          <span>Dynastic change</span>
          <strong>{reign.dynastyBreak}</strong>
        </div>
      )}
      <button
        type="button"
        className={`king-card ${selectedId === reign.personId ? "active" : ""}`}
        aria-pressed={selectedId === reign.personId}
        onClick={() => onSelect(reign.personId)}
        onMouseEnter={() => onHover(person ?? null)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(person ?? null)}
        onBlur={() => onHover(null)}
      >
        <span className="king-card-role">{title}</span>
        <span className="king-card-main">
          <strong>{reign.name}</strong>
          <time>{reign.reignLabel}</time>
        </span>
        <span className="king-card-meta">
          <small>{reign.dynasty}</small>
          {reign.durationLabel && <small>{reign.durationLabel}</small>}
        </span>
      </button>
    </div>
  );
}

export function KingsTimeline({ selectedId, onSelect, onHover }: KingsTimelineProps) {
  const rows = useMemo(() => {
    const byYear = new Map<number, TimelineRow>();
    const rowFor = (year: number) => {
      const existing = byYear.get(year);
      if (existing) return existing;
      const row: TimelineRow = { year, judah: [], israel: [] };
      byYear.set(year, row);
      return row;
    };

    dividedKingReigns.forEach((reign) => rowFor(reign.startBce)[reign.kingdom as "judah" | "israel"].push(reign));
    rowFor(722).israelMilestone = {
      title: "Samaria falls",
      text: "Assyria ends the northern kingdom and carries Israel into exile.",
    };
    rowFor(586).judahMilestone = {
      title: "Jerusalem falls",
      text: "Babylon destroys Jerusalem and the temple, and Judah goes into exile.",
    };

    return [...byYear.values()].sort((a, b) => b.year - a.year);
  }, []);

  return (
    <section className="kings-chronology" aria-label="Chronology of the kings of Judah and Israel">
      <div className="kings-chronology-summary">
        <div>
          <span>Chronology note</span>
          <strong>One story, then two kingdoms</strong>
          <p>
            Dates are approximate BCE dates in a commonly used Thiele-style chronology. Co-regencies,
            rival reigns, and different accession-year systems mean some sources vary by several years.
          </p>
        </div>
        <dl>
          <div><dt>United monarchy</dt><dd>c. 1050–931</dd></div>
          <div><dt>Israel falls</dt><dd>722 BCE</dd></div>
          <div><dt>Judah falls</dt><dd>586 BCE</dd></div>
        </dl>
      </div>

      <div className="united-monarchy">
        <div className="kings-era-label">
          <span>Before the division</span>
          <strong>The united monarchy</strong>
        </div>
        <div className="united-king-list">
          {unitedKingReigns.map((reign) => (
            <KingCard
              key={reign.personId}
              reign={reign}
              selectedId={selectedId}
              onSelect={onSelect}
              onHover={onHover}
            />
          ))}
        </div>
      </div>

      <div className="kingdom-division">
        <span>931 BCE</span>
        <strong>The kingdom divides</strong>
        <small>Rehoboam retains Judah; Jeroboam leads the northern tribes as Israel.</small>
      </div>

      <div className="kingdom-column-headings" aria-hidden="true">
        <div><span>Southern kingdom</span><strong>Judah</strong><small>House of David, except Athaliah’s interruption</small></div>
        <i />
        <div><span>Northern kingdom</span><strong>Israel</strong><small>Nine royal houses in roughly two centuries</small></div>
      </div>

      <ol className="divided-kings-list">
        {rows.map((row) => (
          <li className="king-accession-row" key={row.year}>
            <time>{row.year} BCE</time>
            <div className="kingdom-cell judah-cell">
              {row.judah.map((reign) => (
                <KingCard
                  key={reign.personId}
                  reign={reign}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onHover={onHover}
                />
              ))}
              {row.judahMilestone && (
                <div className="kingdom-fall judah-fall">
                  <span>Kingdom ends</span>
                  <strong>{row.judahMilestone.title}</strong>
                  <p>{row.judahMilestone.text}</p>
                </div>
              )}
            </div>
            <i className="chronology-axis" />
            <div className="kingdom-cell israel-cell">
              {row.israel.map((reign) => (
                <KingCard
                  key={reign.personId}
                  reign={reign}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onHover={onHover}
                />
              ))}
              {row.israelMilestone && (
                <div className="kingdom-fall israel-fall">
                  <span>Kingdom ends</span>
                  <strong>{row.israelMilestone.title}</strong>
                  <p>{row.israelMilestone.text}</p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
