import { FormEvent, useEffect, useState } from "react";
import "./App.css";
import Sidebar from "./assets/components/Sidebar.js";
import Topbar from "./assets/components/Topbar.js";
import RecentTickets from "./assets/components/RecentTickets.js";
import AnalysisCards from "./assets/components/AnalysisCards.js";
import TicketChart from "./assets/components/TicketChart.js";
import { Ticket, TicketStats } from "./assets/types/Ticket.js";
import { api } from "./api.js";

const emptyStats: TicketStats = {
  total: 0,
  open: 0,
  closed: 0,
  assigned: 0,
  processing: 0,
  completed: 0,
  resolvedToday: 0,
  resolvedThisWeek: 0,
  telegramTickets: 0,
  discordTickets: 0,
  slackTickets: 0,
  highUrgency: 0,
  mediumUrgency: 0,
  lowUrgency: 0,
};

const getTimeBucket = (time: string) => {
  const [timePart = "", period = ""] = time.split(" ");
  const [hourValue = "0"] = timePart.split(":");
  const hour = Number.parseInt(hourValue, 10);

  if (period === "AM") {
    return "Morning";
  }

  if (hour < 6) {
    return "Afternoon";
  }

  return "Evening";
};

const toTitleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

type PageView = "dashboard" | "analysis";

function App() {
  const [activePage, setActivePage] = useState<PageView>("dashboard");
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [searchTicketId, setSearchTicketId] = useState("");
  const [searchResults, setSearchResults] = useState<Ticket[]>([]);
  const [openedTicket, setOpenedTicket] = useState<Ticket | null>(null);
  const [updateTicketId, setUpdateTicketId] = useState("");
  const [updatedStatus, setUpdatedStatus] = useState("assigned");
  const [updateMessage, setUpdateMessage] = useState("");
  const [deleteTicketId, setDeleteTicketId] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [timeDayFilter, setTimeDayFilter] = useState("All");
  const [channelFilter, setChannelFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<TicketStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  // State for the ticket detail modal (opened from Recent Tickets table)
  const [isTicketDetailModalOpen, setIsTicketDetailModalOpen] = useState(false);
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);

  const filteredTickets = tickets.filter((ticket) => {
    const normalizedStatus = api.getDisplayStatus(ticket.status);
    const matchesStatus =
      statusFilter === "All" || normalizedStatus === statusFilter;
    const matchesTimeDay =
      timeDayFilter === "All" ||
      ticket.day === timeDayFilter ||
      getTimeBucket(ticket.time) === timeDayFilter;
    const matchesChannel =
      channelFilter === "All" ||
      (ticket.channel ?? "").toLowerCase() === channelFilter.toLowerCase();
    const matchesUrgency =
      urgencyFilter === "All" ||
      (ticket.urgency ?? "").toLowerCase() === urgencyFilter.toLowerCase();

    return matchesStatus && matchesTimeDay && matchesChannel && matchesUrgency;
  });

  const refreshStats = async (currentTickets: Ticket[]) => {
    const nextStats = await api.getStats(currentTickets);
    setStats(nextStats);
  };

  const loadTickets = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const fetchedTickets = await api.getTickets();
      setTickets(fetchedTickets);
      await refreshStats(fetchedTickets);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load tickets."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);


  const closeFindModal = () => {
    setIsFindModalOpen(false);
    setSearchTicketId("");
    setSearchResults([]);
    setOpenedTicket(null);
  };

  const closeUpdateModal = () => {
    setIsUpdateModalOpen(false);
    setUpdateTicketId("");
    setUpdatedStatus("assigned");
    setUpdateMessage("");
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteTicketId("");
    setDeleteMessage("");
  };

  const closeFilterModal = () => {
    setIsFilterModalOpen(false);
  };

  const closeTicketDetailModal = () => {
    setIsTicketDetailModalOpen(false);
    setDetailTicket(null);
  };



  const handleFindTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedQuery = searchTicketId.trim().toLowerCase();

    if (!normalizedQuery) {
      setSearchResults([]);
      setOpenedTicket(null);
      return;
    }

    const matchedTickets = tickets.filter((ticket) =>
      ticket.id.toLowerCase().includes(normalizedQuery)
    );

    setSearchResults(matchedTickets);
    setOpenedTicket(null);

    // If exact match, auto-fetch full details
    if (matchedTickets.length === 1) {
      try {
        const detailedTicket = await api.getTicket(matchedTickets[0].id);
        setOpenedTicket(detailedTicket);
      } catch {
        // keep search results visible even if detail fetch fails
      }
    }
  };

  const handleOpenTicket = async (ticketId: string) => {
    setErrorMessage("");

    try {
      const detailedTicket = await api.getTicket(ticketId);
      setOpenedTicket(detailedTicket);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to open ticket."
      );
    }
  };

  const handleTicketRowClick = async (ticketId: string) => {
    setErrorMessage("");
    setDetailTicket(null);
    setIsTicketDetailModalOpen(true);

    try {
      const detailedTicket = await api.getTicket(ticketId);
      setDetailTicket(detailedTicket);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to load ticket details."
      );
      setIsTicketDetailModalOpen(false);
    }
  };

  const handleUpdateTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedId = updateTicketId.trim();

    if (!normalizedId) {
      return;
    }

    const ticketToUpdate = tickets.find(
      (ticket) => ticket.id === normalizedId
    );

    if (!ticketToUpdate) {
      setUpdateMessage(
        `No ticket found with ID "${normalizedId}".`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const updatedTicket = await api.updateTicketStatus(ticketToUpdate.id, updatedStatus);
      const nextTickets = tickets.map((ticket) =>
        ticket.id === updatedTicket.id ? updatedTicket : ticket
      );
      setTickets(nextTickets);
      await refreshStats(nextTickets);
      setUpdateMessage(
        `Updated status for ticket #${ticketToUpdate.id} to "${updatedStatus}".`
      );
      setUpdateTicketId("");
      setUpdatedStatus("assigned");
    } catch (error) {
      setUpdateMessage(
        error instanceof Error ? error.message : "Failed to update ticket."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedId = deleteTicketId.trim();

    if (!normalizedId) {
      return;
    }

    const ticketToDelete = tickets.find(
      (ticket) => ticket.id === normalizedId
    );

    if (!ticketToDelete) {
      setDeleteMessage(
        `No ticket found with ID "${normalizedId}".`
      );
      return;
    }

    if (String(ticketToDelete.status).toLowerCase() !== "closed") {
      setDeleteMessage("Backend only allows deleting tickets whose status is closed.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await api.deleteClosedTicket(ticketToDelete.id);
      const nextTickets = tickets.filter((ticket) => ticket.id !== ticketToDelete.id);
      setTickets(nextTickets);
      await refreshStats(nextTickets);
      setDeleteMessage(`Deleted ticket #${ticketToDelete.id}.`);
      setDeleteTicketId("");
    } catch (error) {
      setDeleteMessage(
        error instanceof Error ? error.message : "Failed to delete ticket."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyFilter = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsFilterModalOpen(false);
  };

  const clearFilters = () => {
    setStatusFilter("All");
    setTimeDayFilter("All");
    setChannelFilter("All");
    setUrgencyFilter("All");
  };

  const renderTicketFullDetail = (ticket: Ticket) => (
    <div className="ticket-detail-full">
      <div className="ticket-detail-grid">
        <div>
          <strong>Ticket ID:</strong> {ticket.id}
        </div>
        <div>
          <strong>User ID:</strong> {ticket.userId ?? "N/A"}
        </div>
        <div>
          <strong>Username:</strong> {ticket.username ?? "N/A"}
        </div>
        <div>
          <strong>Status:</strong>{" "}
          <span className={`status-badge ${ticket.status.toLowerCase()}`}>
            {api.getDisplayStatus(ticket.status)}
          </span>
        </div>
        <div>
          <strong>Channel:</strong>{" "}
          <span className={`channel-badge ${(ticket.channel ?? "unknown").toLowerCase()}`}>
            {toTitleCase(ticket.channel ?? "Unknown")}
          </span>
        </div>
        <div>
          <strong>Urgency:</strong>{" "}
          <span className={`urgency-badge ${(ticket.urgency ?? "unknown").toLowerCase()}`}>
            {toTitleCase(ticket.urgency ?? "Unknown")}
          </span>
        </div>
        <div>
          <strong>Created:</strong> {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : "N/A"}
        </div>
        <div>
          <strong>Description:</strong> {ticket.description}
        </div>
      </div>

      {ticket.messages && ticket.messages.length > 0 ? (
        <div className="ticket-messages-section">
          <strong>Messages ({ticket.messages.length}):</strong>
          <div className="ticket-messages-list">
            {ticket.messages.map((msg, index) => (
              <div key={index} className="ticket-message-item">
                <span className="message-index">#{index + 1}</span>
                <span className="message-text">{msg}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="ticket-messages-section">
          <strong>Messages:</strong>
          <p className="no-messages">No messages recorded for this ticket.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="main-section">
        <Topbar title={activePage === "dashboard" ? "Dashboard" : "Analysis"} />

        {errorMessage ? (
          <div className="banner-message error-message">{errorMessage}</div>
        ) : null}

        {isLoading ? (
          <main className="dashboard-content">
            <div className="empty-state">Loading tickets from backend...</div>
          </main>
        ) : activePage === "dashboard" ? (
          <main className="dashboard-content">
            <h1 className="welcome-title">Welcome to Trackr</h1>

            <div className="cards-row">
              <div className="action-card">
                <h3>Find Ticket</h3>
                <p>Search loaded backend tickets by ticket ID.</p>
                <button
                  type="button"
                  onClick={() => setIsFindModalOpen(true)}
                >
                  Find
                </button>
              </div>

              <div className="action-card">
                <h3>Update Ticket Status</h3>
                <p>Update a ticket's status using the backend endpoint.</p>
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(true)}
                >
                  Update
                </button>
              </div>

              <div className="action-card">
                <h3>Delete Ticket</h3>
                <p>Delete a closed ticket using the backend delete rule.</p>
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                >
                  Delete
                </button>
              </div>

              <div className="action-card">
                <h3>Filter Ticket</h3>
                <p>Filter tickets by status, time, channel or urgency.</p>
                <button
                  type="button"
                  onClick={() => setIsFilterModalOpen(true)}
                >
                  Filter
                </button>
              </div>
            </div>

            <RecentTickets tickets={filteredTickets} onTicketClick={handleTicketRowClick} />
          </main>
        ) : (
          <main className="analysis-content">
            <h1 className="analysis-title">Ticket Analysis</h1>
            <AnalysisCards stats={stats} />
            <TicketChart stats={stats} tickets={tickets} />
          </main>
        )}
      </div>



      {isFindModalOpen ? (
        <div className="modal-backdrop" onClick={closeFindModal}>
          <div
            className="modal-window modal-window-large"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Find Ticket</h3>
              <button
                type="button"
                className="modal-close"
                onClick={closeFindModal}
                aria-label="Close find ticket modal"
              >
                x
              </button>
            </div>

            <form className="modal-form" onSubmit={handleFindTicket}>
              <label>
                Ticket ID
                <input
                  type="text"
                  placeholder="Search by ticket ID"
                  value={searchTicketId}
                  onChange={(event) => setSearchTicketId(event.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeFindModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={!searchTicketId.trim()}
                >
                  Search
                </button>
              </div>
            </form>

            <div className="search-results">
              {searchTicketId.trim() && searchResults.length === 0 ? (
                <p className="search-empty">No ticket found with that ID.</p>
              ) : null}

              {searchResults.length > 0 && !openedTicket ? (
                <ul className="search-result-list">
                  {searchResults.map((ticket) => (
                    <li key={ticket.id} className="search-result-item">
                      <div className="search-result-row">
                        <div>
                          <strong>Ticket #{ticket.id}</strong>
                          <div>{ticket.description}</div>
                        </div>
                        <button
                          type="button"
                          className="view-button"
                          onClick={() => void handleOpenTicket(ticket.id)}
                        >
                          View Details
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            {openedTicket ? renderTicketFullDetail(openedTicket) : null}
          </div>
        </div>
      ) : null}

      {isUpdateModalOpen ? (
        <div className="modal-backdrop" onClick={closeUpdateModal}>
          <div
            className="modal-window"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Update Ticket Status</h3>
              <button
                type="button"
                className="modal-close"
                onClick={closeUpdateModal}
                aria-label="Close update ticket modal"
              >
                x
              </button>
            </div>

            <form className="modal-form" onSubmit={handleUpdateTicket}>
              <label>
                Ticket ID
                <input
                  type="text"
                  placeholder="Enter ticket ID"
                  value={updateTicketId}
                  onChange={(event) => setUpdateTicketId(event.target.value)}
                />
              </label>

              <label>
                New Status
                <select
                  value={updatedStatus}
                  onChange={(event) =>
                    setUpdatedStatus(event.target.value)
                  }
                >
                  <option value="assigned">Assigned</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="closed">Closed</option>
                </select>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeUpdateModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-button"
                  disabled={
                    isSubmitting ||
                    !updateTicketId.trim()
                  }
                >
                  Update Ticket
                </button>
              </div>
            </form>

            {updateMessage ? (
              <div className="ticket-detail">
                <strong>Update Status:</strong> {updateMessage}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isDeleteModalOpen ? (
        <div className="modal-backdrop" onClick={closeDeleteModal}>
          <div
            className="modal-window"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Delete Ticket</h3>
              <button
                type="button"
                className="modal-close"
                onClick={closeDeleteModal}
                aria-label="Close delete ticket modal"
              >
                x
              </button>
            </div>

            <form className="modal-form" onSubmit={handleDeleteTicket}>
              <label>
                Ticket ID
                <input
                  type="text"
                  placeholder="Enter ticket ID"
                  value={deleteTicketId}
                  onChange={(event) => setDeleteTicketId(event.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeDeleteModal}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="delete-button"
                  disabled={isSubmitting || !deleteTicketId.trim()}
                >
                  Delete Ticket
                </button>
              </div>
            </form>

            {deleteMessage ? (
              <div className="ticket-detail">
                <strong>Delete Status:</strong> {deleteMessage}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {isFilterModalOpen ? (
        <div className="modal-backdrop" onClick={closeFilterModal}>
          <div
            className="modal-window"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Filter Ticket</h3>
              <button
                type="button"
                className="modal-close"
                onClick={closeFilterModal}
                aria-label="Close filter ticket modal"
              >
                x
              </button>
            </div>

            <form className="modal-form" onSubmit={handleApplyFilter}>
              <label>
                Filter By Status
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Processing">Processing</option>
                  <option value="Completed">Completed</option>
                  <option value="Closed">Closed</option>
                </select>
              </label>

              <label>
                Filter By Time / Day
                <select
                  value={timeDayFilter}
                  onChange={(event) => setTimeDayFilter(event.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                </select>
              </label>

              <label>
                Filter By Channel
                <select
                  value={channelFilter}
                  onChange={(event) => setChannelFilter(event.target.value)}
                >
                  <option value="All">All</option>
                  <option value="telegram">Telegram</option>
                  <option value="discord">Discord</option>
                  <option value="slack">Slack</option>
                </select>
              </label>

              <label>
                Filter By Urgency
                <select
                  value={urgencyFilter}
                  onChange={(event) => setUrgencyFilter(event.target.value)}
                >
                  <option value="All">All</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={clearFilters}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeFilterModal}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-button">
                  Apply Filter
                </button>
              </div>
            </form>

            <div className="ticket-detail">
              <strong>Visible Tickets:</strong> {filteredTickets.length}
            </div>
          </div>
        </div>
      ) : null}

      {isTicketDetailModalOpen ? (
        <div className="modal-backdrop" onClick={closeTicketDetailModal}>
          <div
            className="modal-window modal-window-large"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Ticket Details{detailTicket ? ` — #${detailTicket.id}` : ""}</h3>
              <button
                type="button"
                className="modal-close"
                onClick={closeTicketDetailModal}
                aria-label="Close ticket detail modal"
              >
                x
              </button>
            </div>

            {detailTicket ? (
              renderTicketFullDetail(detailTicket)
            ) : (
              <div className="empty-state" style={{ margin: 0 }}>
                Loading ticket details...
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
