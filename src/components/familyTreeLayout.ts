import cytoscape, { type Core, type ElementDefinition, type NodeSingular, type StylesheetJson } from "cytoscape";
import {
  davidicJesseHouseholdOrder,
  patriarchSonsInBirthOrder,
  peopleById,
  relationships,
} from "../data/genealogy";
import type { GenealogyView } from "../data/types";

/*
 * DOM-free pieces of the family graph: element building, styling, the dagre
 * layout options, and the hand arrangement applied after dagre runs. Kept apart
 * from the React component so tests can lay a tree out in a headless graph.
 */

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

function arrangeDavidicHousehold(graph: Core) {
  const jesse = graph.getElementById("jesse");
  const david = graph.getElementById("david");
  if (!jesse.length || !david.length) return;

  const anchorX = jesse.position("x");
  const householdY = david.position("y");
  const offsets = [-900, -750, -600, -450, -300, -150, 0, 210, 500];
  davidicJesseHouseholdOrder.forEach((personId, index) => {
    const node = graph.getElementById(personId);
    if (node.length) node.position({ x: anchorX + offsets[index], y: householdY });
  });

  const nephewsY = householdY + 155;
  const nephewOffsets: Record<string, number> = {
    joab: 90,
    abishai: 210,
    asahel: 330,
    amasa: 500,
  };
  Object.entries(nephewOffsets).forEach(([personId, offset]) => {
    const node = graph.getElementById(personId);
    if (node.length) node.position({ x: anchorX + offset, y: nephewsY });
  });
}

/** Horizontal distance between a person and someone set beside them. */
export const BESIDE_OFFSET = 170;
/** Breathing room kept between cards when looking for a free spot. */
const CARD_GAP = 12;

type Relationship = (typeof relationships)[number];

export function buildGraphElements(view: GenealogyView, visiblePersonIds: string[]) {
  const visible = new Set(visiblePersonIds);
  const nodes: ElementDefinition[] = visiblePersonIds.flatMap((id, layoutOrder) => {
    const person = peopleById.get(id);
    if (!person) return [];
    const showPeopleGroup = view.id === "noah-to-abraham" && person.peopleGroup;
    const peopleGroupLabel = showPeopleGroup
      ? `${person.peopleGroup}${person.peopleGroupCertainty === "uncertain" ? " ?" : ""}`
      : "";
    const relationshipLabel = person.id === "sarah" && (view.id === "noah-to-abraham" || view.id === "patriarchs")
      ? "wife & paternal half-sister"
      : "";
    const subtitle = peopleGroupLabel || relationshipLabel;
    return [{
      data: {
        id: person.id,
        label: person.name,
        displayLabel: subtitle ? `${person.name}\n${subtitle}` : person.name,
        descriptor: person.descriptor ?? "",
        layoutOrder,
        birthOrder: person.birthOrder ?? null,
      },
      classes: [
        person.notable ? "notable" : "",
        person.sex === "female" ? "woman" : "",
        subtitle ? "subtitle" : "",
        relationshipLabel ? "relationship-note" : "",
      ]
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
  return { nodes, lineageEdges, partnerEdges, partnerRelationships };
}

export const graphStyle: StylesheetJson = [
    {
      selector: "node",
      style: {
        "background-color": "#fffdf7",
        "border-color": "#b8ad97",
        "border-width": 1.5,
        color: "#1b2b28",
        "font-family": "Georgia, 'Times New Roman', serif",
        "font-size": 15,
        "font-weight": "bold",
        height: 42,
        label: "data(displayLabel)",
        padding: "8px",
        shape: "round-rectangle",
        "text-halign": "center",
        "text-valign": "center",
        width: 116,
      },
    },
    {
      selector: "node.subtitle",
      style: {
        "font-size": 11.5,
        "line-height": 1.3,
        "text-max-width": "126px",
        "text-wrap": "wrap",
        height: 54,
        width: 138,
      },
    },
    {
      selector: "node.relationship-note",
      style: {
        "text-max-width": "148px",
        width: 160,
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
];

export const dagreLayoutOptions = {
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
} as cytoscape.LayoutOptions;

function overlapsAnotherCard(graph: Core, node: NodeSingular, x: number, y: number) {
  const halfWidth = node.width() / 2;
  const halfHeight = node.height() / 2;
  return graph.nodes().toArray().some((other) => {
    if (other.same(node)) return false;
    const position = other.position();
    return Math.abs(position.x - x) < halfWidth + other.width() / 2 + CARD_GAP
      && Math.abs(position.y - y) < halfHeight + other.height() / 2 + CARD_GAP;
  });
}

/**
 * Put a spouse who has no parent or child link in this tree level with their
 * partner, on whichever side is free. Dagre lays such a person out as an
 * unconnected card (partner links are left out of the layout), so their own
 * x position is arbitrary and can sit underneath another card.
 */
function placeUnlinkedPartner(graph: Core, node: NodeSingular, partner: NodeSingular) {
  const y = partner.position("y");
  if (!overlapsAnotherCard(graph, node, node.position("x"), y)) {
    node.position("y", y);
    return;
  }
  const partnerX = partner.position("x");
  const others = graph.nodes().not(node).boundingBox();
  const center = (others.x1 + others.x2) / 2;
  // Prefer the outer side of the tree, then the inner one, stepping outward until a spot is free.
  const outward = partnerX >= center ? 1 : -1;
  for (let step = 1; step <= 12; step += 1) {
    for (const direction of [outward, -outward]) {
      const x = partnerX + direction * step * BESIDE_OFFSET;
      if (!overlapsAnotherCard(graph, node, x, y)) {
        node.position({ x, y });
        return;
      }
    }
  }
  node.position({ x: partnerX + outward * BESIDE_OFFSET, y });
}

/** Hand adjustments applied once dagre has run, before partner edges are added. */
export function arrangeAfterLayout(graph: Core, view: GenealogyView, partnerRelationships: Relationship[]) {
  if (view.id === "patriarchs") arrangePatriarchs(graph);
  if (view.id === "davidic") arrangeDavidicHousehold(graph);
  view.placeBeside?.forEach(({ personId, besideId }) => {
    const node = graph.getElementById(personId);
    const beside = graph.getElementById(besideId);
    if (node.length && beside.length) node.position({ x: beside.position("x") + BESIDE_OFFSET, y: beside.position("y") });
  });
  const unlinked = (node: NodeSingular) => node.connectedEdges().length === 0;
  partnerRelationships.forEach((relationship) => {
    const from = graph.getElementById(relationship.from);
    const to = graph.getElementById(relationship.to);
    if (!from.length || !to.length) return;
    if (unlinked(to)) placeUnlinkedPartner(graph, to, from);
    else if (unlinked(from)) placeUnlinkedPartner(graph, from, to);
    else to.position("y", from.position("y"));
  });
}
