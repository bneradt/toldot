import { useEffect, useMemo, useRef, useState } from "react";
import { GenealogyGraph } from "./components/GenealogyGraph";
import { PersonPanel } from "./components/PersonPanel";
import { firstViewForPerson, people, peopleById, relationships, viewById, views } from "./data/genealogy";
import { scripture } from "./data/scripture.generated";
import type { GenealogyView, Person, Translation } from "./data/types";

function readLocation() {
  const personMatch = window.location.pathname.match(/^\/people\/([^/]+)\/?$/);
  const requestedPerson = personMatch ? decodeURIComponent(personMatch[1]) : null;
  const requestedView = new URLSearchParams(window.location.search).get("view");
  const person = requestedPerson && peopleById.has(requestedPerson) ? requestedPerson : null;
  const fallbackView = person ? firstViewForPerson(person)?.id : null;
  const view = requestedView && viewById.has(requestedView) ? requestedView : fallbackView ?? "origins";
  return { person, view };
}

function updateLocation(personId: string | null, viewId: string, replace = false) {
  const url = personId ? `/people/${encodeURIComponent(personId)}?view=${viewId}` : `/?view=${viewId}`;
  window.history[replace ? "replaceState" : "pushState"]({ personId, viewId }, "", url);
}

export function App() {
  const initial = useMemo(readLocation, []);
  const [activeViewId, setActiveViewId] = useState(initial.view);
  const [selectedId, setSelectedId] = useState<string | null>(initial.person);
  const [hovered, setHovered] = useState<Person | null>(null);
  const [query, setQuery] = useState("");
  const [translation, setTranslation] = useState<Translation>(() =>
    window.localStorage.getItem("toldot-translation") === "kjv" ? "kjv" : "web",
  );
  const searchRef = useRef<HTMLInputElement>(null);
  const activeView = viewById.get(activeViewId) ?? views[0];
  const selected = selectedId ? peopleById.get(selectedId) ?? null : null;
  const graphLegend = useMemo(() => {
    const personIds = new Set(activeView.personIds);
    const visibleRelationships = relationships.filter((relationship) =>
      personIds.has(relationship.from)
      && personIds.has(relationship.to)
      && relationship.sourceLayers.some((layer) => activeView.sourceLayers.includes(layer)),
    );
    const sources = activeView.id === "promise"
      ? [
          { id: "matthew", label: "Matthew 1 line" },
          { id: "luke", label: "Luke 3 line" },
          { id: "shared", label: "Recorded in both" },
        ]
      : [];

    return {
      sources,
      hasWomen: activeView.personIds.some((personId) => peopleById.get(personId)?.sex === "female"),
      hasPartners: visibleRelationships.some((relationship) =>
        relationship.kind === "spouse" || relationship.kind === "concubine"),
      hasNotable: activeView.personIds.some((personId) => peopleById.get(personId)?.notable),
    };
  }, [activeView]);

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return [];
    return people
      .filter((person) => [person.name, person.descriptor, ...(person.aliases ?? [])]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(normalized)))
      .sort((a, b) => {
        const aExact = a.name.toLocaleLowerCase() === normalized ? -1 : 0;
        const bExact = b.name.toLocaleLowerCase() === normalized ? -1 : 0;
        return aExact - bExact || a.name.localeCompare(b.name);
      })
      .slice(0, 9);
  }, [query]);

  useEffect(() => {
    const onPopState = () => {
      const location = readLocation();
      setActiveViewId(location.view);
      setSelectedId(location.person);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "/" && document.activeElement?.tagName !== "INPUT") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setSelectedId(null);
        setQuery("");
        updateLocation(null, activeViewId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeViewId]);

  const chooseView = (view: GenealogyView) => {
    setActiveViewId(view.id);
    setSelectedId(null);
    setHovered(null);
    updateLocation(null, view.id);
  };

  const openPerson = (personId: string) => {
    const visibleHere = activeView.personIds.includes(personId);
    const nextView = visibleHere ? activeView : firstViewForPerson(personId) ?? activeView;
    if (nextView.id !== activeViewId) setActiveViewId(nextView.id);
    setSelectedId(personId);
    setQuery("");
    updateLocation(personId, nextView.id);
  };

  const closePerson = () => {
    setSelectedId(null);
    updateLocation(null, activeView.id);
  };

  const changeTranslation = (next: Translation) => {
    setTranslation(next);
    window.localStorage.setItem("toldot-translation", next);
  };

  return (
    <div className={`app-shell ${selected ? "details-open" : ""}`}>
      <header className="site-header">
        <a className="brand" href="/" onClick={(event) => { event.preventDefault(); chooseView(views[0]); }}>
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span><strong>Toldot</strong><small>The Bible’s family lines, connected</small></span>
        </a>

        <div className="global-search">
          <label htmlFor="person-search">Find a person</label>
          <div className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              id="person-search"
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && results[0]) openPerson(results[0].id);
              }}
              placeholder="Rahab, Boaz, David…"
              autoComplete="off"
            />
            <kbd>/</kbd>
          </div>
          {results.length > 0 && (
            <div className="search-results" role="listbox">
              {results.map((person) => (
                <button type="button" role="option" aria-selected="false" key={person.id} onClick={() => openPerson(person.id)}>
                  <span><strong>{person.name}</strong>{person.descriptor && <small>{person.descriptor}</small>}</span>
                  <em>{scripture[person.primaryVerseId]?.reference}</em>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="translation-toggle header-toggle" role="group" aria-label="Bible translation">
          <button type="button" className={translation === "web" ? "active" : ""} onClick={() => changeTranslation("web")}>WEB</button>
          <button type="button" className={translation === "kjv" ? "active" : ""} onClick={() => changeTranslation("kjv")}>KJV</button>
        </div>
      </header>

      <nav className="view-nav" aria-label="Genealogy views">
        <div className="view-nav-intro">
          <span>Explore</span>
          <p>Choose a source line, then select any name.</p>
        </div>
        <div className="view-buttons">
          {views.map((view) => (
            <button
              type="button"
              key={view.id}
              className={view.id === activeView.id ? "active" : ""}
              onClick={() => chooseView(view)}
            >
              <small>{view.eyebrow}</small>
              <strong>{view.title}</strong>
              <span>{view.personIds.length} people</span>
            </button>
          ))}
        </div>
        <div className="edition-note">
          <span>First edition</span>
          <p>From Genesis’s earliest families through the Gospel genealogies. More biblical lines will follow.</p>
        </div>
      </nav>

      <main className="workspace">
        <section className="view-heading">
          <div>
            <span className={`view-accent ${activeView.accent}`}>{activeView.eyebrow}</span>
            <h1>{activeView.title}</h1>
            <p>{activeView.description}</p>
          </div>
          <div className="legend" aria-label="Graph legend">
            {graphLegend.sources.map((source) => (
              <span key={source.id}><i className={`legend-line ${source.id}`} />{source.label}</span>
            ))}
            {graphLegend.hasWomen && <span><i className="legend-node woman" />Women</span>}
            {graphLegend.hasPartners && <span><i className="legend-line partner" />Marriage / concubinage</span>}
            {graphLegend.hasNotable && <span><i className="legend-node notable" />Richer story</span>}
          </div>
        </section>

        <GenealogyGraph view={activeView} selectedId={selectedId} onSelect={openPerson} onHover={setHovered} />

        <div className={`hover-preview ${hovered ? "visible" : ""}`} aria-hidden="true">
          {hovered && <><span>Open person</span><strong>{hovered.name}</strong><small>{hovered.descriptor ?? scripture[hovered.primaryVerseId]?.reference}</small></>}
        </div>

        <details className="name-index">
          <summary>Browse all {activeView.personIds.length} names in this view</summary>
          <div>
            {activeView.personIds
              .map((id) => peopleById.get(id))
              .filter((person): person is Person => Boolean(person))
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((person) => <button type="button" key={person.id} onClick={() => openPerson(person.id)}>{person.name}<small>{person.descriptor}</small></button>)}
          </div>
        </details>
      </main>

      {selected && (
        <PersonPanel
          person={selected}
          translation={translation}
          onTranslationChange={changeTranslation}
          onClose={closePerson}
          onOpenPerson={openPerson}
        />
      )}
      {selected && <button type="button" className="panel-backdrop" onClick={closePerson} aria-label="Close person details" />}
    </div>
  );
}
