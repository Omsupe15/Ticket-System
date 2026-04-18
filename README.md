# Ticket System

A structured customer-support ticketing system that ingests messages from **Telegram** and **Discord**, persists them in a **PostgreSQL** database, and exposes a **FastAPI** REST API for ticket management.

---

## Architecture

| Node | Purpose | Key Files |
|------|---------|-----------|
| **Node 1** | External API integration (bots) | `bots/telegram_bot.py`, `bots/discord_bot.py`, `bots/slack_bot.py`|
| **Node 2** | Database design & persistence | `database/models.py`, `database/ticket_store.py`, `database/node2_database.py` |
| **Node 3** | Internal REST API (FastAPI) | `Server/api.py` |

See [`docs/architecture.md`](docs/architecture.md) for the full specification.

---

## Requirements

- Python 3.11+
- PostgreSQL 14+

---

## Environment Variables

Create a `.env` file inside the `Server/` directory (or export these in your shell):

| Variable | Description | Example |
|----------|-------------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token from [@BotFather](https://t.me/BotFather) | `123456:ABC-...` |
| `TELEGRAM_WEBHOOK_URL` | Public HTTPS URL for Telegram to call | `https://example.com/webhook/telegram` |
| `TELEGRAM_WEBHOOK_SECRET` | *(Optional)* Secret token set on the webhook for extra security | `my_secret_token` |
| `DISCORD_BOT_TOKEN` | Token from the Discord Developer Portal | `MTQ4...` |
| `DISCORD_PUBLIC_KEY` | Ed25519 public key from Discord Developer Portal (for webhook signature verification) | `abc123...` |
| `DATABASE_URL` | SQLAlchemy-compatible PostgreSQL connection string | `postgresql+psycopg2://user:pass@localhost:5432/ticket_system` |
| `SLACK_BOT_TOKEN` | Bot token from Slack App configuration | `xoxb-...` |
| `SLACK_WEBHOOK_URL` | Public HTTPS URL for Slack to call | `https://example.com/webhook/slack` |

---

## Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd Ticket-System

# 2. Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # Linux / macOS

# 3. Install dependencies
pip install -r requirements.txt
```

---

## Running the Server

```bash
# From the project root
uvicorn Server.api:app --reload --host 0.0.0.0 --port 8000
```

The API documentation (Swagger UI) is available at `http://localhost:8000/docs`.

---

## Running Tests

Tests live in the `tests/` directory and use an **in-memory SQLite** database — no real PostgreSQL needed.

```bash
pytest
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/webhook/telegram` | Receives Telegram updates |
| `POST` | `/webhook/slack` | Receives Slack Updates|
| `POST` | `/webhook/discord` | Receives Discord payloads |
| `GET` | `/tickets` | List all tickets |
| `GET` | `/tickets/sort` | List tickets sorted by field (`status`, `created_at`, `username`, `channel`) |
| `GET` | `/tickets/{ticket_id}` | Get a single ticket with its messages |
| `GET` | `/tickets/{ticket_id}/messages` | Get all messages for a ticket |
| `POST` | `/tickets/{ticket_id}/status` | Set ticket status |
| `PATCH` | `/tickets/{ticket_id}/status` | Update ticket status |
| `DELETE` | `/tickets/{ticket_id}/status/closed` | Delete a ticket (only if status is `closed`) |
| `GET` | `/stats` | Returns the number of `closed` tickets, `assigned` tickets, total tickets, tickets resolved today, tickets resolved this week |

### Ticket Statuses

`assigned` → `processing` → `completed` → `closed`

---




