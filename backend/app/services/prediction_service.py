"""
AI prediction service.
Uses PIL + numpy for image processing (no OpenCV dependency on Render).
Falls back to mock prediction when model weights are absent.
"""
import logging
import os
import time
from typing import Any

import numpy as np
from PIL import Image

from app.core.config import settings
from app.utils.helpers import get_recommendation, get_severity_from_confidence

logger = logging.getLogger(__name__)

DEFECT_CLASSES = [
    "scratch", "crack", "contamination",
    "missing_pattern", "surface_defect", "other",
]

# ── Module-level model cache ──────────────────────────────────
_tf_model     = None
_yolo_model   = None
_models_loaded = False


def _load_tf_model():
    if not os.path.exists(settings.MODEL_WEIGHTS_PATH):
        return None
    try:
        import tensorflow as tf
        model = tf.keras.models.load_model(settings.MODEL_WEIGHTS_PATH)
        logger.info("TF model loaded from %s", settings.MODEL_WEIGHTS_PATH)
        return model
    except Exception as exc:
        logger.warning("Failed to load TF model: %s", exc)
        return None


def _load_yolo_model():
    if not os.path.exists(settings.YOLO_WEIGHTS_PATH):
        return None
    try:
        from ultralytics import YOLO
        model = YOLO(settings.YOLO_WEIGHTS_PATH)
        logger.info("YOLO model loaded from %s", settings.YOLO_WEIGHTS_PATH)
        return model
    except Exception as exc:
        logger.warning("Failed to load YOLO model: %s", exc)
        return None


def _ensure_models():
    global _tf_model, _yolo_model, _models_loaded
    if not _models_loaded:
        _tf_model   = _load_tf_model()
        _yolo_model = _load_yolo_model()
        _models_loaded = True


def _get_image_size(image_path: str):
    """Get image dimensions using PIL."""
    try:
        with Image.open(image_path) as img:
            return img.width, img.height
    except Exception:
        return None, None


def _draw_bbox_pil(image_path: str, bbox: tuple, label: str,
                   confidence: float, severity: str) -> str:
    """Draw bounding box on image using PIL. Returns saved annotated path."""
    try:
        from PIL import ImageDraw, ImageFont

        img = Image.open(image_path).convert("RGB")
        draw = ImageDraw.Draw(img)

        x, y, w, h = bbox
        color_map = {
            "low": (0, 200, 0), "medium": (255, 165, 0),
            "high": (255, 69, 0), "critical": (220, 38, 38),
        }
        color = color_map.get(severity, (255, 0, 0))

        # Draw rectangle
        draw.rectangle([x, y, x + w, y + h], outline=color, width=3)

        # Draw label background
        text = f"{label.replace('_', ' ').title()} {confidence*100:.0f}%"
        draw.rectangle([x, y - 22, x + len(text) * 8, y], fill=color)
        draw.text((x + 2, y - 20), text, fill=(255, 255, 255))

        base, ext = os.path.splitext(image_path)
        annotated_path = f"{base}_annotated{ext}"
        img.save(annotated_path)
        return annotated_path
    except Exception as exc:
        logger.warning("Could not draw bbox: %s", exc)
        return image_path


def _mock_prediction(image_path: str) -> list[dict]:
    """
    Mock prediction using PIL + numpy — no OpenCV needed.
    Deterministic based on image statistics.
    """
    try:
        with Image.open(image_path).convert("L") as img:
            arr = np.array(img, dtype=np.float32)
            mean_val = float(np.mean(arr))
            std_val  = float(np.std(arr))
            width, height = img.size
    except Exception as exc:
        logger.error("Cannot open image %s: %s", image_path, exc)
        return []

    idx         = int(mean_val) % len(DEFECT_CLASSES)
    defect_type = DEFECT_CLASSES[idx]
    confidence  = min(0.99, max(0.55, std_val / 80.0))
    severity    = get_severity_from_confidence(confidence, defect_type)

    bx = width  // 4
    by = height // 4
    bw = width  // 3
    bh = height // 3

    annotated_path = _draw_bbox_pil(
        image_path, (bx, by, bw, bh), defect_type, confidence, severity
    )

    return [{
        "defect_type":          defect_type,
        "confidence":           round(confidence, 4),
        "severity":             severity,
        "bbox_x":               bx,
        "bbox_y":               by,
        "bbox_width":           bw,
        "bbox_height":          bh,
        "annotated_image_path": annotated_path,
        "recommendation":       get_recommendation(defect_type),
    }]


async def run_prediction(image_path: str, scan_id: int) -> dict[str, Any]:
    """
    Main prediction entry point.
    Priority: YOLOv8 → TF/Keras → mock (PIL-based, no OpenCV)
    """
    _ensure_models()
    start = time.perf_counter()

    width, height = _get_image_size(image_path)

    if _yolo_model is not None:
        logger.info("[Scan %s] Running YOLOv8", scan_id)
        from app.services._yolo_predict import run_yolo
        detections = run_yolo(_yolo_model, image_path)
    elif _tf_model is not None:
        logger.info("[Scan %s] Running TF/Keras", scan_id)
        from app.services._tf_predict import run_tf
        detections = run_tf(_tf_model, image_path)
    else:
        logger.warning("[Scan %s] No weights — using mock prediction", scan_id)
        detections = _mock_prediction(image_path)

    elapsed_ms = int((time.perf_counter() - start) * 1000)

    return {
        "width":              width,
        "height":             height,
        "processing_time_ms": elapsed_ms,
        "detections":         detections,
    }
