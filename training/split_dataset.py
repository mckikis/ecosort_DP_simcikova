"""rozdeli priecinok s fotkami na train / val / test (70 / 15 / 15).

vstup:  raw/<TRIEDA>/*.jpg      (napr. raw/PLAST/img001.jpg)
vystup: dataset/train|val|test/<TRIEDA>/*.jpg

pouyitie:  python split_dataset.py raw dataset
-rozdelenie je nahodne, ale s pevnym seedom (opakovatelne). 
-ak je fotka jedneho predmetu z viacerych uhlov, treba ich dat do jednej casti, inak by to nadhodnotilo rpesnot
-pomenovat subory PREDMET_cislo.jpg (napr. flasa3_01.jpg) - skript drzi rovnaky PREDMET pokope.
"""
import random
import shutil
import sys
from collections import defaultdict
from pathlib import Path

SEED = 42
RATIOS = (0.70, 0.15, 0.15)
EXT = {".jpg", ".jpeg", ".png", ".webp", ".heic"}


def group_key(p: Path) -> str:
    # skupina = cast nazvu pred poslednym "_" (flasa3_01 -> flasa3)
    stem = p.stem
    return stem.rsplit("_", 1)[0] if "_" in stem else stem


def main(src: str, dst: str) -> None:
    src_p, dst_p = Path(src), Path(dst)
    rnd = random.Random(SEED)
    for cls_dir in sorted(d for d in src_p.iterdir() if d.is_dir()):
        groups = defaultdict(list)
        for f in cls_dir.iterdir():
            if f.suffix.lower() in EXT:
                groups[group_key(f)].append(f)
        keys = sorted(groups)
        rnd.shuffle(keys)
        n = len(keys)
        n_train = round(n * RATIOS[0])
        n_val = round(n * RATIOS[1])
        parts = {
            "train": keys[:n_train],
            "val": keys[n_train:n_train + n_val],
            "test": keys[n_train + n_val:],
        }
        for part, ks in parts.items():
            out = dst_p / part / cls_dir.name
            out.mkdir(parents=True, exist_ok=True)
            for k in ks:
                for f in groups[k]:
                    shutil.copy2(f, out / f.name)
        counts = {p: sum(len(groups[k]) for k in ks) for p, ks in parts.items()}
        print(f"{cls_dir.name}: {counts}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
