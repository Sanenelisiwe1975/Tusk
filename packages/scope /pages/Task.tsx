import { useTasks } from "../hooks/useTasks";

export function Tasks() {
  const { data = [] } = useTasks();

  return (
    <div>
      <h1>Tasks</h1>

      {data.map((task) => (
        <div key={task.id}>
          <h3>{task.description}</h3>
          <p>{task.status}</p>
        </div>
      ))}
    </div>
  );
}