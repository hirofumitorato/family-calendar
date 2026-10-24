// 西暦 → 和暦。外部依存なし。

const ERAS: { name: string; start: [number, number, number] }[] = [
  { name: '令和', start: [2019, 5, 1] },
  { name: '平成', start: [1989, 1, 8] },
  { name: '昭和', start: [1926, 12, 25] },
  { name: '大正', start: [1912, 7, 30] },
  { name: '明治', start: [1868, 1, 25] },
];

/** 例: (2026, 10, 1) → '令和8年'、(2019, 5, 1) → '令和元年'。明治より前は null。month は 1 始まり */
export function warekiYear(year: number, month = 1, day = 1): string | null {
  const key = year * 10000 + month * 100 + day;
  for (const era of ERAS) {
    const [y, m, d] = era.start;
    if (key >= y * 10000 + m * 100 + d) {
      const n = year - y + 1;
      return `${era.name}${n === 1 ? '元' : n}年`;
    }
  }
  return null;
}
