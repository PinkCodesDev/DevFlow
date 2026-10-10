import { useEffect, useState } from "react";

function FocusTimer() {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setSecondsLeft((seconds) => {
        if (seconds <= 1) {
          setRunning(false);
          return 25 * 60;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [running]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <section className="dashboard-card focus-card">
      <div className="card-header">
        <h2>Focus Timer</h2>
      </div>

      <div className="timer-circle">
        <span className="timer-label">Pomodoro</span>

        <strong>
          {String(minutes).padStart(2, "0")}:
          {String(seconds).padStart(2, "0")}
        </strong>
      </div>

      <button
        className="primary-button"
        onClick={() => setRunning((current) => !current)}
      >
        {running ? "Pause" : "Start"}
      </button>
    </section>
  );
}

export default FocusTimer;