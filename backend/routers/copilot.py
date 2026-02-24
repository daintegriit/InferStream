from fastapi import APIRouter, Body

router = APIRouter(prefix="/copilot", tags=["copilot"])

@router.post("/")
def explain_prediction(payload: dict = Body(...)):
    explanation = payload.get("explanation", {})
    prediction = payload.get("prediction", "unknown")

    # Rank top feature
    top_feature = max(explanation.items(), key=lambda x: abs(x[1]))[0]

    summary = (
        f"The prediction '{prediction}' was primarily influenced by the feature "
        f"'{top_feature}', which had the highest SHAP impact in the input vector."
    )

    return {"copilot_response": summary}
