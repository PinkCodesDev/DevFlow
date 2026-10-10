const goals = [
  {
    title: "Complete 3 tasks",
    current: 3,
    target: 3,
  },
  {
    title: "Focus for 2+ hours",
    current: 105,
    target: 120,
  },
  {
    title: "Apply to 2 jobs",
    current: 1,
    target: 2,
  },
  {
    title: "Code for 3 hours",
    current: 120,
    target: 180,
  },
];

function DailyGoals() {
  return (
    <section className="dashboard-card goals-card">
      <div className="card-header">
        <h2>Daily Goals</h2>
        <button className="text-button">View All</button>
      </div>

      <div className="goal-list">
        {goals.map((goal) => {
          const percentage = Math.min(
            100,
            Math.round((goal.current / goal.target) * 100)
          );

          return (
            <div className="goal-item" key={goal.title}>
              <div className="goal-info">
                <span>{goal.title}</span>
                <strong>{percentage}%</strong>
              </div>

              <div className="progress-track">
                <div
                  className="progress-bar"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default DailyGoals;