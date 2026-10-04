from flask import Flask, request, jsonify
import joblib
import json
import os

app = Flask(__name__)

# Model directory
MODEL_DIR = "saved_models"

# -----------------------------
# Load metadata
# -----------------------------
metadata_path = os.path.join(
    MODEL_DIR,
    "metadata.json"
)

with open(metadata_path, "r") as file:
    metadata = json.load(file)

print("Metadata loaded successfully.")

# -----------------------------
# Load all 8 models
# -----------------------------
models = {}

for model_name in metadata["models"]:

    filename = (
        model_name.lower()
        .replace(" ", "_")
        + ".joblib"
    )

    filepath = os.path.join(
        MODEL_DIR,
        filename
    )

    models[model_name] = joblib.load(filepath)

    print(f"Loaded: {model_name}")


# -----------------------------
# Home route
# -----------------------------
@app.route("/")
def home():
    return "Customer Churn Prediction App is Running!"


# -----------------------------
# Prediction route
# -----------------------------
@app.route("/predict", methods=["POST"])
def predict():

    try:

        # Get JSON data
        data = request.get_json()

        # Feature order must match training
        input_data = [[
            data["CreditScore"],
            data["Age"],
            data["Tenure"],
            data["Balance"],
            data["NumOfProducts"],
            data["HasCrCard"],
            data["IsActiveMember"],
            data["EstimatedSalary"],
            data["GeographyLocation"],
            data["GenderCategory"],
            data["Month"]
        ]]

        # Get probability from all 8 models
        probabilities = []

        for model_name, model in models.items():

            probability = model.predict_proba(
                input_data
            )[0][1]

            probabilities.append(probability)

        # Average probability
        ensemble_probability = (
            sum(probabilities) / len(probabilities)
        )

        # Threshold from metadata
        threshold = metadata["ensemble_threshold"]

        # Final prediction
        prediction = int(
            ensemble_probability >= threshold
        )

        result = (
            "Churn"
            if prediction == 1
            else "Not Churn"
        )

        return jsonify({
            "prediction": prediction,
            "result": result,
            "churn_probability": round(
                ensemble_probability * 100,
                2
            ),
            "threshold": threshold,
            "models_used": len(models)
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 400


# -----------------------------
# Run Flask
# -----------------------------
if __name__ == "__main__":
    app.run(debug=True)