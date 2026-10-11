import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import Sidebar from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import TasksPage from "./pages/TasksPage";
import FocusTimer from "./pages/FocusTimer";
import ProjectsPage from "./pages/ProjectsPage";
import ApplicationsPage from "./pages/ApplicationsPage";
import GoalsPage from "./pages/GoalsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import PreferencesAppearance from "./components/PreferencesAppearance";

import MobileNavigation from "./components/MobileNavigation";
import "./Responsive.css";

export default function App() {
  return <div className="app"><PreferencesAppearance /><Sidebar /><MobileNavigation /><main id="main-content" className="main-content" tabIndex={-1}><Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/tasks" element={<TasksPage />} />
    <Route path="/focus" element={<FocusTimer compact={false} />} />
    <Route path="/projects" element={<ProjectsPage />} />
    <Route path="/learning" element={<Navigate to="/projects" replace />} />
    <Route path="/applications" element={<ApplicationsPage />} />
    <Route path="/goals" element={<GoalsPage />} />
    <Route path="/analytics" element={<AnalyticsPage />} />
    <Route path="/calendar" element={<CalendarPage />} />
    <Route path="/settings" element={<SettingsPage />} />
  </Routes></main></div>;
}


