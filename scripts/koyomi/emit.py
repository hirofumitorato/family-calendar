import json
raw = json.load(open('raw.json'))
months = json.load(open('months.json'))
terms = raw['terms']

# 旧暦の月初（1989〜2062）："YYYYMMDD" + 月(2桁) + 閏なら "L"
mm = [f"{s.replace('-', '')}{n:02d}{'L' if l else ''}" for s, n, l in months if '1989-01-01' <= s]

# 12の節（月の境目）：西暦の各月にある節入り日（1桁）
SETSU_LON = {1: 285, 2: 315, 3: 345, 4: 15, 5: 45, 6: 75, 7: 105, 8: 135, 9: 165, 10: 195, 11: 225, 12: 255}
by = {}
for d, lon in terms:
    y, m, day = int(d[:4]), int(d[5:7]), int(d[8:10])
    if lon == SETSU_LON.get(m):
        by.setdefault(y, {})[m] = day
setsu = {}
for y in range(1929, 2062):
    days = [by[y][m] for m in range(1, 13)]
    assert all(3 <= x <= 9 for x in days), (y, days)
    setsu[y] = ''.join(str(x) for x in days)

# 夏至・冬至の日
solstice = {}
for d, lon in terms:
    y = int(d[:4])
    if lon in (90, 270) and 1929 <= y < 2062:
        solstice.setdefault(y, [None, None])[0 if lon == 90 else 1] = int(d[8:10])
sol = {y: f"{v[0]}{v[1]}" for y, v in solstice.items()}

ts = f"""// 自動生成ファイル（scripts/koyomi/ で生成）。手で編集しないこと。
// PyEphem による天文計算で求めた日本時間（JST）の暦データ。
//  - LUNAR_MONTHS : 旧暦の各月の初日（新月の日）と月番号。末尾 L は閏月。1989〜2062年
//  - SETSU        : 西暦1〜12月それぞれの節入り日（小寒・立春・啓蟄…大雪）。1929〜2061年
//  - SOLSTICE     : 夏至・冬至の日（2桁ずつ）。1929〜2061年

export const LUNAR_MONTHS = '{",".join(mm)}';

export const SETSU_FROM_YEAR = 1929;
export const SETSU = '{",".join(setsu[y] for y in range(1929, 2062))}';

export const SOLSTICE = '{",".join(sol[y] for y in range(1929, 2062))}';
"""
open('koyomi-data.ts', 'w').write(ts)
print(len(ts), 'bytes;', setsu[2026], sol[2026], mm[-1])
