"""
YOLOv8 training script for semiconductor defect bounding-box detection.

Dataset format (YOLO):
    dataset/
        images/
            train/  *.jpg
            val/    *.jpg
        labels/
            train/  *.txt   # YOLO format: <class_id> <cx> <cy> <w> <h> (normalized)
            val/    *.txt
        data.yaml

Usage:
    python yolo_train.py --data data.yaml --epochs 50 --imgsz 640 --batch 16
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


DEFECT_CLASSES = [
    "scratch",
    "crack",
    "contamination",
    "missing_pattern",
    "surface_defect",
    "other",
]


def create_data_yaml(dataset_dir: str, output_path: str = "data.yaml") -> str:
    """Auto-generate YOLO data.yaml from dataset directory."""
    import yaml

    train_img_dir = os.path.join(dataset_dir, "images", "train")
    val_img_dir   = os.path.join(dataset_dir, "images", "val")

    data = {
        "path":  os.path.abspath(dataset_dir),
        "train": "images/train",
        "val":   "images/val",
        "nc":    len(DEFECT_CLASSES),
        "names": DEFECT_CLASSES,
    }

    with open(output_path, "w") as f:
        yaml.dump(data, f, default_flow_style=False)

    print(f"✅ data.yaml written to: {output_path}")
    return output_path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train YOLOv8 Defect Detector")
    parser.add_argument("--data",       default="data.yaml",            help="Path to data.yaml")
    parser.add_argument("--dataset_dir",default=None,                   help="Auto-generate data.yaml from this dir")
    parser.add_argument("--model",      default="yolov8n.pt",           help="YOLOv8 base model (n/s/m/l/x)")
    parser.add_argument("--epochs",     type=int, default=50)
    parser.add_argument("--imgsz",      type=int, default=640)
    parser.add_argument("--batch",      type=int, default=16)
    parser.add_argument("--output_dir", default="weights",              help="Save weights here")
    parser.add_argument("--name",       default="defect_yolov8",        help="Run name")
    parser.add_argument("--device",     default="0",                    help="CUDA device or 'cpu'")
    return parser.parse_args()


def main():
    from ultralytics import YOLO

    args = parse_args()
    os.makedirs(args.output_dir, exist_ok=True)

    # Auto-generate data.yaml if dataset_dir provided
    if args.dataset_dir:
        args.data = create_data_yaml(args.dataset_dir)

    if not os.path.exists(args.data):
        print(f"❌ data.yaml not found: {args.data}")
        print("   Use --dataset_dir to auto-generate it, or create it manually.")
        sys.exit(1)

    print(f"\n🚀 Training YOLOv8 ({args.model}) for {args.epochs} epochs…")
    print(f"   Data     : {args.data}")
    print(f"   Img size : {args.imgsz}")
    print(f"   Batch    : {args.batch}")
    print(f"   Device   : {args.device}")

    model = YOLO(args.model)

    results = model.train(
        data=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        name=args.name,
        device=args.device,
        patience=15,
        save=True,
        save_period=10,
        val=True,
        plots=True,
        augment=True,
        hsv_h=0.015,
        hsv_s=0.5,
        hsv_v=0.4,
        flipud=0.5,
        fliplr=0.5,
        mosaic=1.0,
    )

    # Copy best weights to output dir
    import shutil
    best_pt = os.path.join("runs", "detect", args.name, "weights", "best.pt")
    if os.path.exists(best_pt):
        dest = os.path.join(args.output_dir, "yolov8_defect.pt")
        shutil.copy(best_pt, dest)
        print(f"\n✅ Best YOLOv8 weights saved to: {dest}")
    else:
        print(f"\n⚠️  Best weights not found at {best_pt} — check runs/ directory")

    print("\n🎉 YOLOv8 training complete!")


if __name__ == "__main__":
    main()
