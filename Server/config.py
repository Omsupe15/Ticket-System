from __future__ import annotations

from dotenv import load_dotenv
import os
from dataclasses import dataclass

load_dotenv()


@dataclass
class TelegramConfig:
    bot_token: str
    webhook_url: str


@dataclass
class DiscordConfig:
    bot_token: str


def get_telegram_config() -> TelegramConfig:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    webhook_url = os.getenv("TELEGRAM_WEBHOOK_URL", "")
    return TelegramConfig(bot_token=token, webhook_url=webhook_url)


def get_discord_config() -> DiscordConfig:
    token = os.getenv("DISCORD_BOT_TOKEN", "")
    return DiscordConfig(bot_token=token)

