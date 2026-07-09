export type Translation = "web" | "kjv";

export interface Verse {
  id: string;
  reference: string;
  web: string;
  kjv: string;
}

export type PassageCategory = "genealogy" | "story";

export interface PassageSelection {
  title: string;
  category: PassageCategory;
  verseIds: string[];
}

export interface Person {
  id: string;
  name: string;
  descriptor?: string;
  aliases?: string[];
  sex?: "male" | "female";
  primaryVerseId: string;
  note?: string;
  notable?: boolean;
  passages: PassageSelection[];
}

export type RelationshipKind = "parent" | "spouse" | "genealogical" | "as-supposed";
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

export interface GenealogyView {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  personIds: string[];
  rootIds: string[];
  sourceLayers: SourceLayer[];
  accent: "shared" | "matthew" | "luke" | "family";
}
