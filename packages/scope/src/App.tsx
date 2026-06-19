import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TimelinePane } from "./components/TimelinePane";
import { DetailPane } from "./components/DetailPane";
import { CoordinationPane } from "./components/CoordinationPane";
import { DeckSlides } from "./components/DeckSlides";
import { useNamespaces } from "./hooks/useNamespaces";

type View = "timeline" | "coordination" | "deck";

const PRESENT_MODE =
  (import.meta.env["VITE_TUSK_PRESENT"] as string | undefined) === "1";

export function App() {
  const [selectedNs, setSelectedNs] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<View>("timeline");
  const { data: namespaces = [] } = useNamespaces();

  useEffect(() => {
    if (selectedNs === null && namespaces.length > 0) {
      setSelectedNs(namespaces[0]!.namespace);
    }
  }, [namespaces, selectedNs]);

  function handleSelectNs(ns: string) {
    setSelectedNs(ns);
    setSelectedId(null);
  }

  function handleNavigateToEntry(id: string) {
    setSelectedId(id);
    setActiveView("timeline");
  }

  const shellClass = [
    "app-shell",
    PRESENT_MODE ? "app-shell--present" : "",
    activeView === "deck" ? "app-shell--deck" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClass}>
      {!PRESENT_MODE && (
        <Sidebar
          namespaces={namespaces}
          selectedNs={selectedNs}
          onSelect={handleSelectNs}
        />
      )}

      <main className="app-main">
        <div className="view-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "timeline" ? "true" : "false"}
            className={`view-tab${activeView === "timeline" ? " view-tab--active" : ""}`}
            onClick={() => setActiveView("timeline")}
          >
            Timeline
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "coordination" ? "true" : "false"}
            className={`view-tab${activeView === "coordination" ? " view-tab--active" : ""}`}
            onClick={() => setActiveView("coordination")}
          >
            Coordination
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === "deck" ? "true" : "false"}
            className={`view-tab${activeView === "deck" ? " view-tab--active" : ""}`}
            onClick={() => setActiveView("deck")}
          >
            Deck
          </button>
        </div>

        {activeView === "timeline" && (
          <TimelinePane
            namespace={selectedNs}
            selectedId={selectedId}
            onSelect={setSelectedId}
            presentMode={PRESENT_MODE}
          />
        )}
        {activeView === "coordination" && (
          <CoordinationPane
            namespace={selectedNs}
            onNavigate={handleNavigateToEntry}
          />
        )}
        {activeView === "deck" && <DeckSlides />}
      </main>

      {activeView !== "deck" && (
        <aside className="app-detail">
          <DetailPane
            namespace={selectedNs}
            entryId={selectedId}
            onNavigate={handleNavigateToEntry}
          />
        </aside>
      )}
    </div>
  );
}
