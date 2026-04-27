import { TicketStats } from "../types/Ticket.js";

type AnalysisCardsProps = {
  stats: TicketStats;
};

function AnalysisCards({ stats }: AnalysisCardsProps) {
  return (
    <div className="analysis-cards">
      <div className="stat-card">
        <h3>Total Tickets</h3>
        <p>{stats.total}</p>
      </div>

      <div className="stat-card">
        <h3>Open Tickets</h3>
        <p>{stats.open}</p>
      </div>

      <div className="stat-card">
        <h3>Closed Tickets</h3>
        <p>{stats.closed}</p>
      </div>

      <div className="stat-card stat-card-telegram">
        <h3>Telegram</h3>
        <p>{stats.telegramTickets}</p>
      </div>

      <div className="stat-card stat-card-discord">
        <h3>Discord</h3>
        <p>{stats.discordTickets}</p>
      </div>

      <div className="stat-card stat-card-slack">
        <h3>Slack</h3>
        <p>{stats.slackTickets}</p>
      </div>
    </div>
  );
}

export default AnalysisCards;
