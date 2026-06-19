"""
Synthetic wafer dataset generator for development / testing.
Produces realistic-looking grayscale wafer images with programmatically
drawn defects so the model and pipeline can be tested without real data.

Usage:
    python generate_synthetic_data.py --output_dir data --samples_per_class 200
"""
import argparse
import os
import random

import cv2
import numpy as np
from tqdm import tqdm

DEFECT_CLASSES = [
    "scratch",
    "crack",
    "contamination",
    "missing_pattern",
    "surface_defect",
    "other",
]


def _wafer_background(size: int = 512) -> np.ndarray:
    """Generate a realistic wafer-like background with subtle texture."""
    img = np.full((size, size, 3), 200, dtype=np.uint8)

    # Add circular wafer boundary
    center = size // 2
    cv2.circle(img, (center, center), center - 10, (180, 180, 185), -1)
    cv2.circle(img, (center, center), center - 10, (100, 100, 110), 2)

    # Add subtle die grid pattern
    step = size // 16
    for i in range(0, size, step):
        cv2.line(img, (i, 0), (i, size), (170, 170, 175), 1)
        cv2.line(img, (0, i), (size, i), (170, 170, 175), 1)

    # Add random noise texture
    noise = np.random.randint(-10, 10, img.shape, dtype=np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    return img


def _draw_scratch(img: np.ndarray) -> tuple:
    h, w = img.shape[:2]
    x1 = random.randint(50, w - 100)
    y1 = random.randint(50, h - 100)
    length = random.randint(60, 180)
    angle = random.uniform(0, 360)
    dx = int(length * np.cos(np.radians(angle)))
    dy = int(length * np.sin(np.radians(angle)))
    x2, y2 = x1 + dx, y1 + dy
    thickness = random.randint(1, 3)
    color = (random.randint(50, 100),) * 3
    cv2.line(img, (x1, y1), (x2, y2), color, thickness)
    bx = min(x1, x2) - 5
    by = min(y1, y2) - 5
    bw = abs(dx) + 10
    bh = abs(dy) + 10
    return img, (max(0, bx), max(0, by), bw, bh)


def _draw_crack(img: np.ndarray) -> tuple:
    h, w = img.shape[:2]
    x, y = random.randint(80, w - 80), random.randint(80, h - 80)
    num_segments = random.randint(3, 7)
    points = [(x, y)]
    for _ in range(num_segments):
        dx = random.randint(-30, 30)
        dy = random.randint(-30, 30)
        points.append((points[-1][0] + dx, points[-1][1] + dy))
    for i in range(len(points) - 1):
        cv2.line(img, points[i], points[i + 1], (40, 40, 50), random.randint(1, 2))
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    bx, by = max(0, min(xs) - 10), max(0, min(ys) - 10)
    bw = max(xs) - min(xs) + 20
    bh = max(ys) - min(ys) + 20
    return img, (bx, by, bw, bh)


def _draw_contamination(img: np.ndarray) -> tuple:
    h, w = img.shape[:2]
    x = random.randint(60, w - 60)
    y = random.randint(60, h - 60)
    radius = random.randint(15, 50)
    color = (
        random.randint(80, 130),
        random.randint(100, 160),
        random.randint(60, 120),
    )
    cv2.circle(img, (x, y), radius, color, -1)
    cv2.circle(img, (x, y), radius, (color[0] - 20, color[1] - 20, color[2] - 20), 2)
    return img, (x - radius, y - radius, radius * 2, radius * 2)


def _draw_missing_pattern(img: np.ndarray) -> tuple:
    h, w = img.shape[:2]
    # Blank out a die-grid cell
    step = w // 16
    col = random.randint(1, 14)
    row = random.randint(1, 14)
    bx, by = col * step, row * step
    bw, bh = step, step
    img[by : by + bh, bx : bx + bw] = random.randint(150, 200)
    return img, (bx, by, bw, bh)


def _draw_surface_defect(img: np.ndarray) -> tuple:
    h, w = img.shape[:2]
    x = random.randint(50, w - 80)
    y = random.randint(50, h - 80)
    rw = random.randint(20, 70)
    rh = random.randint(10, 40)
    # Elliptical discoloration
    overlay = img.copy()
    cv2.ellipse(overlay, (x, y), (rw, rh), random.uniform(0, 180), 0, 360,
                (random.randint(120, 160),) * 3, -1)
    img = cv2.addWeighted(img, 0.7, overlay, 0.3, 0)
    return img, (x - rw, y - rh, rw * 2, rh * 2)


def _draw_other(img: np.ndarray) -> tuple:
    h, w = img.shape[:2]
    # Random pixel cluster
    x = random.randint(40, w - 60)
    y = random.randint(40, h - 60)
    size = random.randint(5, 20)
    for _ in range(random.randint(10, 40)):
        px = x + random.randint(-size, size)
        py = y + random.randint(-size, size)
        cv2.circle(img, (px, py), random.randint(1, 3),
                   (random.randint(30, 80),) * 3, -1)
    return img, (x - size, y - size, size * 2, size * 2)


DRAW_FUNCS = {
    "scratch":         _draw_scratch,
    "crack":           _draw_crack,
    "contamination":   _draw_contamination,
    "missing_pattern": _draw_missing_pattern,
    "surface_defect":  _draw_surface_defect,
    "other":           _draw_other,
}


def generate_dataset(output_dir: str, samples_per_class: int = 200, img_size: int = 512):
    """
    Generate synthetic wafer defect images for train / val / test splits.
    80% train, 10% val, 10% test.
    """
    splits = {
        "train": int(samples_per_class * 0.8),
        "val":   int(samples_per_class * 0.1),
        "test":  samples_per_class - int(samples_per_class * 0.8) - int(samples_per_class * 0.1),
    }

    total = sum(splits.values()) * len(DEFECT_CLASSES)
    print(f"🖼️  Generating {total} synthetic wafer images…")

    for split, count in splits.items():
        for cls in DEFECT_CLASSES:
            out_dir = os.path.join(output_dir, split, cls)
            os.makedirs(out_dir, exist_ok=True)
            for i in tqdm(range(count), desc=f"{split}/{cls}", leave=False):
                img = _wafer_background(img_size)
                draw_fn = DRAW_FUNCS[cls]
                img, _ = draw_fn(img)
                path = os.path.join(out_dir, f"{cls}_{split}_{i:04d}.jpg")
                cv2.imwrite(path, img)

    print(f"\n✅ Dataset generated at: {output_dir}")
    print(f"   Structure: {output_dir}/{{train,val,test}}/<class_name>/*.jpg")


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Generate synthetic wafer defect dataset")
    p.add_argument("--output_dir",        default="data",    help="Output directory")
    p.add_argument("--samples_per_class", type=int, default=200)
    p.add_argument("--img_size",          type=int, default=512)
    return p.parse_args()


if __name__ == "__main__":
    args = parse_args()
    generate_dataset(args.output_dir, args.samples_per_class, args.img_size)
