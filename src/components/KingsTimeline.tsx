import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  dividedKingReigns,
  type KingReign,
  kingRelatives,
  type KingRelative,
  unitedKingReigns,
} from "../data/kings";
import { kingsFamilyLinks, peopleById } from "../data/genealogy";
import type { Person, Relationship } from "../data/types";

interface KingsTimelineProps {
  selectedId: string | null;
  onSelect: (personId: string) => void;
  onHover: (person: Person | null) => void;
}

interface TimelineRow {
  year: number;
  judah: KingReign[];
  israel: KingReign[];
  judahRelatives: KingRelative[];
  israelRelatives: KingRelative[];
  judahMilestone?: { title: string; text: string };
  israelMilestone?: { title: string; text: string };
}

function KingCard({
  reign,
  selectedId,
  kinIds,
  onSelect,
  onHover,
}: {
  reign: KingReign;
  selectedId: string | null;
  kinIds?: Set<string>;
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
        data-person-id={reign.personId}
        className={`king-card ${selectedId === reign.personId ? "active" : ""} ${kinIds?.has(reign.personId) ? "kin" : ""}`}
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

function RelativeCard({
  relative,
  selectedId,
  kinIds,
  onSelect,
  onHover,
}: {
  relative: KingRelative;
  selectedId: string | null;
  kinIds?: Set<string>;
  onSelect: (personId: string) => void;
  onHover: (person: Person | null) => void;
}) {
  const person = peopleById.get(relative.personId);
  return (
    <div className="king-entry king-relative">
      <button
        type="button"
        data-person-id={relative.personId}
        className={`king-card relative-card ${selectedId === relative.personId ? "active" : ""} ${kinIds?.has(relative.personId) ? "kin" : ""}`}
        aria-pressed={selectedId === relative.personId}
        onClick={() => onSelect(relative.personId)}
        onMouseEnter={() => onHover(person ?? null)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(person ?? null)}
        onBlur={() => onHover(null)}
      >
        <span className="king-card-role">Family · did not reign</span>
        <span className="king-card-main">
          <strong>{relative.name}</strong>
        </span>
        <span className="king-card-meta">
          <small>{relative.role}</small>
        </span>
      </button>
    </div>
  );
}

interface LinkPath {
  relationship: Relationship;
  d: string;
}

interface Box { left: number; right: number; top: number; bottom: number; cx: number; cy: number }

/**
 * Route a family link between two cards. Cards in different columns connect
 * through the axis side; cards stacked in the same column connect with a
 * bracket on the outer side, away from the axis, so lines never cross cards.
 */
function routeLink(from: Box, to: Box, width: number): string {
  const sameColumn = Math.abs(from.cx - to.cx) < 60;
  if (sameColumn) {
    // Bracket on the side away from the central axis, clamped to the room available.
    const useLeft = (from.cx + to.cx) / 2 < width / 2;
    const x1 = useLeft ? from.left : from.right;
    const x2 = useLeft ? to.left : to.right;
    const edge = useLeft ? Math.min(x1, x2) : Math.max(x1, x2);
    const room = useLeft ? edge : width - edge;
    // Longer brackets bulge further so nested links stay distinguishable.
    const span = Math.abs(to.cy - from.cy);
    const bulge = Math.max(8, Math.min(14 + span * 0.14, 64, room - 4)) * (useLeft ? -1 : 1);
    return `M ${x1} ${from.cy} C ${edge + bulge} ${from.cy}, ${edge + bulge} ${to.cy}, ${x2} ${to.cy}`;
  }
  const leftToRight = from.cx < to.cx;
  const x1 = leftToRight ? from.right : from.left;
  const x2 = leftToRight ? to.left : to.right;
  const mid = (x1 + x2) / 2;
  return `M ${x1} ${from.cy} C ${mid} ${from.cy}, ${mid} ${to.cy}, ${x2} ${to.cy}`;
}

export function KingsTimeline({ selectedId, onSelect, onHover }: KingsTimelineProps) {
  const rows = useMemo(() => {
    const byYear = new Map<number, TimelineRow>();
    const rowFor = (year: number) => {
      const existing = byYear.get(year);
      if (existing) return existing;
      const row: TimelineRow = { year, judah: [], israel: [], judahRelatives: [], israelRelatives: [] };
      byYear.set(year, row);
      return row;
    };

    dividedKingReigns.forEach((reign) => rowFor(reign.startBce)[reign.kingdom as "judah" | "israel"].push(reign));
    kingRelatives.forEach((relative) => rowFor(relative.rowBce)[`${relative.kingdom}Relatives`].push(relative));
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

  const familyLinks = useMemo(() => kingsFamilyLinks(), []);
  const sectionRef = useRef<HTMLElement>(null);
  const [paths, setPaths] = useState<LinkPath[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    const measure = () => {
      const origin = section.getBoundingClientRect();
      const boxFor = (personId: string): Box | null => {
        const element = section.querySelector<HTMLElement>(`[data-person-id="${personId}"]`);
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        const left = rect.left - origin.left;
        const top = rect.top - origin.top;
        return {
          left,
          right: left + rect.width,
          top,
          bottom: top + rect.height,
          cx: left + rect.width / 2,
          cy: top + rect.height / 2,
        };
      };
      setSize({ width: section.scrollWidth, height: section.scrollHeight });
      setPaths(familyLinks.flatMap((relationship) => {
        const from = boxFor(relationship.from);
        const to = boxFor(relationship.to);
        return from && to ? [{ relationship, d: routeLink(from, to, origin.width) }] : [];
      }));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [familyLinks]);

  const focusId = hoveredId ?? selectedId;
  const focusInFamily = Boolean(focusId && familyLinks.some((link) => link.from === focusId || link.to === focusId));
  const kinIds = new Set(
    focusInFamily
      ? familyLinks
        .filter((link) => link.from === focusId || link.to === focusId)
        .flatMap((link) => [link.from, link.to])
      : [],
  );
  const handleHover = (person: Person | null) => {
    setHoveredId(person?.id ?? null);
    onHover(person);
  };

  return (
    <section
      ref={sectionRef}
      className={`kings-chronology ${focusInFamily ? "family-focus" : ""}`}
      aria-label="Chronology of the kings of Judah and Israel"
    >
      <svg
        className="kings-family-links"
        width={size.width}
        height={size.height}
        viewBox={`0 0 ${size.width} ${size.height}`}
        aria-hidden="true"
      >
        <defs>
          <marker id="kings-family-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
        </defs>
        {paths.map(({ relationship, d }) => {
          const touchesFocus = focusInFamily && (relationship.from === focusId || relationship.to === focusId);
          return (
            <path
              key={relationship.id}
              d={d}
              className={`family-link ${relationship.kind} ${touchesFocus ? "highlight" : focusInFamily ? "faded" : ""}`}
              markerEnd={relationship.kind === "parent" ? "url(#kings-family-arrow)" : undefined}
            />
          );
        })}
      </svg>
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
                  kinIds={kinIds}
                  onHover={handleHover}
                />
              ))}
              {row.judahRelatives.map((relative) => (
                <RelativeCard key={relative.personId} relative={relative} selectedId={selectedId} onSelect={onSelect} kinIds={kinIds}
                  onHover={handleHover} />
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
                  kinIds={kinIds}
                  onHover={handleHover}
                />
              ))}
              {row.israelRelatives.map((relative) => (
                <RelativeCard key={relative.personId} relative={relative} selectedId={selectedId} onSelect={onSelect} kinIds={kinIds}
                  onHover={handleHover} />
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
