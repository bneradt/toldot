import { describe, expect, it } from "vitest";
import {
  people,
  peopleById,
  patriarchSonsInBirthOrder,
  relationships,
  views,
  visiblePersonIdsForView,
} from "../src/data/genealogy";
import { chapters, scripture } from "../src/data/scripture.generated";

describe("Toldot genealogy dataset", () => {
  it("ships a substantial first edition", () => {
    expect(people.length).toBeGreaterThanOrEqual(100);
    expect(relationships.length).toBeGreaterThanOrEqual(100);
    expect(Object.keys(scripture).length).toBeGreaterThanOrEqual(200);
  });

  it("gives every person bilingual source text", () => {
    for (const person of people) {
      const primary = scripture[person.primaryVerseId];
      expect(primary, `${person.name} primary verse`).toBeDefined();
      expect(primary.web.length, `${person.name} WEB text`).toBeGreaterThan(0);
      expect(primary.kjv.length, `${person.name} KJV text`).toBeGreaterThan(0);

      for (const passage of person.passages) {
        expect(passage.verseIds.length).toBeGreaterThan(0);
        passage.verseIds.forEach((verseId) => expect(scripture[verseId], `${person.name}: ${verseId}`).toBeDefined());
      }
    }
  });

  it("keeps every relationship and view internally linked", () => {
    for (const relationship of relationships) {
      expect(peopleById.has(relationship.from), relationship.id).toBe(true);
      expect(peopleById.has(relationship.to), relationship.id).toBe(true);
      expect(relationship.sourceLayers.length).toBeGreaterThan(0);
      relationship.verseIds.forEach((verseId) => expect(scripture[verseId], `${relationship.id}: ${verseId}`).toBeDefined());
    }

    for (const view of views) {
      expect(view.personIds.length).toBeGreaterThan(0);
      view.personIds.forEach((personId) => expect(peopleById.has(personId), `${view.id}: ${personId}`).toBe(true));
      view.rootIds.forEach((personId) => expect(view.personIds, `${view.id}: root ${personId}`).toContain(personId));
      view.branches?.forEach((branch) => {
        expect(view.personIds, `${view.id}: branch root ${branch.rootPersonId}`).toContain(branch.rootPersonId);
        branch.personIds.forEach((personId) => expect(view.personIds, `${view.id}/${branch.id}: ${personId}`).toContain(personId));
      });
      view.defaultExpandedBranchIds?.forEach((branchId) => {
        expect(view.branches?.some((branch) => branch.id === branchId), `${view.id}: default branch ${branchId}`).toBe(true);
      });
    }
  });

  it("preserves source differences instead of silently harmonizing them", () => {
    const toShealtiel = relationships.filter((relationship) => relationship.to === "shealtiel");
    expect(toShealtiel.some((relationship) => relationship.from === "jechoniah" && relationship.sourceLayers.includes("Matthew"))).toBe(true);
    expect(toShealtiel.some((relationship) => relationship.from === "neri" && relationship.sourceLayers.includes("Luke"))).toBe(true);

    expect(relationships.some((relationship) => relationship.from === "arpachshad" && relationship.to === "shelah" && relationship.sourceLayers.includes("Genesis"))).toBe(true);
    expect(relationships.some((relationship) => relationship.from === "arpachshad" && relationship.to === "cainan-post-arpachshad" && relationship.sourceLayers.includes("Luke"))).toBe(true);
  });

  it("provides richer story passages for major figures", () => {
    for (const person of people.filter((candidate) => candidate.notable)) {
      expect(person.passages.some((passage) => passage.category === "story"), person.id).toBe(true);
    }
  });

  it("links the Nahor-Bethuel-Laban branch to Rebekah, Leah, and Rachel", () => {
    const patriarchs = views.find((view) => view.id === "patriarchs")!;
    for (const personId of ["nahor-brother", "milcah", "bethuel", "laban", "rebekah", "leah", "rachel"]) {
      expect(patriarchs.personIds, personId).toContain(personId);
    }
    for (const [from, to] of [
      ["nahor-brother", "bethuel"],
      ["milcah", "bethuel"],
      ["bethuel", "rebekah"],
      ["bethuel", "laban"],
      ["laban", "leah"],
      ["laban", "rachel"],
    ]) {
      expect(relationships.some((relationship) => relationship.from === from && relationship.to === to), `${from} -> ${to}`).toBe(true);
    }
  });

  it("includes Judah's older sons and generous story context", () => {
    const patriarchs = views.find((view) => view.id === "patriarchs")!;
    for (const sonId of ["er-judah", "onan"]) {
      expect(patriarchs.personIds).toContain(sonId);
      expect(relationships.some((relationship) => relationship.from === "judah" && relationship.to === sonId)).toBe(true);
      expect(peopleById.get(sonId)?.passages.some((passage) => passage.category === "story")).toBe(true);
    }

    const boazStoryChapters = new Set(
      peopleById.get("boaz")?.passages
        .filter((passage) => passage.category === "story")
        .flatMap((passage) => passage.verseIds.map((verseId) => verseId.slice(0, verseId.lastIndexOf("-")))),
    );
    expect([...boazStoryChapters]).toEqual(expect.arrayContaining(["ruth-2", "ruth-3", "ruth-4"]));

    for (const personId of ["abraham", "isaac", "jacob", "joseph-patriarch", "david"]) {
      expect(peopleById.get(personId)?.recommendedReading?.length, personId).toBeGreaterThan(0);
    }
  });

  it("bundles complete bilingual chapters for every passage reference", () => {
    expect(chapters["matt-1"].verseIds).toHaveLength(25);
    expect(chapters["gen-38"].verseIds).toHaveLength(30);

    for (const person of people) {
      for (const passage of person.passages) {
        for (const verseId of passage.verseIds) {
          const chapterId = verseId.slice(0, verseId.lastIndexOf("-"));
          const chapter = chapters[chapterId];
          expect(chapter, `${person.name}: ${chapterId}`).toBeDefined();
          chapter.verseIds.forEach((chapterVerseId) => {
            expect(scripture[chapterVerseId]?.web.length).toBeGreaterThan(0);
            expect(scripture[chapterVerseId]?.kjv.length).toBeGreaterThan(0);
          });
        }
      }
    }
  });

  it("places Perez and Zerah under both Judah and Tamar in Matthew", () => {
    for (const childId of ["perez", "zerah"]) {
      for (const parentId of ["judah", "tamar"]) {
        expect(relationships.some((relationship) =>
          relationship.from === parentId
          && relationship.to === childId
          && relationship.sourceLayers.includes("Matthew"),
        ), `${parentId} -> ${childId}`).toBe(true);
      }
    }
  });

  it("orders the genealogy views chronologically", () => {
    expect(views.map((view) => view.id)).toEqual([
      "origins",
      "noah-to-abraham",
      "patriarchs",
      "davidic",
      "matthew",
      "luke",
      "promise",
    ]);
    expect(views.find((view) => view.id === "patriarchs")?.personIds).not.toContain("david");
  });

  it("uses the Davidic view to bridge Judah's family to David", () => {
    const davidic = views.find((view) => view.id === "davidic")!;

    expect(davidic.rootIds).toEqual(["judah", "tamar"]);
    expect(davidic.personIds).toContain("perez");
    expect(davidic.personIds).toContain("boaz");
    expect(davidic.personIds).toContain("david");
    expect(davidic.personIds).not.toContain("solomon");
    expect(davidic.personIds).not.toContain("jesus");
  });

  it("records partners accurately and numbers Jacob's sons in birth order", () => {
    expect(relationships.some((relationship) =>
      relationship.from === "abraham"
      && relationship.to === "hagar"
      && relationship.kind === "concubine",
    )).toBe(true);
    for (const personId of ["bilhah", "zilpah"]) {
      expect(relationships.some((relationship) =>
        relationship.from === "jacob"
        && relationship.to === personId
        && relationship.kind === "concubine",
      ), personId).toBe(true);
    }

    const expectedBirthOrder = patriarchSonsInBirthOrder;
    expect(expectedBirthOrder[0]).toBe("reuben");
    expect(expectedBirthOrder[3]).toBe("judah");
    expect(expectedBirthOrder.at(-1)).toBe("benjamin");
    expect(expectedBirthOrder.map((personId) => peopleById.get(personId)?.birthOrder))
      .toEqual(expectedBirthOrder.map((_, index) => index + 1));
  });

  it("includes Cain's Genesis 4 line and defaults to Seth's line", () => {
    const origins = views.find((view) => view.id === "origins")!;
    const visible = visiblePersonIdsForView(origins, origins.defaultExpandedBranchIds ?? []);

    expect(origins.branches?.map((branch) => branch.id)).toEqual(["seth", "cain"]);
    expect(visible).toContain("noah");
    expect(visible).not.toContain("enoch-cain");
    expect(relationships.some((relationship) => relationship.from === "cain" && relationship.to === "enoch-cain")).toBe(true);
    expect(relationships.some((relationship) => relationship.from === "methushael" && relationship.to === "lamech-cain")).toBe(true);
    expect(relationships.some((relationship) => relationship.from === "zillah" && relationship.to === "tubal-cain")).toBe(true);
  });

  it("shows Noah's three sons and expands only Shem's line by default", () => {
    const origins = views.find((view) => view.id === "origins")!;
    const noahView = views.find((view) => view.id === "noah-to-abraham")!;
    const noahChildren = relationships
      .filter((relationship) => relationship.from === "noah" && origins.personIds.includes(relationship.to))
      .map((relationship) => relationship.to)
      .sort();
    const visible = visiblePersonIdsForView(noahView, noahView.defaultExpandedBranchIds ?? []);

    expect(noahChildren).toEqual(["ham", "japheth", "shem"]);
    expect(noahView.branches?.map((branch) => branch.id)).toEqual(["shem", "ham", "japheth"]);
    expect(visible).toContain("abraham");
    expect(visible).not.toContain("cush");
    expect(visible).not.toContain("gomer");
    expect(chapters["gen-10"].verseIds).toHaveLength(32);
  });
});
