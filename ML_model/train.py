import pandas as pd
import numpy as np
import joblib
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OrdinalEncoder, OneHotEncoder
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import os

# ── Load data ────────────────────────────────────────────────────
DATA_PATH = os.path.join(os.path.dirname(__file__), "ticket_data_synthetic.csv")
df = pd.read_csv(DATA_PATH)

# ── Feature engineering ──────────────────────────────────────────
# Extract hour from arrival time (numeric feature)
df["time_arrival"] = pd.to_datetime(df["time_arrival"])
df["time_closed"] = pd.to_datetime(df["time_closed"])
df["hour"] = df["time_arrival"].dt.hour

# Calculate resolution time in hours
df["resolution_time"] = (df["time_closed"] - df["time_arrival"]).dt.total_seconds() / 3600

# ── Define X and y ───────────────────────────────────────────────
FEATURES = ["status", "channel", "urgency", "hour"]
TARGET = "resolution_time"

X = df[FEATURES]
y = df[TARGET]

# ── Preprocessing ────────────────────────────────────────────────
# OrdinalEncoder for ordinal columns (urgency has natural order, status too)
ordinal_cols = ["status", "urgency"]
ordinal_categories = [
    ["assigned", "processing", "closed"],   # status order
    ["low", "medium", "high"],              # urgency order
]

# OneHotEncoder for nominal column
nominal_cols = ["channel"]

# hour is already numeric – pass through
numeric_cols = ["hour"]

preprocessor = ColumnTransformer(
    transformers=[
        ("ord", OrdinalEncoder(categories=ordinal_categories), ordinal_cols),
        ("ohe", OneHotEncoder(drop="first", sparse_output=False), nominal_cols),
        ("num", "passthrough", numeric_cols),
    ]
)

# ── Pipeline ─────────────────────────────────────────────────────
pipeline = Pipeline([
    ("pre", preprocessor),
    ("model", LinearRegression()),
])

# ── Train / Evaluate ────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

pipeline.fit(X_train, y_train)

y_pred = pipeline.predict(X_test)
print(f"MAE : {mean_absolute_error(y_test, y_pred):.2f} hrs")
print(f"R²  : {r2_score(y_test, y_pred):.4f}")

# ── Export ───────────────────────────────────────────────────────
PKL_PATH = os.path.join(os.path.dirname(__file__), "pipeline.pkl")
joblib.dump(pipeline, PKL_PATH)
print(f"Pipeline saved → {PKL_PATH}")
