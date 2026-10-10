const weeklyData = [
  { day: "Mon", hours: 2.8 },
  { day: "Tue", hours: 3.8 },
  { day: "Wed", hours: 3.0 },
  { day: "Thu", hours: 3.6 },
  { day: "Fri", hours: 2.8 },
  { day: "Sat", hours: 3.1 },
  { day: "Sun", hours: 1.9 },
];

function WeeklyFocus() {
  return (
    <section className="dashboard-card weekly-focus">
      <div className="card-header">
        <div>
          <h2>Weekly Focus</h2>
          <strong>21h 00m</strong>
          <p>Total focus time</p>
        </div>
      </div>

      <div className="bar-chart">
        {weeklyData.map((item) => (
          <div className="bar-column" key={item.day}>
            <div
              className="bar"
              style={{
                height: `${item.hours * 28}px`,
              }}
            />

            <span>{item.day}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default WeeklyFocus;