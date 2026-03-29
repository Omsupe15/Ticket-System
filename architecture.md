#Ticket System

## Server

### A. NODE 1: External API permissions
  1. Create a telegram bot and attach a webhook to the service.
  2. Create a webhook using gmail API.
  3. Create a webhook using Discord API.
  -> Extract the Username, gmailID, Time, channel(gmail,telegram,discord) and msg itself.

### B. NODE 2: Database Design (postgresql+sqlalchemy+python)
  1. Create a ticket and Insert the Data in proper schema in postgresql database using SQLAlchemy.
  2. Each ticket will have auto generated TicketID. Other than that gmailID, Username, time , status,channel(gmail,telegram,discord), and messages will be the other fields present.
  3. status will be set as assigned by default. Other modes are processing, completed and closed.
  4. message field will have an array of messages sent by the same user. Make sure to update and add messages of same user to the same ticket until the ticket status is closed.
  5. time field will have 3 status, created_at, updated_at, closed_at. created_at will have the time that ticket is created, updated_at will have the time that status turns to processing and closed_at will have the time at which status is changed to closed.
  6. if the same user messages after the ticket is closed, generate a new ticket. 

### C. Node 3: Internal APIs (FastAPI)
  1. /webhook/gmail -> webhook for gmail
         a. check if the gmailID exists. if yes, check the status of the ticket, if status is anything other than closed, add the message sent inside the array of messages in the same ticket.
         b. if the status is closed or the gmail does not exist create a new ticket in database according to the Database design.
  2. /webhook/telegram -> webhook for telegram
         a. check if the gmailID exists. if yes, check the status of the ticket, if status is anything other than closed, add the message sent inside the array of messages in the same ticket.
         b. if the status is closed or the gmail does not exist create a new ticket in database according to the Database design.
  3. /webhook/discord -> webhook for discord
         a. check if the gmailID exists. if yes, check the status of the ticket, if status is anything other than closed, add the message sent inside the array of messages in the same ticket.
         b. if the status is closed or the gmail does not exist create a new ticket in database according to the Database design.
  4. GET/tickets -> gets all the tickets with data, ticketID, Username, created_at, channel and status
  5. GET/tickets/{ticketID} -> gets all the data in the database regarding that ticket.
  6. GET/tickets/{ticketID}/messages -> gets all the messages of given ticket id.
  7. GET/tickets/sort -> sorts the tickets according to the, status, created_at, updated_at, closed_at, username, gmailID, and channel.
  8. POST/tickets/{ticketID}/status -> add to status to Tickets
  9. PATCH/tickets/{ticketID}/status -> update status of tickets
  10. DELETE/tickets/{ticketID}/status/closed -> deletes the tickets whose status has been closed.


## Client

### D. Node 4: Frontend (React)
   -> sleek, stylish and modern design.
   -> 2 page design. 
   -> 1st page lists all the Tickets. Has a filter(sort) option. Only a small amount of data like ticketID, username, created_at, channel and staus is visible
   -> 2nd page opens up when the ticket has been clicked upon and will display all the information availabe in the database.

