"""
Standalone inference script — run prediction on a single image or directory.

Usage:
    python inference.py --image path/to/wafer.jpg --model weights/defect_model.h5
    python inference.py --dir  path/to/images/    --model weights/defect_model.h5 --yolo weights/yolov8_defect.pt
"""
import argparse
import os
import sys
import time
from pathlib import Path

import cv2

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_model.utils.preprocessing import DEFECT_CLASSES, load_image, preprocess_for_classification
from ai_model.utils.visualization import draw_detections, save_annotated_image

SUPPORTED_EXTS = {".jpg", ".jpeg", ".png", ".tiff", ".bmp"}


def predict_with_tf(model, image_path: str) -> list[dict]:
    """Run TF/Keras classification inference."""
    import numpy as np

    img = load_image(image_path)
    tensor = preprocess_for_classification(img)
    probs = model.predict(tensor, verbose=0)[0]

    results = []
    for i, conf in enumerate(probs):
        if conf >= 0.45 and i < len(DEFECT_CLASSES):
            defect_type = DEFECT_CLASSES[i]
            from ai_model.utils.preprocessing import IMG_SIZE
            h, w = IMG_SIZE
            results.append(
                {
                    "defect_type": defect_type,
                    "confidence": round(float(conf), 4),
                    "severity": _get_severity(float(conf), defect_type),
                    "bbox_x": w // 4,
                    "bbox_y": h // 4,
                    "bbox_width": w // 2,
                    "bbox_height": h // 2,
                }
            )
    return results


def predict_with_yolo(model, image_path: str) -> list[dict]:
    """Run YOLOv8 detection inference."""
    results = model(image_path, verbose=False)
    detections = []
    for result in results:
        if result.boxes is None:
            continue
        for box in result.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            if cls_id >= len(DEFECT_CLASSES) or conf < 0.45:
                continue
            defect_type = DEFECT_CLASSES[cls_id]
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            detections.append(
                {
                    "defect_type": defect_type,
                    "confidence": round(conf, 4),
                    "severity": _get_severity(conf, defect_type),
                    "bbox_x": x1,
                    "bbox_y": y1,
                    "bbox_width": x2 - x1,
                    "bbox_height": y2 - y1,
                }
            )
    return detections


def _get_severity(confidence: float, defect_type: str) -> str:
    if defect_type in ("crack", "missing_pattern"):
        return "critical" if confidence >= 0.85 else "high"
    if defect_type == "contamination":
        if confidence >= 0.90:
            return "critical"
        return "high" if confidence >= 0.75 else "medium"
    if confidence >= 0.90:
        return "high"
    if confidence >= 0.70:
        return "medium"
    return "low"


def _print_results(image_path: str, detections: list[dict], elapsed_ms: int) -> None:
    print(f"\n{'─'*60}")
    print(f"  Image : {os.path.basename(image_path)}")
    print(f"  Time  : {elapsed_ms} ms")
    if not detections:
        print("  Result: ✅ No defects detected (PASS)")
    else:
        print(f"  Result: ⚠️  {len(detections)} defect(s) detected (FAIL)")
        for i, d in enumerate(detections, 1):
            print(
                f"  [{i}] {d['defect_type'].replace('_',' ').title():20s}"
                f"  Conf: {d['confidence']*100:.1f}%"
                f"  Severity: {d['severity'].upper()}"
            )
    print(f"{'─'*60}")


def run_inference(
    image_path: str,
    tf_model=None,
    yolo_model=None,
    save_annotated: bool = True,
    output_dir: str = "inference_output",
) -> list[dict]:
    start = time.perf_counter()

    if yolo_model is not None:
        detections = predict_with_yolo(yolo_model, image_path)
    elif tf_model is not None:
        detections = predict_with_tf(tf_model, image_path)
    else:
        raise ValueError("At least one model (TF or YOLO) must be provided.")

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    _print_results(image_path, detections, elapsed_ms)

    if save_annotated and detections:
        os.makedirs(output_dir, exist_ok=True)
        out_path = os.path.join(
            output_dir,
            f"annotated_{os.path.basename(image_path)}",
        )
        save_annotated_image(image_path, detections, out_path)
        print(f"  Saved : {out_path}")

    return detections


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Defect Inference")
    p.add_argument("--image",  default=None, help="Single image path")
    p.add_argument("--dir",    default=None, help="Directory of images")
    p.add_argument("--model",  default=None, help="TF/Keras .h5 model path")
    p.add_argument("--yolo",   default=None, help="YOLOv8 .pt weights path")
    p.add_argument("--output", default="inference_output", help="Output directory")
    p.add_argument("--no-save", action="store_true", help="Skip saving annotated images")
    return p.parse_args()


def main():
    import tensorflow as tf

    args = parse_args()

    if not args.model and not args.yolo:
        print("❌ Provide at least one of --model (TF/Keras) or --yolo (YOLOv8)")
        sys.exit(1)

    tf_model, yolo_model = None, None

    if args.model:
        print(f"📦 Loading TF model: {args.model}")
        tf_model = tf.keras.models.load_model(args.model)

    if args.yolo:
        from ultralytics import YOLO
        print(f"📦 Loading YOLO model: {args.yolo}")
        yolo_model = YOLO(args.yolo)

    image_paths = []
    if args.image:
        image_paths = [args.image]
    elif args.dir:
        image_paths = [
            str(p) for p in Path(args.dir).rglob("*")
            if p.suffix.lower() in SUPPORTED_EXTS
        ]
        print(f"Found {len(image_paths)} images in {args.dir}")
    else:
        print("❌ Provide --image or --dir")
        sys.exit(1)

    for img_path in image_paths:
        run_inference(
            img_path,
            tf_model=tf_model,
            yolo_model=yolo_model,
            save_annotated=not args.no_save,
            output_dir=args.output,
        )


if __name__ == "__main__":
    main()
