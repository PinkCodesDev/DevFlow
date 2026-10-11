import { useEffect, useRef } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import AppIcon from "./AppIcon";
import { navItems } from "./navigation";

export default function MobileNavigation() {
  const dialog = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();
  const current = navItems.find((item) => item.path === pathname)?.label ?? "DevFlow";
  const quickLinks = navItems.filter((item) => ["/", "/tasks", "/focus", "/calendar"].includes(item.path));
  function closeMenu() { dialog.current?.close(); }
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const closeOnDesktop = () => { if (!query.matches) dialog.current?.close(); };
    query.addEventListener("change", closeOnDesktop);
    return () => query.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    dialog.current?.close();
    if (window.matchMedia("(max-width: 900px)").matches) {
      window.scrollTo(0, 0);
      const main = document.querySelector<HTMLElement>("#main-content");
      main?.scrollTo(0, 0);
      main?.focus({ preventScroll: true });
    }
  }, [pathname]);
  return <>
    <header className="mobile-header">
      <Link to="/" className="mobile-brand" aria-label="DevFlow — Dashboard"><img src={`${import.meta.env.BASE_URL}branding/devflow-logo.png`} alt="DevFlow" width="2172" height="724" /></Link>
      <button type="button" className="mobile-menu-button" aria-haspopup="dialog" aria-controls="mobile-menu" onClick={() => dialog.current?.showModal()}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg><span>Menu</span></button>
    </header>
    <nav className="mobile-bottom-nav" aria-label="Quick navigation">{quickLinks.map((item) => <NavLink key={item.path} to={item.path} end={item.path === "/"} className={({ isActive }) => isActive ? "mobile-quick-link active" : "mobile-quick-link"}><AppIcon name={item.icon} /><span>{item.path === "/focus" ? "Focus" : item.label}</span></NavLink>)}</nav>
    <dialog id="mobile-menu" className="mobile-menu-dialog" ref={dialog} aria-labelledby="mobile-menu-title" onClick={(event) => { if (event.target === event.currentTarget) closeMenu(); }}>
      <div className="mobile-menu-content">
        <div className="mobile-menu-heading"><div><h2 id="mobile-menu-title">Your workspace</h2><p>Currently in {current}</p></div><button type="button" className="mobile-menu-button" aria-label="Close menu" onClick={closeMenu}>×</button></div>
        <nav aria-label="All pages">{navItems.map((item) => <NavLink key={item.path} to={item.path} end={item.path === "/"} onClick={closeMenu} className={({ isActive }) => isActive ? "mobile-page-link active" : "mobile-page-link"}><AppIcon name={item.icon} /><span>{item.label}</span></NavLink>)}</nav>
        <p className="mobile-menu-note">Small steps every day lead to big results.</p>
      </div>
    </dialog>
  </>;
}
