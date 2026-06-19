"""
CNN Classification Model for Semiconductor Defect Detection.

Architecture:
  - Base: EfficientNetB3 (ImageNet pre-trained) — proven on small industrial datasets
  - Head: Global Average Pooling → BN → Dropout → Dense(256) → Dropout → Softmax(6)
  - Supports two training phases:
      Phase 1: Feature extraction (base frozen)
      Phase 2: Fine-tuning (top N layers unfrozen)
"""
import os
from typing import Optional, Tuple

import numpy as np
import tensorflow as tf
from tensorflow.keras import layers, models, optimizers, regularizers
from tensorflow.keras.applications import EfficientNetB3
from tensorflow.keras.callbacks import (
    EarlyStopping,
    ModelCheckpoint,
    ReduceLROnPlateau,
    TensorBoard,
)

from ai_model.utils.preprocessing import DEFECT_CLASSES, IMG_SIZE

NUM_CLASSES = len(DEFECT_CLASSES)
INPUT_SHAPE = (*IMG_SIZE, 3)   # (224, 224, 3)


# ── Model builder ─────────────────────────────────────────────────────────────
def build_model(
    num_classes: int = NUM_CLASSES,
    input_shape: Tuple[int, int, int] = INPUT_SHAPE,
    dropout_rate: float = 0.40,
    l2_reg: float = 1e-4,
    freeze_base: bool = True,
) -> tf.keras.Model:
    """
    Build the EfficientNetB3-based defect classification model.

    Args:
        num_classes:   Number of output classes (default 6).
        input_shape:   Input tensor shape (H, W, C).
        dropout_rate:  Dropout probability in the classifier head.
        l2_reg:        L2 regularization strength.
        freeze_base:   Whether to freeze the EfficientNetB3 base (Phase 1).

    Returns:
        Compiled Keras model.
    """
    # ── Base model ────────────────────────────────────────────────────────────
    base = EfficientNetB3(
        include_top=False,
        weights="imagenet",
        input_shape=input_shape,
        pooling=None,
    )
    base.trainable = not freeze_base

    # ── Classification head ───────────────────────────────────────────────────
    inputs = layers.Input(shape=input_shape, name="input_image")

    # EfficientNet expects [0, 255] uint8 — we scale here from [0, 1]
    x = layers.Rescaling(255.0, name="rescale_to_255")(inputs)

    x = base(x, training=False)
    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.BatchNormalization(name="bn_head")(x)
    x = layers.Dropout(dropout_rate, name="dropout_1")(x)
    x = layers.Dense(
        256,
        activation="relu",
        kernel_regularizer=regularizers.l2(l2_reg),
        name="dense_256",
    )(x)
    x = layers.Dropout(dropout_rate / 2, name="dropout_2")(x)
    outputs = layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = models.Model(inputs=inputs, outputs=outputs, name="DefectClassifier")

    # ── Compile ───────────────────────────────────────────────────────────────
    model.compile(
        optimizer=optimizers.Adam(learning_rate=1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def unfreeze_top_layers(model: tf.keras.Model, num_layers: int = 30) -> tf.keras.Model:
    """
    Unfreeze the top N layers of the EfficientNetB3 base for fine-tuning (Phase 2).
    Re-compiles with a lower learning rate.
    """
    base_model = model.get_layer("efficientnetb3")
    base_model.trainable = True

    # Freeze everything except the last `num_layers` layers
    for layer in base_model.layers[:-num_layers]:
        layer.trainable = False

    model.compile(
        optimizer=optimizers.Adam(learning_rate=1e-5),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    print(f"Fine-tuning: unfroze top {num_layers} layers of EfficientNetB3.")
    return model


# ── Callbacks ─────────────────────────────────────────────────────────────────
def get_callbacks(
    checkpoint_path: str = "weights/defect_model_best.h5",
    log_dir: str = "logs/",
    patience: int = 8,
) -> list:
    os.makedirs(os.path.dirname(checkpoint_path), exist_ok=True)
    os.makedirs(log_dir, exist_ok=True)
    return [
        ModelCheckpoint(
            filepath=checkpoint_path,
            monitor="val_accuracy",
            save_best_only=True,
            verbose=1,
        ),
        EarlyStopping(
            monitor="val_loss",
            patience=patience,
            restore_best_weights=True,
            verbose=1,
        ),
        ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.3,
            patience=4,
            min_lr=1e-7,
            verbose=1,
        ),
        TensorBoard(log_dir=log_dir, histogram_freq=1),
    ]


# ── Data generators ───────────────────────────────────────────────────────────
def build_data_generators(
    train_dir: str,
    val_dir: str,
    batch_size: int = 32,
    img_size: Tuple[int, int] = IMG_SIZE,
    augment: bool = True,
):
    """
    Build Keras ImageDataGenerators for train and validation splits.
    Expects directory layout:
        train_dir/
            scratch/
            crack/
            ...
        val_dir/
            scratch/
            crack/
            ...
    """
    from tensorflow.keras.preprocessing.image import ImageDataGenerator

    train_datagen = ImageDataGenerator(
        rescale=1.0 / 255,
        rotation_range=20 if augment else 0,
        width_shift_range=0.10 if augment else 0,
        height_shift_range=0.10 if augment else 0,
        shear_range=0.10 if augment else 0,
        zoom_range=0.15 if augment else 0,
        horizontal_flip=augment,
        vertical_flip=augment,
        brightness_range=[0.85, 1.15] if augment else None,
        fill_mode="reflect",
    )
    val_datagen = ImageDataGenerator(rescale=1.0 / 255)

    train_gen = train_datagen.flow_from_directory(
        train_dir,
        target_size=img_size,
        batch_size=batch_size,
        class_mode="sparse",
        classes=DEFECT_CLASSES,
        shuffle=True,
    )
    val_gen = val_datagen.flow_from_directory(
        val_dir,
        target_size=img_size,
        batch_size=batch_size,
        class_mode="sparse",
        classes=DEFECT_CLASSES,
        shuffle=False,
    )
    return train_gen, val_gen


# ── Inference ─────────────────────────────────────────────────────────────────
def predict_single(model: tf.keras.Model, image_path: str) -> dict:
    """
    Run inference on a single image.
    Returns: { class_name: str, confidence: float, all_probs: list }
    """
    from ai_model.utils.preprocessing import load_image, preprocess_for_classification

    img = load_image(image_path)
    tensor = preprocess_for_classification(img)
    probs = model.predict(tensor, verbose=0)[0]

    top_idx = int(np.argmax(probs))
    return {
        "class_name":  DEFECT_CLASSES[top_idx],
        "confidence":  float(probs[top_idx]),
        "all_probs":   {DEFECT_CLASSES[i]: float(p) for i, p in enumerate(probs)},
    }


# ── Model summary helper ──────────────────────────────────────────────────────
if __name__ == "__main__":
    m = build_model(freeze_base=True)
    m.summary()
    print(f"\nTotal params: {m.count_params():,}")
