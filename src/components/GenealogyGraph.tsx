import cytoscape, { type Core, type ElementDefinition } from "cytoscape";
import dagre from "cytoscape-dagre";
import { useEffect, useRef } from "react";
import { peopleById, relationships } from "../data/genealogy";
import type { GenealogyView, Person } from "../data/types";

cytoscape.use(dagre);

interface GenealogyGraphProps {
  view: GenealogyView;
  selectedId: string | null;
  onSelect: (personId: string) => void;
  onHover: (person: Person | null) => void;
}

function edgeClass(sourceLayers: string[], kind: string) {
  const layer = sourceLayers.includes("Matthew") && sourceLayers.includes("Luke")
    ? "shared"
    : sourceLayers.includes("Matthew")
      ? "matthew"
      : sourceLayers.includes("Luke")
        ? "luke"
        : sourceLayers.includes("Ruth")
          ? "ruth"
          : "genesis";
  return `${layer} ${kind}`;
}

export function GenealogyGraph({ view, selectedId, onSelect, onHover }: GenealogyGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Core | null>(null);
  const onSelectRef = useRef(onSelect);
  const onHoverRef = useRef(onHover);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onHoverRef.current = onHover;
  }, [onHover, onSelect]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const visible = new Set(view.personIds);
    const nodes: ElementDefinition[] = view.personIds.flatMap((id) => {
      const person = peopleById.get(id);
      if (!person) return [];
      return [{
        data: {
          id: person.id,
          label: person.name,
          descriptor: person.descriptor ?? "",
        },
        classes: [person.notable ? "notable" : "", person.sex === "female" ? "woman" : ""]
          .filter(Boolean)
          .join(" "),
      }];
    });

    const edges: ElementDefinition[] = relationships
      .filter((relationship) =>
        visible.has(relationship.from)
        && visible.has(relationship.to)
        && relationship.sourceLayers.some((layer) => view.sourceLayers.includes(layer)),
      )
      .map((relationship) => ({
        data: {
          id: relationship.id,
          source: relationship.from,
          target: relationship.to,
          kind: relationship.kind,
        },
        classes: edgeClass(relationship.sourceLayers, relationship.kind),
      }));

    const graph = cytoscape({
      container,
      elements: [...nodes, ...edges],
      minZoom: 0.18,
      maxZoom: 2.2,
      wheelSensitivity: 0.22,
      boxSelectionEnabled: false,
      selectionType: "single",
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
          selector: "edge.spouse",
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

    const layout = graph.layout({
      name: "dagre",
      rankDir: "TB",
      rankSep: 70,
      nodeSep: 38,
      edgeSep: 14,
      padding: 36,
      animate: false,
    } as cytoscape.LayoutOptions);

    layout.one("layoutstop", () => {
      const ordered = [...graph.nodes()].sort((a, b) => a.position("y") - b.position("y"));
      let opening = graph.collection();
      ordered.slice(0, Math.min(12, ordered.length)).forEach((node) => {
        opening = opening.merge(node);
      });
      graph.fit(opening, 54);
      if (graph.zoom() > 0.95) graph.zoom(0.95);
    });
    layout.run();

    const observer = new ResizeObserver(() => graph.resize());
    observer.observe(container);

    const panWithWheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      graph.panBy({ x: -event.deltaX, y: -event.deltaY });
    };
    container.addEventListener("wheel", panWithWheel, { capture: true, passive: false });

    return () => {
      container.removeEventListener("wheel", panWithWheel, { capture: true });
      observer.disconnect();
      graph.destroy();
      graphRef.current = null;
    };
  }, [view]);

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
  }, [selectedId]);

  const zoom = (factor: number) => {
    const graph = graphRef.current;
    if (!graph) return;
    graph.zoom({ level: graph.zoom() * factor, renderedPosition: { x: graph.width() / 2, y: graph.height() / 2 } });
  };

  const fit = () => graphRef.current?.animate({ fit: { eles: graphRef.current.elements(), padding: 44 }, duration: 240 });

  return (
    <div className="graph-shell">
      <div
        ref={containerRef}
        className="graph-canvas"
        role="img"
        aria-label={`${view.title} interactive family graph. Use search or the browse-names list for keyboard navigation.`}
      />
      <div className="graph-controls" aria-label="Graph controls">
        <button type="button" onClick={() => zoom(1.24)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom out">−</button>
        <button type="button" className="fit-button" onClick={fit}>Fit all</button>
      </div>
      <div className="graph-scroll-hint">Scroll to move through generations</div>
    </div>
  );
}
