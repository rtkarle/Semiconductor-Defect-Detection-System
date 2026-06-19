"""
Training script for the semiconductor defect detection CNN.

Usage:
    python train.py --train_dir data/train --val_dir data/val \
                    --epochs 30 --batch_size 32 --phase 1

Two-phase training:
    Phase 1: Feature extraction (EfficientNetB3 frozen, train head only)
    Phase 2: Fine-tuning (top 30 layers unfrozen, low LR)
"""
import argparse
import os
import sys

import numpy as np

# Allow running from project root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_model.model import (
    build_model,
    build_data_generators,
    get_callbacks,
    unfreeze_top_layers,
)
from ai_model.utils.visualization import plot_training_history, plot_confusion_matrix
from ai_model.utils.preprocessing import DEFECT_CLASSES


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train Defect Detection Model")
    parser.add_argument("--train_dir",   default="data/train",            help="Training data directory")
    parser.add_argument("--val_dir",     default="data/val",              help="Validation data directory")
    parser.add_argument("--output_dir",  default="weights",               help="Model output directory")
    parser.add_argument("--log_dir",     default="logs",                  help="TensorBoard log directory")
    parser.add_argument("--epochs",      type=int, default=30,            help="Training epochs")
    parser.add_argument("--batch_size",  type=int, default=32,            help="Batch size")
    parser.add_argument("--dropout",     type=float, default=0.4,         help="Dropout rate")
    parser.add_argument("--phase",       type=int, default=1, choices=[1, 2], help="Training phase")
    parser.add_argument("--weights",     default=None,                    help="Pre-trained weights to load (Phase 2)")
    parser.add_argument("--fine_tune_layers", type=int, default=30,       help="Layers to unfreeze in Phase 2")
    return parser.parse_args()


def evaluate_model(model, val_gen, output_dir: str):
    """Run full evaluation and save confusion matrix."""
    print("\n🔍 Evaluating model on validation set…")
    val_gen.reset()
    y_pred_probs = model.predict(val_gen, verbose=1)
    y_pred = np.argmax(y_pred_probs, axis=1)
    y_true = val_gen.classes[:len(y_pred)]

    from sklearn.metrics import classification_report
    report = classification_report(y_true, y_pred, target_names=DEFECT_CLASSES)
    print("\nClassification Report:")
    print(report)

    # Save report to file
    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, "classification_report.txt"), "w") as f:
        f.write(report)

    plot_confusion_matrix(
        y_true.tolist(), y_pred.tolist(),
        save_path=os.path.join(output_dir, "confusion_matrix.png"),
    )


def main():
    args = parse_args()

    # ── Validate dataset paths ────────────────────────────────────────────────
    for d in [args.train_dir, args.val_dir]:
        if not os.path.isdir(d):
            print(f"⚠️  Directory not found: {d}")
            print("   Create dataset in data/train/<class_name>/ and data/val/<class_name>/")
            sys.exit(1)

    os.makedirs(args.output_dir, exist_ok=True)

    # ── Data generators ───────────────────────────────────────────────────────
    print("📂 Loading datasets…")
    train_gen, val_gen = build_data_generators(
        train_dir=args.train_dir,
        val_dir=args.val_dir,
        batch_size=args.batch_size,
        augment=(args.phase == 1),
    )
    print(f"   Train samples: {train_gen.samples}")
    print(f"   Val   samples: {val_gen.samples}")
    print(f"   Classes:       {train_gen.class_indices}")

    # ── Build / load model ────────────────────────────────────────────────────
    if args.phase == 1:
        print("\n🏗️  Phase 1: Feature Extraction (EfficientNetB3 frozen)")
        model = build_model(freeze_base=True, dropout_rate=args.dropout)
    else:
        print("\n🔧  Phase 2: Fine-Tuning")
        if not args.weights:
            print("⚠️  --weights required for Phase 2")
            sys.exit(1)
        import tensorflow as tf
        model = tf.keras.models.load_model(args.weights)
        model = unfreeze_top_layers(model, num_layers=args.fine_tune_layers)

    model.summary()

    # ── Callbacks ─────────────────────────────────────────────────────────────
    ckpt_path = os.path.join(args.output_dir, "defect_model_best.h5")
    callbacks = get_callbacks(
        checkpoint_path=ckpt_path,
        log_dir=args.log_dir,
        patience=10 if args.phase == 2 else 8,
    )

    # ── Train ─────────────────────────────────────────────────────────────────
    print(f"\n🚀 Starting Phase {args.phase} training for {args.epochs} epochs…")
    history = model.fit(
        train_gen,
        epochs=args.epochs,
        validation_data=val_gen,
        callbacks=callbacks,
        verbose=1,
    )

    # ── Save final model ──────────────────────────────────────────────────────
    final_path = os.path.join(args.output_dir, "defect_model.h5")
    model.save(final_path)
    print(f"\n✅ Model saved to: {final_path}")

    # ── Visualizations ────────────────────────────────────────────────────────
    plot_training_history(
        history,
        save_path=os.path.join(args.output_dir, "training_history.png"),
    )
    evaluate_model(model, val_gen, args.output_dir)

    print("\n🎉 Training complete!")
    print(f"   Best checkpoint : {ckpt_path}")
    print(f"   Final model     : {final_path}")
    print(f"   Confusion matrix: {args.output_dir}/confusion_matrix.png")


if __name__ == "__main__":
    main()
