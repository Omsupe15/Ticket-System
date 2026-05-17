import { Ticket, TicketStats } from "./assets/types/Ticket.js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

type RawTicket = Record<string, unknown>;
type RequestOptions = RequestInit & {
  allowNotFound?: boolean;
};

const request = async <T>(path: string, options?: RequestOptions): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    if (options?.allowNotFound && response.status === 404) {
      throw new Error("Resource not found");
    }

    let message = "Request failed";

    try {
      const errorData = await response.json();
      if (typeof errorData?.detail === "string") {
        message = errorData.detail;
      }
    } catch {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
};

const toTitleCase = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const getDisplayStatus = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized === "assigned") {
    return "Assigned";
  }

  if (normalized === "processing") {
    return "Processing";
  }

  if (normalized === "completed") {
    return "Completed";
  }

  if (normalized === "closed") {
    return "Closed";
  }

  return toTitleCase(normalized);
};

const formatDayAndTime = (rawDate: string | undefined) => {
  if (!rawDate) {
    return {
      createdAt: "",
      time: "--",
      day: "Unknown",
    };
  }

  const date = new Date(rawDate);

  if (Number.isNaN(date.getTime())) {
    return {
      createdAt: rawDate,
      time: rawDate,
      day: "Unknown",
    };
  }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfTicketDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  let day = startOfTicketDay.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });

  if (startOfTicketDay.getTime() === startOfToday.getTime()) {
    day = "Today";
  } else if (startOfTicketDay.getTime() === startOfYesterday.getTime()) {
    day = "Yesterday";
  }

  return {
    createdAt: date.toISOString(),
    time: date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    day,
  };
};

const normalizeTicket = (rawTicket: RawTicket): Ticket => {
  const createdSource =
    (rawTicket.created_at as string | undefined) ||
    (rawTicket.updated_at as string | undefined) ||
    (rawTicket.closed_at as string | undefined) ||
    (rawTicket.time as string | undefined);
  const { createdAt, time, day } = formatDayAndTime(createdSource);
  const rawStatus = String(
    rawTicket.status ?? rawTicket.ticket_status ?? rawTicket.state ?? "assigned"
  ).toLowerCase();
  const rawMessages = Array.isArray(rawTicket.messages)
    ? rawTicket.messages
    : [];
  const messageTexts = rawMessages
    .map((message) => {
      if (typeof message === "string") {
        return message;
      }

      if (message && typeof message === "object") {
        const text = (message as Record<string, unknown>).message;
        const body = (message as Record<string, unknown>).body;
        const content = (message as Record<string, unknown>).content;
        return String(text ?? body ?? content ?? "");
      }

      return "";
    })
    .filter(Boolean);
  const primaryDescription =
    String(
      rawTicket.description ??
        rawTicket.latest_message ??
        rawTicket.message ??
        rawTicket.subject ??
        rawTicket.issue ??
        messageTexts[0] ??
        "No description available."
    ) || "No description available.";
  const fallbackTitle =
    String(
      rawTicket.title ??
        rawTicket.ticket_name ??
        rawTicket.subject ??
        rawTicket.username ??
        rawTicket.ticket_id ??
        rawTicket.id ??
        "Untitled Ticket"
    ) || "Untitled Ticket";

  return {
    id: String(rawTicket.ticket_id ?? rawTicket.id ?? "Unknown"),
    title: fallbackTitle,
    description: primaryDescription,
    status: rawStatus,
    time,
    day,
    createdAt,
    updatedAt: String(rawTicket.updated_at ?? "") || undefined,
    closedAt: String(rawTicket.closed_at ?? "") || undefined,
    channel: String(rawTicket.channel ?? "") || undefined,
    urgency: String(rawTicket.urgency ?? "") || undefined,
    username: String(rawTicket.username ?? "") || undefined,
    userId: String(rawTicket.user_id ?? rawTicket.userid ?? "") || undefined,
    messages: messageTexts,
  };
};

const normalizeStats = (
  rawStats: Record<string, unknown> | undefined,
  tickets: Ticket[]
): TicketStats => {
  const total = Number(rawStats?.total_tickets ?? rawStats?.total ?? tickets.length);
  const assigned = Number(
    rawStats?.assigned_tickets ??
      rawStats?.assigned ??
      tickets.filter((ticket) => ticket.status === "assigned").length
  );
  const processing = Number(
    rawStats?.processing_tickets ??
      rawStats?.processing ??
      tickets.filter((ticket) => ticket.status === "processing").length
  );
  const completed = Number(
    rawStats?.completed_tickets ??
      rawStats?.completed ??
      tickets.filter((ticket) => ticket.status === "completed").length
  );
  const closed = Number(
    rawStats?.closed_tickets ??
      rawStats?.closed ??
      tickets.filter((ticket) => ticket.status === "closed").length
  );

  return {
    total,
    open: assigned + processing + completed,
    closed,
    assigned,
    processing,
    completed,
    resolvedToday: Number(
      rawStats?.tickets_resolved_today ?? rawStats?.resolved_today ?? 0
    ),
    resolvedThisWeek: Number(
      rawStats?.tickets_resolved_this_week ?? rawStats?.resolved_this_week ?? 0
    ),
    telegramTickets: Number(
      rawStats?.telegram_tickets ??
        tickets.filter((t) => t.channel?.toLowerCase() === "telegram").length
    ),
    discordTickets: Number(
      rawStats?.discord_tickets ??
        tickets.filter((t) => t.channel?.toLowerCase() === "discord").length
    ),
    slackTickets: Number(
      rawStats?.slack_tickets ??
        tickets.filter((t) => t.channel?.toLowerCase() === "slack").length
    ),
    highUrgency: Number(
      rawStats?.high_urgency_tickets ??
        tickets.filter((t) => t.urgency?.toLowerCase() === "high").length
    ),
    mediumUrgency: Number(
      rawStats?.medium_urgency_tickets ??
        tickets.filter((t) => t.urgency?.toLowerCase() === "medium").length
    ),
    lowUrgency: Number(
      rawStats?.low_urgency_tickets ??
        tickets.filter((t) => t.urgency?.toLowerCase() === "low").length
    ),
  };
};

export const api = {
  getDisplayStatus,

  async getTickets(): Promise<Ticket[]> {
    const response = await request<RawTicket[] | { tickets?: RawTicket[] }>(
      "/tickets"
    );
    const rawTickets = Array.isArray(response) ? response : response.tickets ?? [];
    return rawTickets.map(normalizeTicket);
  },

  async getTicket(ticketId: string): Promise<Ticket> {
    const response = await request<RawTicket>(`/tickets/${ticketId}`);
    return normalizeTicket(response);
  },

  async getSortedTickets(sortBy: string, order: string = "desc"): Promise<Ticket[]> {
    const response = await request<RawTicket[] | { tickets?: RawTicket[] }>(
      `/tickets/sort?sort_by=${encodeURIComponent(sortBy)}&order=${encodeURIComponent(order)}`
    );
    const rawTickets = Array.isArray(response) ? response : response.tickets ?? [];
    return rawTickets.map(normalizeTicket);
  },



  async updateTicketStatus(ticketId: string, status: string): Promise<Ticket> {
    const response = await request<RawTicket>(`/tickets/${ticketId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return normalizeTicket(response);
  },

  async deleteClosedTicket(ticketId: string): Promise<void> {
    await request<void>(`/tickets/${ticketId}/status/closed`, {
      method: "DELETE",
    });
  },

  async getStats(tickets?: Ticket[]): Promise<TicketStats> {
    try {
      const response = await request<Record<string, unknown>>("/stats");
      return normalizeStats(response, tickets ?? []);
    } catch {
      return normalizeStats(undefined, tickets ?? []);
    }
  },
};
