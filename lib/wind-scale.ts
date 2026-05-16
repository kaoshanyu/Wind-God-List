export interface WindLevelInfo {
  level: number;
  name: string;
  speedMs: string;
  speedKmh: string;
  sea: string;
  land: string;
  desc: string;
  tip: string;
}

export const WIND_SCALE: WindLevelInfo[] = [
  { level: 0, name: "无风", speedMs: "<0.3", speedKmh: "<1", sea: "海面如镜", land: "静烟直上", desc: "风平浪静，帽子稳如泰山", tip: "这基本就是你深吸一口气的状态" },
  { level: 1, name: "软风", speedMs: "0.3-1.5", speedKmh: "1-5", sea: "微波粼粼", land: "烟示风向", desc: "发梢微微飘动，伞还不用撑", tip: "≈ 人慢走的速度" },
  { level: 2, name: "轻风", speedMs: "1.6-3.3", speedKmh: "6-11", sea: "小波", land: "树叶微响", desc: "脸上能感觉到风了，伞开始不安分", tip: "≈ 自行车慢骑" },
  { level: 3, name: "微风", speedMs: "3.4-5.4", speedKmh: "12-19", sea: "小浪", land: "旗展开", desc: "伞明显弯了，发型开始乱", tip: "≈ 散步的速度" },
  { level: 4, name: "和风", speedMs: "5.5-7.9", speedKmh: "20-28", sea: "轻浪", land: "尘土扬起", desc: "人和伞一起歪，帽子开始翻飞", tip: "≈ 慢跑速度" },
  { level: 5, name: "劲风", speedMs: "8.0-10.7", speedKmh: "29-38", sea: "中浪", land: "小树摇摆", desc: "帽子剧烈翻飞！撑伞已经很费劲了", tip: "≈ 自行车正常骑行" },
  { level: 6, name: "强风", speedMs: "10.8-13.8", speedKmh: "39-49", sea: "大浪", land: "电线有声", desc: "🎩 帽子飞了！人被风推着走", tip: "≈ 跑步冲刺的速度" },
  { level: 7, name: "疾风", speedMs: "13.9-17.1", speedKmh: "50-61", sea: "巨浪", land: "步行困难", desc: "伞快撑不住了，人被吹着跑", tip: "≈ 骑电动车" },
  { level: 8, name: "大风", speedMs: "17.2-20.7", speedKmh: "62-74", sea: "狂浪", land: "折毁树枝", desc: "伞骨弯了！蹲下抵抗！", tip: "≈ 城市快速路车速" },
  { level: 9, name: "烈风", speedMs: "20.8-24.4", speedKmh: "75-88", sea: "狂涛", land: "屋顶受损", desc: "伞反了！人要起飞了！！", tip: "≈ 高速公路上车速" },
  { level: 10, name: "狂风", speedMs: "24.5-28.4", speedKmh: "89-102", sea: "怒涛", land: "拔树倒屋", desc: "脚离地了！救命！！！", tip: "≈ 火车速度" },
  { level: 11, name: "暴风", speedMs: "28.5-32.6", speedKmh: "103-117", sea: "异常巨浪", land: "重大损毁", desc: "人在空中飞，伞已经散架了", tip: "≈ 高铁速度" },
  { level: 12, name: "飓风", speedMs: "32.7-36.9", speedKmh: "118-133", sea: "怒涛滔天", land: "毁坏极大", desc: "人没了，没了……", tip: "≈ 台风中心风力" },
  { level: 13, name: "台风", speedMs: "37.0-41.4", speedKmh: "134-149", sea: "海啸级", land: "灾难性破坏", desc: "棕榈树断了！场景在摇晃！", tip: "CMA 定义的台风下限" },
  { level: 14, name: "强台风", speedMs: "41.5-46.1", speedKmh: "150-166", sea: "毁灭级", land: "建筑物损毁", desc: "树断了！沙尘暴！末日来了！", tip: "≈ 高铁时速 300km/h 的一半" },
  { level: 15, name: "强台风", speedMs: "46.2-50.9", speedKmh: "167-183", sea: "毁灭级", land: "严重结构破坏", desc: "棕榈树被连根拔起！世界末日！", tip: "这风能把你吹到隔壁城市" },
  { level: 16, name: "超强台风", speedMs: "51.0-56.0", speedKmh: "184-202", sea: "极恐怖", land: "毁灭一切", desc: "棕榈树都断了！满屏飞 debris！", tip: "≈ F1 赛车的极速" },
  { level: 17, name: "超强台风", speedMs: ">56.1", speedKmh: ">203", sea: "末日的海", land: "末日模式", desc: "像素世界已经毁灭了……", tip: "≈ 磁悬浮列车速度！人类几乎无法站立" },
];

export function getWindInfo(level: number): WindLevelInfo {
  return WIND_SCALE[Math.max(0, Math.min(17, Math.round(level)))] || WIND_SCALE[0];
}

export const WIND_LEVEL_COLORS: string[] = [
  "#b5c4b1", "#c4c9b5", "#c4b5d4", "#b5c4c9", "#d4c9b5",
  "#d4b5b5", "#d4a0a0", "#c9a9b8", "#c08080", "#b07070",
  "#a06060", "#905050", "#e8a0a0", "#d08080", "#c06060",
  "#a04040",
];

export const WIND_LEVEL_EMOJIS: string[] = [
  "🏳️", "🏁", "🏁", "🚩", "🚩",
  "🌬️", "💨", "💨", "🌪️", "🌪️",
  "🌀", "🌀", "🌀", "☄️", "☄️",
  "💀", "💀",
];
