const upcomingTasks = [
  {
    title: "Project meeting",
    category: "Work",
    date: "Tomorrow, 10:00 AM",
  },
  {
    title: "Update portfolio",
    category: "Career",
    date: "Tomorrow, 5:00 PM",
  },
  {
    title: "Study algorithms",
    category: "Learning",
    date: "Saturday, 9:00 AM",
  },
];

function UpcomingTasks() {
  return (
    <section className="dashboard-card upcoming-card">
      <div className="card-header">
        <h2>Upcoming Tasks</h2>
      </div>

      {upcomingTasks.map((task) => (
        <div className="upcoming-task" key={task.title}>
          <div className="task-dot" />

          <div>
            <strong>{task.title}</strong>
            <p>
              {task.date} · {task.category}
            </p>
          </div>
        </div>
      ))}

      <button className="text-button">View calendar</button>
    </section>
  );
}

export default UpcomingTasks;