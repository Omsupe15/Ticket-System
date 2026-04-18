from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import Select, desc, select
from sqlalchemy.orm import Session

from database.models import Ticket, TicketMessage
from database.schemas import TicketIngress


def _latest_ticket_for_user(
    session: Session,
    *,
    userid: str,
    channel: str,
) -> Ticket | None:
    stmt: Select[tuple[Ticket]] = (
        select(Ticket)
        .where(Ticket.userid == userid, Ticket.channel == channel)
        .order_by(desc(Ticket.ticket_id))
        .limit(1)
    )
    return session.execute(stmt).scalar_one_or_none()


def create_or_append_ticket(session: Session, ingress: TicketIngress) -> Ticket:
    """
    Node 2 rule implementation:
    - If latest ticket for same user+channel is not closed, append message there.
    - If latest ticket is closed (or does not exist), create a new ticket.
    """
    latest = _latest_ticket_for_user(
        session,
        userid=ingress.userid,
        channel=ingress.channel.value,
    )

    new_message = TicketMessage(
        userid=ingress.userid,
        message=ingress.message,
        time=ingress.time
    )

    if latest is None or latest.status == "closed":
        ticket = Ticket(
            userid=ingress.userid,
            username=ingress.username,
            time=ingress.time,
            status="assigned",
            channel=ingress.channel.value,
            messages=[new_message],
        )
        session.add(ticket)
        session.commit()
        session.refresh(ticket)
        return ticket

    # Same user has an active ticket: append message via relationship.
    # SQLAlchemy will handle inserting the new TicketMessage and setting the foreign key.
    latest.messages.append(new_message)
    latest.username = ingress.username or latest.username
    latest.time = datetime.now(timezone.utc)
    session.commit()
    session.refresh(latest)
    return latest


