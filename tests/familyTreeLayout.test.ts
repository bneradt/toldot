import cytoscape, { type Core } from "cytoscape";
import dagre from "cytoscape-dagre";
import { describe, expect, it } from "vitest";
import { arrangeAfterLayout, buildGraphElements, dagreLayoutOptions, graphStyle } from "../src/components/familyTreeLayout";
import { kingsFamilyTreeViews, visiblePersonIdsForView } from "../src/data/genealogy";
import type { GenealogyView } from "../src/data/types";

cytoscape.use(dagre);

/** Lay a tree out exactly as GenealogyGraph does, without a browser. */
function layOut(view: GenealogyView): Core {
  const visiblePersonIds = visiblePersonIdsForView(view, new Set(view.defaultExpandedBranchIds ?? []));
  const { nodes, lineageEdges, partnerEdges, partnerRelationships } = buildGraphElements(view, visiblePersonIds);
  const graph = cytoscape({ headless: true, styleEnabled: true, style: graphStyle, elements: [...nodes, ...lineageEdges] });
  graph.layout(dagreLayoutOptions).run();
  arrangeAfterLayout(graph, view, partnerRelationships);
  graph.add(partnerEdges);
  return graph;
}

function overlappingCards(graph: Core) {
  const cards = graph.nodes().toArray();
  const overlaps: string[] = [];
  cards.forEach((a, index) => {
    cards.slice(index + 1).forEach((b) => {
      const dx = Math.abs(a.position("x") - b.position("x"));
      const dy = Math.abs(a.position("y") - b.position("y"));
      if (dx < (a.width() + b.width()) / 2 && dy < (a.height() + b.height()) / 2) overlaps.push(`${a.id()} / ${b.id()}`);
    });
  });
  return overlaps;
}

describe("Kings family tree layout", () => {
  it.each(kingsFamilyTreeViews.map((view) => [view.id, view] as const))("keeps every card in %s clear of the others", (_id, view) => {
    const graph = layOut(view);
    expect(graph.nodes().length).toBe(view.personIds.length);
    expect(overlappingCards(graph)).toEqual([]);
  });

  it("sets Jezebel, who has no parent or child link in the tree, level with and beside Ahab", () => {
    const graph = layOut(kingsFamilyTreeViews.find((view) => view.id === "athaliah-family")!);
    const ahab = graph.getElementById("ahab");
    const jezebel = graph.getElementById("jezebel");
    expect(jezebel.position("y")).toBe(ahab.position("y"));
    expect(Math.abs(jezebel.position("x") - ahab.position("x"))).toBe(170);
  });
});
