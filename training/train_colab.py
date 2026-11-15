
import argparse
import json
import os

os.environ.setdefault("TF_USE_LEGACY_KERAS", "1")

import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix

IMG = (224, 224)
BATCH = 32
SEED = 42


def load_ds(path: str, shuffle: bool):
    return tf.keras.utils.image_dataset_from_directory(
        path, image_size=IMG, batch_size=BATCH, shuffle=shuffle, seed=SEED, label_mode="int"
    )


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True, help="priecinok s train/ val/ test/")
    ap.add_argument("--out", required=True)
    ap.add_argument("--head_epochs", type=int, default=10)
    ap.add_argument("--finetune_epochs", type=int, default=10)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    train = load_ds(os.path.join(args.data, "train"), True)
    val = load_ds(os.path.join(args.data, "val"), False)
    test = load_ds(os.path.join(args.data, "test"), False)
    classes = train.class_names  # abecedne, nazvy priecinkov = nazvy kategorii (PLAST, PAPIER, ...)
    print("triedy:", classes)

    # augmentacia sa robi LEN pri trenovani a mimo modelu (tfjs konvertor nepodporuje augmentacne vrstvy)
    augment = tf.keras.Sequential([
        tf.keras.layers.RandomFlip("horizontal"),
        tf.keras.layers.RandomRotation(0.08),
        tf.keras.layers.RandomZoom(0.15),
        tf.keras.layers.RandomContrast(0.2),
    ])
    train_aug = train.map(lambda x, y: (augment(x, training=True), y), num_parallel_calls=tf.data.AUTOTUNE)
    train_aug = train_aug.prefetch(tf.data.AUTOTUNE)

    base = tf.keras.applications.MobileNetV2(input_shape=IMG + (3,), include_top=False, weights="imagenet")
    base.trainable = False

    inputs = tf.keras.Input(shape=IMG + (3,))
    # normalizacia 0..255 -> -1..1 je v modeli, v appke teda davame surove pixely
    x = tf.keras.layers.Rescaling(1.0 / 127.5, offset=-1)(inputs)
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    outputs = tf.keras.layers.Dense(len(classes), activation="softmax")(x)
    model = tf.keras.Model(inputs, outputs)

    callbacks = [tf.keras.callbacks.EarlyStopping(monitor="val_accuracy", patience=4, restore_best_weights=True)]

    # faza 1: trenuje sa len nova hlava
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-3), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(train_aug, validation_data=val, epochs=args.head_epochs, callbacks=callbacks)

    # faza 2: dotrenovanie poslednych vrstiev s malym learning rate
    base.trainable = True
    for layer in base.layers[:-30]:
        layer.trainable = False
    model.compile(optimizer=tf.keras.optimizers.Adam(1e-5), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(train_aug, validation_data=val, epochs=args.finetune_epochs, callbacks=callbacks)

    # vyhodnotenie na test sete (tie fotky model pocas trenovania nevidel)
    y_true, y_pred = [], []
    for xb, yb in test:
        y_true += yb.numpy().tolist()
        y_pred += np.argmax(model.predict(xb, verbose=0), axis=1).tolist()
    report = classification_report(y_true, y_pred, target_names=classes, digits=3)
    cm = confusion_matrix(y_true, y_pred)
    acc = float(np.mean(np.array(y_true) == np.array(y_pred)))
    text = f"TEST accuracy: {acc:.4f} (n={len(y_true)})\n\n{report}\nConfusion matrix (riadky=pravda, stlpce=predikcia):\n{cm}\n"
    print(text)
    with open(os.path.join(args.out, "training_report.txt"), "w", encoding="utf-8") as f:
        f.write(text)

    with open(os.path.join(args.out, "labels.json"), "w", encoding="utf-8") as f:
        json.dump(classes, f, ensure_ascii=False)

    h5 = os.path.join(args.out, "model.h5")
    model.save(h5)
    os.system(f'tensorflowjs_converter --input_format=keras "{h5}" "{args.out}"')
    os.remove(h5)
    print("hotovo, skopiruj model.json, group1-shard*.bin a labels.json do public/models/ecosort/")


if __name__ == "__main__":
    main()
