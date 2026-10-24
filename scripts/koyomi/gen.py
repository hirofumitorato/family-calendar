# 旧暦（新月・中気）と二十四節気の日付表を作る（JST）。PyEphem の天文計算を使用。
import ephem, math, json, datetime as dt

JST = dt.timedelta(hours=9)

def sun_lon(d):
    s = ephem.Sun(d)
    return math.degrees(float(ephem.Ecliptic(s, epoch=d).lon)) % 360

def find_lon(target, start, end):
    # [start,end] で太陽黄経が target を通過する時刻（二分法）
    def diff(d):
        x = (sun_lon(d) - target + 540) % 360 - 180
        return x
    a, b = ephem.Date(start), ephem.Date(end)
    fa = diff(a)
    for _ in range(60):
        m = ephem.Date((a + b) / 2)
        fm = diff(m)
        if (fa < 0) == (fm < 0):
            a, fa = m, fm
        else:
            b = m
    return ephem.Date((a + b) / 2)

def jst_date(d):
    return (ephem.Date(d).datetime() + JST).date()

# 二十四節気（15度ごと）を 1928〜2062 で求める
terms = []  # (jst_date, lon)
d = ephem.Date('1928/1/1')
end = ephem.Date('2062/12/31')
lon0 = sun_lon(d)
k = math.floor(lon0 / 15) + 1
while d < end:
    target = (k * 15) % 360
    # 次の通過は概ね 15 日後前後
    t = find_lon(target, d, ephem.Date(d + 17))
    terms.append((jst_date(t), target))
    d = ephem.Date(t + 1)
    k += 1

# 新月
moons = []
d = ephem.Date('1928/1/1')
while d < end:
    nm = ephem.next_new_moon(d)
    moons.append(jst_date(nm))
    d = ephem.Date(nm + 1)

# 各朔望月に含まれる中気（30度の倍数）
chuki = [(day, lon) for day, lon in terms if lon % 30 == 0]
months = []
for i in range(len(moons) - 1):
    s, e = moons[i], moons[i + 1]
    zs = [lon for day, lon in chuki if s <= day < e]
    months.append({'start': s, 'zs': zs})

def num_from_lon(lon):
    return (lon // 30 + 2) % 12 or 12

# 月番号：中気を含む月はその中気から、含まない月は閏月（前月と同じ番号）
for m in months:
    m['num'] = num_from_lon(m['zs'][0]) if m['zs'] else None
    m['leap'] = False
for i, m in enumerate(months):
    if m['num'] is None:
        m['num'] = months[i - 1]['num']
        m['leap'] = True

# 矛盾チェック：同じ番号が非閏で続く／番号が飛ぶ
issues = []
for i in range(1, len(months)):
    a, b = months[i - 1], months[i]
    expected = a['num'] if b['leap'] else (a['num'] % 12) + 1
    if b['num'] != expected or len(b['zs']) > 1:
        issues.append((str(b['start']), a['num'], b['num'], b['leap'], b['zs']))
print('issues:', issues[:20])

json.dump({
    'terms': [(str(d), lon) for d, lon in terms],
    'months': [(str(m['start']), m['num'], m['leap'], m['zs']) for m in months],
}, open('raw.json', 'w'))
print('terms', len(terms), 'months', len(months))
