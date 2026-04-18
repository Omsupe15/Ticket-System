from __future__ import annotations

from typing import Any, Dict

import httpx

from Server.config import get_slack_config
from database.schemas import Channel, TicketIngress


async def send_slack_message(userid: str, message: str) -> None:
    """
    Send a message to a Slack user via the bot API.
    """
    cfg = get_slack_config()
    if not cfg.bot_token:
        return

    url = "https://slack.com/api/chat.postMessage"
    headers = {"Authorization": f"Bearer {cfg.bot_token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient() as client:
        await client.post(url, json={"channel": userid, "text": message}, headers=headers)


def parse_slack_update(update: Dict[str, Any]) -> TicketIngress | None:
    """
    Convert a raw Slack event payload into the normalized TicketIngress schema.
    """
    event = update.get("event", {})
    if event.get("type") != "message" or event.get("subtype"):
        return None
    
    if event.get("bot_id") or event.get("user", "").startswith("B"):
        return None

    user = event.get("user", "")
    if not user:
        return None

    text = event.get("text", "")
    if not text:
        return None

    # Slack uses Unix time in seconds
    from datetime import datetime, timezone
    ts = event.get("ts", "")
    try:
        time = datetime.fromtimestamp(float(ts), tz=timezone.utc)
    except ValueError:
        time = datetime.now(timezone.utc)

    return TicketIngress.new(
        channel=Channel.SLACK,
        userid=user,
        username=None,  # Slack doesn't provide username in event
        message=text,
        time=time,
    )