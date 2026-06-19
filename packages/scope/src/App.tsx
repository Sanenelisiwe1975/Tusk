import { useEffect, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { TimelinePane } from "./components/TimelinePane";
import { DetailPane } from "./components/DetailPane";
import { CoordinationPane } from "./components/CoordinationPane";
import { DiffPane } from "./components/DiffPane";
import { DeckSlides } from "./components/DeckSlides";
import { ReplayBar } from "./components/ReplayBar";
import { useNamespaces } from "./hooks/useNamespaces";

type View = "timeline" | "coordination" | "diff" | "deck";

// Views that need the full main+detail width — no per-entry detail to show.
const FULL_WIDTH_VIEWS: ReadonlySet<View> = new Set(["diff", "deck"]);

const PRESENT_MODE =
  (import.meta.env["VITE_TUSK_PRESENT"] as string | undefined) === "1";

export function App() {
  const [selectedNs, setSelectedNs] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<View>("timeline");
  const [checkpoint, setCheckpoint] = useState<number | null>(null);
  const { data: namespaces = [] } = useNamespaces();

  useEffect(() => {
    if (selectedNs === null && namespaces.length > 0) {
      setSelectedNs(namespaces[0]!.namespace);
    }
  }, [namespaces, selectedNs]);

  function handleSelectNs(ns: string) {
    setSelectedNs(ns);
    setSelectedId(null);
    setCheckpoint(null);
  }

  function handleNavigateToEntry(id: string) {
    setSelectedId(id);
    setActiveView("timeline");
  }

  const isFullWidth = FULL_WIDTH_VIEWS.has(activeView);
  const showReplayBar = activeView === "timeline" || activeView === "coordination";

  const shellClass = [
    "app-shell",
    PRESENT_MODE ? "app-shell--present" : "",
    isFullWidth ? "app-shell--full" : "",
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
            aria-selected={activeView === "diff" ? "true" : "false"}
            className={`view-tab${activeView === "diff" ? " view-tab--active" : ""}`}
            onClick={() => setActiveView("diff")}
          >
            Diff
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

        {showReplayBar && (
          <ReplayBar namespace={selectedNs} checkpoint={checkpoint} onChange={setCheckpoint} />
        )}

        {activeView === "timeline" && (
          <TimelinePane
            namespace={selectedNs}
            selectedId={selectedId}
            onSelect={setSelectedId}
            presentMode={PRESENT_MODE}
            checkpoint={checkpoint}
          />
        )}
        {activeView === "coordination" && (
          <CoordinationPane
            namespace={selectedNs}
            onNavigate={handleNavigateToEntry}
            checkpoint={checkpoint}
          />
        )}
        {activeView === "diff" && <DiffPane namespace={selectedNs} />}
        {activeView === "deck" && <DeckSlides />}
      </main>

      {!isFullWidth && (
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
