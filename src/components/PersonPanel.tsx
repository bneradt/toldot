import { relationshipsForPerson, peopleById } from "../data/genealogy";
import { scripture } from "../data/scripture.generated";
import type { Person, Relationship, Translation } from "../data/types";

interface PersonPanelProps {
  person: Person;
  translation: Translation;
  onTranslationChange: (translation: Translation) => void;
  onClose: () => void;
  onOpenPerson: (personId: string) => void;
}

function relationshipLabel(relationship: Relationship, personId: string) {
  if (relationship.kind === "spouse") return "Spouse";
  if (relationship.kind === "as-supposed") return relationship.from === personId ? "Genealogical link" : "As supposed";
  if (relationship.from === personId) return relationship.kind === "parent" ? "Child" : "Descendant in this record";
  return relationship.kind === "parent" ? "Parent" : "Ancestor in this record";
}

function Passage({ title, verseIds, translation }: { title: string; verseIds: string[]; translation: Translation }) {
  const verses = verseIds.map((id) => scripture[id]).filter(Boolean);
  if (!verses.length) return null;
  const first = verses[0];
  const last = verses.at(-1)!;
  const firstChapter = first.reference.split(":")[0];
  const sameChapter = verses.every((verse) => verse.reference.split(":")[0] === firstChapter);
  const reference = !sameChapter
    ? `${verses.length} selected passages`
    : first.reference === last.reference
      ? first.reference
      : `${first.reference}–${last.reference.split(":").at(-1)}`;

  return (
    <article className="passage-card">
      <div className="passage-heading">
        <span>{title}</span>
        <cite>{reference}</cite>
      </div>
      <blockquote>
        {verses.map((verse) => (
          <span className={`verse ${sameChapter ? "" : "standalone"}`} key={verse.id}>
            <sup>{sameChapter ? verse.reference.split(":").at(-1) : verse.reference}</sup>
            {verse[translation]}{" "}
          </span>
        ))}
      </blockquote>
    </article>
  );
}

export function PersonPanel({
  person,
  translation,
  onTranslationChange,
  onClose,
  onOpenPerson,
}: PersonPanelProps) {
  const connections = relationshipsForPerson(person.id);
  const genealogy = person.passages.filter((passage) => passage.category === "genealogy");
  const stories = person.passages.filter((passage) => passage.category === "story");

  return (
    <aside className="person-panel" aria-label={`${person.name} details`}>
      <div className="panel-topbar">
        <span className="panel-kicker">Person record</span>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close person details">×</button>
      </div>

      <header className="person-heading">
        <h2>{person.name}</h2>
        {person.descriptor && <p>{person.descriptor}</p>}
        {person.aliases?.length ? <div className="aliases">Also: {person.aliases.join(", ")}</div> : null}
      </header>

      {person.note && <div className="textual-note"><strong>Source note</strong>{person.note}</div>}

      <div className="panel-section connections-section">
        <h3>Connections</h3>
        <div className="connection-list">
          {connections.map((relationship) => {
            const relatedId = relationship.from === person.id ? relationship.to : relationship.from;
            const related = peopleById.get(relatedId);
            if (!related) return null;
            return (
              <button type="button" key={relationship.id} onClick={() => onOpenPerson(relatedId)}>
                <span>{relationshipLabel(relationship, person.id)}</span>
                <strong>{related.name}</strong>
                <small>{relationship.sourceLayers.join(" · ")}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sticky-translation">
        <span>Bible text</span>
        <div className="translation-toggle" role="group" aria-label="Bible translation">
          <button type="button" className={translation === "web" ? "active" : ""} onClick={() => onTranslationChange("web")}>WEB</button>
          <button type="button" className={translation === "kjv" ? "active" : ""} onClick={() => onTranslationChange("kjv")}>KJV</button>
        </div>
      </div>

      {stories.length > 0 && (
        <section className="panel-section">
          <div className="section-title-row">
            <h3>Story passages</h3>
            <span>{stories.length}</span>
          </div>
          {stories.map((passage) => <Passage key={`${passage.title}-${passage.verseIds[0]}`} {...passage} translation={translation} />)}
        </section>
      )}

      <section className="panel-section">
        <div className="section-title-row">
          <h3>Genealogy records</h3>
          <span>{genealogy.length}</span>
        </div>
        {genealogy.map((passage) => <Passage key={`${passage.title}-${passage.verseIds[0]}`} {...passage} translation={translation} />)}
      </section>

      <footer className="translation-note">
        <strong>{translation === "web" ? "World English Bible" : "King James Version"}</strong>
        <span>{translation === "web" ? "Public domain; WEB is a trademark of eBible.org." : "Public domain outside UK Crown rights."}</span>
      </footer>
    </aside>
  );
}
