function AllTickets() {
  return (
    <div className="all-tickets-page">
      <h1 className="analysis-title">All Tickets</h1>

      <div className="tickets-grid">
        <div className="ticket-card">
          <h3>TCK-1001</h3>
          <p>
            <strong>User:</strong> Alice
          </p>
          <p>
            <strong>User ID:</strong> U001
          </p>
          <p>
            <strong>Time:</strong> 09:15 AM
          </p>
          <span className="status-badge open">Open</span>
        </div>

        <div className="ticket-card">
          <h3>TCK-1002</h3>
          <p>
            <strong>User:</strong> Bob
          </p>
          <p>
            <strong>User ID:</strong> U002
          </p>
          <p>
            <strong>Time:</strong> 10:27 AM
          </p>
          <span className="status-badge pending">Pending</span>
        </div>

        <div className="ticket-card">
          <h3>TCK-1003</h3>
          <p>
            <strong>User:</strong> Clara
          </p>
          <p>
            <strong>User ID:</strong> U003
          </p>
          <p>
            <strong>Time:</strong> 11:42 AM
          </p>
          <span className="status-badge resolved">Resolved</span>
        </div>
      </div>
    </div>
  );
}

export default AllTickets;
