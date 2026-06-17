export interface AgentStats {
  agentId: string;
  memoryCount: number;
  taskCount: number;
}

export interface TimelineItem {
  id: string;
  timestamp: number;
}