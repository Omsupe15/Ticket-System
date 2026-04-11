from __future__ import annotations

import dotenv
import os
from dataclasses import dataclass

dotenv.load_dotenv()


@dataclass
class TelegramConfig:
    bot_token: str
    webhook_url: str


@dataclass
class DiscordConfig:
    bot_token: str


@dataclass
class DatabaseConfig:
    database_url: str


def get_telegram_config() -> TelegramConfig:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    webhook_url = os.getenv("TELEGRAM_WEBHOOK_URL", "")
    return TelegramConfig(bot_token=token, webhook_url=webhook_url)


def get_discord_config() -> DiscordConfig:
    token = os.getenv("DISCORD_BOT_TOKEN", "")
    return DiscordConfig(bot_token=token)


def get_database_config() -> DatabaseConfig:
    # Expected format:
    # postgresql+psycopg://user:password@localhost:5432/database_name
    database_url = os.getenv("DATABASE_URL", "")
    return DatabaseConfig(database_url=database_url)

