"""
Node 3: Internal APIs (FastAPI)

Implements all HTTP routes described in architecture.md:
  - Webhook ingress for Telegram and Discord
  - Ticket CRUD and status management
"""

from __future__ import annotations

import hashlib
import hmac
import time as _time
from typing import Any, Dict, Generator, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import asc, desc, select, update, func
from sqlalchemy.orm import Session, joinedload

from Server.config import get_discord_config, get_telegram_config, get_slack_config
from database.models import Ticket, TicketMessage
from database.node2_database import init_node2_database, persist_ingress
from database.schemas import Channel, TicketIngress
from bots.telegram_bot import parse_telegram_update, set_telegram_webhook, send_telegram_message
from bots.discord_bot import send_discord_dm
from bots.slack_bot import parse_slack_update, send_slack_message

app = FastAPI(
    title="Ticket System API",
    description="Internal API for managing support tickets from Telegram and Discord.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# Application startup / shutdown
# ---------------------------------------------------------------------------

@app.on_event("startup")
async def startup_event() -> None:
    """
    Initialise the database (create tables if they don't exist) and store the
    session factory on app.state so dependency injection can reach it.
    Also registers the Telegram webhook with Telegram's servers.
    """
    session_factory = init_node2_database()
    app.state.session_factory = session_factory

    # Register Telegram webhook (silently skips if env vars are missing).
    try:
        set_telegram_webhook()
    except Exception:
        pass  # Webhook registration failure should not crash the server.


# ---------------------------------------------------------------------------
# DB session dependency
# ---------------------------------------------------------------------------

def get_session() -> Generator[Session, None, None]:
    factory = app.state.session_factory
    db: Session = factory()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Pydantic response models
# ---------------------------------------------------------------------------

class MessageOut(BaseModel):
    id: int
    ticket_id: int
    userid: str
    message: str
    time: Any

    class Config:
        from_attributes = True


class TicketOut(BaseModel):
    ticket_id: int
    userid: str
    username: Optional[str]
    time: Any
    status: str
    channel: str

    class Config:
        from_attributes = True


class TicketDetailOut(TicketOut):
    messages: List[MessageOut] = []


class StatusIn(BaseModel):
    status: str


# ---------------------------------------------------------------------------
# A. Webhook – Telegram  (POST /webhook/telegram)
# ---------------------------------------------------------------------------

@app.post("/webhook/telegram", status_code=200)
async def telegram_webhook(request: Request) -> Dict[str, Any]:
    """
    Receives updates pushed by Telegram.

    Security: verifies the X-Telegram-Bot-Api-Secret-Token header when
    TELEGRAM_WEBHOOK_SECRET is set in the environment.
    """
    cfg = get_telegram_config()

    # Optional secret-token verification (set when registering the webhook).
    import os
    secret = os.getenv("TELEGRAM_WEBHOOK_SECRET", "")
    if secret:
        token_header = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        if not hmac.compare_digest(token_header.encode('utf-8'), secret.encode('utf-8')):
            raise HTTPException(status_code=403, detail="Invalid Telegram secret token.")

    body: Dict[str, Any] = await request.json()
    ingress: Optional[TicketIngress] = parse_telegram_update(body)
    if ingress:
        ticket = persist_ingress(app.state.session_factory, ingress)
        if ticket.status == "assigned":
            await send_telegram_message(ticket.userid, f"Your complaint has been assigned. Ticket ID: {ticket.ticket_id}")

    return {"ok": True}



# ---------------------------------------------------------------------------
# B. Webhook – Discord  (POST /webhook/discord)
# ---------------------------------------------------------------------------

def _verify_discord_signature(
    public_key_hex: str,
    signature: str,
    timestamp: str,
    body: bytes,
) -> bool:
    """
    Verify a Discord Ed25519 signature.
    Requires the 'PyNaCl' package (pip install PyNaCl).
    """
    try:
        from nacl.signing import VerifyKey  # type: ignore
        from nacl.exceptions import BadSignatureError  # type: ignore

        verify_key = VerifyKey(bytes.fromhex(public_key_hex))
        verify_key.verify(timestamp.encode() + body, bytes.fromhex(signature))
        return True
    except Exception:
        return False


@app.post("/webhook/discord", status_code=200)
async def discord_webhook(request: Request) -> Dict[str, Any]:
    """
    Receives messages forwarded from the Discord gateway client.

    Security: verifies Ed25519 signature per Discord's requirements.
    Falls back to accepting the request if DISCORD_PUBLIC_KEY is not set
    (useful for development).
    """
    import os
    public_key = os.getenv("DISCORD_PUBLIC_KEY", "")

    signature = request.headers.get("X-Signature-Ed25519", "")
    timestamp = request.headers.get("X-Signature-Timestamp", "")
    raw_body: bytes = await request.body()

    if public_key:
        if not signature or not timestamp:
            raise HTTPException(status_code=401, detail="Missing Discord signature headers.")
        if not _verify_discord_signature(public_key, signature, timestamp, raw_body):
            raise HTTPException(status_code=401, detail="Invalid Discord signature.")

    if not raw_body:
        raise HTTPException(status_code=400, detail="Empty Discord webhook payload.")

    import json
    try:
        body: Dict[str, Any] = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {exc.msg}") from exc

    # Expect the same normalized payload that the Discord gateway produces.
    userid = body.get("userid", "")
    username = body.get("username", "")
    message = body.get("message", "")
    if userid and message:
        ingress = TicketIngress.new(
            channel=Channel.DISCORD,
            userid=userid,
            username=username or None,
            message=message,
        )
        ticket = persist_ingress(app.state.session_factory, ingress)
        if ticket.status == "assigned":
            await send_discord_dm(ticket.userid, f"Your complaint has been assigned. Ticket ID: {ticket.ticket_id}")

    return {"ok": True}


# ---------------------------------------------------------------------------
# B. Webhook – Slack  (POST /webhook/slack)
# ---------------------------------------------------------------------------

@app.post("/webhook/slack", status_code=200)
async def slack_webhook(request: Request) -> Dict[str, Any]:
    """
    Receives updates pushed by Slack.
    """
    body: Dict[str, Any] = await request.json()
    if "challenge" in body:
        # Respond to Slack's URL verification challenge
        return {"challenge": body["challenge"]}
    ingress: Optional[TicketIngress] = parse_slack_update(body)
    if ingress:
        ticket = persist_ingress(app.state.session_factory, ingress)
        if ticket.status == "assigned":
            await send_slack_message(ticket.userid, f"Your complaint has been assigned. Ticket ID: {ticket.ticket_id}")

    return {"ok": True}


# ---------------------------------------------------------------------------
# C. Ticket CRUD – GET /tickets
# ---------------------------------------------------------------------------

@app.get("/tickets", response_model=List[TicketOut])
def list_tickets(db: Session = Depends(get_session)) -> List[Ticket]:
    """Returns all tickets with basic metadata."""
    return list(db.execute(select(Ticket)).scalars().all())


# ---------------------------------------------------------------------------
# D. GET /tickets/sort  (must be declared BEFORE /tickets/{ticket_id})
# ---------------------------------------------------------------------------

SORT_COLUMNS = {
    "status": Ticket.status,
    "created_at": Ticket.time,
    "updated_at": Ticket.time,
    "username": Ticket.username,
    "channel": Ticket.channel,
}


@app.get("/tickets/sort", response_model=List[TicketOut])
def sort_tickets(
    sort_by: str = Query("created_at", description="Field to sort by"),
    order: str = Query("desc", description="'asc' or 'desc'"),
    db: Session = Depends(get_session),
) -> List[Ticket]:
    """
    Sort tickets by the specified field.
    Supported sort fields: status, created_at, updated_at, username, channel.
    """
    column = SORT_COLUMNS.get(sort_by)
    if column is None:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid sort field '{sort_by}'. Choose from: {list(SORT_COLUMNS.keys())}",
        )
    direction = asc if order == "asc" else desc
    stmt = select(Ticket).order_by(direction(column))
    return list(db.execute(stmt).scalars().all())


# ---------------------------------------------------------------------------
# E. GET /tickets/{ticket_id}
# ---------------------------------------------------------------------------

@app.get("/tickets/{ticket_id}", response_model=TicketDetailOut)
def get_ticket(ticket_id: int, db: Session = Depends(get_session)) -> Ticket:
    """Returns all data for a given ticket, including its messages."""
    stmt = (
        select(Ticket)
        .where(Ticket.ticket_id == ticket_id)
        .options(joinedload(Ticket.messages))
    )
    ticket = db.execute(stmt).unique().scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found.")
    return ticket


# ---------------------------------------------------------------------------
# F. GET /tickets/{ticket_id}/messages
# ---------------------------------------------------------------------------

@app.get("/tickets/{ticket_id}/messages", response_model=List[MessageOut])
def get_ticket_messages(ticket_id: int, db: Session = Depends(get_session)) -> List[TicketMessage]:
    """Returns all messages for a given ticket."""
    ticket = db.execute(
        select(Ticket).where(Ticket.ticket_id == ticket_id)
    ).scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found.")

    msgs = db.execute(
        select(TicketMessage)
        .where(TicketMessage.ticket_id == ticket_id)
        .order_by(asc(TicketMessage.time))
    ).scalars().all()
    return list(msgs)


# ---------------------------------------------------------------------------
# G. POST /tickets/{ticket_id}/status  – set status
# ---------------------------------------------------------------------------

ALLOWED_STATUSES = {"assigned", "processing", "completed", "closed"}


@app.post("/tickets/{ticket_id}/status", response_model=TicketOut)
async def set_ticket_status(
    ticket_id: int,
    payload: StatusIn,
    db: Session = Depends(get_session),
) -> Ticket:
    """Set the status of a ticket (replaces current value)."""
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Allowed: {sorted(ALLOWED_STATUSES)}",
        )
    ticket = db.execute(
        select(Ticket).where(Ticket.ticket_id == ticket_id)
    ).scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found.")

    old_status = ticket.status
    ticket.status = payload.status
    db.commit()
    db.refresh(ticket)
    if old_status != payload.status:
        msg = f"Your complaint status has changed from {old_status} to {payload.status}."
        if payload.status == "closed":
            msg = "Your complaint was resolved."
        if ticket.channel == "telegram":
            await send_telegram_message(ticket.userid, msg)
        elif ticket.channel == "discord":
            await send_discord_dm(ticket.userid, msg)
        elif ticket.channel == "slack":
            await send_slack_message(ticket.userid, msg)
    return ticket


# ---------------------------------------------------------------------------
# H. PATCH /tickets/{ticket_id}/status  – update status
# ---------------------------------------------------------------------------

@app.patch("/tickets/{ticket_id}/status", response_model=TicketOut)
async def update_ticket_status(
    ticket_id: int,
    payload: StatusIn,
    db: Session = Depends(get_session),
) -> Ticket:
    """Update (patch) the status of a ticket."""
    if payload.status not in ALLOWED_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{payload.status}'. Allowed: {sorted(ALLOWED_STATUSES)}",
        )
    ticket = db.execute(
        select(Ticket).where(Ticket.ticket_id == ticket_id)
    ).scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found.")

    old_status = ticket.status
    ticket.status = payload.status
    db.commit()
    db.refresh(ticket)
    if old_status != payload.status:
        msg = f"Your complaint status has changed from {old_status} to {payload.status}."
        if payload.status == "closed":
            msg = "Your complaint was resolved."
        if ticket.channel == "telegram":
            await send_telegram_message(ticket.userid, msg)
        elif ticket.channel == "discord":
            await send_discord_dm(ticket.userid, msg)
        elif ticket.channel == "slack":
            await send_slack_message(ticket.userid, msg)
    return ticket


# ---------------------------------------------------------------------------
# I. DELETE /tickets/{ticket_id}/status/closed  – delete closed ticket
# ---------------------------------------------------------------------------

@app.delete("/tickets/{ticket_id}/status/closed", status_code=204)
def delete_closed_ticket(ticket_id: int, db: Session = Depends(get_session)) -> Response:
    """
    Permanently deletes a ticket only if its status is 'closed'.
    Returns 204 No Content on success.
    """
    ticket = db.execute(
        select(Ticket).where(Ticket.ticket_id == ticket_id)
    ).scalar_one_or_none()
    if ticket is None:
        raise HTTPException(status_code=404, detail=f"Ticket {ticket_id} not found.")
    if ticket.status != "closed":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete ticket {ticket_id}: status is '{ticket.status}', not 'closed'.",
        )

    db.delete(ticket)
    db.commit()
    return Response(status_code=204)


# ---------------------------------------------------------------------------
# J. GET /stats
# ---------------------------------------------------------------------------

@app.get("/stats")
def get_stats(db: Session = Depends(get_session)) -> Dict[str, Any]:
    """
    Returns statistics about tickets.
    """
    from datetime import datetime, timezone, timedelta

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_start = today_start + timedelta(days=1)
    week_start = today_start - timedelta(days=now.weekday())  # Monday start
    week_end = week_start + timedelta(days=7)

    # Total tickets
    total = db.execute(select(func.count(Ticket.ticket_id))).scalar()

    # Closed tickets
    closed = db.execute(select(func.count(Ticket.ticket_id)).where(Ticket.status == "closed")).scalar()

    # Assigned tickets
    assigned = db.execute(select(func.count(Ticket.ticket_id)).where(Ticket.status == "assigned")).scalar()

    # Tickets resolved today (closed today)
    resolved_today = db.execute(select(func.count(Ticket.ticket_id)).where(Ticket.status == "closed", Ticket.time >= today_start, Ticket.time < tomorrow_start)).scalar()

    # Tickets resolved this week
    resolved_week = db.execute(select(func.count(Ticket.ticket_id)).where(Ticket.status == "closed", Ticket.time >= week_start, Ticket.time < week_end)).scalar()

    return {
        "total_tickets": total,
        "closed_tickets": closed,
        "assigned_tickets": assigned,
        "tickets_resolved_today": resolved_today,
        "tickets_resolved_this_week": resolved_week
    }
