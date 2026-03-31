"""
Node 1: External API integrations for Telegram and Discord.

This package is responsible only for:
- Receiving raw events from external platforms.
- Normalizing them into a common ticket-ingress schema.

Database persistence and HTTP APIs are implemented in later nodes.
"""

