import { describe, expect, it } from "vitest";
import { people, peopleById, relationships, views } from "../src/data/genealogy";
import { scripture } from "../src/data/scripture.generated";

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
    for (const personId of ["rahab", "boaz", "ruth", "david", "mary", "jesus"]) {
      const person = peopleById.get(personId);
      expect(person?.passages.some((passage) => passage.category === "story"), personId).toBe(true);
    }
  });
});
