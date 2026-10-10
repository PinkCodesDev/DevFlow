export type Task = {
  id: number;
  title: string;
  category: string;
  completed: boolean;
  time: string;
};

type TaskListProps = {
  tasks: Task[];
  onToggle: (id: number) => void;
};

function TaskList({ tasks, onToggle }: TaskListProps) {
  return (
    <section className="dashboard-card task-list">
      <div className="card-header">
        <h2>Today's Tasks</h2>
        <button className="text-button">View All</button>
      </div>

      <div className="task-items">
        {tasks.map((task) => (
          <label className="task-item" key={task.id}>
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => onToggle(task.id)}
            />

            <span
              className={
                task.completed ? "task-title completed" : "task-title"
              }
            >
              {task.title}
            </span>

            <span className="task-category">{task.category}</span>
            <span className="task-time">{task.time}</span>
          </label>
        ))}
      </div>

      <button className="add-task-button">+ Add new task</button>
    </section>
  );
}

export default TaskList;