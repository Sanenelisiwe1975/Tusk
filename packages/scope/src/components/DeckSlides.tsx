import { useEffect, useState } from "react";

interface Slide {
  number: string;
  title: string;
  subtitle: string;
  body: React.ReactNode;
}

const SLIDES: Slide[] = [
  {
    number: "01",
    title: "The Problem",
    subtitle: "AI agents are stateless and fragmented",
    body: (
      <ul className="deck-bullets">
        <li>Each agent runs in isolation — no shared context or memory</li>
        <li>Outputs are ephemeral: once the process exits, provenance is lost</li>
        <li>No way to audit what an agent actually wrote, or verify it didn't change</li>
        <li>Multi-agent systems can't compose — every agent starts from scratch</li>
      </ul>
    ),
  },
  {
    number: "02",
    title: "Tusk",
    subtitle: "A shared, verifiable memory bus for multi-agent systems",
    body: (
      <ul className="deck-bullets">
        <li>
          <span className="deck-hl">Write once:</span> every memory entry is a
          content-addressed JSON blob on Walrus
        </li>
        <li>
          <span className="deck-hl">Anchor forever:</span> the content hash is recorded on
          Sui — immutable, on-chain provenance
        </li>
        <li>
          <span className="deck-hl">Verify anywhere:</span> any agent or tool can re-fetch
          the blob and confirm the hash matches
        </li>
        <li>
          <span className="deck-hl">Compose naturally:</span> agents cite prior results via{" "}
          <code>parentId</code> — a verifiable citation graph
        </li>
      </ul>
    ),
  },
  {
    number: "03",
    title: "Architecture",
    subtitle: "Manager + Specialists sharing one memory store",
    body: (
      <pre className="deck-diagram">{`  Manager
  │  writes goal, decomposes into 3 tasks
  │
  ├──► Researcher  ──► result (blobId + hash on Sui)
  ├──► Analyst     ──► result (blobId + hash on Sui)
  └──► Writer      ──► result (blobId + hash on Sui)

          WalrusStore  ◄── content-addressed blob storage
               │
          Sui on-chain ◄── EntryAnchored event per write
               │
          MemoryScope  ◄── this live visual debugger`}</pre>
    ),
  },
  {
    number: "04",
    title: "The Demo",
    subtitle: "Four beats — live on Sui testnet",
    body: (
      <ol className="deck-beats">
        <li>
          <span className="deck-beat-num">1</span>
          <span>
            Kick off: Manager writes goal → Researcher, Analyst, Writer each claim a task
          </span>
        </li>
        <li>
          <span className="deck-beat-num">2</span>
          <span>
            Timeline grows live as each specialist writes its result entry in real time
          </span>
        </li>
        <li>
          <span className="deck-beat-num">3</span>
          <span>
            Open any result →{" "}
            <span className="deck-hl-green">green VERIFIED badge</span> proves the local
            hash matches the Sui on-chain anchor
          </span>
        </li>
        <li>
          <span className="deck-beat-num">4</span>
          <span>
            Coordination board: which agents did what, full task lifecycle, result links
          </span>
        </li>
      </ol>
    ),
  },
  {
    number: "05",
    title: "Why Walrus?",
    subtitle: "Durable, portable, and verifiable storage for agent memory",
    body: (
      <ul className="deck-bullets">
        <li>
          <span className="deck-hl">Durable:</span> blobs outlive the agent process — any
          future tool can re-read them years later
        </li>
        <li>
          <span className="deck-hl">Portable:</span> a <code>blobId</code> is a universal
          pointer — share it, fetch it from any aggregator
        </li>
        <li>
          <span className="deck-hl">Verifiable:</span> Sui anchors the hash on-chain —
          content is provably unmodified
        </li>
        <li>
          <span className="deck-hl">Composable:</span> agents build on each other's results
          via <code>parentId</code>; the citation graph lives on-chain
        </li>
      </ul>
    ),
  },
];

export function DeckSlides() {
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        setSlide((s) => Math.min(s + 1, SLIDES.length - 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        setSlide((s) => Math.max(s - 1, 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = SLIDES[slide]!;

  return (
    <div className="deck">
      <div className="deck-slide">
        <div className="deck-slide-num">
          {current.number} / {String(SLIDES.length).padStart(2, "0")}
        </div>
        <div className="deck-slide-title">{current.title}</div>
        <div className="deck-slide-subtitle">{current.subtitle}</div>
        <div className="deck-slide-body">{current.body}</div>
      </div>

      <nav className="deck-nav">
        <button
          type="button"
          className="deck-nav-btn"
          onClick={() => setSlide((s) => Math.max(s - 1, 0))}
          disabled={slide === 0}
          aria-label="Previous slide"
        >
          ←
        </button>

        <div className="deck-nav-pips" role="tablist" aria-label="Slide navigation">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === slide ? "true" : "false"}
              aria-label={`Slide ${i + 1}`}
              className={`deck-nav-pip${i === slide ? " deck-nav-pip--active" : ""}`}
              onClick={() => setSlide(i)}
            />
          ))}
        </div>

        <button
          type="button"
          className="deck-nav-btn"
          onClick={() => setSlide((s) => Math.min(s + 1, SLIDES.length - 1))}
          disabled={slide === SLIDES.length - 1}
          aria-label="Next slide"
        >
          →
        </button>
      </nav>
    </div>
  );
}
