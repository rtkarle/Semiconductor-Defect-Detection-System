"""
Model evaluation script — runs inference on a test set and prints full metrics.

Usage:
    python evaluate.py --model_path weights/defect_model.h5 \
                       --test_dir data/test
"""
import argparse
import os
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_model.utils.preprocessing import (
    DEFECT_CLASSES,
    preprocess_batch,
    scan_dataset_directory,
)
from ai_model.utils.visualization import plot_confusion_matrix


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate Defect Detection Model")
    parser.add_argument("--model_path", required=True, help="Path to .h5 model file")
    parser.add_argument("--test_dir",   required=True, help="Test dataset directory")
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--output_dir", default="eval_results")
    return parser.parse_args()


def main():
    import tensorflow as tf
    from sklearn.metrics import (
        classification_report,
        accuracy_score,
        f1_score,
        precision_score,
        recall_score,
    )

    args = parse_args()
    os.makedirs(args.output_dir, exist_ok=True)

    print(f"📦 Loading model: {args.model_path}")
    model = tf.keras.models.load_model(args.model_path)

    print(f"📂 Scanning test directory: {args.test_dir}")
    image_paths, labels = scan_dataset_directory(args.test_dir)
    if not image_paths:
        print("❌ No images found in test directory.")
        sys.exit(1)
    print(f"   Found {len(image_paths)} images across {len(set(labels))} classes")

    # ── Batched inference ─────────────────────────────────────────────────────
    all_preds = []
    start = time.time()
    for i in range(0, len(image_paths), args.batch_size):
        batch_paths = image_paths[i : i + args.batch_size]
        batch_arr = preprocess_batch(batch_paths)
        probs = model.predict(batch_arr, verbose=0)
        all_preds.extend(np.argmax(probs, axis=1).tolist())
        print(f"   Processed {min(i + args.batch_size, len(image_paths))}/{len(image_paths)}", end="\r")

    elapsed = time.time() - start
    print(f"\n⏱️  Inference time: {elapsed:.2f}s ({elapsed/len(image_paths)*1000:.1f} ms/image)")

    # ── Metrics ───────────────────────────────────────────────────────────────
    y_true = labels
    y_pred = all_preds

    acc       = accuracy_score(y_true, y_pred)
    f1_macro  = f1_score(y_true, y_pred, average="macro",     zero_division=0)
    f1_weight = f1_score(y_true, y_pred, average="weighted",  zero_division=0)
    precision = precision_score(y_true, y_pred, average="weighted", zero_division=0)
    recall    = recall_score(y_true, y_pred,    average="weighted", zero_division=0)

    print(f"\n{'='*50}")
    print(f"  Accuracy          : {acc*100:.2f}%")
    print(f"  F1 (macro)        : {f1_macro:.4f}")
    print(f"  F1 (weighted)     : {f1_weight:.4f}")
    print(f"  Precision (w)     : {precision:.4f}")
    print(f"  Recall    (w)     : {recall:.4f}")
    print(f"{'='*50}")

    report = classification_report(y_true, y_pred, target_names=DEFECT_CLASSES, zero_division=0)
    print("\nPer-Class Report:\n")
    print(report)

    # Save results
    report_path = os.path.join(args.output_dir, "eval_report.txt")
    with open(report_path, "w") as f:
        f.write(f"Model: {args.model_path}\n")
        f.write(f"Test Dir: {args.test_dir}\n")
        f.write(f"Total Images: {len(image_paths)}\n")
        f.write(f"Accuracy: {acc*100:.2f}%\n")
        f.write(f"F1 (weighted): {f1_weight:.4f}\n\n")
        f.write(report)
    print(f"\n📄 Evaluation report saved to: {report_path}")

    plot_confusion_matrix(
        y_true, y_pred,
        save_path=os.path.join(args.output_dir, "confusion_matrix.png"),
    )
    print(f"📊 Confusion matrix saved to: {args.output_dir}/confusion_matrix.png")


if __name__ == "__main__":
    main()
