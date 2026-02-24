# backend/services/shap_explainer.py

import shap
import numpy as np
import logging
import xgboost as xgb
import torch
from sklearn.base import BaseEstimator
from tensorflow.keras.models import Model

logger = logging.getLogger(__name__)

# -------- Main SHAP Entry Point -------- #
def get_shap_values(model_type: str, model_obj, input_array: np.ndarray) -> list:
    try:
        if model_type in ["xgboost", "sklearn"]:
            explainer = shap.Explainer(model_obj)
            shap_vals = explainer(input_array)
            return shap_vals.values[0].tolist()

        elif model_type == "pytorch":
            model_obj.eval()
            with torch.no_grad():
                f = lambda x: model_obj(torch.tensor(x, dtype=torch.float32)).detach().numpy()
                explainer = shap.KernelExplainer(f, shap.sample(input_array, 1))
                shap_vals = explainer.shap_values(input_array)
                return shap_vals[0].tolist() if isinstance(shap_vals, list) else shap_vals.tolist()

        elif model_type == "keras":
            f = lambda x: model_obj.predict(x)
            explainer = shap.KernelExplainer(f, shap.sample(input_array, 1))
            shap_vals = explainer.shap_values(input_array)
            return shap_vals[0].tolist() if isinstance(shap_vals, list) else shap_vals.tolist()

        else:
            logger.warning(f"[SHAP] Unsupported model type: {model_type}")
            return []

    except Exception as e:
        logger.warning(f"[SHAP] Explainability failed for {model_type}: {e}")
        return []
