from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Literal, Optional


class Channel(str, Enum):
    TELEGRAM = "telegram"
    DISCORD = "discord"
    SLACK = "slack"


Status = Literal["assigned", "processing", "completed", "closed"]


@dataclass
class TicketIngress:
    """
    Normalized representation of a single incoming message from an external channel.

    This is the schema described in architecture.md for Node 1:
    - ticket_id: auto-generated later by the database layer (Node 2)
    - channel: telegram or discord
    - userid: user identifier on the source channel
    - username: user-visible name on the source channel
    - time: when the ticket/message was generated
    - status: assigned/processing/completed/closed (assigned by default at ingress)
    - message: raw text content for this event
    """

    # ticket_id is left as Optional here; it will be populated by Node 2.
    ticket_id: Optional[int]
    channel: Channel
    userid: str
    username: Optional[str]
    time: datetime
    status: Status
    message: str
    error_type: Optional[str] = None  # billing, website, or delivery
    urgency: Optional[str] = None  # low, medium, or high
    time_updated: Optional[datetime] = None
    time_closed: Optional[datetime] = None

    @classmethod
    def new(
        cls,
        *,
        channel: Channel,
        userid: str,
        username: Optional[str],
        message: str,
        time: Optional[datetime] = None,
        status: Status = "assigned",
        error_type: Optional[str] = None,
        urgency: Optional[str] = None,
    ) -> "TicketIngress":
        return cls(
            ticket_id=None,
            channel=channel,
            userid=userid,
            username=username,
            time=time or datetime.now(timezone.utc),
            time_updated=None,
            time_closed=None,
            status=status,
            message=message,
            error_type=error_type,
            urgency=urgency,
        )

    def set_urgency_based_on_mood(self, mood: str):
        """Set urgency based on the user's mood."""
        mood_to_urgency = {
            "angry": "high",
            "neutral": "medium",
            "happy": "low",
        }
        self.urgency = mood_to_urgency.get(mood, "medium")

    def update_status(self, new_status: Status):
        """Update ticket status and timestamps."""
        self.status = new_status
        if new_status == "processing":
            self.time_updated = datetime.now(timezone.utc)
        elif new_status == "closed":
            self.time_closed = datetime.now(timezone.utc)

