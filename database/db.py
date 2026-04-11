from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


def build_engine(database_url: str):
    return create_engine(database_url, future=True)


def build_session_factory(engine):
    return sessionmaker(bind=engine, class_=Session, expire_on_commit=False, future=True)


def create_tables(engine) -> None:
    # Import models to ensure metadata is registered before create_all.
    from database import models  # noqa: F401

    Base.metadata.create_all(engine)

