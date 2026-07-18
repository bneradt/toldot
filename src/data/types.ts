export type Translation = "web" | "kjv";

export interface Verse {
  id: string;
  reference: string;
  web: string;
  kjv: string;
}

export interface BibleChapter {
  id: string;
  reference: string;
  verseIds: string[];
}

export type PassageCategory = "genealogy" | "story";

export interface PassageSelection {
  title: string;
  category: PassageCategory;
  verseIds: string[];
}

export interface AgeFact {
  id: string;
  label: string;
  value: string;
  verseIds: string[];
  note?: string;
}

export interface Person {
  id: string;
  name: string;
  descriptor?: string;
  peopleGroup?: string;
  peopleGroupCertainty?: "text" | "likely" | "uncertain";
  aliases?: string[];
  sex?: "male" | "female";
  primaryVerseId: string;
  note?: string;
  notable?: boolean;
  birthOrder?: number;
  recommendedReading?: string[];
  ageFacts?: AgeFact[];
  passages: PassageSelection[];
}

export type RelationshipKind = "parent" | "spouse" | "concubine" | "genealogical" | "as-supposed";
export type SourceLayer = "Genesis" | "Ruth" | "Matthew" | "Luke" | "Narrative";

export interface Relationship {
  id: string;
  from: string;
  to: string;
  kind: RelationshipKind;
  sourceLayers: SourceLayer[];
  verseIds: string[];
  note?: string;
}

export interface GenealogyBranch {
  id: string;
  title: string;
  rootPersonId: string;
  personIds: string[];
}

export interface GenealogyView {
  id: string;
  title: string;
  tabLabel?: string;
  eyebrow: string;
  description: string;
  presentation?: "graph" | "timeline";
  personIds: string[];
  rootIds: string[];
  sourceLayers: SourceLayer[];
  accent: "shared" | "matthew" | "luke" | "family";
  branches?: GenealogyBranch[];
  defaultExpandedBranchIds?: string[];
}

export interface GenealogyNavigationGroup {
  id: string;
  title: string;
  eyebrow: string;
  meta: string;
  defaultViewId: string;
  viewIds: string[];
}
