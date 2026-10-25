// 予定のアイコン（スタンプ）のカタログ。外部依存なし（npm test で検証する）。
//
// スタンプの値（events.icon / day_stickers.sticker に保存する文字列）は2種類：
// - 絵のスタンプ：絵文字そのもの（例 '🐶'）。Fluent Emoji（MIT）の画像で表示し、画像がなければ絵文字の文字で表示する。
//   以前の絵文字アイコンもそのまま表示できる。
// - 文字のスタンプ：'tx:<色>:<文字>'（例 'tx:#1E88E5:早番'）。色付きの枠に文字を描く（オリジナルデザイン）。

export type StampItem = {
  /** 保存する値 */
  value: string;
  /** 検索・読み上げ用の名前 */
  label: string;
};

export type StampCategory = {
  id: string;
  name: string;
  items: StampItem[];
};

export type ParsedStamp =
  | { kind: 'emoji'; glyph: string }
  | { kind: 'text'; color: string; label: string };

const TX = 'tx:';

export function textStamp(color: string, label: string): string {
  return `${TX}${color}:${label}`;
}

export function parseStamp(value: string): ParsedStamp {
  if (value.startsWith(TX)) {
    const rest = value.slice(TX.length);
    const i = rest.indexOf(':');
    if (i > 0) return { kind: 'text', color: rest.slice(0, i), label: rest.slice(i + 1) };
    return { kind: 'text', color: '#757575', label: rest };
  }
  return { kind: 'emoji', glyph: value };
}

/** 文字だけで表すとき（テンプレート名の横など、画像を置けない場所） */
export function stampAsText(value: string | null | undefined): string {
  if (!value) return '';
  const s = parseStamp(value);
  return s.kind === 'emoji' ? s.glyph : `［${s.label}］`;
}

/**
 * 文字スタンプの行の分け方と文字の大きさ（スタンプの一辺に対する比率）。
 * 1〜2文字：1行、3文字：1行（小さめ）、4文字：2行（2+2）、5〜6文字：2行（3+3）、それ以上は先頭6文字。
 */
export function textStampLayout(label: string): { lines: string[]; scale: number } {
  const chars = Array.from(label).slice(0, 6);
  const n = chars.length;
  if (n <= 2) return { lines: [chars.join('')], scale: n === 1 ? 0.56 : 0.4 };
  if (n === 3) return { lines: [chars.join('')], scale: 0.29 };
  if (n === 4) return { lines: [chars.slice(0, 2).join(''), chars.slice(2).join('')], scale: 0.34 };
  const half = Math.ceil(n / 2);
  return { lines: [chars.slice(0, half).join(''), chars.slice(half).join('')], scale: 0.26 };
}

// ---------------------------------------------------------------------------
// カタログ
// ---------------------------------------------------------------------------

const C = {
  red: '#E53935',
  pink: '#D81B60',
  orange: '#EF6C00',
  amber: '#F9A825',
  green: '#2E7D32',
  teal: '#00897B',
  blue: '#1E88E5',
  navy: '#3949AB',
  purple: '#8E24AA',
  brown: '#6D4C41',
  gray: '#616161',
};

/** 絵のスタンプ：'🐶 いぬ' のように「絵文字 名前」をスペース区切りで並べる */
function e(list: string): StampItem[] {
  return list
    .trim()
    .split(/\n|\s{2,}|、/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const sp = s.indexOf(' ');
      return { value: s.slice(0, sp), label: s.slice(sp + 1) };
    });
}

/** 文字のスタンプ：同じ色でまとめて作る */
function t(color: string, labels: string): StampItem[] {
  return labels
    .trim()
    .split(/\s+/)
    .map((label) => ({ value: textStamp(color, label), label }));
}

export const STAMP_CATEGORIES: StampCategory[] = [
  {
    id: 'event',
    name: 'イベント',
    items: [
      ...e(`🎂 誕生日、🎉 パーティー、🎁 プレゼント、💐 花束、🍻 飲み会、🍽️ 食事、❤️ デート、💍 記念日、
        🎤 カラオケ、🎬 映画、🎵 ライブ、🎭 観劇、🎡 遊園地、🎢 ジェットコースター、♨️ 温泉、🏨 ホテル、
        ✈️ 旅行、🧳 旅行の準備、📸 写真、🎮 ゲーム、🛍️ 買い物、☕ カフェ、🍖 BBQ、🎆 花火`),
      ...t(C.red, '予定 イベント 記念日 誕生日'),
      ...t(C.pink, 'デート 女子会 飲み会 ランチ ディナー'),
      ...t(C.orange, '旅行 おでかけ 遊び 帰省 ライブ セール'),
    ],
  },
  {
    id: 'work',
    name: 'しごと',
    items: [
      ...t(C.blue, '出勤 仕事 会議 出張 研修 面接 打合せ 外出 来客'),
      ...t(C.navy, '早番 中番 遅番 日勤 夜勤 夜勤明け 当直 当番 残業'),
      ...t(C.green, '休み 有休 半休 午前休 午後休 代休 振休 在宅 リモート 定時'),
      ...t(C.red, '締切 提出 重要 給料日 ボーナス'),
      ...e(`💼 仕事、💻 パソコン、📞 電話、📝 メモ、📊 資料、🏢 会社、🖨️ 印刷、📅 予定、⏰ 時間、📌 重要`),
    ],
  },
  {
    id: 'school',
    name: 'がっこう',
    items: [
      ...t(C.blue, '学校 授業 テスト 中間テスト 期末テスト 小テスト 宿題 塾'),
      ...t(C.green, '入学式 卒業式 始業式 終業式 新学期 夏休み 冬休み 春休み'),
      ...t(C.orange, '運動会 遠足 修学旅行 文化祭 発表会 部活 合宿 試合 練習'),
      ...t(C.purple, '参観日 懇談会 面談 PTA 家庭訪問 給食 弁当 集金'),
      ...e(`🏫 学校、🎒 ランドセル、📚 勉強、✏️ えんぴつ、📐 さんかく定規、🔬 理科、🎨 図工、🎼 音楽、
        🏃 運動会、🍱 お弁当、🎓 卒業、🌸 入学`),
    ],
  },
  {
    id: 'kids',
    name: 'こそだて',
    items: [
      ...e(`👶 赤ちゃん、🍼 ミルク、🧸 くま、🚼 ベビー、🧒 こども、👦 男の子、👧 女の子、🎈 風船、
        🛝 公園、🧩 パズル、🖍️ おえかき、🪀 おもちゃ`),
      ...t(C.pink, '保育園 幼稚園 お迎え 送り 延長保育 お弁当 おやつ'),
      ...t(C.teal, '健診 予防接種 身体測定 入園式 卒園式 お遊戯会 学童 児童館'),
      ...t(C.orange, '習い事 スイミング ピアノ 英語 体操 サッカー'),
    ],
  },
  {
    id: 'health',
    name: 'びょういん',
    items: [
      ...e(`🏥 病院、💊 くすり、💉 注射、🩺 診察、🦷 歯医者、👓 めがね、🩹 けが、🌡️ 熱、🤧 かぜ、😷 マスク、
        🧘 ヨガ、🏃 ランニング、🏋️ ジム、🛌 休養、🦶 足`),
      ...t(C.red, '病院 歯医者 内科 小児科 皮膚科 眼科 耳鼻科 整形外科 産婦人科'),
      ...t(C.teal, '健診 検診 検査 予防接種 薬 通院 入院 退院 リハビリ'),
      ...t(C.purple, '美容院 ネイル エステ マッサージ まつエク'),
    ],
  },
  {
    id: 'life',
    name: 'せいかつ',
    items: [
      ...e(`🏠 家、🛒 買い物、🧹 そうじ、🧺 洗濯、🍳 料理、🗑️ ゴミの日、♻️ 資源ゴミ、📦 宅配便、📮 郵便、
        🔧 修理、🚗 車、⛽ ガソリン、🚲 自転車、🐕 さんぽ、🌱 水やり、🛁 お風呂、💤 ねる、⏰ 目覚まし`),
      ...t(C.green, '燃えるゴミ 燃えないゴミ 資源ゴミ ビン・缶 ペットボトル 粗大ゴミ'),
      ...t(C.brown, '買い物 宅配 掃除 洗濯 料理 実家 帰省 お泊り 来客 引越し'),
      ...t(C.navy, '約束 予約 確認 手続き 車検 点検 工事'),
    ],
  },
  {
    id: 'money',
    name: 'おかね',
    items: [
      ...e(`💰 お金、💴 お札、🪙 小銭、💳 カード、🏦 銀行、🧾 レシート、📈 投資、🐷 貯金`),
      ...t(C.amber, '給料日 ボーナス 入金 振込み 引落し 支払い 集金 お小遣い'),
      ...t(C.red, '家賃 電気代 ガス代 水道代 携帯代 カード 税金 保険'),
    ],
  },
  {
    id: 'hobby',
    name: 'しゅみ',
    items: [
      ...e(`⚽ サッカー、⚾ 野球、🏀 バスケ、🏐 バレー、🎾 テニス、⛳ ゴルフ、🏓 卓球、🏸 バドミントン、
        🏊 水泳、🚴 サイクリング、🎿 スキー、🏂 スノボ、🎣 釣り、⛺ キャンプ、🥾 登山、🎹 ピアノ、🎸 ギター、
        🎻 バイオリン、🎺 トランペット、📖 読書、🎨 絵、🧶 手芸、📷 カメラ、🎲 ボードゲーム、🎯 ダーツ、🎳 ボウリング`),
      ...t(C.orange, '習い事 レッスン 練習 試合 大会 発表会 ジム ヨガ ダンス'),
    ],
  },
  {
    id: 'outing',
    name: 'おでかけ',
    items: [
      ...e(`🚃 電車、🚄 新幹線、🚌 バス、🚕 タクシー、🚗 くるま、✈️ 飛行機、🚢 船、🗺️ 地図、🧳 スーツケース、
        🏖️ 海、🏔️ 山、🗻 富士山、🏯 お城、⛩️ 神社、🛕 お寺、🎠 メリーゴーランド、🦁 動物園、🐠 水族館、
        🏟️ スタジアム、🛍️ ショッピング、🍦 ソフトクリーム、🌉 夜景`),
      ...t(C.teal, '旅行 帰省 ドライブ 日帰り お泊り 出発 到着'),
    ],
  },
  {
    id: 'food',
    name: 'たべもの',
    items: e(`🍙 おにぎり、🍞 パン、🍜 ラーメン、🍝 パスタ、🍛 カレー、🍕 ピザ、🍔 ハンバーガー、🍣 おすし、
      🍱 お弁当、🍳 目玉焼き、🥩 お肉、🍖 骨つき肉、🐟 さかな、🍤 えびフライ、🥗 サラダ、🍲 なべ、🍢 おでん、
      🍰 ケーキ、🎂 バースデーケーキ、🧁 カップケーキ、🍩 ドーナツ、🍪 クッキー、🍫 チョコ、🍬 キャンディ、🍮 プリン、
      🍧 かき氷、🍨 アイス、🥞 パンケーキ、🍓 いちご、🍉 すいか、🍑 もも、🍎 りんご、☕ コーヒー、🍵 お茶、
      🧃 ジュース、🍺 ビール、🍷 ワイン、🍸 カクテル、🍶 日本酒`),
  },
  {
    id: 'season',
    name: 'きせつ',
    items: [
      ...e(`🎍 お正月、🧧 お年玉、👹 節分、🎎 ひなまつり、🌸 お花見、🎏 こどもの日、💐 母の日、👔 父の日、
        🎋 七夕、🎐 夏、🎆 花火、🍉 すいか、🎃 ハロウィン、🍁 紅葉、🎑 お月見、🍠 焼きいも、🎄 クリスマス、
        🎅 サンタ、⛄ 雪だるま、🍫 バレンタイン、🍬 ホワイトデー`),
      ...t(C.red, 'お正月 初詣 節分 ひなまつり 母の日 父の日 七夕 お盆 敬老の日 ハロウィン クリスマス 大掃除 年末'),
    ],
  },
  {
    id: 'animal',
    name: 'どうぶつ',
    items: e(`🐶 いぬ、🐱 ねこ、🐰 うさぎ、🐻 くま、🐼 パンダ、🐨 コアラ、🐯 とら、🦁 ライオン、🐮 うし、🐷 ぶた、
      🐸 かえる、🐵 さる、🐔 にわとり、🐤 ひよこ、🐧 ペンギン、🦉 ふくろう、🐭 ねずみ、🐹 ハムスター、🦊 きつね、
      🐴 うま、🦄 ユニコーン、🐑 ひつじ、🐘 ぞう、🦒 きりん、🐢 かめ、🐬 イルカ、🐳 くじら、🐙 たこ、🦀 かに、
      🐠 さかな、🦋 ちょうちょ、🐞 てんとうむし、🦔 はりねずみ、🦖 きょうりゅう`),
  },
  {
    id: 'face',
    name: 'きもち',
    items: e(`😊 にこにこ、😆 わらう、🥰 だいすき、😍 めろめろ、😋 おいしい、😎 かっこいい、🤩 わくわく、🥳 おいわい、
      😴 ねむい、😪 つかれた、😢 かなしい、😭 なく、😤 ぷんぷん、😡 おこる、😱 びっくり、🤒 ねつ、🤔 かんがえる、
      🙏 おねがい、👍 いいね、👏 はくしゅ、💪 がんばる、✌️ ピース、🙌 ばんざい、💯 まんてん`),
  },
  {
    id: 'mark',
    name: 'きごう',
    items: [
      ...e(`⭐ ほし、🌟 きらきら星、✨ きらきら、❤️ ハート、💖 ハート、💕 ふたつのハート、💮 はなまる、⭕ まる、
        ❌ ばつ、✅ チェック、❗ びっくり、❓ はてな、⚠️ 注意、🔔 ベル、📌 ピン、🚩 はた、🍀 クローバー、
        🌷 チューリップ、🌻 ひまわり、🌈 にじ、☀️ はれ、☁️ くもり、☔ あめ、⛄ ゆき、🔥 ほのお、💡 ひらめき、
        🎀 リボン、👑 王冠、💎 宝石、🔑 かぎ`),
      ...t(C.red, '重要 注意 必須 確定'),
      ...t(C.gray, '未定 仮 保留 予備'),
      ...t(C.green, '完了 OK 済'),
    ],
  },
];

/** 全スタンプ（検索用、重複なし） */
export function allStamps(): StampItem[] {
  const seen = new Set<string>();
  const out: StampItem[] = [];
  for (const c of STAMP_CATEGORIES) {
    for (const it of c.items) {
      if (seen.has(it.value)) continue;
      seen.add(it.value);
      out.push(it);
    }
  }
  return out;
}

/** ひらがな → カタカナ（検索で「ごみ」と「ゴミ」を同じに扱う） */
function toKatakana(s: string): string {
  return s.replace(/[ぁ-ゖ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) + 0x60));
}

export function searchStamps(query: string): StampItem[] {
  const q = toKatakana(query.trim().toLowerCase());
  if (!q) return [];
  return allStamps().filter((it) => toKatakana(it.label.toLowerCase()).includes(q));
}

/** 絵のスタンプで使っている絵文字の一覧（画像を用意するため） */
export function emojiGlyphs(): string[] {
  const out = new Set<string>();
  for (const it of allStamps()) {
    const s = parseStamp(it.value);
    if (s.kind === 'emoji') out.add(s.glyph);
  }
  return [...out];
}
