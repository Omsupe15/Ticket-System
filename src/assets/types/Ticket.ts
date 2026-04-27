export type TicketStatus =
  | "assigned"
  | "processing"
  | "completed"
  | "closed"
  | "open"
  | "pending"
  | "resolved";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus | string;
  time: string;
  day: string;
  createdAt?: string;
  updatedAt?: string;
  closedAt?: string;
  channel?: string;
  urgency?: string;
  username?: string;
  userId?: string;
  messages?: string[];
  category?: string;
  priority?: string;
  assignedAgent?: string;
};

export type TicketStats = {
  total: number;
  open: number;
  closed: number;
  assigned: number;
  processing: number;
  completed: number;
  resolvedToday: number;
  resolvedThisWeek: number;
  telegramTickets: number;
  discordTickets: number;
  slackTickets: number;
  highUrgency: number;
  mediumUrgency: number;
  lowUrgency: number;
};
