# EcoSort 

Mobilná aplikácia (Progressive Web App) pre inteligentnú klasifikáciu odpadu a lokalizáciu zberných miest v Bratislave.
Súčasť diplomovej práce, Ekonomická univerzita v Bratislave, FHI.

Funkcie: rozpoznanie odpadu z fotky (TensorFlow.js), kontrola zálohovanej fľaše cez čiarový kód EAN (zxing-wasm),
OCR textu z obalu (tesseract.js), najbližšie zberné miesto (poloha + Haversine), test presnosti s metrikami.


## Štruktúra
- `src/ai/` – klasifikátory, mapovanie labelov, čiarový kód, OCR, celý pipeline
- `src/data/` – vyhľadávanie miest
- `src/eval/` – metriky testu presnosti (accuracy, Wilson interval, F1, zámeny)
- `src/ui/` – obrazovky
- `public/data/` – labelMappings.json, collectionPoints.json, depositBarcodes.json (miesta sú zatiaľ testovacie)
- `public/models/ecosort/` – vlastný dotrénovaný model
- `training/` – split_dataset.py, train_colab.py (transfer learning)

