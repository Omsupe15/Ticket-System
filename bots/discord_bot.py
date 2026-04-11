from __future__ import annotations

import asyncio
from datetime import timezone
from typing import Awaitable, Callable, Optional

import discord

from Server.config import get_discord_config
from database.schemas import Channel, TicketIngress


TicketCallback = Callable[[TicketIngress], Awaitable[None]]


class TicketDiscordClient(discord.Client):
    """
    Discord gateway client responsible only for tracking incoming messages
    and converting them into the normalized TicketIngress schema.

    Persistence and HTTP APIs are handled in later nodes.
    """

    def __init__(self, *, on_ticket: Optional[TicketCallback] = None) -> None:
        intents = discord.Intents.none()
        intents.message_content = True
        intents.guilds = True
        intents.members = True

        super().__init__(intents=intents)
        self.on_ticket = on_ticket

    async def on_message(self, message: discord.Message) -> None:
        # Ignore messages from the bot itself.
        if message.author.bot:
            return

        userid = str(message.author.id)
        username = message.author.display_name
        content = message.content or ""
        if not content:
            return

        ingress = TicketIngress.new(
            channel=Channel.DISCORD,
            userid=userid,
            username=username,
            message=content,
            time=message.created_at.astimezone(timezone.utc) if message.created_at.tzinfo else message.created_at.replace(tzinfo=timezone.utc),
        )

        if self.on_ticket is not None:
            await self.on_ticket(ingress)


async def run_discord_gateway(on_ticket: Optional[TicketCallback] = None) -> None:
    """
    Run the Discord gateway client to track messages.

    This satisfies the Node 1 requirement to:
    - "Track the messages of discord bot using gateway."

    The callback receives normalized TicketIngress objects which can later be
    forwarded to the database or internal APIs defined in subsequent nodes.
    """
    cfg = get_discord_config()
    if not cfg.bot_token:
        # Configuration is missing; nothing to do at this layer.
        return

    client = TicketDiscordClient(on_ticket=on_ticket)
    await client.start(cfg.bot_token)


def run_discord_gateway_blocking(on_ticket: Optional[TicketCallback] = None) -> None:
    """
    Convenience wrapper to run the Discord gateway in a blocking fashion.
    """
    asyncio.run(run_discord_gateway(on_ticket=on_ticket))

