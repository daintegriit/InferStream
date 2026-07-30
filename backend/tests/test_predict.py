# backend/tests/test_predict.py

"""Tests the contract the API derives from the artifact, not a copy of it.

The bug these guard against: predict.py once carried a hand-maintained
23-column feature list that was correct for an earlier version of the model.
Two features were added in a retrain and the serving code never heard.
"""


async def test_schema_is_self_describing(live_client):
    response = await live_client.get("/predict/schema")
    assert response.status_code == 200

    models = response.json()["models"]
    assert models, "no models loaded"

    for model in models:
        assert model["features"], f"{model['model']} declares no features"
        for feature in model["features"]:
            assert feature["type"] in ("numeric", "categorical")
            if feature["type"] == "categorical":
                assert feature["allowed_values"], (
                    f"{feature['name']} is categorical with no vocabulary"
                )


async def test_predict_returns_probability(live_client, churn_features):
    response = await live_client.post(
        "/predict/", json={"model": "xgboost", "features": churn_features}
    )
    assert response.status_code == 200, response.text

    data = response.json()
    assert data["model"] == "xgboost"
    assert data["prediction"] in (0, 1)
    assert 0.0 <= data["probability"] <= 1.0
    # The label must follow from the probability, not be computed separately.
    assert data["prediction"] == int(data["probability"] >= 0.5)


async def test_payload_must_match_the_declared_contract(live_client):
    """Every required feature is named in the error, so a caller can fix it
    in one round trip."""
    response = await live_client.post(
        "/predict/", json={"model": "xgboost", "features": {"age": 30}}
    )
    assert response.status_code == 400

    detail = response.json()["detail"]
    assert "Missing required features" in detail
    assert "payment_method" in detail
    assert "favorite_genre" in detail


async def test_unknown_category_rejected(live_client, churn_features):
    """The encoder uses handle_unknown='ignore', which would zero the column
    and predict on a silently degraded vector. The API rejects instead."""
    payload = {**churn_features, "region": "Antarctica"}
    response = await live_client.post(
        "/predict/", json={"model": "xgboost", "features": payload}
    )
    assert response.status_code == 400
    assert "Antarctica" in response.json()["detail"]


async def test_unknown_model_is_404(async_test_client, churn_features):
    response = await async_test_client.post(
        "/predict/", json={"model": "nonexistent", "features": churn_features}
    )
    assert response.status_code == 404


async def test_fairness_sweep_covers_every_category(live_client, churn_features):
    response = await live_client.post(
        "/predict/fairness?attribute=payment_method",
        json={"model": "xgboost", "features": churn_features},
    )
    assert response.status_code == 200

    check = response.json()["fairness_check"]
    assert check["attribute"] == "payment_method"
    # A sweep of one value is not a counterfactual.
    assert len(check["probabilities"]) > 1
    assert check["max_spread"] >= 0
    assert check["observed_value"] == churn_features["payment_method"]