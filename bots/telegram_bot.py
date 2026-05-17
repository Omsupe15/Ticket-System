from __future__ import annotations

from typing import Any, Dict

import httpx

from Server.config import get_telegram_config
from database.schemas import Channel, TicketIngress


def set_telegram_webhook() -> None:
    """
    Configure the Telegram bot webhook for this service.

    This only performs the external API permission / webhook setup required in Node 1.
    The actual HTTP endpoint that Telegram will call is implemented in Node 3.
    """
    cfg = get_telegram_config()
    if not cfg.bot_token or not cfg.webhook_url:
        # Configuration is missing; nothing to do at this layer.
        return

    url = f"https://api.telegram.org/bot{cfg.bot_token}/setWebhook"
    payload = {"url": cfg.webhook_url}

    with httpx.Client(timeout=10.0) as client:
        response = client.post(url, json=payload)
        response.raise_for_status()


async def send_telegram_message(userid: str, message: str) -> None:
    """
    Send a message to a Telegram user via the bot API.
    """
    cfg = get_telegram_config()
    if not cfg.bot_token:
        return

    url = f"https://api.telegram.org/bot{cfg.bot_token}/sendMessage"
    async with httpx.AsyncClient() as client:
        await client.post(url, json={"chat_id": userid, "text": message})


def parse_telegram_update(update: Dict[str, Any]) -> TicketIngress | None:
    """
    Convert a raw Telegram update payload into the normalized TicketIngress schema.

    This function does not persist data; it only performs the Node 1 responsibility
    of normalizing external data for later database insertion.
    """
    message = update.get("message") or update.get("edited_message")
    if not message:
        return None

    user = message.get("from") or {}
    userid = str(user.get("id", ""))
    if not userid:
        return None

    username = user.get("username") or user.get("first_name")
    text = message.get("text") or ""
    if not text:
        return None

    # Telegram uses Unix time (seconds since epoch) in `date`.
    from datetime import datetime, timezone

    timestamp = message.get("date")
    if isinstance(timestamp, int):
        time = datetime.fromtimestamp(timestamp, tz=timezone.utc)
    else:
        time = datetime.now(timezone.utc)

    return TicketIngress.new(
        channel=Channel.TELEGRAM,
        userid=userid,
        username=username,
        message=text,
        time=time,
    )

