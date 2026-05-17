type TopbarProps = {
  title: string;
};

function Topbar({ title }: TopbarProps) {
  return (
    <header className="topbar">
      <h2>Trackr Ticket System</h2>
      <span className="topbar-page">{title}</span>
    </header>
  );
}

export default Topbar;
