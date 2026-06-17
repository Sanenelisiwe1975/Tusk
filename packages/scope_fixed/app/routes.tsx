import { RouteObject } from "react-router-dom";
import { Dashboard } from "../pages/Dashboard";
import { MemoryTimeline } from "../pages/MemoryTimeline";
import { MemoryReplay } from "../pages/MemoryReplay";
import { MemoryGraph } from "../pages/MemoryGraph";
import { Tasks } from "../pages/Tasks";
import { Agents } from "../pages/Agents";
import { EntryDetails } from "../pages/EntryDetails";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <Dashboard />
  },
  {
    path: "/timeline",
    element: <MemoryTimeline />
  },
  {
    path: "/replay",
    element: <MemoryReplay />
  },
  {
    path: "/graph",
    element: <MemoryGraph />
  },
  {
    path: "/tasks",
    element: <Tasks />
  },
  {
    path: "/agents",
    element: <Agents />
  },
  {
    path: "/entry/:id",
    element: <EntryDetails />
  }
];