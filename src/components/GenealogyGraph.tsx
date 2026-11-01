import cytoscape, { type Core } from "cytoscape";
import dagre from "cytoscape-dagre";
import { useEffect, useMemo, useRef, useState } from "react";
import { peopleById, visiblePersonIdsForView } from "../data/genealogy";
import type { GenealogyView, Person } from "../data/types";
import { arrangeAfterLayout, buildGraphElements, dagreLayoutOptions, graphStyle } from "./familyTreeLayout";

cytoscape.use(dagre);

interface GenealogyGraphProps {
  view: GenealogyView;
  selectedId: string | null;
  onSelect: (personId: string) => void;
  onHover: (person: Person | null) => void;
  /**
   * Embedded in another page (the Kings chronology): show the whole tree,
   * leave page scrolling alone, and keep the selection highlighted in place.
   */
  embedded?: boolean;
}

export function GenealogyGraph({ view, selectedId, onSelect, onHover, embedded = false }: GenealogyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Core | null>(null);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);
  const branchButtonRefs = useRef(new Map<string, HTMLButtonElement>());
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
    const touchZoomEnabled = window.matchMedia("(pointer: coarse)").matches;

    const { nodes, lineageEdges, partnerEdges, partnerRelationships } = buildGraphElements(view, visiblePersonIds);

    const graph = cytoscape({
      container,
      elements: [...nodes, ...lineageEdges],
      minZoom: 0.18,
      maxZoom: 2.2,
      wheelSensitivity: 0.22,
      boxSelectionEnabled: false,
      selectionType: "single",
      userZoomingEnabled: touchZoomEnabled,
      autoungrabify: true,
      style: graphStyle,
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

    };
    graph.on("render", positionOverlayControls);

    const layout = graph.layout(dagreLayoutOptions);

    layout.one("layoutstop", () => {
      graph.startBatch();
      arrangeAfterLayout(graph, view, partnerRelationships);
      graph.add(partnerEdges);
      graph.endBatch();

      if (embedded) {
        graph.fit(graph.elements(), 40);
        if (graph.zoom() > 0.95) {
          graph.zoom(0.95);
          graph.center(graph.elements());
        }
        // Keep labels legible on narrow screens; the tree can be dragged sideways.
        const minimumZoom = 0.62;
        if (graph.zoom() < minimumZoom) {
          graph.zoom(minimumZoom);
          graph.center(graph.elements());
          const top = graph.elements().renderedBoundingBox().y1;
          graph.panBy({ x: 0, y: 24 - top });
        }
      } else if (view.id === "patriarchs") {
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
    if (!embedded) container.addEventListener("wheel", panWithWheel, { capture: true, passive: false });

    return () => {
      container.removeEventListener("wheel", panWithWheel, { capture: true });
      observer.disconnect();
      graph.off("render", positionOverlayControls);
      view.branches?.forEach((branch) => {
        const button = branchButtonRefs.current.get(branch.id);
        if (button) button.style.visibility = "hidden";
      });
      graph.destroy();
      graphRef.current = null;
    };
  }, [embedded, view, visiblePersonIds]);

  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.elements().removeClass("selected neighbor");
    if (!selectedId) return;
    const selected = graph.getElementById(selectedId);
    if (!selected.length) return;
    selected.addClass("selected");
    selected.neighborhood().addClass("neighbor");
    if (!embedded) graph.animate({ center: { eles: selected }, duration: 220 });
  }, [embedded, selectedId, visiblePersonIds]);

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
    <div className={`graph-shell ${embedded ? "embedded-graph" : ""}`}>
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
        <button type="button" className="zoom-button" onClick={() => zoom(1.24)} aria-label="Zoom in">+</button>
        <button type="button" className="zoom-button" onClick={() => zoom(0.8)} aria-label="Zoom out">−</button>
        <button type="button" className="fit-button" onClick={fit}>Fit all</button>
      </div>
      <div className="graph-scroll-hint">
        {embedded && <span className="embedded-graph-hint">Drag to move · select a name for details</span>}
        <span className="pointer-graph-hint">Scroll or drag to move</span>
        <span className="touch-graph-hint">Pinch to zoom · drag to move</span>
      </div>
    </div>
  );
}
