import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Ticket, TicketStats } from "../types/Ticket.js";

type TicketChartProps = {
  stats: TicketStats;
  tickets?: Ticket[];
};

const STATUS_COLORS = ["#6c63ff", "#f59e0b", "#38bdf8", "#22c55e"];
const CHANNEL_COLORS = ["#38bdf8", "#8e86ff", "#c084fc"];
const URGENCY_COLORS = ["#f87171", "#ffcc4d", "#4ade80"];

const tooltipStyle = {
  backgroundColor: "#0a1326",
  border: "1px solid #1f3357",
  borderRadius: "12px",
  color: "#ffffff",
};

function TicketChart({ stats }: TicketChartProps) {
  const statusData = [
    { name: "Open", value: stats.open },
    { name: "In Progress", value: stats.processing },
    { name: "Closed", value: stats.closed },
  ];

  const channelData = [
    { name: "Telegram", value: stats.telegramTickets },
    { name: "Discord", value: stats.discordTickets },
    { name: "Slack", value: stats.slackTickets },
  ];

  const urgencyData = [
    { name: "High", value: stats.highUrgency },
    { name: "Medium", value: stats.mediumUrgency },
    { name: "Low", value: stats.lowUrgency },
  ];

  return (
    <div className="charts-grid">
      <div className="chart-section">
        <h2 className="chart-title">Ticket Overview</h2>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={55}
                paddingAngle={4}
              >
                {statusData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-section">
        <h2 className="chart-title">Tickets by Channel</h2>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Pie
                data={channelData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={55}
                paddingAngle={4}
              >
                {channelData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={CHANNEL_COLORS[index % CHANNEL_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-section">
        <h2 className="chart-title">Tickets by Urgency</h2>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Pie
                data={urgencyData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={110}
                innerRadius={55}
                paddingAngle={4}
              >
                {urgencyData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={URGENCY_COLORS[index % URGENCY_COLORS.length]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default TicketChart;
