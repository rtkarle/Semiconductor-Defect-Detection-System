"""
Visualization utilities: plot training curves, confusion matrix,
bounding-box overlays, and grad-CAM heatmaps.
"""
from typing import List, Optional, Tuple

import cv2
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns

DEFECT_CLASSES = [
    "scratch", "crack", "contamination",
    "missing_pattern", "surface_defect", "other",
]

# BGR colors per severity (for OpenCV overlays)
SEVERITY_COLORS_BGR = {
    "low":      (0,   200, 0),
    "medium":   (0,   165, 255),
    "high":     (0,   0,   255),
    "critical": (0,   0,   180),
}


# ── Training history ─────────────────────────────────────────────────────────
def plot_training_history(history, save_path: str = "training_history.png") -> None:
    """Plot accuracy and loss curves from a Keras History object."""
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # Accuracy
    axes[0].plot(history.history["accuracy"],       label="Train Acc",  lw=2)
    axes[0].plot(history.history["val_accuracy"],   label="Val Acc",    lw=2, linestyle="--")
    axes[0].set_title("Model Accuracy",  fontsize=14, fontweight="bold")
    axes[0].set_xlabel("Epoch")
    axes[0].set_ylabel("Accuracy")
    axes[0].legend()
    axes[0].grid(True, alpha=0.3)

    # Loss
    axes[1].plot(history.history["loss"],     label="Train Loss", lw=2)
    axes[1].plot(history.history["val_loss"], label="Val Loss",   lw=2, linestyle="--")
    axes[1].set_title("Model Loss",      fontsize=14, fontweight="bold")
    axes[1].set_xlabel("Epoch")
    axes[1].set_ylabel("Loss")
    axes[1].legend()
    axes[1].grid(True, alpha=0.3)

    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Training history saved to {save_path}")


# ── Confusion matrix ──────────────────────────────────────────────────────────
def plot_confusion_matrix(
    y_true: List[int],
    y_pred: List[int],
    save_path: str = "confusion_matrix.png",
) -> None:
    """Plot and save a labeled confusion matrix."""
    from sklearn.metrics import confusion_matrix

    cm = confusion_matrix(y_true, y_pred, labels=list(range(len(DEFECT_CLASSES))))
    fig, ax = plt.subplots(figsize=(10, 8))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=[c.replace("_", "\n") for c in DEFECT_CLASSES],
        yticklabels=[c.replace("_", "\n") for c in DEFECT_CLASSES],
        ax=ax,
    )
    ax.set_xlabel("Predicted Label", fontsize=12)
    ax.set_ylabel("True Label",      fontsize=12)
    ax.set_title("Defect Detection Confusion Matrix", fontsize=14, fontweight="bold")
    plt.tight_layout()
    plt.savefig(save_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"Confusion matrix saved to {save_path}")


# ── Bounding box overlay ──────────────────────────────────────────────────────
def draw_detections(
    image_bgr: np.ndarray,
    detections: List[dict],
    show_confidence: bool = True,
) -> np.ndarray:
    """
    Draw detection results (bbox + label) on a BGR image.

    Each detection dict must have:
        defect_type, confidence, severity,
        bbox_x, bbox_y, bbox_width, bbox_height
    """
    output = image_bgr.copy()

    for det in detections:
        x  = det.get("bbox_x", 0)
        y  = det.get("bbox_y", 0)
        w  = det.get("bbox_width", 50)
        h  = det.get("bbox_height", 50)
        label = det.get("defect_type", "unknown").replace("_", " ").title()
        conf  = det.get("confidence", 0.0)
        sev   = det.get("severity", "medium")

        color = SEVERITY_COLORS_BGR.get(sev, (255, 0, 0))

        # Bounding box
        cv2.rectangle(output, (x, y), (x + w, y + h), color, 2)

        # Label background + text
        text = f"{label} {conf*100:.0f}%" if show_confidence else label
        (tw, th), baseline = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 2)
        cv2.rectangle(output, (x, y - th - baseline - 6), (x + tw + 6, y), color, -1)
        cv2.putText(
            output, text, (x + 3, y - baseline - 2),
            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2, cv2.LINE_AA,
        )

    return output


def save_annotated_image(
    image_path: str,
    detections: List[dict],
    output_path: Optional[str] = None,
) -> str:
    """Load image, draw detections, save to output_path."""
    import os
    img = cv2.imread(image_path)
    if img is None:
        raise FileNotFoundError(f"Image not found: {image_path}")
    annotated = draw_detections(img, detections)
    if output_path is None:
        base, ext = os.path.splitext(image_path)
        output_path = f"{base}_annotated{ext}"
    cv2.imwrite(output_path, annotated)
    return output_path


# ── Grad-CAM heatmap ──────────────────────────────────────────────────────────
def generate_gradcam(
    model,
    image_array: np.ndarray,
    class_idx: int,
    last_conv_layer_name: str = "conv5_block3_out",
    save_path: Optional[str] = None,
) -> np.ndarray:
    """
    Generate a Grad-CAM heatmap to visualize which regions activated the prediction.

    Args:
        model:               Keras model
        image_array:         (1, H, W, 3) normalized float32
        class_idx:           Target class index
        last_conv_layer_name: Name of the last conv layer
        save_path:           Optional path to save visualization

    Returns:
        heatmap: (H, W, 3) uint8 BGR visualization
    """
    import tensorflow as tf

    grad_model = tf.keras.models.Model(
        inputs=model.inputs,
        outputs=[model.get_layer(last_conv_layer_name).output, model.output],
    )

    with tf.GradientTape() as tape:
        conv_outputs, predictions = grad_model(image_array)
        loss = predictions[:, class_idx]

    grads = tape.gradient(loss, conv_outputs)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    conv_outputs = conv_outputs[0]
    heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
    heatmap = tf.squeeze(heatmap)
    heatmap = tf.maximum(heatmap, 0) / (tf.math.reduce_max(heatmap) + 1e-8)
    heatmap = heatmap.numpy()

    # Resize to original image size
    h, w = image_array.shape[1:3]
    heatmap_resized = cv2.resize(heatmap, (w, h))
    heatmap_uint8 = np.uint8(255 * heatmap_resized)
    heatmap_color = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)

    # Superimpose on original image
    original = np.uint8(image_array[0] * 255)
    original_bgr = cv2.cvtColor(original, cv2.COLOR_RGB2BGR)
    superimposed = cv2.addWeighted(original_bgr, 0.6, heatmap_color, 0.4, 0)

    if save_path:
        cv2.imwrite(save_path, superimposed)

    return superimposed
