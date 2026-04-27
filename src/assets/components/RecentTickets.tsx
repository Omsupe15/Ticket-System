import { Ticket } from "../types/Ticket.js";
import { api } from "../../api.js";

type RecentTicketsProps = {
  tickets: Ticket[];
  onTicketClick?: (ticketId: string) => void;
};

const toTitleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

function RecentTickets({ tickets, onTicketClick }: RecentTicketsProps) {
  return (
    <div className="recent-tickets-section">
      <h2>Recent Tickets</h2>

      <div className="tickets-table-wrapper">
        <table className="tickets-table">
          <thead>
            <tr>
              <th>Ticket ID</th>
              <th>Description</th>
              <th>Channel</th>
              <th>Urgency</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {tickets.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-table-cell">
                  No tickets match the current backend data or filters.
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="clickable-row"
                  onClick={() => onTicketClick?.(ticket.id)}
                  title="Click to view full ticket details"
                >
                  <td>{ticket.id}</td>
                  <td>{ticket.description}</td>
                  <td>
                    <span className={`channel-badge ${(ticket.channel ?? "unknown").toLowerCase()}`}>
                      {toTitleCase(ticket.channel ?? "Unknown")}
                    </span>
                  </td>
                  <td>
                    <span className={`urgency-badge ${(ticket.urgency ?? "unknown").toLowerCase()}`}>
                      {toTitleCase(ticket.urgency ?? "Unknown")}
                    </span>
                  </td>
                  <td>{ticket.time}</td>
                  <td>
                    <span className={`status-badge ${ticket.status.toLowerCase()}`}>
                      {api.getDisplayStatus(ticket.status)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RecentTickets;
