import { useEntries } from "../hooks/useEntries";
import { useTasks } from "../hooks/useTasks";

export function Dashboard() {
    const { data: entries = [] } = useEntries();
    const { data: tasks = [] } = useTasks();

    return (
      <div>
        <h1>MemoryScope</h1>

        <div>
          <h2>Entries</h2>
          <p>{entries.length}</p>

          <h2>Tasks</h2>
          <p>{tasks.length}</p>
        </div>
    </div>
  );
    
}