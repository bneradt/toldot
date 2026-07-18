import { describe, expect, it } from "vitest";
import {
  davidicJesseHouseholdOrder,
  people,
  peopleById,
  originTimelineEntries,
  originTimelineMilestones,
  patriarchSonsInBirthOrder,
  relationships,
  viewNavigationGroups,
  views,
  visiblePersonIdsForView,
} from "../src/data/genealogy";
import { chapters, scripture } from "../src/data/scripture.generated";
import { allKingReigns, israelKingReigns, judahKingReigns } from "../src/data/kings";

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
      person.ageFacts?.forEach((fact) => {
        expect(fact.verseIds.length, `${person.name}: ${fact.label}`).toBeGreaterThan(0);
        fact.verseIds.forEach((verseId) => expect(scripture[verseId], `${person.name} age: ${verseId}`).toBeDefined());
      });
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

  it("labels the Table of Nations without repeating the Abraham-line caption", () => {
    const view = views.find((candidate) => candidate.id === "noah-to-abraham");
    expect(view).toBeDefined();
    const intentionallyNameOnly = new Set(["reu", "serug", "nahor-ancestor", "terah", "sarah"]);
    for (const personId of view!.personIds) {
      const person = peopleById.get(personId);
      if (intentionallyNameOnly.has(personId)) {
        expect(person?.peopleGroup, person?.name ?? personId).toBeUndefined();
        continue;
      }
      expect(person?.peopleGroup, person?.name ?? personId).toBeTruthy();
      expect(["text", "likely", "uncertain"]).toContain(person?.peopleGroupCertainty);
    }

    expect(peopleById.get("mizraim")?.peopleGroup).toBe("Egypt");
    expect(peopleById.get("asshur")?.peopleGroup).toBe("Assyrians");
    expect(peopleById.get("javan")?.peopleGroup).toBe("Ionians / Greeks");
    expect(peopleById.get("magog")?.peopleGroupCertainty).toBe("uncertain");
    expect(peopleById.get("lot")?.peopleGroup).toBe("Moabites & Ammonites");
    expect(peopleById.get("peleg")?.peopleGroup).toBe("Line to Abraham");
  });

  it("records Sarah as Abraham’s wife and paternal half-sister", () => {
    const noahView = views.find((view) => view.id === "noah-to-abraham")!;
    const patriarchsView = views.find((view) => view.id === "patriarchs")!;
    const sarah = peopleById.get("sarah")!;

    expect(noahView.personIds).toContain("sarah");
    expect(patriarchsView.personIds).toContain("sarah");
    expect(sarah.descriptor).toBe("wife and paternal half-sister of Abraham");
    expect(relationships).toContainEqual(expect.objectContaining({
      from: "terah",
      to: "sarah",
      kind: "parent",
      verseIds: ["gen-20-12"],
    }));
    expect(relationships).toContainEqual(expect.objectContaining({
      from: "abraham",
      to: "sarah",
      kind: "spouse",
    }));
    expect(sarah.passages.find((passage) => passage.title.includes("half-sister"))?.verseIds).toHaveLength(18);
    expect(chapters["gen-20"].verseIds).toHaveLength(18);
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
      "origins-timeline",
      "noah-to-abraham",
      "patriarchs",
      "davidic",
      "kings",
      "matthew",
      "luke",
      "promise",
    ]);
    expect(views.find((view) => view.id === "patriarchs")?.personIds).not.toContain("david");

    const timeline = views.find((view) => view.id === "origins-timeline")!;
    expect(timeline.presentation).toBe("timeline");
    expect(timeline.tabLabel).toBe("Timeline");
    expect(timeline.personIds).toEqual(expect.arrayContaining(["adam", "noah", "shem", "ham", "japheth"]));

    expect(viewNavigationGroups.map((group) => group.id)).toEqual([
      "origins",
      "noah-to-abraham",
      "patriarchs",
      "davidic",
      "kings",
      "jesus-genealogy",
    ]);
    expect(viewNavigationGroups.find((group) => group.id === "origins")?.viewIds)
      .toEqual(["origins", "origins-timeline"]);
    expect(viewNavigationGroups.find((group) => group.id === "jesus-genealogy")?.viewIds)
      .toEqual(["matthew", "luke", "promise"]);
  });

  it("aligns Judah and Israel while marking northern dynastic breaks", () => {
    const kingsView = views.find((view) => view.id === "kings")!;
    expect(kingsView.presentation).toBe("kings");
    expect(kingsView.rootIds).toEqual(["saul"]);
    expect(kingsView.personIds).toHaveLength(allKingReigns.length);
    allKingReigns.forEach((reign) => {
      expect(kingsView.personIds).toContain(reign.personId);
      expect(peopleById.get(reign.personId)?.passages.some((passage) => passage.title === "Accession and reign"), reign.personId).toBe(true);
      expect(reign.reignLabel).toContain("BCE");
    });

    expect(judahKingReigns[0].personId).toBe("rehoboam");
    expect(israelKingReigns[0].personId).toBe("jeroboam-i");
    expect(israelKingReigns.filter((reign) => reign.dynastyBreak).map((reign) => reign.personId)).toEqual([
      "jeroboam-i",
      "baasha",
      "zimri",
      "omri",
      "jehu",
      "shallum-israel",
      "menahem",
      "pekah",
      "hoshea",
    ]);
    expect(viewNavigationGroups.find((group) => group.id === "jesus-genealogy")?.title)
      .toBe("The Genealogy of the Christ");
  });

  it("uses the Davidic view to bridge Judah's family to David", () => {
    const davidic = views.find((view) => view.id === "davidic")!;

    expect(davidic.rootIds).toEqual(["judah", "tamar"]);
    expect(davidic.personIds).toContain("perez");
    expect(davidic.personIds).toContain("boaz");
    expect(davidic.personIds).toContain("david");
    expect(davidic.personIds).not.toContain("solomon");
    expect(davidic.personIds).not.toContain("jesus");

    const jesseChildren = [
      "eliab-jesse",
      "abinadab-jesse",
      "shimea-jesse",
      "nethanel-jesse",
      "raddai",
      "ozem",
      "david",
      "zeruiah",
      "abigail-david-sister",
    ];
    jesseChildren.forEach((personId) => {
      expect(davidic.personIds, personId).toContain(personId);
      expect(relationships.some((relationship) =>
        relationship.from === "jesse"
        && relationship.to === personId
        && relationship.sourceLayers.includes("Narrative"),
      ), `Jesse -> ${personId}`).toBe(true);
    });

    for (const sonId of ["joab", "abishai", "asahel"]) {
      expect(relationships.some((relationship) =>
        relationship.from === "zeruiah" && relationship.to === sonId,
      ), `Zeruiah -> ${sonId}`).toBe(true);
      expect(peopleById.get(sonId)?.passages.some((passage) => passage.category === "story"), sonId).toBe(true);
    }
    expect(relationships.some((relationship) =>
      relationship.from === "abigail-david-sister" && relationship.to === "amasa",
    )).toBe(true);
    expect(peopleById.get("amasa")?.passages.some((passage) => passage.category === "story")).toBe(true);
    expect(chapters["1-chr-2"].verseIds).toHaveLength(55);

    const davidIndex = davidicJesseHouseholdOrder.indexOf("david");
    expect(davidicJesseHouseholdOrder.slice(davidIndex + 1)).toEqual(["zeruiah", "abigail-david-sister"]);
    expect(peopleById.get("zeruiah")?.birthOrder).toBeUndefined();
    expect(peopleById.get("abigail-david-sister")?.birthOrder).toBeUndefined();
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

  it("records the Genesis 5 ages and Noah's flood timeline", () => {
    const expectedAges: Record<string, [string, string]> = {
      adam: ["130 years old", "930 years"],
      seth: ["105 years old", "912 years"],
      enosh: ["90 years old", "905 years"],
      kenan: ["70 years old", "910 years"],
      mahalalel: ["65 years old", "895 years"],
      jared: ["162 years old", "962 years"],
      enoch: ["65 years old", "365 years"],
      methuselah: ["187 years old", "969 years"],
      "lamech-noah": ["182 years old", "777 years"],
    };

    for (const [personId, values] of Object.entries(expectedAges)) {
      expect(peopleById.get(personId)?.ageFacts?.map((fact) => fact.value), personId).toEqual(values);
    }
    expect(peopleById.get("enoch")?.ageFacts?.at(-1)?.note).toContain("God took Enoch");

    const noahFacts = peopleById.get("noah")?.ageFacts ?? [];
    expect(noahFacts.map((fact) => fact.value)).toEqual([
      "500 years old",
      "600 years old",
      "In his 601st year",
      "350 years",
      "950 years",
    ]);
    expect(noahFacts.find((fact) => fact.id === "flood-began")?.verseIds).toEqual(["gen-7-6", "gen-7-11"]);

    expect(peopleById.get("shem")?.ageFacts?.map((fact) => fact.value)).toEqual(["100 years old", "600 years"]);
    expect(peopleById.get("ham")?.ageFacts?.[0].value).toBe("Not stated");
    expect(peopleById.get("japheth")?.ageFacts?.[0].value).toBe("Not stated");

    expect(originTimelineEntries.map((entry) => [entry.personId, entry.yearLabel, entry.lifeLabel])).toEqual([
      ["adam", "Year 0", "Lifespan 930 years"],
      ["seth", "Year 130", "Lifespan 912 years"],
      ["enosh", "Year 235", "Lifespan 905 years"],
      ["kenan", "Year 325", "Lifespan 910 years"],
      ["mahalalel", "Year 395", "Lifespan 895 years"],
      ["jared", "Year 460", "Lifespan 962 years"],
      ["enoch", "Year 622", "365 years; taken by God"],
      ["methuselah", "Year 687", "Lifespan 969 years"],
      ["lamech-noah", "Year 874", "Lifespan 777 years"],
      ["noah", "Year 1056", "Flood year 1656 · lifespan 950 years"],
      ["shem", "After year 1556", "Shem born 1558 (derived); Ham and Japheth not stated"],
    ]);
    expect(originTimelineEntries.map((entry) => [entry.birthYear, entry.endYear])).toEqual([
      [0, 930], [130, 1042], [235, 1140], [325, 1235], [395, 1290],
      [460, 1422], [622, 987], [687, 1656], [874, 1651], [1056, 2006], [1558, 2158],
    ]);
    expect(originTimelineEntries.every((entry) => entry.endYear && entry.endAge && entry.endTitle && entry.color)).toBe(true);
    expect(originTimelineEntries.map((entry) => entry.endAge)).toEqual([
      930, 912, 905, 910, 895, 962, 365, 969, 777, 950, 600,
    ]);
    expect(originTimelineEntries.find((entry) => entry.id === "noah-sons")?.endTitle).toBe("Shem died");
    expect(new Set(originTimelineEntries.map((entry) => entry.color)).size).toBe(originTimelineEntries.length);
    expect(originTimelineMilestones).toEqual([
      expect.objectContaining({
        id: "flood",
        year: 1656,
        title: "Flood begins",
        anchorPersonId: "noah",
        alignWithEndId: "methuselah",
      }),
    ]);
    expect(originTimelineEntries.find((entry) => entry.id === "methuselah")?.endYear).toBe(
      originTimelineMilestones[0].year,
    );
  });
});
