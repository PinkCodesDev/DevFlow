import { Link, NavLink } from "react-router-dom";
import AppIcon from "./AppIcon";
import { navItems } from "./navigation";
import "./Sidebar.css";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <Link className="sidebar-brand" to="/" aria-label="DevFlow — Dashboard">
        <img src={`${import.meta.env.BASE_URL}branding/devflow-logo.png`} alt="DevFlow" width="2172" height="724" />
      </Link>
      <nav aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink key={item.path} to={item.path} end={item.path === "/"}
            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>
            <AppIcon name={item.icon} /><span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-encouragement">
        <AppIcon name="sparkles" />
        <p><strong>You've got this!</strong>Small steps every day lead to big results.</p>
      </div>
    </aside>
  );
}

