from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy.orm import Session

from Server.config import get_database_config
from database.db import build_engine, build_session_factory, create_tables
from database.schemas import TicketIngress
from database.ticket_store import create_or_append_ticket


def init_node2_database():
    cfg = get_database_config()
    if not cfg.database_url:
        raise ValueError("DATABASE_URL is required for Node 2.")

    engine = build_engine(cfg.database_url)
    create_tables(engine)
    return build_session_factory(engine)


@contextmanager
def session_scope(session_factory) -> Iterator[Session]:
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def persist_ingress(session_factory, ingress: TicketIngress):
    with session_scope(session_factory) as session:
        return create_or_append_ticket(session, ingress)

