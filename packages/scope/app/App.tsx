import { useRoutes, Link } from "react-router-dom";
import { routes } from "./routes";

export function App() {
  const content = useRoutes(routes);

  return (
    <div>
      <nav>
        <Link to="/">Dashboard</Link>
        <Link to="/timeline">Timeline</Link>
        <Link to="/graph">Graph</Link>
        <Link to="/replay">Replay</Link>
        <Link to="/tasks">Tasks</Link>
        <Link to="/agents">Agents</Link>
      </nav>

      {content}
    </div>
  );
}