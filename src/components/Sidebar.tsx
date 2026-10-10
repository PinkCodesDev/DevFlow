type NavItem = {
  label: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard" },
  { label: "Tasks" },
  { label: "Focus Timer" },
  { label: "Learning" },
  { label: "Applications" },
  { label: "Goals" },
  { label: "Analytics" },
  { label: "Calendar" },
  { label: "Settings" },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <h2>DevFlow</h2>

      <nav>
        {navItems.map((item) => (
          <button key={item.label}>
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;