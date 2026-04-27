type PageView = "dashboard" | "analysis";

type SidebarProps = {
  activePage: PageView;
  onNavigate: (page: PageView) => void;
};

function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>Trackr</h1>
        <p>TICKET SYSTEM</p>
      </div>

      <div className="sidebar-section">
        <p className="sidebar-heading">OVERVIEW</p>
        <button
          type="button"
          className={`sidebar-item ${activePage === "dashboard" ? "active" : ""}`}
          onClick={() => onNavigate("dashboard")}
        >
          Dashboard
        </button>
      </div>

      <button
        type="button"
        className={`sidebar-item ${activePage === "analysis" ? "active" : ""}`}
        onClick={() => onNavigate("analysis")}
      >
        Analysis
      </button>
    </aside>
  );
}

export default Sidebar;
