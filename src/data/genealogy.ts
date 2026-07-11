import type {
  AgeFact,
  GenealogyView,
  PassageSelection,
  Person,
  Relationship,
  RelationshipKind,
  SourceLayer,
} from "./types";

type ChainEntry = Omit<Person, "passages"> & {
  sourceVerseIds?: string[];
};

const personMap = new Map<string, Person>();
const relationshipMap = new Map<string, Relationship>();

const genealogyPassage = (verseIds: string[], source: SourceLayer): PassageSelection => ({
  title: `${source} genealogy`,
  category: "genealogy",
  verseIds,
});

function ensurePerson(entry: ChainEntry, source: SourceLayer): Person {
  const verseIds = entry.sourceVerseIds ?? [entry.primaryVerseId];
  const existing = personMap.get(entry.id);
  if (existing) {
    const passageKey = `${source}:${verseIds.join(",")}`;
    const alreadyPresent = existing.passages.some(
      (passage) => `${passage.title.replace(" genealogy", "")}:${passage.verseIds.join(",")}` === passageKey,
    );
    if (!alreadyPresent) existing.passages.push(genealogyPassage(verseIds, source));
    if (entry.note && !existing.note) existing.note = entry.note;
    if (entry.aliases) existing.aliases = [...new Set([...(existing.aliases ?? []), ...entry.aliases])];
    if (entry.birthOrder) existing.birthOrder = entry.birthOrder;
    return existing;
  }

  const person: Person = {
    ...entry,
    passages: [genealogyPassage(verseIds, source)],
  };
  delete (person as ChainEntry).sourceVerseIds;
  personMap.set(person.id, person);
  return person;
}

function connect(
  from: string,
  to: string,
  kind: RelationshipKind,
  source: SourceLayer,
  verseIds: string[],
  note?: string,
) {
  const key = `${from}:${to}:${kind}`;
  const existing = relationshipMap.get(key);
  if (existing) {
    existing.sourceLayers = [...new Set([...existing.sourceLayers, source])];
    existing.verseIds = [...new Set([...existing.verseIds, ...verseIds])];
    if (note && !existing.note) existing.note = note;
    return;
  }

  relationshipMap.set(key, {
    id: key,
    from,
    to,
    kind,
    sourceLayers: [source],
    verseIds,
    note,
  });
}

function addChain(entries: ChainEntry[], source: SourceLayer, viewSet?: Set<string>) {
  entries.forEach((entry, index) => {
    ensurePerson(entry, source);
    viewSet?.add(entry.id);
    if (index === 0) return;
    const previous = entries[index - 1];
    connect(
      previous.id,
      entry.id,
      entry.id === "jesus" && previous.id === "joseph-of-nazareth" ? "as-supposed" : "genealogical",
      source,
      entry.sourceVerseIds ?? [entry.primaryVerseId],
      entry.id === "jesus" && previous.id === "joseph-of-nazareth"
        ? "The genealogies reach Jesus through Joseph while Matthew identifies Mary as the one from whom Jesus was born; Luke says Joseph was his father ‘as was supposed.’"
        : undefined,
    );
  });
}

function addPerson(entry: ChainEntry, source: SourceLayer, viewSets: Set<string>[] = []) {
  ensurePerson(entry, source);
  viewSets.forEach((set) => set.add(entry.id));
}

function addStory(personId: string, title: string, verseIds: string[]) {
  const person = personMap.get(personId);
  if (!person) throw new Error(`Cannot add a story passage to unknown person ${personId}`);
  person.passages.push({ title, category: "story", verseIds });
  person.notable = true;
}

function addReadingGuide(personId: string, references: string[]) {
  const person = personMap.get(personId);
  if (!person) throw new Error(`Cannot add a reading guide to unknown person ${personId}`);
  person.recommendedReading = references;
}

function addAgeFacts(personId: string, facts: AgeFact[]) {
  const person = personMap.get(personId);
  if (!person) throw new Error(`Cannot add age facts to unknown person ${personId}`);
  person.ageFacts = facts;
}

function addDescendants(
  parentId: string,
  entries: ChainEntry[],
  viewSet: Set<string>,
  branchSet: Set<string>,
  kind: RelationshipKind = "genealogical",
) {
  entries.forEach((entry) => {
    addPerson(entry, "Genesis", [viewSet]);
    branchSet.add(entry.id);
    connect(parentId, entry.id, kind, "Genesis", entry.sourceVerseIds ?? [entry.primaryVerseId]);
  });
}

const origins = new Set<string>();
const noahToAbraham = new Set<string>();
const patriarchs = new Set<string>();
const promise = new Set<string>();
const matthew = new Set<string>();
const luke = new Set<string>();
const davidic = new Set<string>();
const originsSethBranch = new Set<string>();
const originsCainBranch = new Set<string>();
const shemBranch = new Set<string>();
const hamBranch = new Set<string>();
const japhethBranch = new Set<string>();

const sharedToDavid: ChainEntry[] = [
  { id: "adam", name: "Adam", primaryVerseId: "gen-5-1", notable: true },
  { id: "seth", name: "Seth", primaryVerseId: "gen-5-3" },
  { id: "enosh", name: "Enosh", aliases: ["Enos"], primaryVerseId: "gen-5-6" },
  { id: "kenan", name: "Kenan", aliases: ["Cainan"], primaryVerseId: "gen-5-9" },
  { id: "mahalalel", name: "Mahalalel", aliases: ["Mahalaleel"], primaryVerseId: "gen-5-15" },
  { id: "jared", name: "Jared", primaryVerseId: "gen-5-18" },
  { id: "enoch", name: "Enoch", descriptor: "son of Jared", primaryVerseId: "gen-5-21", notable: true },
  { id: "methuselah", name: "Methuselah", primaryVerseId: "gen-5-25" },
  { id: "lamech-noah", name: "Lamech", descriptor: "father of Noah", primaryVerseId: "gen-5-28" },
  { id: "noah", name: "Noah", primaryVerseId: "gen-5-29", notable: true },
  { id: "shem", name: "Shem", primaryVerseId: "gen-5-32" },
  { id: "arpachshad", name: "Arpachshad", aliases: ["Arphaxad"], primaryVerseId: "gen-11-10" },
  { id: "shelah", name: "Shelah", aliases: ["Salah", "Sala"], primaryVerseId: "gen-11-12" },
  { id: "eber", name: "Eber", primaryVerseId: "gen-11-14" },
  { id: "peleg", name: "Peleg", primaryVerseId: "gen-11-16" },
  { id: "reu", name: "Reu", primaryVerseId: "gen-11-18" },
  { id: "serug", name: "Serug", primaryVerseId: "gen-11-20" },
  { id: "nahor-ancestor", name: "Nahor", descriptor: "grandfather of Abraham", primaryVerseId: "gen-11-22" },
  { id: "terah", name: "Terah", primaryVerseId: "gen-11-24" },
  { id: "abraham", name: "Abraham", aliases: ["Abram"], primaryVerseId: "gen-11-26", notable: true },
  { id: "isaac", name: "Isaac", primaryVerseId: "gen-21-3", notable: true },
  { id: "jacob", name: "Jacob", aliases: ["Israel"], primaryVerseId: "gen-25-26", notable: true },
  { id: "judah", name: "Judah", aliases: ["Juda", "Judas"], primaryVerseId: "gen-29-35" },
  { id: "perez", name: "Perez", aliases: ["Pharez", "Phares"], primaryVerseId: "gen-38-29" },
  { id: "hezron", name: "Hezron", aliases: ["Esrom"], primaryVerseId: "ruth-4-18" },
  { id: "ram", name: "Ram", aliases: ["Aram"], primaryVerseId: "ruth-4-19" },
  { id: "amminadab", name: "Amminadab", primaryVerseId: "ruth-4-19" },
  { id: "nahshon", name: "Nahshon", aliases: ["Naasson"], primaryVerseId: "ruth-4-20" },
  { id: "salmon", name: "Salmon", primaryVerseId: "ruth-4-20" },
  { id: "boaz", name: "Boaz", aliases: ["Booz"], primaryVerseId: "ruth-4-21", notable: true },
  { id: "obed", name: "Obed", primaryVerseId: "ruth-4-21" },
  { id: "jesse", name: "Jesse", primaryVerseId: "ruth-4-22" },
  { id: "david", name: "David", descriptor: "king of Israel", primaryVerseId: "ruth-4-22", notable: true },
];

addChain(sharedToDavid.slice(0, 24), "Genesis", promise);
addChain(sharedToDavid.slice(23), "Ruth", promise);
sharedToDavid.slice(0, 10).forEach((person) => origins.add(person.id));
sharedToDavid.slice(2, 11).forEach((person) => originsSethBranch.add(person.id));
sharedToDavid.slice(9, 20).forEach((person) => noahToAbraham.add(person.id));
sharedToDavid.slice(11, 20).forEach((person) => shemBranch.add(person.id));
sharedToDavid.slice(18, 24).forEach((person) => patriarchs.add(person.id));
sharedToDavid.slice(22).forEach((person) => davidic.add(person.id));

const matthewLine: ChainEntry[] = [
  { ...sharedToDavid[19], primaryVerseId: "matt-1-2" },
  { ...sharedToDavid[20], primaryVerseId: "matt-1-2" },
  { ...sharedToDavid[21], primaryVerseId: "matt-1-2" },
  { ...sharedToDavid[22], primaryVerseId: "matt-1-2" },
  { ...sharedToDavid[23], primaryVerseId: "matt-1-3" },
  { ...sharedToDavid[24], primaryVerseId: "matt-1-3" },
  { ...sharedToDavid[25], primaryVerseId: "matt-1-3" },
  { ...sharedToDavid[26], primaryVerseId: "matt-1-4" },
  { ...sharedToDavid[27], primaryVerseId: "matt-1-4" },
  { ...sharedToDavid[28], primaryVerseId: "matt-1-4" },
  { ...sharedToDavid[29], primaryVerseId: "matt-1-5" },
  { ...sharedToDavid[30], primaryVerseId: "matt-1-5" },
  { ...sharedToDavid[31], primaryVerseId: "matt-1-5" },
  { ...sharedToDavid[32], primaryVerseId: "matt-1-6" },
  { id: "solomon", name: "Solomon", primaryVerseId: "matt-1-6", notable: true },
  { id: "rehoboam", name: "Rehoboam", aliases: ["Roboam"], primaryVerseId: "matt-1-7" },
  { id: "abijah", name: "Abijah", aliases: ["Abia"], primaryVerseId: "matt-1-7" },
  { id: "asa", name: "Asa", primaryVerseId: "matt-1-7" },
  { id: "jehoshaphat", name: "Jehoshaphat", aliases: ["Josaphat"], primaryVerseId: "matt-1-8" },
  { id: "joram", name: "Joram", primaryVerseId: "matt-1-8" },
  {
    id: "uzziah",
    name: "Uzziah",
    aliases: ["Ozias"],
    primaryVerseId: "matt-1-8",
    note: "Matthew’s genealogy moves from Joram to Uzziah without naming several intervening kings recorded elsewhere in Scripture.",
  },
  { id: "jotham", name: "Jotham", aliases: ["Joatham"], primaryVerseId: "matt-1-9" },
  { id: "ahaz", name: "Ahaz", aliases: ["Achaz"], primaryVerseId: "matt-1-9" },
  { id: "hezekiah", name: "Hezekiah", aliases: ["Ezekias"], primaryVerseId: "matt-1-9" },
  { id: "manasseh", name: "Manasseh", aliases: ["Manasses"], primaryVerseId: "matt-1-10" },
  { id: "amon", name: "Amon", primaryVerseId: "matt-1-10" },
  { id: "josiah", name: "Josiah", aliases: ["Josias"], primaryVerseId: "matt-1-10" },
  { id: "jechoniah", name: "Jechoniah", aliases: ["Jeconiah", "Jechonias", "Coniah"], primaryVerseId: "matt-1-11" },
  {
    id: "shealtiel",
    name: "Shealtiel",
    aliases: ["Salathiel"],
    primaryVerseId: "matt-1-12",
    note: "Matthew associates Shealtiel with Jechoniah; Luke associates him with Neri. Toldot preserves both source lines without choosing a harmonization.",
  },
  { id: "zerubbabel", name: "Zerubbabel", aliases: ["Zorobabel"], primaryVerseId: "matt-1-12" },
  { id: "abiud", name: "Abiud", primaryVerseId: "matt-1-13" },
  { id: "eliakim-matthew", name: "Eliakim", descriptor: "in Matthew’s line", primaryVerseId: "matt-1-13" },
  { id: "azor", name: "Azor", primaryVerseId: "matt-1-13" },
  { id: "zadok", name: "Zadok", aliases: ["Sadoc"], descriptor: "in Matthew’s line", primaryVerseId: "matt-1-14" },
  { id: "achim", name: "Achim", primaryVerseId: "matt-1-14" },
  { id: "eliud", name: "Eliud", primaryVerseId: "matt-1-14" },
  { id: "eleazar-matthew", name: "Eleazar", descriptor: "in Matthew’s line", primaryVerseId: "matt-1-15" },
  { id: "matthan", name: "Matthan", primaryVerseId: "matt-1-15" },
  { id: "jacob-matthew", name: "Jacob", descriptor: "father of Joseph in Matthew", primaryVerseId: "matt-1-15" },
  { id: "joseph-of-nazareth", name: "Joseph", descriptor: "husband of Mary", primaryVerseId: "matt-1-16", notable: true },
  { id: "jesus", name: "Jesus", descriptor: "called Christ", primaryVerseId: "matt-1-16", notable: true },
];

addChain(matthewLine, "Matthew", matthew);
matthewLine.forEach((person) => promise.add(person.id));

const lukeSharedEntries: ChainEntry[] = [
  { ...sharedToDavid[0], primaryVerseId: "luke-3-38" },
  { ...sharedToDavid[1], primaryVerseId: "luke-3-38" },
  { ...sharedToDavid[2], primaryVerseId: "luke-3-38" },
  { ...sharedToDavid[3], primaryVerseId: "luke-3-37" },
  { ...sharedToDavid[4], primaryVerseId: "luke-3-37" },
  { ...sharedToDavid[5], primaryVerseId: "luke-3-37" },
  { ...sharedToDavid[6], primaryVerseId: "luke-3-37" },
  { ...sharedToDavid[7], primaryVerseId: "luke-3-37" },
  { ...sharedToDavid[8], primaryVerseId: "luke-3-36" },
  { ...sharedToDavid[9], primaryVerseId: "luke-3-36" },
  { ...sharedToDavid[10], primaryVerseId: "luke-3-36" },
  { ...sharedToDavid[11], primaryVerseId: "luke-3-36" },
  {
    id: "cainan-post-arpachshad",
    name: "Cainan",
    descriptor: "between Arphaxad and Shelah in Luke",
    primaryVerseId: "luke-3-36",
    note: "Luke includes this Cainan between Arphaxad and Shelah; the Genesis 11 line in the Hebrew textual tradition moves directly from Arpachshad to Shelah.",
  },
  { ...sharedToDavid[12], primaryVerseId: "luke-3-35" },
  { ...sharedToDavid[13], primaryVerseId: "luke-3-35" },
  { ...sharedToDavid[14], primaryVerseId: "luke-3-35" },
  { ...sharedToDavid[15], primaryVerseId: "luke-3-35" },
  { ...sharedToDavid[16], primaryVerseId: "luke-3-35" },
  { ...sharedToDavid[17], primaryVerseId: "luke-3-34" },
  { ...sharedToDavid[18], primaryVerseId: "luke-3-34" },
  { ...sharedToDavid[19], primaryVerseId: "luke-3-34" },
  { ...sharedToDavid[20], primaryVerseId: "luke-3-34" },
  { ...sharedToDavid[21], primaryVerseId: "luke-3-34" },
  { ...sharedToDavid[22], primaryVerseId: "luke-3-33" },
  { ...sharedToDavid[23], primaryVerseId: "luke-3-33" },
  { ...sharedToDavid[24], primaryVerseId: "luke-3-33" },
  { ...sharedToDavid[25], primaryVerseId: "luke-3-33" },
  { ...sharedToDavid[26], primaryVerseId: "luke-3-33" },
  { ...sharedToDavid[27], primaryVerseId: "luke-3-32" },
  { ...sharedToDavid[28], primaryVerseId: "luke-3-32" },
  { ...sharedToDavid[29], primaryVerseId: "luke-3-32" },
  { ...sharedToDavid[30], primaryVerseId: "luke-3-32" },
  { ...sharedToDavid[31], primaryVerseId: "luke-3-32" },
  { ...sharedToDavid[32], primaryVerseId: "luke-3-31" },
];

addChain(lukeSharedEntries, "Luke", luke);
lukeSharedEntries.forEach((person) => promise.add(person.id));

const lukeAfterDavid: ChainEntry[] = [
  { ...sharedToDavid[32], primaryVerseId: "luke-3-31" },
  { id: "nathan", name: "Nathan", descriptor: "son of David in Luke’s line", primaryVerseId: "luke-3-31" },
  { id: "mattatha", name: "Mattatha", primaryVerseId: "luke-3-31" },
  { id: "menan", name: "Menan", aliases: ["Menna"], primaryVerseId: "luke-3-31" },
  { id: "melea", name: "Melea", primaryVerseId: "luke-3-31" },
  { id: "eliakim-luke", name: "Eliakim", descriptor: "in Luke’s line", primaryVerseId: "luke-3-30" },
  { id: "jonan", name: "Jonan", aliases: ["Jonam"], primaryVerseId: "luke-3-30" },
  { id: "joseph-luke-1", name: "Joseph", descriptor: "between Jonan and Judah", primaryVerseId: "luke-3-30" },
  { id: "judah-luke-1", name: "Judah", descriptor: "between Joseph and Simeon", primaryVerseId: "luke-3-30" },
  { id: "simeon-luke", name: "Simeon", descriptor: "in Luke’s line", primaryVerseId: "luke-3-30" },
  { id: "levi-luke-1", name: "Levi", descriptor: "between Simeon and Matthat", primaryVerseId: "luke-3-29" },
  { id: "matthat-luke-1", name: "Matthat", descriptor: "between Levi and Jorim", primaryVerseId: "luke-3-29" },
  { id: "jorim", name: "Jorim", primaryVerseId: "luke-3-29" },
  { id: "eliezer", name: "Eliezer", primaryVerseId: "luke-3-29" },
  { id: "jose-luke", name: "Jose", primaryVerseId: "luke-3-29" },
  { id: "er-luke", name: "Er", descriptor: "in Luke’s line", primaryVerseId: "luke-3-28" },
  { id: "elmodam", name: "Elmodam", aliases: ["Elmadam"], primaryVerseId: "luke-3-28" },
  { id: "cosam", name: "Cosam", primaryVerseId: "luke-3-28" },
  { id: "addi", name: "Addi", primaryVerseId: "luke-3-28" },
  { id: "melchi-luke-1", name: "Melchi", descriptor: "between Addi and Neri", primaryVerseId: "luke-3-28" },
  { id: "neri", name: "Neri", primaryVerseId: "luke-3-27" },
  { ...matthewLine[28], primaryVerseId: "luke-3-27" },
  { ...matthewLine[29], primaryVerseId: "luke-3-27" },
  { id: "rhesa", name: "Rhesa", primaryVerseId: "luke-3-27" },
  { id: "joanan", name: "Joanan", aliases: ["Joda"], primaryVerseId: "luke-3-27" },
  { id: "judah-luke-2", name: "Judah", descriptor: "between Joanan and Joseph", primaryVerseId: "luke-3-26" },
  { id: "joseph-luke-2", name: "Joseph", descriptor: "between Judah and Semein", primaryVerseId: "luke-3-26" },
  { id: "semein", name: "Semein", aliases: ["Semei"], primaryVerseId: "luke-3-26" },
  { id: "mattathias-luke-1", name: "Mattathias", descriptor: "between Semein and Maath", primaryVerseId: "luke-3-26" },
  { id: "maath", name: "Maath", primaryVerseId: "luke-3-26" },
  { id: "naggai", name: "Naggai", aliases: ["Nagge"], primaryVerseId: "luke-3-25" },
  { id: "esli", name: "Esli", primaryVerseId: "luke-3-25" },
  { id: "nahum-luke", name: "Nahum", descriptor: "in Luke’s line", primaryVerseId: "luke-3-25" },
  { id: "amos-luke", name: "Amos", descriptor: "in Luke’s line", primaryVerseId: "luke-3-25" },
  { id: "mattathias-luke-2", name: "Mattathias", descriptor: "between Amos and Joseph", primaryVerseId: "luke-3-25" },
  { id: "joseph-luke-3", name: "Joseph", descriptor: "between Mattathias and Jannai", primaryVerseId: "luke-3-24" },
  { id: "jannai", name: "Jannai", aliases: ["Janna"], primaryVerseId: "luke-3-24" },
  { id: "melchi-luke-2", name: "Melchi", descriptor: "between Jannai and Levi", primaryVerseId: "luke-3-24" },
  { id: "levi-luke-2", name: "Levi", descriptor: "between Melchi and Matthat", primaryVerseId: "luke-3-24" },
  { id: "matthat-luke-2", name: "Matthat", descriptor: "father of Heli in Luke", primaryVerseId: "luke-3-24" },
  { id: "heli", name: "Heli", descriptor: "associated with Joseph in Luke", primaryVerseId: "luke-3-23" },
  { ...matthewLine[39], primaryVerseId: "luke-3-23" },
  { ...matthewLine[40], primaryVerseId: "luke-3-23" },
];

addChain(lukeAfterDavid, "Luke", luke);
lukeAfterDavid.forEach((person) => {
  promise.add(person.id);
});

// Immediate families and the women named or alluded to in Matthew's genealogy.
addPerson({ id: "eve", name: "Eve", primaryVerseId: "gen-4-1", sex: "female", notable: true }, "Genesis", [origins, promise]);
addPerson({ id: "cain", name: "Cain", primaryVerseId: "gen-4-1", notable: true }, "Genesis", [origins]);
addPerson({ id: "abel", name: "Abel", primaryVerseId: "gen-4-2", notable: true }, "Genesis", [origins]);
addPerson({ id: "ham", name: "Ham", primaryVerseId: "gen-5-32" }, "Genesis", [origins, noahToAbraham]);
addPerson({ id: "japheth", name: "Japheth", primaryVerseId: "gen-5-32" }, "Genesis", [origins, noahToAbraham]);
origins.add("shem");
noahToAbraham.add("shem");
originsSethBranch.add("ham");
originsSethBranch.add("japheth");
connect("adam", "eve", "spouse", "Genesis", ["gen-2-24"]);
connect("eve", "cain", "parent", "Genesis", ["gen-4-1"]);
connect("adam", "cain", "parent", "Genesis", ["gen-4-1"]);
connect("eve", "abel", "parent", "Genesis", ["gen-4-2"]);
connect("adam", "abel", "parent", "Genesis", ["gen-4-2"]);
connect("eve", "seth", "parent", "Genesis", ["gen-4-25"]);
connect("noah", "ham", "parent", "Genesis", ["gen-5-32"]);
connect("noah", "japheth", "parent", "Genesis", ["gen-5-32"]);

addDescendants("cain", [
  { id: "enoch-cain", name: "Enoch", descriptor: "son of Cain", primaryVerseId: "gen-4-17" },
], origins, originsCainBranch, "parent");
addDescendants("enoch-cain", [
  { id: "irad", name: "Irad", primaryVerseId: "gen-4-18" },
], origins, originsCainBranch, "parent");
addDescendants("irad", [
  { id: "mehujael", name: "Mehujael", primaryVerseId: "gen-4-18" },
], origins, originsCainBranch, "parent");
addDescendants("mehujael", [
  { id: "methushael", name: "Methushael", primaryVerseId: "gen-4-18" },
], origins, originsCainBranch, "parent");
addDescendants("methushael", [
  { id: "lamech-cain", name: "Lamech", descriptor: "descendant of Cain", primaryVerseId: "gen-4-18" },
], origins, originsCainBranch, "parent");

addPerson({ id: "adah", name: "Adah", descriptor: "wife of Lamech", primaryVerseId: "gen-4-19", sex: "female" }, "Genesis", [origins]);
addPerson({ id: "zillah", name: "Zillah", descriptor: "wife of Lamech", primaryVerseId: "gen-4-19", sex: "female" }, "Genesis", [origins]);
originsCainBranch.add("adah");
originsCainBranch.add("zillah");
connect("lamech-cain", "adah", "spouse", "Genesis", ["gen-4-19"]);
connect("lamech-cain", "zillah", "spouse", "Genesis", ["gen-4-19"]);
addDescendants("lamech-cain", [
  { id: "jabal", name: "Jabal", primaryVerseId: "gen-4-20" },
  { id: "jubal", name: "Jubal", descriptor: "brother of Jabal", primaryVerseId: "gen-4-21" },
  { id: "tubal-cain", name: "Tubal Cain", primaryVerseId: "gen-4-22" },
  { id: "naamah", name: "Naamah", descriptor: "sister of Tubal Cain", primaryVerseId: "gen-4-22", sex: "female" },
], origins, originsCainBranch, "parent");
connect("adah", "jabal", "parent", "Genesis", ["gen-4-20"]);
connect("adah", "jubal", "parent", "Genesis", ["gen-4-21"]);
connect("zillah", "tubal-cain", "parent", "Genesis", ["gen-4-22"]);
connect("zillah", "naamah", "parent", "Genesis", ["gen-4-22"]);

// The table of nations: all three of Noah's sons remain visible while each
// descendant tree can be opened independently.
addDescendants("japheth", [
  { id: "gomer", name: "Gomer", primaryVerseId: "gen-10-2" },
  { id: "magog", name: "Magog", primaryVerseId: "gen-10-2" },
  { id: "madai", name: "Madai", primaryVerseId: "gen-10-2" },
  { id: "javan", name: "Javan", primaryVerseId: "gen-10-2" },
  { id: "tubal", name: "Tubal", descriptor: "son of Japheth", primaryVerseId: "gen-10-2" },
  { id: "meshech", name: "Meshech", primaryVerseId: "gen-10-2" },
  { id: "tiras", name: "Tiras", primaryVerseId: "gen-10-2" },
], noahToAbraham, japhethBranch);
addDescendants("gomer", [
  { id: "ashkenaz", name: "Ashkenaz", primaryVerseId: "gen-10-3" },
  { id: "riphath", name: "Riphath", primaryVerseId: "gen-10-3" },
  { id: "togarmah", name: "Togarmah", primaryVerseId: "gen-10-3" },
], noahToAbraham, japhethBranch);
addDescendants("javan", [
  { id: "elishah", name: "Elishah", primaryVerseId: "gen-10-4" },
  { id: "tarshish", name: "Tarshish", primaryVerseId: "gen-10-4" },
  { id: "kittim", name: "Kittim", primaryVerseId: "gen-10-4" },
  { id: "dodanim", name: "Dodanim", primaryVerseId: "gen-10-4" },
], noahToAbraham, japhethBranch);

addDescendants("ham", [
  { id: "cush", name: "Cush", primaryVerseId: "gen-10-6" },
  { id: "mizraim", name: "Mizraim", primaryVerseId: "gen-10-6" },
  { id: "put", name: "Put", primaryVerseId: "gen-10-6" },
  { id: "canaan", name: "Canaan", primaryVerseId: "gen-10-6" },
], noahToAbraham, hamBranch);
addDescendants("cush", [
  { id: "seba", name: "Seba", primaryVerseId: "gen-10-7" },
  { id: "havilah-cush", name: "Havilah", descriptor: "son of Cush", primaryVerseId: "gen-10-7" },
  { id: "sabtah", name: "Sabtah", primaryVerseId: "gen-10-7" },
  { id: "raamah", name: "Raamah", primaryVerseId: "gen-10-7" },
  { id: "sabteca", name: "Sabteca", primaryVerseId: "gen-10-7" },
  { id: "nimrod", name: "Nimrod", primaryVerseId: "gen-10-8", notable: true },
], noahToAbraham, hamBranch);
addDescendants("raamah", [
  { id: "sheba-raamah", name: "Sheba", descriptor: "son of Raamah", primaryVerseId: "gen-10-7" },
  { id: "dedan", name: "Dedan", primaryVerseId: "gen-10-7" },
], noahToAbraham, hamBranch);
addDescendants("mizraim", [
  { id: "ludim", name: "Ludim", descriptor: "a people descended from Mizraim", primaryVerseId: "gen-10-13" },
  { id: "anamim", name: "Anamim", descriptor: "a people descended from Mizraim", primaryVerseId: "gen-10-13" },
  { id: "lehabim", name: "Lehabim", descriptor: "a people descended from Mizraim", primaryVerseId: "gen-10-13" },
  { id: "naphtuhim", name: "Naphtuhim", descriptor: "a people descended from Mizraim", primaryVerseId: "gen-10-13" },
  { id: "pathrusim", name: "Pathrusim", descriptor: "a people descended from Mizraim", primaryVerseId: "gen-10-14" },
  { id: "casluhim", name: "Casluhim", descriptor: "a people descended from Mizraim", primaryVerseId: "gen-10-14" },
  { id: "caphtorim", name: "Caphtorim", descriptor: "a people descended from Mizraim", primaryVerseId: "gen-10-14" },
], noahToAbraham, hamBranch);
addDescendants("canaan", [
  { id: "sidon", name: "Sidon", primaryVerseId: "gen-10-15" },
  { id: "heth", name: "Heth", primaryVerseId: "gen-10-15" },
  { id: "jebusites", name: "Jebusites", descriptor: "a people descended from Canaan", primaryVerseId: "gen-10-16" },
  { id: "amorites", name: "Amorites", descriptor: "a people descended from Canaan", primaryVerseId: "gen-10-16" },
  { id: "girgashites", name: "Girgashites", descriptor: "a people descended from Canaan", primaryVerseId: "gen-10-16" },
  { id: "hivites", name: "Hivites", descriptor: "a people descended from Canaan", primaryVerseId: "gen-10-17" },
  { id: "arkites", name: "Arkites", descriptor: "a people descended from Canaan", primaryVerseId: "gen-10-17" },
  { id: "sinites", name: "Sinites", descriptor: "a people descended from Canaan", primaryVerseId: "gen-10-17" },
  { id: "arvadites", name: "Arvadites", descriptor: "a people descended from Canaan", primaryVerseId: "gen-10-18" },
  { id: "zemarites", name: "Zemarites", descriptor: "a people descended from Canaan", primaryVerseId: "gen-10-18" },
  { id: "hamathites", name: "Hamathites", descriptor: "a people descended from Canaan", primaryVerseId: "gen-10-18" },
], noahToAbraham, hamBranch);

addDescendants("shem", [
  { id: "elam", name: "Elam", primaryVerseId: "gen-10-22" },
  { id: "asshur", name: "Asshur", primaryVerseId: "gen-10-22" },
  { id: "arpachshad", name: "Arpachshad", aliases: ["Arphaxad"], primaryVerseId: "gen-10-22" },
  { id: "lud", name: "Lud", primaryVerseId: "gen-10-22" },
  { id: "aram-shem", name: "Aram", descriptor: "son of Shem", primaryVerseId: "gen-10-22" },
], noahToAbraham, shemBranch);
addDescendants("aram-shem", [
  { id: "uz", name: "Uz", primaryVerseId: "gen-10-23" },
  { id: "hul", name: "Hul", primaryVerseId: "gen-10-23" },
  { id: "gether", name: "Gether", primaryVerseId: "gen-10-23" },
  { id: "mash", name: "Mash", primaryVerseId: "gen-10-23" },
], noahToAbraham, shemBranch);
addDescendants("arpachshad", [
  { id: "shelah", name: "Shelah", aliases: ["Salah", "Sala"], primaryVerseId: "gen-10-24" },
], noahToAbraham, shemBranch);
addDescendants("shelah", [
  { id: "eber", name: "Eber", primaryVerseId: "gen-10-24" },
], noahToAbraham, shemBranch);
addDescendants("eber", [
  { id: "peleg", name: "Peleg", primaryVerseId: "gen-10-25" },
  { id: "joktan", name: "Joktan", primaryVerseId: "gen-10-25" },
], noahToAbraham, shemBranch);
addDescendants("joktan", [
  { id: "almodad", name: "Almodad", primaryVerseId: "gen-10-26" },
  { id: "sheleph", name: "Sheleph", primaryVerseId: "gen-10-26" },
  { id: "hazarmaveth", name: "Hazarmaveth", primaryVerseId: "gen-10-26" },
  { id: "jerah", name: "Jerah", primaryVerseId: "gen-10-26" },
  { id: "hadoram", name: "Hadoram", primaryVerseId: "gen-10-27" },
  { id: "uzal", name: "Uzal", primaryVerseId: "gen-10-27" },
  { id: "diklah", name: "Diklah", primaryVerseId: "gen-10-27" },
  { id: "obal", name: "Obal", primaryVerseId: "gen-10-28" },
  { id: "abimael", name: "Abimael", primaryVerseId: "gen-10-28" },
  { id: "sheba-joktan", name: "Sheba", descriptor: "son of Joktan", primaryVerseId: "gen-10-28" },
  { id: "ophir", name: "Ophir", primaryVerseId: "gen-10-29" },
  { id: "havilah-joktan", name: "Havilah", descriptor: "son of Joktan", primaryVerseId: "gen-10-29" },
  { id: "jobab", name: "Jobab", descriptor: "son of Joktan", primaryVerseId: "gen-10-29" },
], noahToAbraham, shemBranch);
addDescendants("terah", [
  { id: "nahor-brother", name: "Nahor", descriptor: "brother of Abraham", primaryVerseId: "gen-11-26" },
  { id: "haran", name: "Haran", descriptor: "brother of Abraham", primaryVerseId: "gen-11-26" },
], noahToAbraham, shemBranch, "parent");
addDescendants("haran", [
  { id: "lot", name: "Lot", primaryVerseId: "gen-11-27", notable: true },
], noahToAbraham, shemBranch, "parent");

addPerson({
  id: "sarah",
  name: "Sarah",
  aliases: ["Sarai"],
  descriptor: "wife and paternal half-sister of Abraham",
  primaryVerseId: "gen-20-12",
  sex: "female",
  notable: true,
}, "Genesis", [noahToAbraham, shemBranch, patriarchs, promise]);
addPerson({ id: "hagar", name: "Hagar", primaryVerseId: "gen-16-15", sex: "female", notable: true }, "Genesis", [patriarchs]);
addPerson({ id: "ishmael", name: "Ishmael", primaryVerseId: "gen-16-15", notable: true }, "Genesis", [patriarchs]);
addPerson({ id: "rebekah", name: "Rebekah", aliases: ["Rebecca"], descriptor: "sister of Laban; mother of Jacob and Esau", primaryVerseId: "gen-25-20", sex: "female", notable: true }, "Genesis", [patriarchs, promise]);
addPerson({ id: "esau", name: "Esau", aliases: ["Edom"], primaryVerseId: "gen-25-25", notable: true }, "Genesis", [patriarchs]);
addPerson({ id: "nahor-brother", name: "Nahor", descriptor: "brother of Abraham", primaryVerseId: "gen-11-26" }, "Genesis", [patriarchs]);
addPerson({ id: "milcah", name: "Milcah", descriptor: "wife of Nahor", primaryVerseId: "gen-11-29", sex: "female" }, "Genesis", [patriarchs]);
addPerson({ id: "bethuel", name: "Bethuel", descriptor: "father of Rebekah and Laban", primaryVerseId: "gen-22-23" }, "Genesis", [patriarchs]);
addPerson({ id: "laban", name: "Laban", descriptor: "Jacob’s uncle; brother of Rebekah; father of Leah and Rachel", primaryVerseId: "gen-28-5" }, "Genesis", [patriarchs]);
connect("terah", "sarah", "parent", "Genesis", ["gen-20-12"]);
connect("abraham", "sarah", "spouse", "Genesis", ["gen-11-29", "gen-20-12"]);
connect("abraham", "hagar", "concubine", "Genesis", ["gen-16-3"]);
connect("sarah", "isaac", "parent", "Genesis", ["gen-21-2"]);
connect("abraham", "ishmael", "parent", "Genesis", ["gen-16-15"]);
connect("hagar", "ishmael", "parent", "Genesis", ["gen-16-15"]);
connect("isaac", "rebekah", "spouse", "Genesis", ["gen-25-20"]);
connect("isaac", "esau", "parent", "Genesis", ["gen-25-26"]);
connect("rebekah", "esau", "parent", "Genesis", ["gen-25-24", "gen-25-25"]);
connect("rebekah", "jacob", "parent", "Genesis", ["gen-25-24", "gen-25-26"]);
connect("nahor-brother", "milcah", "spouse", "Genesis", ["gen-11-29"]);
connect("nahor-brother", "bethuel", "parent", "Genesis", ["gen-22-20", "gen-22-23"]);
connect("milcah", "bethuel", "parent", "Genesis", ["gen-22-20", "gen-22-23"]);
connect("bethuel", "rebekah", "parent", "Genesis", ["gen-24-15"]);
connect("bethuel", "laban", "parent", "Genesis", ["gen-28-5"]);

const mothers = [
  { id: "leah", name: "Leah", descriptor: "daughter of Laban; cousin and wife of Jacob", ref: "gen-29-16", relationship: "spouse" },
  { id: "rachel", name: "Rachel", descriptor: "daughter of Laban; cousin and wife of Jacob", ref: "gen-29-16", relationship: "spouse" },
  { id: "bilhah", name: "Bilhah", descriptor: "Rachel’s servant and Jacob’s concubine", ref: "gen-29-29", relationship: "concubine" },
  { id: "zilpah", name: "Zilpah", descriptor: "Leah’s servant and Jacob’s concubine", ref: "gen-29-24", relationship: "concubine" },
] satisfies Array<{ id: string; name: string; descriptor: string; ref: string; relationship: "spouse" | "concubine" }>;
mothers.forEach((mother) => {
  addPerson({ id: mother.id, name: mother.name, descriptor: mother.descriptor, primaryVerseId: mother.ref, sex: "female", notable: mother.id === "leah" || mother.id === "rachel" }, "Genesis", [patriarchs]);
  connect("jacob", mother.id, mother.relationship, "Genesis", [mother.ref]);
});
connect("laban", "leah", "parent", "Genesis", ["gen-29-16"]);
connect("laban", "rachel", "parent", "Genesis", ["gen-29-16"]);

const sons = [
  ["reuben", "Reuben", "leah", "gen-29-32"], ["simeon", "Simeon", "leah", "gen-29-33"],
  ["levi", "Levi", "leah", "gen-29-34"], ["judah", "Judah", "leah", "gen-29-35"],
  ["dan", "Dan", "bilhah", "gen-30-6"], ["naphtali", "Naphtali", "bilhah", "gen-30-8"],
  ["gad", "Gad", "zilpah", "gen-30-11"], ["asher", "Asher", "zilpah", "gen-30-13"],
  ["issachar", "Issachar", "leah", "gen-30-18"], ["zebulun", "Zebulun", "leah", "gen-30-20"],
  ["joseph-patriarch", "Joseph", "rachel", "gen-30-24"], ["benjamin", "Benjamin", "rachel", "gen-35-18"],
] as const;

export const patriarchSonsInBirthOrder = sons.map(([id]) => id);

sons.forEach(([id, name, motherId, ref], birthIndex) => {
  addPerson({ id, name, primaryVerseId: ref, notable: id === "joseph-patriarch", birthOrder: birthIndex + 1 }, "Genesis", [patriarchs]);
  if (id !== "judah") connect("jacob", id, "parent", "Genesis", [ref]);
  connect(motherId, id, "parent", "Genesis", [ref]);
});

addPerson({ id: "tamar", name: "Tamar", descriptor: "mother of Perez and Zerah", primaryVerseId: "gen-38-6", sex: "female", notable: true }, "Genesis", [patriarchs, davidic, promise, matthew]);
addPerson({ id: "zerah", name: "Zerah", aliases: ["Zara"], primaryVerseId: "gen-38-30" }, "Genesis", [patriarchs, davidic, matthew]);
addPerson({ id: "er-judah", name: "Er", descriptor: "Judah’s firstborn son", primaryVerseId: "gen-38-3" }, "Genesis", [patriarchs]);
addPerson({ id: "onan", name: "Onan", descriptor: "Judah’s second son", primaryVerseId: "gen-38-4" }, "Genesis", [patriarchs]);
connect("judah", "er-judah", "parent", "Genesis", ["gen-38-3"]);
connect("judah", "onan", "parent", "Genesis", ["gen-38-4"]);
connect("er-judah", "tamar", "spouse", "Genesis", ["gen-38-6"]);
connect("tamar", "perez", "parent", "Genesis", ["gen-38-29"]);
connect("tamar", "perez", "parent", "Matthew", ["matt-1-3"]);
connect("judah", "zerah", "parent", "Genesis", ["gen-38-30"]);
connect("judah", "zerah", "parent", "Matthew", ["matt-1-3"]);
connect("tamar", "zerah", "parent", "Genesis", ["gen-38-30"]);
connect("tamar", "zerah", "parent", "Matthew", ["matt-1-3"]);

addPerson({ id: "rahab", name: "Rahab", primaryVerseId: "matt-1-5", sex: "female", notable: true }, "Matthew", [davidic, promise, matthew]);
addPerson({ id: "ruth", name: "Ruth", descriptor: "the Moabitess", primaryVerseId: "matt-1-5", sex: "female", notable: true }, "Matthew", [davidic, promise, matthew]);
addPerson({ id: "bathsheba", name: "Bathsheba", descriptor: "the wife of Uriah", primaryVerseId: "matt-1-6", sex: "female", notable: true }, "Matthew", [promise, matthew]);
addPerson({ id: "mary", name: "Mary", descriptor: "mother of Jesus", primaryVerseId: "matt-1-16", sex: "female", notable: true }, "Matthew", [promise, matthew]);
connect("salmon", "rahab", "spouse", "Matthew", ["matt-1-5"]);
connect("rahab", "boaz", "parent", "Matthew", ["matt-1-5"]);
connect("boaz", "ruth", "spouse", "Ruth", ["ruth-4-13"]);
connect("ruth", "obed", "parent", "Ruth", ["ruth-4-13", "ruth-4-17"]);
connect("david", "bathsheba", "spouse", "Narrative", ["2-sam-12-24"]);
connect("bathsheba", "solomon", "parent", "Narrative", ["2-sam-12-24"]);
connect("joseph-of-nazareth", "mary", "spouse", "Matthew", ["matt-1-16", "matt-1-18"]);
connect("mary", "jesus", "parent", "Matthew", ["matt-1-16", "matt-1-18"]);

addStory("adam", "The first human family", ["gen-2-22", "gen-2-23", "gen-2-24", "gen-4-1", "gen-4-2"]);
addStory("eve", "The first human family", ["gen-2-22", "gen-2-23", "gen-2-24", "gen-4-1", "gen-4-2"]);
addStory("cain", "Cain and his family", ["gen-4-1", "gen-4-2", "gen-4-8", "gen-4-9", "gen-4-10", "gen-4-11", "gen-4-12", "gen-4-13", "gen-4-14", "gen-4-15", "gen-4-16", "gen-4-17"]);
addStory("enoch", "Enoch walked with God", ["gen-5-21", "gen-5-22", "gen-5-23", "gen-5-24", "heb-11-5"]);
addStory("noah", "Noah found favor", ["gen-6-8", "gen-6-9", "heb-11-7"]);
addStory("abraham", "The call and the promise", ["gen-12-1", "gen-12-2", "gen-12-3", "gen-15-5", "gen-15-6", "heb-11-8"]);
addStory("sarah", "The promised son", ["gen-21-1", "gen-21-2", "gen-21-3", "heb-11-11"]);
addStory("tamar", "Judah and Tamar", ["gen-38-26", "gen-38-27", "gen-38-28", "gen-38-29", "gen-38-30", "matt-1-3"]);
addStory("rahab", "Rahab in the story of redemption", ["josh-2-1", "josh-6-25", "matt-1-5", "heb-11-31", "jas-2-25"]);
addStory("boaz", "Boaz the kinsman-redeemer", ["ruth-2-1", "ruth-4-9", "ruth-4-10", "ruth-4-13", "ruth-4-21"]);
addStory("ruth", "Ruth’s faithfulness and family", ["ruth-1-16", "ruth-1-17", "ruth-4-13", "ruth-4-14", "ruth-4-15", "ruth-4-16", "ruth-4-17"]);
addStory("david", "David anointed and promised a house", ["1-sam-16-12", "1-sam-16-13", "2-sam-7-12", "2-sam-7-13", "2-sam-7-14", "2-sam-7-15", "2-sam-7-16"]);
addStory("bathsheba", "The birth of Solomon", ["2-sam-12-24", "2-sam-12-25", "matt-1-6"]);
addStory("joseph-of-nazareth", "Joseph receives Mary", ["matt-1-18", "matt-1-19", "matt-1-20", "matt-1-21"]);
addStory("mary", "The promised birth", ["luke-1-30", "luke-1-31", "luke-1-32", "luke-1-33", "luke-1-34", "luke-1-35"]);
addStory("jesus", "Jesus in the genealogies", ["matt-1-1", "matt-1-16", "matt-1-21", "luke-3-23"]);

// Broader story selections for every person marked as having a richer history.
addStory("abel", "Abel’s offering and death", ["gen-4-2", "gen-4-3", "gen-4-4", "gen-4-5", "gen-4-8", "gen-4-9", "gen-4-10", "heb-11-4"]);
addStory("noah", "The flood and God’s covenant", ["gen-6-13", "gen-6-14", "gen-6-18", "gen-6-22", "gen-7-1", "gen-7-5", "gen-8-15", "gen-8-16", "gen-8-20", "gen-8-21", "gen-8-22", "gen-9-8", "gen-9-9", "gen-9-10", "gen-9-11", "gen-9-12", "gen-9-13"]);
addStory("nimrod", "Nimrod’s kingdom", ["gen-10-8", "gen-10-9", "gen-10-10", "gen-10-11", "gen-10-12"]);
addStory("lot", "Lot separates from Abraham and escapes Sodom", ["gen-13-5", "gen-13-6", "gen-13-7", "gen-13-8", "gen-13-9", "gen-13-10", "gen-13-11", "gen-13-12", "gen-13-13", "gen-19-1", "gen-19-15", "gen-19-16", "gen-19-17", "gen-19-29"]);
addStory("abraham", "The covenant and the testing of Abraham", ["gen-17-1", "gen-17-2", "gen-17-3", "gen-17-4", "gen-17-5", "gen-17-6", "gen-17-7", "gen-17-8", "gen-18-10", "gen-18-11", "gen-18-12", "gen-18-13", "gen-18-14", "gen-22-1", "gen-22-2", "gen-22-9", "gen-22-10", "gen-22-11", "gen-22-12", "gen-22-15", "gen-22-16", "gen-22-17", "gen-22-18"]);
addStory("sarah", "Sarah hears the promise", ["gen-18-9", "gen-18-10", "gen-18-11", "gen-18-12", "gen-18-13", "gen-18-14", "gen-18-15"]);
addStory("sarah", "Abram calls Sarai his sister in Egypt", Array.from({ length: 11 }, (_, index) => `gen-12-${index + 10}`));
addStory("sarah", "Abraham explains Sarah is his half-sister", Array.from({ length: 18 }, (_, index) => `gen-20-${index + 1}`));
addStory("hagar", "Hagar meets the God who sees", ["gen-16-7", "gen-16-8", "gen-16-9", "gen-16-10", "gen-16-11", "gen-16-12", "gen-16-13", "gen-16-14", "gen-16-15", "gen-16-16", "gen-21-14", "gen-21-15", "gen-21-16", "gen-21-17", "gen-21-18", "gen-21-19", "gen-21-20", "gen-21-21"]);
addStory("ishmael", "Ishmael’s birth and preservation", ["gen-16-10", "gen-16-11", "gen-16-12", "gen-16-15", "gen-16-16", "gen-21-13", "gen-21-14", "gen-21-15", "gen-21-16", "gen-21-17", "gen-21-18", "gen-21-19", "gen-21-20", "gen-21-21"]);
addStory("isaac", "The promised son", ["gen-21-1", "gen-21-2", "gen-21-3", "gen-21-4", "gen-21-5", "gen-21-6", "gen-21-7", "gen-22-6", "gen-22-7", "gen-22-8", "gen-22-9", "gen-22-10", "gen-22-11", "gen-22-12", "gen-24-62", "gen-24-63", "gen-24-64", "gen-24-65", "gen-24-66", "gen-24-67", "gen-26-2", "gen-26-3", "gen-26-4", "gen-26-5"]);
addStory("rebekah", "Rebekah joins Isaac’s family", ["gen-24-15", "gen-24-16", "gen-24-17", "gen-24-18", "gen-24-19", "gen-24-20", "gen-24-24", "gen-24-27", "gen-24-57", "gen-24-58", "gen-24-59", "gen-24-60", "gen-24-61", "gen-24-64", "gen-24-65", "gen-24-67"]);
addStory("esau", "Esau’s birthright, blessing, and reunion", ["gen-25-29", "gen-25-30", "gen-25-31", "gen-25-32", "gen-25-33", "gen-25-34", "gen-27-30", "gen-27-31", "gen-27-32", "gen-27-33", "gen-27-34", "gen-27-35", "gen-27-36", "gen-27-37", "gen-27-38", "gen-27-39", "gen-27-40", "gen-33-1", "gen-33-2", "gen-33-3", "gen-33-4"]);
addStory("jacob", "Bethel, wrestling, and the name Israel", ["gen-28-10", "gen-28-11", "gen-28-12", "gen-28-13", "gen-28-14", "gen-28-15", "gen-28-16", "gen-28-17", "gen-28-18", "gen-28-19", "gen-28-20", "gen-28-21", "gen-28-22", "gen-32-24", "gen-32-25", "gen-32-26", "gen-32-27", "gen-32-28", "gen-32-29", "gen-32-30", "gen-35-9", "gen-35-10", "gen-35-11", "gen-35-12", "gen-35-13", "gen-35-14", "gen-35-15"]);
addStory("laban", "Laban, Jacob, Leah, and Rachel", ["gen-29-13", "gen-29-14", "gen-29-15", "gen-29-16", "gen-29-17", "gen-29-18", "gen-29-19", "gen-29-20", "gen-29-21", "gen-29-22", "gen-29-23", "gen-29-24", "gen-29-25", "gen-29-26", "gen-29-27", "gen-29-28", "gen-29-29", "gen-29-30", "gen-31-43", "gen-31-44", "gen-31-45", "gen-31-46", "gen-31-47", "gen-31-48", "gen-31-49", "gen-31-50", "gen-31-51", "gen-31-52", "gen-31-53", "gen-31-54", "gen-31-55"]);
addStory("leah", "Leah’s marriage and children", ["gen-29-16", "gen-29-17", "gen-29-18", "gen-29-21", "gen-29-22", "gen-29-23", "gen-29-24", "gen-29-25", "gen-29-26", "gen-29-27", "gen-29-28", "gen-29-31", "gen-29-32", "gen-29-33", "gen-29-34", "gen-29-35", "gen-30-17", "gen-30-18", "gen-30-19", "gen-30-20", "gen-30-21"]);
addStory("rachel", "Rachel’s marriage and children", ["gen-29-9", "gen-29-10", "gen-29-11", "gen-29-12", "gen-29-13", "gen-29-17", "gen-29-18", "gen-29-20", "gen-29-27", "gen-29-28", "gen-29-29", "gen-29-30", "gen-30-1", "gen-30-2", "gen-30-22", "gen-30-23", "gen-30-24", "gen-35-16", "gen-35-17", "gen-35-18", "gen-35-19", "gen-35-20"]);
addStory("reuben", "Reuben’s turning points", ["gen-29-32", "gen-35-22", "gen-37-21", "gen-37-22", "gen-37-29", "gen-37-30", "gen-42-37", "gen-49-3", "gen-49-4"]);
addStory("simeon", "Simeon in Jacob’s family", ["gen-29-33", "gen-34-25", "gen-34-26", "gen-34-27", "gen-34-28", "gen-34-29", "gen-34-30", "gen-34-31", "gen-42-24", "gen-49-5", "gen-49-6", "gen-49-7"]);
addStory("levi", "Levi in Jacob’s family", ["gen-29-34", "gen-34-25", "gen-34-26", "gen-34-27", "gen-34-28", "gen-34-29", "gen-34-30", "gen-34-31", "gen-49-5", "gen-49-6", "gen-49-7"]);
addStory("judah", "Judah’s transformation and blessing", ["gen-37-26", "gen-37-27", "gen-38-26", "gen-43-8", "gen-43-9", "gen-43-10", "gen-44-18", "gen-44-19", "gen-44-20", "gen-44-21", "gen-44-22", "gen-44-23", "gen-44-24", "gen-44-25", "gen-44-26", "gen-44-27", "gen-44-28", "gen-44-29", "gen-44-30", "gen-44-31", "gen-44-32", "gen-44-33", "gen-44-34", "gen-49-8", "gen-49-9", "gen-49-10", "gen-49-11", "gen-49-12"]);
addStory("joseph-patriarch", "Joseph’s suffering, rise, and reconciliation", ["gen-37-3", "gen-37-4", "gen-37-5", "gen-37-6", "gen-37-7", "gen-37-8", "gen-37-9", "gen-37-10", "gen-37-11", "gen-39-2", "gen-39-3", "gen-39-4", "gen-39-5", "gen-39-6", "gen-39-7", "gen-39-8", "gen-39-9", "gen-41-37", "gen-41-38", "gen-41-39", "gen-41-40", "gen-41-41", "gen-41-42", "gen-41-43", "gen-41-44", "gen-41-45", "gen-41-46", "gen-45-1", "gen-45-2", "gen-45-3", "gen-45-4", "gen-45-5", "gen-45-6", "gen-45-7", "gen-45-8", "gen-45-9", "gen-45-10", "gen-45-11", "gen-45-12", "gen-45-13", "gen-45-14", "gen-45-15", "gen-50-19", "gen-50-20", "gen-50-21"]);
addStory("er-judah", "Er’s death", ["gen-38-6", "gen-38-7"]);
addStory("onan", "Onan’s refusal and death", ["gen-38-8", "gen-38-9", "gen-38-10"]);
addStory("boaz", "Boaz throughout Ruth 2–4", ["ruth-2-1", "ruth-2-4", "ruth-2-8", "ruth-2-9", "ruth-2-10", "ruth-2-11", "ruth-2-12", "ruth-2-14", "ruth-2-15", "ruth-2-16", "ruth-3-7", "ruth-3-8", "ruth-3-9", "ruth-3-10", "ruth-3-11", "ruth-3-12", "ruth-3-13", "ruth-4-1", "ruth-4-2", "ruth-4-3", "ruth-4-4", "ruth-4-5", "ruth-4-6", "ruth-4-9", "ruth-4-10", "ruth-4-13", "ruth-4-21"]);
addStory("ruth", "Ruth and Boaz", ["ruth-2-2", "ruth-2-3", "ruth-2-8", "ruth-2-9", "ruth-2-10", "ruth-2-11", "ruth-2-12", "ruth-2-19", "ruth-2-20", "ruth-2-21", "ruth-2-22", "ruth-2-23", "ruth-3-1", "ruth-3-5", "ruth-3-6", "ruth-3-9", "ruth-3-10", "ruth-3-11", "ruth-3-12", "ruth-3-13", "ruth-4-13", "ruth-4-14", "ruth-4-15", "ruth-4-16", "ruth-4-17"]);
addStory("david", "David and Goliath", ["1-sam-17-32", "1-sam-17-33", "1-sam-17-34", "1-sam-17-35", "1-sam-17-36", "1-sam-17-37", "1-sam-17-38", "1-sam-17-39", "1-sam-17-40", "1-sam-17-45", "1-sam-17-46", "1-sam-17-47", "1-sam-17-48", "1-sam-17-49", "1-sam-17-50"]);
addStory("bathsheba", "David, Bathsheba, and Solomon", ["2-sam-11-2", "2-sam-11-3", "2-sam-11-4", "2-sam-11-5", "2-sam-12-24", "2-sam-12-25"]);
addStory("solomon", "Solomon asks for wisdom", ["1-kgs-3-5", "1-kgs-3-6", "1-kgs-3-7", "1-kgs-3-8", "1-kgs-3-9", "1-kgs-3-10", "1-kgs-3-11", "1-kgs-3-12", "1-kgs-3-13", "1-kgs-3-14", "1-kgs-3-16", "1-kgs-3-17", "1-kgs-3-18", "1-kgs-3-19", "1-kgs-3-20", "1-kgs-3-21", "1-kgs-3-22", "1-kgs-3-23", "1-kgs-3-24", "1-kgs-3-25", "1-kgs-3-26", "1-kgs-3-27", "1-kgs-3-28"]);
addStory("joseph-of-nazareth", "Joseph protects Jesus", ["matt-2-13", "matt-2-14", "matt-2-15", "matt-2-19", "matt-2-20", "matt-2-21", "matt-2-22", "matt-2-23"]);
addStory("mary", "Mary treasures the birth of Jesus", ["luke-2-4", "luke-2-5", "luke-2-6", "luke-2-7", "luke-2-15", "luke-2-16", "luke-2-17", "luke-2-18", "luke-2-19"]);
addStory("jesus", "The birth of Jesus", ["matt-1-18", "matt-1-19", "matt-1-20", "matt-1-21", "matt-1-22", "matt-1-23", "matt-1-24", "matt-1-25", "luke-2-10", "luke-2-11", "luke-2-12", "luke-2-13", "luke-2-14"]);

addReadingGuide("noah", ["Genesis 6–9"]);
addReadingGuide("abraham", ["Genesis 11:26–25:11", "Romans 4", "Hebrews 11:8–19"]);
addReadingGuide("isaac", ["Genesis 21–28", "Genesis 35:27–29"]);
addReadingGuide("jacob", ["Genesis 25–35", "Genesis 46–49"]);
addReadingGuide("joseph-patriarch", ["Genesis 37–50"]);
addReadingGuide("david", ["1 Samuel 16–31", "2 Samuel 1–24", "1 Kings 1–2", "Selected Psalms"]);
addReadingGuide("solomon", ["1 Kings 1–11", "Proverbs", "Ecclesiastes"]);
addReadingGuide("jesus", ["Matthew 1–28", "Mark 1–16", "Luke 1–24", "John 1–21"]);

addAgeFacts("adam", [
  { id: "seth-born", label: "At Seth’s birth", value: "130 years old", verseIds: ["gen-5-3"] },
  { id: "death", label: "Age at death", value: "930 years", verseIds: ["gen-5-5"] },
]);
addAgeFacts("seth", [
  { id: "enosh-born", label: "At Enosh’s birth", value: "105 years old", verseIds: ["gen-5-6"] },
  { id: "death", label: "Age at death", value: "912 years", verseIds: ["gen-5-8"] },
]);
addAgeFacts("enosh", [
  { id: "kenan-born", label: "At Kenan’s birth", value: "90 years old", verseIds: ["gen-5-9"] },
  { id: "death", label: "Age at death", value: "905 years", verseIds: ["gen-5-11"] },
]);
addAgeFacts("kenan", [
  { id: "mahalalel-born", label: "At Mahalalel’s birth", value: "70 years old", verseIds: ["gen-5-12"] },
  { id: "death", label: "Age at death", value: "910 years", verseIds: ["gen-5-14"] },
]);
addAgeFacts("mahalalel", [
  { id: "jared-born", label: "At Jared’s birth", value: "65 years old", verseIds: ["gen-5-15"] },
  { id: "death", label: "Age at death", value: "895 years", verseIds: ["gen-5-17"] },
]);
addAgeFacts("jared", [
  { id: "enoch-born", label: "At Enoch’s birth", value: "162 years old", verseIds: ["gen-5-18"] },
  { id: "death", label: "Age at death", value: "962 years", verseIds: ["gen-5-20"] },
]);
addAgeFacts("enoch", [
  { id: "methuselah-born", label: "At Methuselah’s birth", value: "65 years old", verseIds: ["gen-5-21"] },
  {
    id: "taken",
    label: "Total earthly life",
    value: "365 years",
    verseIds: ["gen-5-23", "gen-5-24"],
    note: "Genesis says God took Enoch rather than saying, ‘then he died.’",
  },
]);
addAgeFacts("methuselah", [
  { id: "lamech-born", label: "At Lamech’s birth", value: "187 years old", verseIds: ["gen-5-25"] },
  { id: "death", label: "Age at death", value: "969 years", verseIds: ["gen-5-27"] },
]);
addAgeFacts("lamech-noah", [
  { id: "noah-born", label: "At Noah’s birth", value: "182 years old", verseIds: ["gen-5-28"] },
  { id: "death", label: "Age at death", value: "777 years", verseIds: ["gen-5-31"] },
]);
addAgeFacts("noah", [
  {
    id: "sons-introduced",
    label: "When his sons are introduced",
    value: "500 years old",
    verseIds: ["gen-5-32"],
    note: "Genesis introduces Shem, Ham, and Japheth here without assigning all three the same birth year.",
  },
  {
    id: "flood-began",
    label: "When the flood began",
    value: "600 years old",
    verseIds: ["gen-7-6", "gen-7-11"],
    note: "The flood began in Noah’s 600th year, on the seventeenth day of the second month.",
  },
  {
    id: "waters-dried",
    label: "When the earth dried",
    value: "In his 601st year",
    verseIds: ["gen-8-13", "gen-8-14"],
    note: "The surface was drying on the first day of the year; the earth was dry by the twenty-seventh day of the second month.",
  },
  { id: "after-flood", label: "Years lived after the flood", value: "350 years", verseIds: ["gen-9-28"] },
  { id: "death", label: "Age at death", value: "950 years", verseIds: ["gen-9-29"] },
]);
addAgeFacts("shem", [
  {
    id: "arpachshad-born",
    label: "At Arpachshad’s birth",
    value: "100 years old",
    verseIds: ["gen-11-10"],
    note: "Arpachshad was born two years after the flood.",
  },
  {
    id: "lifespan",
    label: "Calculated lifespan",
    value: "600 years",
    verseIds: ["gen-11-10", "gen-11-11"],
    note: "Genesis gives 100 years before Arpachshad’s birth and 500 years afterward.",
  },
]);
addAgeFacts("ham", [
  {
    id: "not-stated",
    label: "Birth and death ages",
    value: "Not stated",
    verseIds: ["gen-5-32"],
    note: "Genesis names Ham among Noah’s sons but does not give his age or lifespan.",
  },
]);
addAgeFacts("japheth", [
  {
    id: "not-stated",
    label: "Birth and death ages",
    value: "Not stated",
    verseIds: ["gen-5-32"],
    note: "Genesis names Japheth among Noah’s sons but does not give his age or lifespan.",
  },
]);

export interface OriginTimelineEntry {
  id: string;
  personId: string;
  birthYear: number;
  endYear?: number;
  endAge?: number;
  yearLabel: string;
  title: string;
  lifeLabel: string;
  endTitle?: string;
  color: string;
}

export interface OriginTimelineMilestone {
  id: string;
  year: number;
  title: string;
  color: string;
  anchorPersonId: string;
  alignWithEndId?: string;
}

export const originTimelineEntries: OriginTimelineEntry[] = [
  { id: "adam", personId: "adam", birthYear: 0, endYear: 930, endAge: 930, yearLabel: "Year 0", title: "Adam born", lifeLabel: "Lifespan 930 years", endTitle: "Adam died", color: "#934f43" },
  { id: "seth", personId: "seth", birthYear: 130, endYear: 1042, endAge: 912, yearLabel: "Year 130", title: "Seth born", lifeLabel: "Lifespan 912 years", endTitle: "Seth died", color: "#2f7467" },
  { id: "enosh", personId: "enosh", birthYear: 235, endYear: 1140, endAge: 905, yearLabel: "Year 235", title: "Enosh born", lifeLabel: "Lifespan 905 years", endTitle: "Enosh died", color: "#536f9d" },
  { id: "kenan", personId: "kenan", birthYear: 325, endYear: 1235, endAge: 910, yearLabel: "Year 325", title: "Kenan born", lifeLabel: "Lifespan 910 years", endTitle: "Kenan died", color: "#96652f" },
  { id: "mahalalel", personId: "mahalalel", birthYear: 395, endYear: 1290, endAge: 895, yearLabel: "Year 395", title: "Mahalalel born", lifeLabel: "Lifespan 895 years", endTitle: "Mahalalel died", color: "#755d91" },
  { id: "jared", personId: "jared", birthYear: 460, endYear: 1422, endAge: 962, yearLabel: "Year 460", title: "Jared born", lifeLabel: "Lifespan 962 years", endTitle: "Jared died", color: "#3f7888" },
  { id: "enoch", personId: "enoch", birthYear: 622, endYear: 987, endAge: 365, yearLabel: "Year 622", title: "Enoch born", lifeLabel: "365 years; taken by God", endTitle: "Enoch taken", color: "#a75f40" },
  { id: "methuselah", personId: "methuselah", birthYear: 687, endYear: 1656, endAge: 969, yearLabel: "Year 687", title: "Methuselah born", lifeLabel: "Lifespan 969 years", endTitle: "Methuselah died", color: "#687a38" },
  { id: "lamech", personId: "lamech-noah", birthYear: 874, endYear: 1651, endAge: 777, yearLabel: "Year 874", title: "Lamech born", lifeLabel: "Lifespan 777 years", endTitle: "Lamech died", color: "#94516a" },
  { id: "noah", personId: "noah", birthYear: 1056, endYear: 2006, endAge: 950, yearLabel: "Year 1056", title: "Noah born", lifeLabel: "Flood year 1656 · lifespan 950 years", endTitle: "Noah died", color: "#356c8b" },
  {
    id: "noah-sons",
    personId: "shem",
    birthYear: 1558,
    endYear: 2158,
    endAge: 600,
    yearLabel: "After year 1556",
    title: "Shem, Ham, and Japheth",
    lifeLabel: "Shem born 1558 (derived); Ham and Japheth not stated",
    endTitle: "Shem died",
    color: "#806728",
  },
];

export const originTimelineMilestones: OriginTimelineMilestone[] = [
  {
    id: "flood",
    year: 1656,
    title: "Flood begins",
    color: "#356c8b",
    anchorPersonId: "noah",
    alignWithEndId: "methuselah",
  },
];

const tableOfNationsLabels: Record<string, [string, Person["peopleGroupCertainty"]?]> = {
  noah: ["Post-Flood nations", "text"],
  shem: ["West Asian peoples", "text"],
  ham: ["Africa, Arabia & Canaan", "text"],
  japheth: ["Anatolia & coastlands", "text"],

  gomer: ["Cimmerians", "likely"],
  magog: ["Northern peoples", "uncertain"],
  madai: ["Medes", "likely"],
  javan: ["Ionians / Greeks", "likely"],
  tubal: ["Northern Anatolian tribes", "likely"],
  meshech: ["Musku people", "likely"],
  tiras: ["Thracians", "likely"],
  ashkenaz: ["Scythian-related peoples", "uncertain"],
  riphath: ["Upper Euphrates region", "likely"],
  togarmah: ["Eastern Anatolia", "likely"],
  elishah: ["Cyprus", "likely"],
  tarshish: ["Mediterranean coastlands", "uncertain"],
  kittim: ["Cyprus & Aegean coastlands", "likely"],
  dodanim: ["Rhodes / Greek coastlands", "uncertain"],

  cush: ["Nubia", "likely"],
  mizraim: ["Egypt", "text"],
  put: ["Libya", "likely"],
  canaan: ["Canaanites / Phoenicia", "text"],
  seba: ["Upper Nile region", "likely"],
  "havilah-cush": ["Eastern Arabia", "likely"],
  sabtah: ["Arabia", "uncertain"],
  raamah: ["Southwest Arabia", "likely"],
  sabteca: ["Eastern Arabia", "uncertain"],
  nimrod: ["Shinar & Assyrian cities", "text"],
  "sheba-raamah": ["Sheba / Southwest Arabia", "likely"],
  dedan: ["Northern Arabia", "likely"],
  ludim: ["West of the Nile Delta", "likely"],
  anamim: ["Cyrenaica / North Africa", "likely"],
  lehabim: ["Libyans", "likely"],
  naphtuhim: ["Lower Egypt", "likely"],
  pathrusim: ["Upper Egypt", "likely"],
  casluhim: ["Egypt–Canaan region", "uncertain"],
  caphtorim: ["Crete / Philistine origins", "likely"],
  sidon: ["Sidonians / Phoenicians", "text"],
  heth: ["Canaanite Heth clans", "text"],
  jebusites: ["Jerusalem", "text"],
  amorites: ["Canaanite hill country", "text"],
  girgashites: ["Canaanite tribe", "uncertain"],
  hivites: ["Canaanite / Hurrian clans", "likely"],
  arkites: ["Arqa, Lebanon", "likely"],
  sinites: ["Sin, Lebanon", "likely"],
  arvadites: ["Arwad", "likely"],
  zemarites: ["Sumur, coastal Syria", "likely"],
  hamathites: ["Hamath on the Orontes", "likely"],

  elam: ["Elamites / southwest Iran", "likely"],
  asshur: ["Assyrians", "likely"],
  arpachshad: ["Northeast Mesopotamia", "uncertain"],
  lud: ["Tigris-region Ludbu", "uncertain"],
  "aram-shem": ["Arameans / Syria", "likely"],
  uz: ["Aramean branch", "uncertain"],
  hul: ["Aramean branch", "uncertain"],
  gether: ["Aramean branch", "uncertain"],
  mash: ["Aramean branch", "uncertain"],
  shelah: ["Line to Eber / Hebrews", "text"],
  eber: ["Eberites / Hebrew line", "text"],
  peleg: ["Line to Abraham", "text"],
  joktan: ["South Arabian peoples", "text"],
  almodad: ["South Arabia", "likely"],
  sheleph: ["Yemen", "likely"],
  hazarmaveth: ["Hadramaut", "likely"],
  jerah: ["South Arabia", "uncertain"],
  hadoram: ["South Arabia", "uncertain"],
  uzal: ["Yemen / ancient Sana’a", "likely"],
  diklah: ["South Arabia", "uncertain"],
  obal: ["Yemen", "likely"],
  abimael: ["South Arabia", "likely"],
  "sheba-joktan": ["Sabaeans / South Arabia", "likely"],
  ophir: ["South Arabian gold region", "likely"],
  "havilah-joktan": ["South Arabia", "uncertain"],
  jobab: ["South Arabia", "uncertain"],

  abraham: ["Hebrews / Abrahamic peoples", "text"],
  "nahor-brother": ["Aramean kin of Abraham", "text"],
  haran: ["Line to Moab & Ammon", "text"],
  lot: ["Moabites & Ammonites", "text"],
};

Object.entries(tableOfNationsLabels).forEach(([personId, [peopleGroup, peopleGroupCertainty]]) => {
  const person = personMap.get(personId);
  if (!person) throw new Error(`Cannot add a people group to unknown person ${personId}`);
  person.peopleGroup = peopleGroup;
  person.peopleGroupCertainty = peopleGroupCertainty;
});

export const people = [...personMap.values()];
export const peopleById = new Map(people.map((person) => [person.id, person]));
export const relationships = [...relationshipMap.values()];

export const views: GenealogyView[] = [
  {
    id: "origins",
    title: "Origins",
    eyebrow: "Adam to Noah",
    description: "The lines of Cain and Seth from Genesis 4–5, with their recorded ages and Noah’s flood timeline.",
    personIds: [...origins],
    rootIds: ["adam", "eve"],
    sourceLayers: ["Genesis"],
    accent: "family",
    branches: [
      { id: "seth", title: "Seth’s family", rootPersonId: "seth", personIds: [...originsSethBranch] },
      { id: "cain", title: "Cain’s family", rootPersonId: "cain", personIds: [...originsCainBranch] },
    ],
    defaultExpandedBranchIds: ["seth"],
  },
  {
    id: "noah-to-abraham",
    title: "Noah to Abraham",
    eyebrow: "After the flood",
    description: "Genesis 10’s peoples and ancient regions, followed by Shem’s line through Abram. A ? marks an uncertain identification.",
    personIds: [...noahToAbraham],
    rootIds: ["noah"],
    sourceLayers: ["Genesis"],
    accent: "family",
    branches: [
      { id: "shem", title: "Shem’s family", rootPersonId: "shem", personIds: [...shemBranch] },
      { id: "ham", title: "Ham’s family", rootPersonId: "ham", personIds: [...hamBranch] },
      { id: "japheth", title: "Japheth’s family", rootPersonId: "japheth", personIds: [...japhethBranch] },
    ],
    defaultExpandedBranchIds: ["shem"],
  },
  {
    id: "patriarchs",
    title: "The Patriarchs",
    eyebrow: "Abraham to Israel’s sons",
    description: "The families of Abraham, Isaac, and Jacob, including Rebekah and Laban’s branch and Judah’s sons.",
    personIds: [...patriarchs],
    rootIds: ["terah"],
    sourceLayers: ["Genesis", "Ruth"],
    accent: "family",
  },
  {
    id: "davidic",
    title: "The Davidic Line",
    eyebrow: "Judah to David",
    description: "The family line from the patriarch Judah through Perez, Boaz, and Jesse to David.",
    personIds: [...davidic],
    rootIds: ["judah", "tamar"],
    sourceLayers: ["Genesis", "Ruth", "Matthew"],
    accent: "family",
  },
  {
    id: "matthew",
    title: "Matthew 1",
    eyebrow: "Abraham to Christ",
    description: "Matthew’s royal genealogy, with the women named or alluded to in the text.",
    personIds: [...matthew],
    rootIds: ["abraham"],
    sourceLayers: ["Matthew", "Ruth", "Narrative"],
    accent: "matthew",
  },
  {
    id: "luke",
    title: "Luke 3",
    eyebrow: "Jesus to Adam",
    description: "Luke’s genealogy shown in ancestor-to-descendant order for comparison.",
    personIds: [...luke],
    rootIds: ["adam"],
    sourceLayers: ["Luke"],
    accent: "luke",
  },
  {
    id: "promise",
    title: "Combined Matthew 1 and Luke 3",
    eyebrow: "The connected line",
    description: "Trace the shared backbone and see where Matthew and Luke preserve distinct lines.",
    personIds: [...promise],
    rootIds: ["adam"],
    sourceLayers: ["Genesis", "Ruth", "Matthew", "Luke", "Narrative"],
    accent: "shared",
  },
];

export const viewById = new Map(views.map((view) => [view.id, view]));

export function relationshipsForPerson(personId: string) {
  return relationships.filter((relationship) => relationship.from === personId || relationship.to === personId);
}

export function firstViewForPerson(personId: string) {
  return views.find((view) => view.personIds.includes(personId));
}

export function visiblePersonIdsForView(view: GenealogyView, expandedBranchIds: Iterable<string>) {
  if (!view.branches?.length) return view.personIds;

  const expanded = new Set(expandedBranchIds);
  const branchPeople = new Set(view.branches.flatMap((branch) => branch.personIds));
  const visible = new Set(view.personIds.filter((personId) => !branchPeople.has(personId)));
  view.branches.forEach((branch) => {
    if (expanded.has(branch.id)) branch.personIds.forEach((personId) => visible.add(personId));
  });
  return view.personIds.filter((personId) => visible.has(personId));
}
