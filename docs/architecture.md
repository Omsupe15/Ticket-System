# Ticket System

## Problem Statement
-> Customer support requests often arrive through emails or messaging platforms without structured tracking. As a result, tickets may be overlooked, duplicated, or delayed. Without centralized management, tracking request status becomes difficult.
There is a need for a structured ticketing system to manage and monitor customer support interactions efficiently.

Objectives:
Create and assign support tickets.
Track ticket status from open to closed.
Maintain conversation history within each ticket.
Update, escalate, or close tickets systematically.
Improve response organization and visibility

# Solution

## Server

### A. NODE 1: External API permissions
  1. Create a telegram bot and and Slack bot and attach a webhook to the service.
  2. Track the messages of discord bot using gateway.
  3. convert all the data from telegram, slack and discord bots to a schema so that further it can be added to database with ease. Schema will include, ticket_id(auto-generated), channel(telegram or discord), userid(of user on channel),username(on channel), time(time at which ticket was generated), status(assigned/processing/closed, (assigned as default at beginning)).
  4. Send a message back to the user via telegram or slack or discord from whichever channel it was recieved that the complaint has been assigned.

### B. NODE 2: Database Design (postgresql+sqlalchemy+python)
  1. Create a ticket and Insert the Data in proper schema in postgresql database using SQLAlchemy.
  2. Each ticket will have auto generated TicketID. Other than that, Userid, Username, time, status, and channel(telegram,slack, discord) will be present.
  3. status will be set as assigned by default. Other modes are processing, completed and closed.
  4. Messages will be stored in a separate relational table (e.g. `TicketMessages`) that references the `TicketID` via foreign key. Update and add new messages to this table linked to the ticket until the ticket status is closed.
  5. if the same user messages after the ticket is closed, generate a new ticket. 
  6. whenever the status of the ticket is changed message the user back through the same channel that their complaint status has changed from this to that (eg. assigned to processing, processing to closed). If the status is closed message that the complaint was resolved.

### C. Node 3: Internal APIs (FastAPI)

  1. /webhook/telegram -> webhook for telegram
         a. Verify standard Telegram secret token to ensure the request is legitimate.
         b. check the status of the latest ticket, if status is anything other than closed, add the message sent to the related `TicketMessages` table linked to the same ticket.
         c. if the status is closed create a new ticket in database according to the Database design.
  2. /webhook/discord -> webhook for discord
         a. Verify discord headers/signature to ensure the request is legitimate.
         b. check the status of the latest ticket, if status is anything other than closed, add the message sent to the related `TicketMessages` table linked to the same ticket.
         c. if the status is closed create a new ticket in database according to the Database design.
  3. /webhook/slack -> webhook for slack
         a. check the status of the latest ticket, if status is anything other than closed, add the message sent to the related `TicketMessages` table linked to the same ticket.
         b. if the status is closed create a new ticket in database according to the Database design.        
  4. GET/tickets -> gets all the tickets with data, ticketID, Username, created_at, channel and status
  5. GET/tickets/{ticketID} -> gets all the data in the database regarding that ticket.
  6. GET/tickets/{ticketID}/messages -> gets all the messages of given ticket id.
  7. GET/tickets/sort -> sorts the tickets according to the, status, created_at, updated_at, closed_at, username, gmailID, and channel.
  8. POST/tickets/{ticketID}/status -> add to status to Tickets
  9. PATCH/tickets/{ticketID}/status -> update status of tickets
  10. DELETE/tickets/{ticketID}/status/closed -> deletes the tickets whose status has been closed.
  11. GET/stats -> Returns the number of `closed` tickets, `assigned` tickets, total tickets, tickets resolved today, tickets resolved this week 



