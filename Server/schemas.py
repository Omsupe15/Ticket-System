from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Literal, Optional


class Channel(str, Enum):
    TELEGRAM = "telegram"
    DISCORD = "discord"


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
    ) -> "TicketIngress":
        return cls(
            ticket_id=None,
            channel=channel,
            userid=userid,
            username=username,
            time=time or datetime.now(timezone.utc),
            status=status,
            message=message,
        )

