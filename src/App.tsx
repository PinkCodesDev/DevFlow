import { useState } from "react";

import "./App.css";

import Sidebar from "./components/Sidebar";
import { StatCardList } from "./components/StatCard";

import TaskList, {
  type Task,
} from "./components/TaskList";

import FocusTimer from "./components/FocusTimer";
import DailyGoals from "./components/DailyGoals";
import WeeklyFocus from "./components/WeeklyFocus";
import UpcomingTasks from "./components/UpcomingTasks";

const initialTasks: Task[] = [
  {
    id: 1,
    title: "Learn React props",
    category: "Learning",
    completed: true,
    time: "9:00 AM",
  },
  {
    id: 2,
    title: "Build DevFlow dashboard",
    category: "Project",
    completed: false,
    time: "11:00 AM",
  },
  {
    id: 3,
    title: "Practice TypeScript",
    category: "Learning",
    completed: false,
    time: "2:00 PM",
  },
  {
    id: 4,
    title: "Update GitHub",
    category: "Career",
    completed: false,
    time: "6:00 PM",
  },
];

function App() {
  const [tasks, setTasks] =
    useState<Task[]>(initialTasks);

  function toggleTask(id: number) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
            }
          : task
      )
    );
  }

  const completedTasks =
    tasks.filter((task) => task.completed).length;

  const stats = [
    {
      title: "Tasks Completed",
      value: String(completedTasks),
      description: `${tasks.length} tasks today`,
    },
    {
      title: "Focus Time",
      value: "2h 45m",
      description: "+25m from yesterday",
    },
    {
      title: "Current Streak",
      value: "7 days",
      description: "Keep it up!",
    },
    {
      title: "Daily Goal",
      value: "80%",
      description: "Almost there!",
    },
  ];

  return (
    <div className="app">
      <Sidebar />

      <main className="main-content">
        <header className="dashboard-header">
          <div>
            <h1>Good morning, Alan 👋</h1>
            <p>Let's make today productive.</p>
          </div>

          <span className="dashboard-date">
            October 10, 2026
          </span>
        </header>

        <div className="stat-cards">
          <StatCardList stats={stats} />
        </div>

        <div className="dashboard-grid">
          <TaskList
            tasks={tasks}
            onToggle={toggleTask}
          />

          <FocusTimer />

          <DailyGoals />

          <section className="dashboard-card productivity-card">
            <div className="card-header">
              <h2>Productivity Overview</h2>
              <span>This Week</span>
            </div>

            <div className="fake-chart">
              <svg
                viewBox="0 0 500 180"
                preserveAspectRatio="none"
              >
                <polyline
                  points="
                    0,130
                    70,60
                    140,120
                    210,130
                    280,145
                    350,100
                    420,60
                    500,35
                  "
                />
              </svg>
            </div>
          </section>

          <UpcomingTasks />

          <WeeklyFocus />
        </div>
      </main>
    </div>
  );
}

export default App;