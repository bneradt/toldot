import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import dagre from "cytoscape-dagre";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import {
  originTimelineEntries,
  patriarchSonsInBirthOrder,
  peopleById,
  relationships,
  visiblePersonIdsForView,
} from "../data/genealogy";
import type { GenealogyView, Person } from "../data/types";

cytoscape.use(dagre);

interface GenealogyGraphProps {
  view: GenealogyView;
  selectedId: string | null;
  onSelect: (personId: string) => void;
  onHover: (person: Person | null) => void;
}

function edgeClass(sourceLayers: string[], kind: string, activeLayers: string[]) {
  const visibleLayers = sourceLayers.filter((layer) => activeLayers.includes(layer));
  const layer = visibleLayers.includes("Matthew") && visibleLayers.includes("Luke")
    ? "shared"
    : visibleLayers.includes("Matthew")
      ? "matthew"
      : visibleLayers.includes("Luke")
        ? "luke"
        : visibleLayers.includes("Ruth")
          ? "ruth"
          : "genesis";
  return `${layer} ${kind}`;
}

const patriarchMothers = new Set(["leah", "rachel", "bilhah", "zilpah"]);
const patriarchSons = new Set<string>(patriarchSonsInBirthOrder);

function isPatriarchOverviewRelationship(from: string, to: string) {
  return !(patriarchMothers.has(from) && patriarchSons.has(to));
}

function arrangePatriarchs(graph: Core) {
  const position = (personId: string, x: number, y: number) => {
    const node = graph.getElementById(personId);
    if (node.length) node.position({ x, y });
  };

  position("terah", 0, 0);
  position("hagar", -190, 130);
  position("abraham", 0, 130);
  position("sarah", 190, 130);
  position("nahor-brother", 500, 130);
  position("milcah", 670, 130);
  position("bethuel", 585, 255);
  position("ishmael", -150, 380);
  position("isaac", 100, 380);
  position("rebekah", 270, 380);
  position("laban", 585, 380);
  position("esau", -390, 530);
  position("bilhah", -180, 530);
  position("jacob", 0, 530);
  position("zilpah", 180, 530);
  position("leah", 585, 530);
  position("rachel", 750, 530);

  patriarchSonsInBirthOrder.forEach((personId, index) => {
    position(personId, (index - 5.5) * 150, 690);
  });

  const judahX = (3 - 5.5) * 150;
  position("er-judah", judahX - 475, 835);
  position("onan", judahX - 315, 835);
  position("tamar", judahX - 155, 835);
  position("perez", judahX - 135, 980);
  position("zerah", judahX + 25, 980);
}

export function GenealogyGraph({ view, selectedId, onSelect, onHover }: GenealogyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Core | null>(null);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const branchButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const timelineEntryRefs = useRef(new Map<string, HTMLDivElement>());
  const timelineDeathRefs = useRef(new Map<string, HTMLDivElement>());
  const timelineLineRef = useRef<HTMLDivElement>(null);
  const [expandedByView, setExpandedByView] = useState<Record<string, string[]>>({});

  const expandedBranchIds = useMemo(
    () => new Set(expandedByView[view.id] ?? view.defaultExpandedBranchIds ?? []),
    [expandedByView, view],
  );
  const visiblePersonIds = useMemo(
    () => visiblePersonIdsForView(view, expandedBranchIds),
    [expandedBranchIds, view],
  );

  useEffect(() => {
    onSelectRef.current = onSelect;
    onHoverRef.current = onHover;
  }, [onHover, onSelect]);

  useEffect(() => {
    if (!selectedId) return;
    const containingBranch = view.branches?.find((branch) => branch.personIds.includes(selectedId));
    if (!containingBranch) return;

    setExpandedByView((current) => {
      const expanded = new Set(current[view.id] ?? view.defaultExpandedBranchIds ?? []);
      if (expanded.has(containingBranch.id)) return current;
      expanded.add(containingBranch.id);
      return { ...current, [view.id]: [...expanded] };
    });
  }, [selectedId, view]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const visible = new Set(visiblePersonIds);
    const nodes: ElementDefinition[] = visiblePersonIds.flatMap((id, layoutOrder) => {
      const person = peopleById.get(id);
      if (!person) return [];
      return [{
        data: {
          id: person.id,
          label: person.name,
          descriptor: person.descriptor ?? "",
          layoutOrder,
          birthOrder: person.birthOrder ?? null,
        },
        classes: [person.notable ? "notable" : "", person.sex === "female" ? "woman" : ""]
          .filter(Boolean)
          .join(" "),
      }];
    });

    const visibleRelationships = relationships
      .filter((relationship) =>
        visible.has(relationship.from)
        && visible.has(relationship.to)
        && relationship.sourceLayers.some((layer) => view.sourceLayers.includes(layer))
        && (view.id !== "patriarchs" || isPatriarchOverviewRelationship(relationship.from, relationship.to)),
      );
    const toEdge = (relationship: (typeof relationships)[number]): ElementDefinition => ({
      data: {
        id: relationship.id,
        source: relationship.from,
        target: relationship.to,
        kind: relationship.kind,
      },
      classes: edgeClass(
        relationship.sourceLayers,
        relationship.kind,
        view.id === "promise" ? view.sourceLayers : [],
      ),
    });
    const partnerRelationships = visibleRelationships.filter(
      (relationship) => relationship.kind === "spouse" || relationship.kind === "concubine",
    );
    const lineageEdges = visibleRelationships
      .filter((relationship) => relationship.kind !== "spouse" && relationship.kind !== "concubine")
      .map(toEdge);
    const partnerEdges = partnerRelationships.map(toEdge);

    const graph = cytoscape({
      container,
      elements: [...nodes, ...lineageEdges],
      minZoom: 0.18,
      maxZoom: 2.2,
      wheelSensitivity: 0.22,
      boxSelectionEnabled: false,
      selectionType: "single",
      userZoomingEnabled: false,
      autoungrabify: true,
      style: [
        {
          selector: "node",
          style: {
            "background-color": "#fffdf7",
            "border-color": "#b8ad97",
            "border-width": 1.5,
            color: "#1b2b28",
            content: "data(label)",
            "font-family": "Georgia, 'Times New Roman', serif",
            "font-size": 15,
            "font-weight": "bold",
            height: 42,
            label: "data(label)",
            padding: "8px",
            shape: "round-rectangle",
            "text-halign": "center",
            "text-valign": "center",
            width: 116,
          },
        },
        {
          selector: "node.notable",
          style: {
            "background-color": "#f8efd8",
            "border-color": "#b98038",
            "border-width": 2,
          },
        },
        {
          selector: "node.woman",
          style: {
            "background-color": "#f6ece5",
            "border-color": "#a96851",
          },
        },
        {
          selector: "node.selected",
          style: {
            "background-color": "#173a34",
            "border-color": "#d4a65b",
            "border-width": 3,
            color: "#fffdf7",
            "overlay-color": "#d4a65b",
            "overlay-opacity": 0.14,
            "overlay-padding": 8,
          },
        },
        {
          selector: "node.neighbor",
          style: {
            "border-color": "#4e756d",
            "border-width": 2.5,
          },
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "line-color": "#8a9a95",
            opacity: 0.7,
            "target-arrow-color": "#8a9a95",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.75,
            width: 2,
          },
        },
        {
          selector: "edge.matthew",
          style: { "line-color": "#b8792f", "target-arrow-color": "#b8792f" },
        },
        {
          selector: "edge.luke",
          style: { "line-color": "#557a8f", "target-arrow-color": "#557a8f" },
        },
        {
          selector: "edge.shared",
          style: { "line-color": "#6d5f82", "target-arrow-color": "#6d5f82", width: 2.5 },
        },
        {
          selector: "edge.ruth",
          style: { "line-color": "#8b6652", "target-arrow-color": "#8b6652" },
        },
        {
          selector: "edge.spouse, edge.concubine",
          style: {
            "line-style": "dashed",
            "target-arrow-shape": "none",
            opacity: 0.48,
            width: 1.5,
          },
        },
        {
          selector: "edge.as-supposed",
          style: { "line-style": "dotted", opacity: 0.8 },
        },
        {
          selector: "edge.neighbor",
          style: { opacity: 1, width: 3.5 },
        },
      ],
    });

    graphRef.current = graph;
    graph.on("tap", "node", (event) => onSelectRef.current(event.target.id()));
    graph.on("mouseover", "node", (event) => onHoverRef.current(peopleById.get(event.target.id()) ?? null));
    graph.on("mouseout", "node", () => onHoverRef.current(null));

    const positionOverlayControls = () => {
      const containerLeft = container.offsetLeft;
      view.branches?.forEach((branch) => {
        const button = branchButtonRefs.current.get(branch.id);
        const node = graph.getElementById(branch.rootPersonId);
        if (!button || !node.length) return;
        const position = node.renderedPosition();
        const left = containerLeft + position.x + node.renderedWidth() / 2 - 10;
        const top = position.y - node.renderedHeight() / 2 - 10;
        button.style.transform = `translate3d(${left}px, ${top}px, 0)`;
        button.style.visibility = "visible";
      });

      if (view.id === "origins") {
        const visibleY: number[] = [];
        const birthAnchors: Array<{ year: number; y: number; id: string }> = [];
        originTimelineEntries.forEach((entry) => {
          const element = timelineEntryRefs.current.get(entry.id);
          const node = graph.getElementById(entry.personId);
          if (!element || !node.length) {
            if (element) element.style.visibility = "hidden";
            return;
          }
          const y = container.offsetTop + node.renderedPosition().y;
          element.style.transform = `translate3d(0, ${y}px, 0) translateY(-50%)`;
          element.style.visibility = "visible";
          visibleY.push(y);
          birthAnchors.push({ year: entry.birthYear, y, id: entry.id });
        });

        birthAnchors.sort((a, b) => a.year - b.year);
        const yForYear = (year: number) => {
          if (birthAnchors.length < 2) return birthAnchors[0]?.y ?? 0;
          let lower = birthAnchors[0];
          let upper = birthAnchors[1];
          if (year >= birthAnchors.at(-1)!.year) {
            lower = birthAnchors.at(-2)!;
            upper = birthAnchors.at(-1)!;
          } else {
            for (let index = 1; index < birthAnchors.length; index += 1) {
              if (year <= birthAnchors[index].year) {
                lower = birthAnchors[index - 1];
                upper = birthAnchors[index];
                break;
              }
            }
          }
          const yearSpan = upper.year - lower.year;
          return lower.y + ((year - lower.year) / yearSpan) * (upper.y - lower.y);
        };

        let previousDeathY = Number.NEGATIVE_INFINITY;
        originTimelineEntries
          .filter((entry) => birthAnchors.some((anchor) => anchor.id === entry.id) && entry.endYear)
          .sort((a, b) => a.endYear! - b.endYear!)
          .forEach((entry) => {
            const element = timelineDeathRefs.current.get(entry.id);
            if (!element || !entry.endYear) return;
            const chronologicalY = yForYear(entry.endYear);
            const displayY = Math.max(chronologicalY, previousDeathY + 25);
            previousDeathY = displayY;
            element.style.transform = `translate3d(0, ${displayY}px, 0) translateY(-50%)`;
            element.style.visibility = "visible";
            visibleY.push(displayY);
          });

        timelineDeathRefs.current.forEach((element, id) => {
          if (!birthAnchors.some((anchor) => anchor.id === id)) element.style.visibility = "hidden";
        });

        if (timelineLineRef.current && visibleY.length) {
          const first = Math.min(...visibleY);
          const last = Math.max(...visibleY);
          timelineLineRef.current.style.top = `${first}px`;
          timelineLineRef.current.style.height = `${Math.max(0, last - first)}px`;
          timelineLineRef.current.style.visibility = "visible";
        }
      }
    };
    graph.on("render", positionOverlayControls);

    const layout = graph.layout({
      name: "dagre",
      rankDir: "TB",
      rankSep: 70,
      nodeSep: 38,
      edgeSep: 14,
      padding: 36,
      animate: false,
      sort: (a: cytoscape.SingularElementArgument, b: cytoscape.SingularElementArgument) => {
        const aBirthOrder = a.data("birthOrder") as number | null;
        const bBirthOrder = b.data("birthOrder") as number | null;
        if (aBirthOrder !== null && bBirthOrder !== null) return bBirthOrder - aBirthOrder;
        return Number(b.data("layoutOrder")) - Number(a.data("layoutOrder"));
      },
    } as cytoscape.LayoutOptions);

    layout.one("layoutstop", () => {
      graph.startBatch();
      if (view.id === "patriarchs") arrangePatriarchs(graph);
      partnerRelationships.forEach((relationship) => {
        const partner = graph.getElementById(relationship.to);
        const anchor = graph.getElementById(relationship.from);
        if (partner.length && anchor.length) partner.position("y", anchor.position("y"));
      });
      graph.add(partnerEdges);
      graph.endBatch();

      if (view.id === "patriarchs") {
        graph.fit(graph.elements(), 54);
      } else {
        const ordered = [...graph.nodes()].sort((a, b) => a.position("y") - b.position("y"));
        let opening = graph.collection();
        ordered.slice(0, Math.min(12, ordered.length)).forEach((node) => {
          opening = opening.merge(node);
        });
        graph.fit(opening, view.id === "origins" ? 88 : 54);
      }
      if (graph.zoom() > 0.95) graph.zoom(0.95);
      positionOverlayControls();
    });
    layout.run();

    const observer = new ResizeObserver(() => graph.resize());
    observer.observe(container);

    const panWithWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      graph.panBy({ x: -event.deltaX, y: -event.deltaY });
    };
    container.addEventListener("wheel", panWithWheel, { capture: true, passive: false });

    return () => {
      container.removeEventListener("wheel", panWithWheel, { capture: true });
      observer.disconnect();
      graph.off("render", positionOverlayControls);
      view.branches?.forEach((branch) => {
        const button = branchButtonRefs.current.get(branch.id);
        if (button) button.style.visibility = "hidden";
      });
      timelineEntryRefs.current.forEach((entry) => { entry.style.visibility = "hidden"; });
      timelineDeathRefs.current.forEach((entry) => { entry.style.visibility = "hidden"; });
      if (timelineLineRef.current) timelineLineRef.current.style.visibility = "hidden";
      graph.destroy();
      graphRef.current = null;
    };
  }, [view, visiblePersonIds]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.elements().removeClass("selected neighbor");
    if (!selectedId) return;
    const selected = graph.getElementById(selectedId);
    if (!selected.length) return;
    selected.addClass("selected");
    selected.neighborhood().addClass("neighbor");
    graph.animate({ center: { eles: selected }, duration: 220 });
  }, [selectedId, visiblePersonIds]);

  const toggleBranch = (branchId: string) => {
    setExpandedByView((current) => {
      const expanded = new Set(current[view.id] ?? view.defaultExpandedBranchIds ?? []);
      if (expanded.has(branchId)) expanded.delete(branchId);
      else expanded.add(branchId);
      return { ...current, [view.id]: [...expanded] };
    });
  };

  const zoom = (factor: number) => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.zoom({ level: graph.zoom() * factor, renderedPosition: { x: graph.width() / 2, y: graph.height() / 2 } });
  };

  const fit = () => graphRef.current?.animate({ fit: { eles: graphRef.current.elements(), padding: 44 }, duration: 240 });

  return (
    <div className={`graph-shell ${view.id === "origins" ? "has-origin-timeline" : ""}`}>
      {view.id === "origins" && (
        <aside className="origin-timeline" aria-label="Calculated chronology from Adam through Noah’s sons">
          <header>
            <strong>Years from Adam</strong>
            <span>Births align with the tree · deaths follow chronologically · spacing is not to scale</span>
          </header>
          <div className="origin-timeline-line" ref={timelineLineRef} aria-hidden="true" />
          {originTimelineEntries.map((entry) => (
            <div
              className={`origin-timeline-entry ${entry.id === "noah-sons" ? "sons-entry" : ""}`}
              key={entry.id}
              style={{ "--timeline-color": entry.color } as CSSProperties}
              ref={(element) => {
                if (element) timelineEntryRefs.current.set(entry.id, element);
                else timelineEntryRefs.current.delete(entry.id);
              }}
            >
              <span>{entry.yearLabel}</span>
              <strong>{entry.title}</strong>
              <small>{entry.lifeLabel}</small>
            </div>
          ))}
          {originTimelineEntries.filter((entry) => entry.endYear && entry.endTitle).map((entry) => (
            <div
              className="origin-timeline-death"
              key={`${entry.id}-death`}
              style={{ "--timeline-color": entry.color } as CSSProperties}
              ref={(element) => {
                if (element) timelineDeathRefs.current.set(entry.id, element);
                else timelineDeathRefs.current.delete(entry.id);
              }}
            >
              <strong>{entry.endTitle}</strong>
              <span>Year {entry.endYear}</span>
            </div>
          ))}
        </aside>
      )}
      <div
        ref={containerRef}
        className="graph-canvas"
        role="img"
        aria-label={`${view.title} interactive family graph. Use search or the browse-names list for keyboard navigation.`}
      />
      {view.branches && view.branches.length > 0 && (
        <div className="node-branch-controls" aria-label="Expandable family branches">
          {view.branches.map((branch) => {
            const expanded = expandedBranchIds.has(branch.id);
            const label = `${expanded ? "Collapse" : "Expand"} ${branch.title}`;
            return (
              <button
                type="button"
                key={branch.id}
                ref={(button) => {
                  if (button) branchButtonRefs.current.set(branch.id, button);
                  else branchButtonRefs.current.delete(branch.id);
                }}
                className={expanded ? "expanded" : ""}
                aria-label={label}
                aria-expanded={expanded}
                title={label}
                onClick={() => toggleBranch(branch.id)}
              >
                <span aria-hidden="true">{expanded ? "−" : "+"}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="graph-controls" aria-label="Graph controls">
        <button type="button" onClick={() => zoom(1.24)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom out">−</button>
        <button type="button" className="fit-button" onClick={fit}>Fit all</button>
      </div>
      <div className="graph-scroll-hint">Scroll or drag to move</div>
    </div>
  );
}
