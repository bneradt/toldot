import type {
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
matthewLine.slice(13).forEach((person) => davidic.add(person.id));

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
  davidic.add(person.id);
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

addPerson({ id: "sarah", name: "Sarah", aliases: ["Sarai"], primaryVerseId: "gen-21-2", sex: "female", notable: true }, "Genesis", [patriarchs, promise]);
addPerson({ id: "hagar", name: "Hagar", primaryVerseId: "gen-16-15", sex: "female", notable: true }, "Genesis", [patriarchs]);
addPerson({ id: "ishmael", name: "Ishmael", primaryVerseId: "gen-16-15", notable: true }, "Genesis", [patriarchs]);
addPerson({ id: "rebekah", name: "Rebekah", aliases: ["Rebecca"], primaryVerseId: "gen-25-20", sex: "female", notable: true }, "Genesis", [patriarchs, promise]);
addPerson({ id: "esau", name: "Esau", aliases: ["Edom"], primaryVerseId: "gen-25-25", notable: true }, "Genesis", [patriarchs]);
connect("abraham", "sarah", "spouse", "Genesis", ["gen-11-29"]);
connect("sarah", "isaac", "parent", "Genesis", ["gen-21-2"]);
connect("abraham", "ishmael", "parent", "Genesis", ["gen-16-15"]);
connect("hagar", "ishmael", "parent", "Genesis", ["gen-16-15"]);
connect("isaac", "rebekah", "spouse", "Genesis", ["gen-25-20"]);
connect("isaac", "esau", "parent", "Genesis", ["gen-25-26"]);
connect("rebekah", "esau", "parent", "Genesis", ["gen-25-24", "gen-25-25"]);
connect("rebekah", "jacob", "parent", "Genesis", ["gen-25-24", "gen-25-26"]);

const mothers = [
  { id: "leah", name: "Leah", ref: "gen-29-16" },
  { id: "rachel", name: "Rachel", ref: "gen-29-16" },
  { id: "bilhah", name: "Bilhah", ref: "gen-29-29" },
  { id: "zilpah", name: "Zilpah", ref: "gen-29-24" },
];
mothers.forEach((mother) => {
  addPerson({ id: mother.id, name: mother.name, primaryVerseId: mother.ref, sex: "female", notable: mother.id === "leah" || mother.id === "rachel" }, "Genesis", [patriarchs]);
  connect("jacob", mother.id, "spouse", "Genesis", [mother.ref]);
});

const sons = [
  ["reuben", "Reuben", "leah", "gen-29-32"], ["simeon", "Simeon", "leah", "gen-29-33"],
  ["levi", "Levi", "leah", "gen-29-34"], ["judah", "Judah", "leah", "gen-29-35"],
  ["dan", "Dan", "bilhah", "gen-30-6"], ["naphtali", "Naphtali", "bilhah", "gen-30-8"],
  ["gad", "Gad", "zilpah", "gen-30-11"], ["asher", "Asher", "zilpah", "gen-30-13"],
  ["issachar", "Issachar", "leah", "gen-30-18"], ["zebulun", "Zebulun", "leah", "gen-30-20"],
  ["joseph-patriarch", "Joseph", "rachel", "gen-30-24"], ["benjamin", "Benjamin", "rachel", "gen-35-18"],
] as const;

sons.forEach(([id, name, motherId, ref]) => {
  if (!personMap.has(id)) addPerson({ id, name, primaryVerseId: ref, notable: id === "joseph-patriarch" }, "Genesis", [patriarchs]);
  else patriarchs.add(id);
  if (id !== "judah") connect("jacob", id, "parent", "Genesis", [ref]);
  connect(motherId, id, "parent", "Genesis", [ref]);
});

addPerson({ id: "tamar", name: "Tamar", descriptor: "mother of Perez and Zerah", primaryVerseId: "gen-38-6", sex: "female", notable: true }, "Genesis", [patriarchs, promise, matthew]);
addPerson({ id: "zerah", name: "Zerah", aliases: ["Zara"], primaryVerseId: "gen-38-30" }, "Genesis", [patriarchs, matthew]);
connect("tamar", "perez", "parent", "Genesis", ["gen-38-29"]);
connect("tamar", "perez", "parent", "Matthew", ["matt-1-3"]);
connect("judah", "zerah", "parent", "Genesis", ["gen-38-30"]);
connect("judah", "zerah", "parent", "Matthew", ["matt-1-3"]);
connect("tamar", "zerah", "parent", "Genesis", ["gen-38-30"]);
connect("tamar", "zerah", "parent", "Matthew", ["matt-1-3"]);

addPerson({ id: "rahab", name: "Rahab", primaryVerseId: "matt-1-5", sex: "female", notable: true }, "Matthew", [promise, matthew]);
addPerson({ id: "ruth", name: "Ruth", descriptor: "the Moabitess", primaryVerseId: "matt-1-5", sex: "female", notable: true }, "Matthew", [promise, matthew]);
addPerson({ id: "bathsheba", name: "Bathsheba", descriptor: "the wife of Uriah", primaryVerseId: "matt-1-6", sex: "female", notable: true }, "Matthew", [promise, matthew, davidic]);
addPerson({ id: "mary", name: "Mary", descriptor: "mother of Jesus", primaryVerseId: "matt-1-16", sex: "female", notable: true }, "Matthew", [promise, matthew, davidic]);
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

export const people = [...personMap.values()];
export const peopleById = new Map(people.map((person) => [person.id, person]));
export const relationships = [...relationshipMap.values()];

export const views: GenealogyView[] = [
  {
    id: "origins",
    title: "Origins",
    eyebrow: "Adam to Noah",
    description: "The lines of Cain and Seth from Genesis 4–5, ending with Noah and his three sons.",
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
    description: "The families of Shem, Ham, and Japheth, with Shem’s line through Abram open by default.",
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
    description: "The immediate families of Abraham, Isaac, and Jacob, ending with Judah’s sons Perez and Zerah.",
    personIds: [...patriarchs],
    rootIds: ["terah"],
    sourceLayers: ["Genesis", "Ruth"],
    accent: "family",
  },
  {
    id: "davidic",
    title: "The Davidic Line",
    eyebrow: "David to Jesus",
    description: "Matthew’s line through Solomon and Luke’s line through Nathan, held side by side.",
    personIds: [...davidic],
    rootIds: ["david"],
    sourceLayers: ["Matthew", "Luke", "Narrative"],
    accent: "shared",
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
