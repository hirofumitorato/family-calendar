# 暦データの生成

`src/lib/koyomi-data.ts`（旧暦の月初・二十四節気の日付）を作り直すスクリプト。

```bash
pip install ephem
cd scripts/koyomi
python3 gen.py      # 新月・節気を計算 → raw.json
python3 months.py   # 冬至を11月とする規則で月番号・閏月を決める → months.json
python3 emit.py     # koyomi-data.ts を出力
cp koyomi-data.ts ../../src/lib/
```
