"""
Image preprocessing utilities for the semiconductor defect detection pipeline.
Handles loading, augmentation, normalization, and dataset preparation.
"""
import os
from pathlib import Path
from typing import Tuple, List, Optional

import cv2
import numpy as np
from PIL import Image


# ── Constants ─────────────────────────────────────────────────────────────────
IMG_SIZE = (224, 224)          # Input size for classification model
YOLO_SIZE = (640, 640)         # Input size for YOLOv8
DEFECT_CLASSES = [
    "scratch",
    "crack",
    "contamination",
    "missing_pattern",
    "surface_defect",
    "other",
]
CLASS_TO_IDX = {cls: i for i, cls in enumerate(DEFECT_CLASSES)}
IDX_TO_CLASS = {i: cls for cls, i in CLASS_TO_IDX.items()}


# ── Image loading ─────────────────────────────────────────────────────────────
def load_image(path: str, size: Tuple[int, int] = IMG_SIZE) -> np.ndarray:
    """
    Load an image from disk, convert to RGB, resize, and normalize to [0,1].
    Returns shape: (H, W, 3) float32
    """
    img = cv2.imread(path)
    if img is None:
        raise FileNotFoundError(f"Cannot load image: {path}")
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, size, interpolation=cv2.INTER_AREA)
    return img_resized.astype(np.float32) / 255.0


def load_image_pil(path: str, size: Tuple[int, int] = IMG_SIZE) -> Image.Image:
    """Load and resize image using PIL."""
    img = Image.open(path).convert("RGB")
    return img.resize(size, Image.LANCZOS)


def load_image_raw(path: str) -> np.ndarray:
    """Load raw BGR image without any preprocessing."""
    img = cv2.imread(path)
    if img is None:
        raise FileNotFoundError(f"Cannot load image: {path}")
    return img


# ── Preprocessing pipeline ────────────────────────────────────────────────────
def preprocess_for_classification(image: np.ndarray) -> np.ndarray:
    """
    Prepare a single image array for classification model inference.
    Input:  (H, W, 3) uint8 or float32
    Output: (1, 224, 224, 3) float32 normalized
    """
    if image.dtype != np.float32:
        image = image.astype(np.float32)
    if image.max() > 1.0:
        image = image / 255.0
    if image.shape[:2] != IMG_SIZE:
        image = cv2.resize(image, IMG_SIZE)
    return np.expand_dims(image, axis=0)


def preprocess_batch(image_paths: List[str]) -> np.ndarray:
    """
    Load and preprocess a batch of images.
    Returns: (N, 224, 224, 3) float32
    """
    batch = []
    for path in image_paths:
        img = load_image(path)
        batch.append(img)
    return np.array(batch, dtype=np.float32)


# ── Augmentation ──────────────────────────────────────────────────────────────
def augment_image(image: np.ndarray, seed: Optional[int] = None) -> np.ndarray:
    """
    Apply random augmentations for training data enrichment.
    Input/Output: (H, W, 3) float32 [0, 1]
    """
    rng = np.random.default_rng(seed)

    # Random horizontal flip
    if rng.random() > 0.5:
        image = np.fliplr(image)

    # Random vertical flip
    if rng.random() > 0.5:
        image = np.flipud(image)

    # Random rotation (0°, 90°, 180°, 270°)
    k = rng.integers(0, 4)
    image = np.rot90(image, k)

    # Random brightness shift ±0.15
    delta = rng.uniform(-0.15, 0.15)
    image = np.clip(image + delta, 0.0, 1.0)

    # Random contrast adjustment [0.8, 1.2]
    factor = rng.uniform(0.8, 1.2)
    mean = image.mean()
    image = np.clip((image - mean) * factor + mean, 0.0, 1.0)

    # Gaussian noise (σ = 0.01)
    if rng.random() > 0.7:
        noise = rng.normal(0, 0.01, image.shape).astype(np.float32)
        image = np.clip(image + noise, 0.0, 1.0)

    return image.astype(np.float32)


def apply_clahe(image_bgr: np.ndarray) -> np.ndarray:
    """
    Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to enhance
    wafer surface features.
    Input/Output: (H, W, 3) uint8 BGR
    """
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    l_enhanced = clahe.apply(l_channel)
    enhanced = cv2.merge([l_enhanced, a_channel, b_channel])
    return cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)


def denoise_image(image_bgr: np.ndarray) -> np.ndarray:
    """Apply Non-local Means Denoising to reduce sensor noise."""
    return cv2.fastNlMeansDenoisingColored(image_bgr, None, h=10, hColor=10,
                                            templateWindowSize=7, searchWindowSize=21)


def enhance_edges(image_bgr: np.ndarray) -> np.ndarray:
    """
    Use Canny edge detection to generate an edge-enhanced overlay.
    Returns a 3-channel edge map (uint8).
    """
    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, threshold1=50, threshold2=150)
    return cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)


# ── Wafer-specific analysis ───────────────────────────────────────────────────
def compute_image_stats(image_path: str) -> dict:
    """
    Compute basic image statistics useful for quality control.
    """
    img = cv2.imread(image_path)
    if img is None:
        return {}
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return {
        "mean": float(np.mean(gray)),
        "std": float(np.std(gray)),
        "min": int(np.min(gray)),
        "max": int(np.max(gray)),
        "contrast": float(np.std(gray) / (np.mean(gray) + 1e-8)),
        "height": img.shape[0],
        "width": img.shape[1],
        "channels": img.shape[2] if len(img.shape) > 2 else 1,
    }


def detect_blobs(image_path: str) -> List[dict]:
    """
    Detect bright/dark blobs in a wafer image using SimpleBlobDetector.
    Returns a list of blob dicts with keys: x, y, size.
    """
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return []

    params = cv2.SimpleBlobDetector_Params()
    params.filterByArea = True
    params.minArea = 50
    params.maxArea = 5000
    params.filterByCircularity = False
    params.filterByConvexity = False
    params.filterByInertia = False

    detector = cv2.SimpleBlobDetector_create(params)
    keypoints = detector.detect(img)

    return [
        {"x": int(kp.pt[0]), "y": int(kp.pt[1]), "size": float(kp.size)}
        for kp in keypoints
    ]


# ── Dataset directory scanner ─────────────────────────────────────────────────
def scan_dataset_directory(root_dir: str) -> Tuple[List[str], List[int]]:
    """
    Scan a dataset directory structured as:
        root_dir/
            scratch/      ← folder name = class label
            crack/
            contamination/
            ...

    Returns:
        image_paths: list of absolute image paths
        labels:      corresponding integer class indices
    """
    image_paths: List[str] = []
    labels: List[int] = []

    root = Path(root_dir)
    for class_name in DEFECT_CLASSES:
        class_dir = root / class_name
        if not class_dir.exists():
            continue
        for ext in ("*.jpg", "*.jpeg", "*.png", "*.tiff", "*.bmp"):
            for img_file in class_dir.glob(ext):
                image_paths.append(str(img_file))
                labels.append(CLASS_TO_IDX[class_name])

    return image_paths, labels
