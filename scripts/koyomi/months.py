import json
raw = json.load(open('raw.json'))
months = [{'start': s, 'zs': zs} for s, _n, _l, zs in raw['months']]
dz = [i for i, m in enumerate(months) if 270 in m['zs']]  # 冬至を含む月 = 11月
for a, b in zip(dz, dz[1:]):
    n = b - a
    leap_idx = None
    if n == 13:
        for k in range(a + 1, b):
            if not months[k]['zs']:
                leap_idx = k
                break
        assert leap_idx is not None, months[a]['start']
    num = 11
    months[a]['num'], months[a]['leap'] = 11, False
    for k in range(a + 1, b):
        if k == leap_idx:
            months[k]['num'], months[k]['leap'] = num, True
        else:
            num = num % 12 + 1
            months[k]['num'], months[k]['leap'] = num, False
months = [m for m in months if 'num' in m]
for m in months:
    if m['leap'] and m['start'][:4] in ('1984', '2012', '2014', '2017', '2020', '2023', '2025', '2028', '2031', '2033', '2034', '2052'):
        print('閏', m['num'], '月', m['start'])
json.dump([(m['start'], m['num'], m['leap']) for m in months], open('months.json', 'w'))
print(len(months), months[0]['start'], months[-1]['start'])
