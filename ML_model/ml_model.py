import joblib
import pandas as pd
import os

_PKL_PATH = os.path.join(os.path.dirname(__file__), "pipeline.pkl")
_pipeline = joblib.load(_PKL_PATH)


def predict_resolution_time(ticket) -> float:
    """
    Accepts a Ticket ORM object (or any object with .status, .channel,
    .urgency, .time attributes) and returns predicted resolution time
    in hours (rounded to 2 decimal places).
    """
    hour = ticket.time.hour

    df = pd.DataFrame([{
        "status": ticket.status,
        "channel": ticket.channel,
        "urgency": ticket.urgency,
        "hour": hour,
    }])

    prediction = _pipeline.predict(df)[0]
    return round(max(prediction, 0), 2)
