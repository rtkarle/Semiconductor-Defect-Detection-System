"""
AI prediction service.
Wraps the AI model pipeline: image preprocessing → model inference → postprocessing.
Falls back to a deterministic mock when model weights are not present (dev mode).
"""
import logging
import os
import time
from typing import Any

import cv2
import numpy as np

from app.core.config import settings
from app.utils.helpers import get_recommendation, get_severity_from_confidence

logger = logging.getLogger(__name__)

# Defect class labels (must match training order)
DEFECT_CLASSES = [
    "scratch",
    "crack",
    "contamination",
    "missing_pattern",
    "surface_defect",
    "other",
]


def _load_tf_model():
    """Lazy-load TensorFlow / Keras model. Returns None if weights missing."""
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
    """Lazy-load YOLOv8 model. Returns None if weights missing."""
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


# Module-level model cache
_tf_model = None
_yolo_model = None
_models_loaded = False


def _ensure_models():
    global _tf_model, _yolo_model, _models_loaded
    if not _models_loaded:
        _tf_model = _load_tf_model()
        _yolo_model = _load_yolo_model()
        _models_loaded = True


def _preprocess_image(image_path: str, target_size: tuple = (224, 224)) -> np.ndarray:
    """Load and preprocess image for classification model."""
    img = cv2.imread(image_path)
    if img is None:
        raise ValueError(f"Cannot read image at path: {image_path}")
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, target_size)
    img_norm = img_resized.astype(np.float32) / 255.0
    return np.expand_dims(img_norm, axis=0)  # (1, H, W, C)


def _draw_bounding_box(
    image_path: str,
    bbox: tuple,
    label: str,
    confidence: float,
    severity: str,
) -> str:
    """Draw bounding box on image and save annotated version. Returns save path."""
    img = cv2.imread(image_path)
    if img is None:
        return image_path

    x, y, w, h = bbox
    # Color by severity
    colors = {
        "low":      (0, 200, 0),
        "medium":   (0, 165, 255),
        "high":     (0, 0, 255),
        "critical": (0, 0, 180),
    }
    color = colors.get(severity, (255, 0, 0))

    cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)
    text = f"{label.replace('_', ' ').title()} {confidence*100:.0f}%"
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
    cv2.rectangle(img, (x, y - th - 8), (x + tw + 4, y), color, -1)
    cv2.putText(img, text, (x + 2, y - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

    # Save annotated image
    base, ext = os.path.splitext(image_path)
    annotated_path = f"{base}_annotated{ext}"
    cv2.imwrite(annotated_path, img)
    return annotated_path


def _mock_prediction(image_path: str) -> list[dict]:
    """
    Deterministic mock used when model weights are absent (dev / CI environment).
    Analyses basic image statistics to produce a plausible result.
    """
    img = cv2.imread(image_path)
    if img is None:
        return []

    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    mean_val = float(np.mean(gray))
    std_val = float(np.std(gray))

    # Derive a pseudo-random but deterministic defect based on image statistics
    idx = int(mean_val) % len(DEFECT_CLASSES)
    defect_type = DEFECT_CLASSES[idx]
    confidence = min(0.99, max(0.55, std_val / 80.0))
    severity = get_severity_from_confidence(confidence, defect_type)

    h, w = img.shape[:2]
    bbox = (w // 4, h // 4, w // 3, h // 3)
    annotated_path = _draw_bounding_box(image_path, bbox, defect_type, confidence, severity)

    return [
        {
            "defect_type": defect_type,
            "confidence": round(confidence, 4),
            "severity": severity,
            "bbox_x": bbox[0],
            "bbox_y": bbox[1],
            "bbox_width": bbox[2],
            "bbox_height": bbox[3],
            "annotated_image_path": annotated_path,
            "recommendation": get_recommendation(defect_type),
        }
    ]


def _run_tf_classification(image_path: str, model) -> list[dict]:
    """Run TensorFlow Keras classification model."""
    img_tensor = _preprocess_image(image_path)
    predictions = model.predict(img_tensor, verbose=0)[0]  # shape: (num_classes,)

    detections = []
    for i, confidence in enumerate(predictions):
        if confidence >= settings.CONFIDENCE_THRESHOLD and i < len(DEFECT_CLASSES):
            defect_type = DEFECT_CLASSES[i]
            severity = get_severity_from_confidence(float(confidence), defect_type)

            # Generate rough center bbox for visualisation
            img = cv2.imread(image_path)
            h, w = img.shape[:2] if img is not None else (224, 224)
            bw, bh = max(40, w // 4), max(40, h // 4)
            bx = (w - bw) // 2
            by = (h - bh) // 2
            annotated_path = _draw_bounding_box(
                image_path, (bx, by, bw, bh), defect_type, float(confidence), severity
            )
            detections.append(
                {
                    "defect_type": defect_type,
                    "confidence": round(float(confidence), 4),
                    "severity": severity,
                    "bbox_x": bx,
                    "bbox_y": by,
                    "bbox_width": bw,
                    "bbox_height": bh,
                    "annotated_image_path": annotated_path,
                    "recommendation": get_recommendation(defect_type),
                }
            )
    return detections


def _run_yolo_detection(image_path: str, model) -> list[dict]:
    """Run YOLOv8 object detection model."""
    results = model(image_path, conf=settings.CONFIDENCE_THRESHOLD, verbose=False)
    detections = []
    for result in results:
        boxes = result.boxes
        if boxes is None:
            continue
        for box in boxes:
            cls_id = int(box.cls[0])
            confidence = float(box.conf[0])
            if cls_id >= len(DEFECT_CLASSES):
                continue
            defect_type = DEFECT_CLASSES[cls_id]
            severity = get_severity_from_confidence(confidence, defect_type)

            x1, y1, x2, y2 = map(int, box.xyxy[0])
            bx, by, bw, bh = x1, y1, x2 - x1, y2 - y1
            annotated_path = _draw_bounding_box(
                image_path, (bx, by, bw, bh), defect_type, confidence, severity
            )
            detections.append(
                {
                    "defect_type": defect_type,
                    "confidence": round(confidence, 4),
                    "severity": severity,
                    "bbox_x": bx,
                    "bbox_y": by,
                    "bbox_width": bw,
                    "bbox_height": bh,
                    "annotated_image_path": annotated_path,
                    "recommendation": get_recommendation(defect_type),
                }
            )
    return detections


async def run_prediction(image_path: str, scan_id: int) -> dict[str, Any]:
    """
    Main prediction entry point.
    Priority: YOLOv8 → TF/Keras → mock
    Returns a dict with keys: width, height, processing_time_ms, detections
    """
    _ensure_models()
    start = time.perf_counter()

    img = cv2.imread(image_path)
    height, width = (img.shape[:2] if img is not None else (None, None))

    if _yolo_model is not None:
        logger.info("[Scan %s] Running YOLOv8 inference", scan_id)
        detections = _run_yolo_detection(image_path, _yolo_model)
    elif _tf_model is not None:
        logger.info("[Scan %s] Running TF/Keras inference", scan_id)
        detections = _run_tf_classification(image_path, _tf_model)
    else:
        logger.warning("[Scan %s] No model weights found — using mock prediction", scan_id)
        detections = _mock_prediction(image_path)

    elapsed_ms = int((time.perf_counter() - start) * 1000)

    return {
        "width": width,
        "height": height,
        "processing_time_ms": elapsed_ms,
        "detections": detections,
    }
