// China Map Explorer (拼图游中国) Engine

export const REGIONS = {
  north: { id: 'north', name: '华北地区', color: '#f59e0b' },
  northeast: { id: 'northeast', name: '东北地区', color: '#10b981' },
  east: { id: 'east', name: '华东地区', color: '#3b82f6' },
  central_south: { id: 'central_south', name: '中南地区', color: '#ec4899' },
  southwest: { id: 'southwest', name: '西南地区', color: '#8b5cf6' },
  northwest: { id: 'northwest', name: '西北地区', color: '#14b8a6' },
  hk_mo_tw: { id: 'hk_mo_tw', name: '港澳台', color: '#f97316' },
};

export const PROVINCES = [
  // 华北
  { id: 'bj', name: '北京', abbr: '京', capital: '北京', region: 'north', landmark: '故宫、天坛、长城', specialty: '北京烤鸭' },
  { id: 'tj', name: '天津', abbr: '津', capital: '天津', region: 'north', landmark: '天津之眼、古文化街', specialty: '狗不理包子' },
  { id: 'he', name: '河北', abbr: '冀', capital: '石家庄', region: 'north', landmark: '承德避暑山庄、山海关', specialty: '驴肉火烧' },
  { id: 'sx', name: '山西', abbr: '晋', capital: '太原', region: 'north', landmark: '平遥古城、云冈石窟', specialty: '山西刀削面、老陈醋' },
  { id: 'nm', name: '内蒙古', abbr: '蒙', capital: '呼和浩特', region: 'north', landmark: '呼伦贝尔大草原', specialty: '烤全羊、奶酪' },

  // 东北
  { id: 'ln', name: '辽宁', abbr: '辽', capital: '沈阳', region: 'northeast', landmark: '沈阳故宫、千山', specialty: '锅包肉' },
  { id: 'jl', name: '吉林', abbr: '吉', capital: '长春', region: 'northeast', landmark: '长白山天池、雾凇岛', specialty: '吉林人参、冷面' },
  { id: 'hl', name: '黑龙江', abbr: '黑', capital: '哈尔滨', region: 'northeast', landmark: '冰雪大世界、扎龙湿地', specialty: '哈尔滨红肠' },

  // 华东
  { id: 'sh', name: '上海', abbr: '沪', capital: '上海', region: 'east', landmark: '东方明珠、外滩', specialty: '南翔小笼包' },
  { id: 'js', name: '江苏', abbr: '苏', capital: '南京', region: 'east', landmark: '拙政园、中山陵、周庄', specialty: '阳澄湖大闸蟹' },
  { id: 'zj', name: '浙江', abbr: '浙', capital: '杭州', region: 'east', landmark: '西湖、乌镇、普陀山', specialty: '龙井茶、西湖醋鱼' },
  { id: 'ah', name: '安徽', abbr: '皖', capital: '合肥', region: 'east', landmark: '黄山迎客松、西递宏村', specialty: '黄山烧饼、臭鳜鱼' },
  { id: 'fj', name: '福建', abbr: '闽', capital: '福州', region: 'east', landmark: '武夷山、鼓浪屿、土楼', specialty: '武夷大红袍、佛跳墙' },
  { id: 'jx', name: '江西', abbr: '赣', capital: '南昌', region: 'east', landmark: '庐山、景德镇、滕王阁', specialty: '景德镇瓷器、瓦罐汤' },
  { id: 'sd', name: '山东', abbr: '鲁', capital: '济南', region: 'east', landmark: '泰山极顶、趵突泉、蓬莱阁', specialty: '烟台苹果、德州扒鸡' },

  // 中南
  { id: 'ha', name: '河南', abbr: '豫', capital: '郑州', region: 'central_south', landmark: '龙门石窟、少林寺、殷墟', specialty: '河南烩面、胡辣汤' },
  { id: 'hb', name: '湖北', abbr: '鄂', capital: '武汉', region: 'central_south', landmark: '黄鹤楼、三峡大坝、武当山', specialty: '武汉热干面、武昌鱼' },
  { id: 'hn', name: '湖南', abbr: '湘', capital: '长沙', region: 'central_south', landmark: '张家界、岳麓书院、凤凰古城', specialty: '剁椒鱼头、臭豆腐' },
  { id: 'gd', name: '广东', abbr: '粤', capital: '广州', region: 'central_south', landmark: '广州塔（小蛮腰）、丹霞山', specialty: '广式早茶点心' },
  { id: 'gx', name: '广西', abbr: '桂', capital: '南宁', region: 'central_south', landmark: '桂林山水甲天下、德天瀑布', specialty: '桂林米粉、柳州螺蛳粉' },
  { id: 'hi', name: '海南', abbr: '琼', capital: '海口', region: 'central_south', landmark: '三亚天涯海角、五指山', specialty: '文昌鸡、海南椰子' },

  // 西南
  { id: 'cq', name: '重庆', abbr: '渝', capital: '重庆', region: 'southwest', landmark: '洪崖洞、大足石刻', specialty: '重庆九宫格火锅' },
  { id: 'sc', name: '四川', abbr: '川/蜀', capital: '成都', region: 'southwest', landmark: '大熊猫繁育基地、九寨沟、峨眉山', specialty: '麻婆豆腐、四川泡菜' },
  { id: 'gz', name: '贵州', abbr: '黔/贵', capital: '贵阳', region: 'southwest', landmark: '黄果树大瀑布、千户苗寨', specialty: '遵义羊肉粉、刺梨' },
  { id: 'yn', name: '云南', abbr: '滇/云', capital: '昆明', region: 'southwest', landmark: '丽江古城、大理洱海、石林', specialty: '云南过桥米线、鲜花饼' },
  { id: 'xz', name: '西藏', abbr: '藏', capital: '拉萨', region: 'southwest', landmark: '布达拉宫、珠穆朗玛峰、纳木错', specialty: '酥油茶、青稞酒' },

  // 西北
  { id: 'sn', name: '陕西', abbr: '陕/秦', capital: '西安', region: 'northwest', landmark: '秦始皇兵马俑、大雁塔、华山', specialty: '肉夹馍、陕西羊肉泡馍' },
  { id: 'gs', name: '甘肃', abbr: '甘/陇', capital: '兰州', region: 'northwest', landmark: '敦煌莫高窟、鸣沙山月牙泉、嘉峪关', specialty: '兰州牛肉拉面' },
  { id: 'qh', name: '青海', abbr: '青', capital: '西宁', region: 'northwest', landmark: '青海湖、茶卡盐湖、塔尔寺', specialty: '青海牦牛肉干' },
  { id: 'nx', name: '宁夏', abbr: '宁', capital: '银川', region: 'northwest', landmark: '沙坡头、西夏王陵', specialty: '中宁枸杞' },
  { id: 'xj', name: '新疆', abbr: '新', capital: '乌鲁木齐', region: 'northwest', landmark: '天山天池、喀纳斯湖、吐鲁番葡萄沟', specialty: '吐鲁番葡萄干、哈密瓜、手抓饭' },

  // 港澳台
  { id: 'hk', name: '香港', abbr: '港', capital: '香港', region: 'hk_mo_tw', landmark: '维多利亚港、太平山顶', specialty: '菠萝包、丝袜奶茶' },
  { id: 'mo', name: '澳门', abbr: '澳', capital: '澳门', region: 'hk_mo_tw', landmark: '大三巴牌坊、妈阁庙', specialty: '葡式蛋挞' },
  { id: 'tw', name: '台湾', abbr: '台', capital: '台北', region: 'hk_mo_tw', landmark: '日月潭、阿里山、台北101', specialty: '台湾凤梨酥、珍珠奶茶' },
];

export function getProvincesByRegion(regionId) {
  return PROVINCES.filter(p => p.region === regionId);
}

export function generateQuiz(count = 10) {
  const shuffled = [...PROVINCES].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return selected.map((target) => {
    // Pick 3 distractors
    const distractors = PROVINCES.filter(p => p.id !== target.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const options = [target, ...distractors].sort(() => Math.random() - 0.5);

    // Randomize question type: landmark or specialty or capital
    const qTypes = ['landmark', 'capital', 'specialty'];
    const qType = qTypes[Math.floor(Math.random() * qTypes.length)];

    let question = '';
    if (qType === 'landmark') {
      question = `著名的“${target.landmark}”位于哪个省份？`;
    } else if (qType === 'capital') {
      question = `“${target.capital}”是哪个省份的行政中心（省会/首府）？`;
    } else {
      question = `美味特产“${target.specialty}”是哪个地方的代表美食？`;
    }

    return {
      targetId: target.id,
      targetName: target.name,
      question,
      options: options.map(o => ({ id: o.id, name: o.name })),
    };
  });
}

export function sanitizeProgress(raw) {
  const fallback = { puzzleCleared: {}, quizHighScore: 0 };
  if (!raw || typeof raw !== 'object') return fallback;
  const puzzleCleared = {};
  if (raw.puzzleCleared && typeof raw.puzzleCleared === 'object') {
    for (const [k, v] of Object.entries(raw.puzzleCleared)) {
      if (v === true) puzzleCleared[k] = true;
    }
  }
  const quizHighScore = typeof raw.quizHighScore === 'number' && raw.quizHighScore >= 0
    ? Math.floor(raw.quizHighScore)
    : 0;
  return { puzzleCleared, quizHighScore };
}
