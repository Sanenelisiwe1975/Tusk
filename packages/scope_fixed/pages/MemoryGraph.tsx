import ReactFlow from "reactflow";
import "reactflow/dist/style.css";
import { useMemoryGraph } from "../hooks/useMemoryGraph";

export function MemoryGraph() {
  const { nodes, edges } = useMemoryGraph();

  return (
    <div style={{ height: 700 }}>
      <ReactFlow nodes={nodes} edges={edges} fitView />
    </div>
  );
}