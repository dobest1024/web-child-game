'use strict';
// ===== 诗文数据：统编版一年级上、下册古诗（13 首）=====
// 原文逐首对照过以下来源（2026-10-22 核对），诗句一致，只有标点略有不同：
//   A 诗词乐 一年级上册 https://www.shicile.com/list/bubiank1a
//   B 诗词乐 一年级下册 https://www.shicile.com/list/bubiank1b
//   C 古文之家 小学一年级古诗词 https://www.cngwzj.com/BBGShiCi/3181.html
//   D 苹果树下 人教社一年级上册（6首）https://www.cwzlk.com/index.php?m=content&c=index&a=show&catid=55&id=30
//   E 维基文库《静夜思》（唐诗三百首本）https://zh.wikisource.org/wiki/靜夜思
// 说明：网上流传 2024 秋新版一年级上册删去了识字课《画》，没找到官方目录确认，这里先保留。
// 每句带标点，游戏里要接的字 = 去掉标点后的字。

const POEMS = [
  // 上册 —— 来源 A C D
  { id: 'yonge', title: '咏鹅', author: '骆宾王', dynasty: '唐', term: '上', icon: '🦢',
    lines: ['鹅，鹅，鹅，', '曲项向天歌。', '白毛浮绿水，', '红掌拨清波。'] },
  { id: 'jiangnan', title: '江南', author: '汉乐府', dynasty: '汉', term: '上', icon: '🪷',
    lines: ['江南可采莲，', '莲叶何田田。', '鱼戏莲叶间。', '鱼戏莲叶东，', '鱼戏莲叶西，', '鱼戏莲叶南，', '鱼戏莲叶北。'] },
  { id: 'hua', title: '画', author: '王维', dynasty: '唐', term: '上', icon: '🖼️',
    lines: ['远看山有色，', '近听水无声。', '春去花还在，', '人来鸟不惊。'] },
  { id: 'minnong', title: '悯农（其二）', author: '李绅', dynasty: '唐', term: '上', icon: '🌾',
    lines: ['锄禾日当午，', '汗滴禾下土。', '谁知盘中餐，', '粒粒皆辛苦。'] },
  { id: 'gulangyue', title: '古朗月行（节选）', author: '李白', dynasty: '唐', term: '上', icon: '🌕',
    lines: ['小时不识月，', '呼作白玉盘。', '又疑瑶台镜，', '飞在青云端。'] },
  { id: 'feng', title: '风', author: '李峤', dynasty: '唐', term: '上', icon: '🍃',
    lines: ['解落三秋叶，', '能开二月花。', '过江千尺浪，', '入竹万竿斜。'] },
  // 下册 —— 来源 B C（静夜思另对照 E）
  { id: 'chunxiao', title: '春晓', author: '孟浩然', dynasty: '唐', term: '下', icon: '🐦',
    lines: ['春眠不觉晓，', '处处闻啼鸟。', '夜来风雨声，', '花落知多少。'] },
  { id: 'zengwanglun', title: '赠汪伦', author: '李白', dynasty: '唐', term: '下', icon: '⛵',
    lines: ['李白乘舟将欲行，', '忽闻岸上踏歌声。', '桃花潭水深千尺，', '不及汪伦送我情。'] },
  { id: 'jingyesi', title: '静夜思', author: '李白', dynasty: '唐', term: '下', icon: '🌙',
    lines: ['床前明月光，', '疑是地上霜。', '举头望明月，', '低头思故乡。'] },
  { id: 'xunyinzhe', title: '寻隐者不遇', author: '贾岛', dynasty: '唐', term: '下', icon: '⛰️',
    lines: ['松下问童子，', '言师采药去。', '只在此山中，', '云深不知处。'] },
  { id: 'chishang', title: '池上', author: '白居易', dynasty: '唐', term: '下', icon: '🛶',
    lines: ['小娃撑小艇，', '偷采白莲回。', '不解藏踪迹，', '浮萍一道开。'] },
  { id: 'xiaochi', title: '小池', author: '杨万里', dynasty: '宋', term: '下', icon: '🌱',
    lines: ['泉眼无声惜细流，', '树阴照水爱晴柔。', '小荷才露尖尖角，', '早有蜻蜓立上头。'] },
  { id: 'huaji', title: '画鸡', author: '唐寅', dynasty: '明', term: '下', icon: '🐓',
    lines: ['头上红冠不用裁，', '满身雪白走将来。', '平生不敢轻言语，', '一叫千门万户开。'] },
];

POEMS.forEach(p => { p.grade = 1; });
POEMS.push(...[
  {
    "id": "g2p1",
    "grade": 2,
    "title": "村居",
    "author": "高鼎",
    "dynasty": "清",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "草长莺飞二月天，",
      "拂堤杨柳醉春烟。",
      "儿童散学归来早，",
      "忙趁东风放纸鸢。"
    ]
  },
  {
    "id": "g2p2",
    "grade": 2,
    "title": "咏柳",
    "author": "贺知章",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "碧玉妆成一树高，",
      "万条垂下绿丝绦。",
      "不知细叶谁裁出，",
      "二月春风似剪刀。"
    ]
  },
  {
    "id": "g2p3",
    "grade": 2,
    "title": "登鹳雀楼",
    "author": "王之涣",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "白日依山尽，",
      "黄河入海流。",
      "欲穷千里目，",
      "更上一层楼。"
    ]
  },
  {
    "id": "g2p4",
    "grade": 2,
    "title": "望庐山瀑布",
    "author": "李白",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "日照香炉生紫烟，",
      "遥看瀑布挂前川。",
      "飞流直下三千尺，",
      "疑是银河落九天。"
    ]
  },
  {
    "id": "g2p5",
    "grade": 2,
    "title": "夜宿山寺",
    "author": "李白",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "危楼高百尺，",
      "手可摘星辰。",
      "不敢高声语，",
      "恐惊天上人。"
    ]
  },
  {
    "id": "g2p6",
    "grade": 2,
    "title": "敕勒歌",
    "author": "北朝民歌",
    "dynasty": "南北朝",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "敕勒川，",
      "阴山下。",
      "天似穹庐，",
      "笼盖四野。",
      "天苍苍，",
      "野茫茫。",
      "风吹草低见牛羊。"
    ]
  },
  {
    "id": "g2p7",
    "grade": 2,
    "title": "晓出净慈寺送林子方",
    "author": "杨万里",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "毕竟西湖六月中，",
      "风光不与四时同。",
      "接天莲叶无穷碧，",
      "映日荷花别样红。"
    ]
  },
  {
    "id": "g2p8",
    "grade": 2,
    "title": "绝句",
    "author": "杜甫",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "两个黄鹂鸣翠柳，",
      "一行白鹭上青天。",
      "窗含西岭千秋雪，",
      "门泊东吴万里船。"
    ]
  },
  {
    "id": "g2p9",
    "grade": 2,
    "title": "悯农（其一）",
    "author": "李绅",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "春种一粒粟，",
      "秋收万颗子。",
      "四海无闲田，",
      "农夫犹饿死。"
    ]
  },
  {
    "id": "g2p10",
    "grade": 2,
    "title": "舟夜书所见",
    "author": "查慎行",
    "dynasty": "清",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "月黑见渔灯，",
      "孤光一点萤。",
      "微微风簇浪，",
      "散作满河星。"
    ]
  },
  {
    "id": "g3p1",
    "grade": 3,
    "title": "山行",
    "author": "杜牧",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "远上寒山石径斜，",
      "白云生处有人家。",
      "停车坐爱枫林晚，",
      "霜叶红于二月花。"
    ]
  },
  {
    "id": "g3p2",
    "grade": 3,
    "title": "赠刘景文",
    "author": "苏轼",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "荷尽已无擎雨盖，",
      "菊残犹有傲霜枝。",
      "一年好景君须记，",
      "最是橙黄橘绿时。"
    ]
  },
  {
    "id": "g3p3",
    "grade": 3,
    "title": "夜书所见",
    "author": "叶绍翁",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "萧萧梧叶送寒声，",
      "江上秋风动客情。",
      "知有儿童挑促织，",
      "夜深篱落一灯明。"
    ]
  },
  {
    "id": "g3p4",
    "grade": 3,
    "title": "望天门山",
    "author": "李白",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "天门中断楚江开，",
      "碧水东流至此回。",
      "两岸青山相对出，",
      "孤帆一片日边来。"
    ]
  },
  {
    "id": "g3p5",
    "grade": 3,
    "title": "饮湖上初晴后雨",
    "author": "苏轼",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "水光潋滟晴方好，",
      "山色空蒙雨亦奇。",
      "欲把西湖比西子，",
      "淡妆浓抹总相宜。"
    ]
  },
  {
    "id": "g3p6",
    "grade": 3,
    "title": "望洞庭",
    "author": "刘禹锡",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "湖光秋月两相和，",
      "潭面无风镜未磨。",
      "遥望洞庭山水翠，",
      "白银盘里一青螺。"
    ]
  },
  {
    "id": "g3p7",
    "grade": 3,
    "title": "绝句（迟日江山丽）",
    "author": "杜甫",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "迟日江山丽，",
      "春风花草香。",
      "泥融飞燕子，",
      "沙暖睡鸳鸯。"
    ]
  },
  {
    "id": "g3p8",
    "grade": 3,
    "title": "惠崇春江晚景",
    "author": "苏轼",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "竹外桃花三两枝，",
      "春江水暖鸭先知。",
      "蒌蒿满地芦芽短，",
      "正是河豚欲上时。"
    ]
  },
  {
    "id": "g3p9",
    "grade": 3,
    "title": "元日",
    "author": "王安石",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "爆竹声中一岁除，",
      "春风送暖入屠苏。",
      "千门万户曈曈日，",
      "总把新桃换旧符。"
    ]
  },
  {
    "id": "g3p10",
    "grade": 3,
    "title": "九月九日忆山东兄弟",
    "author": "王维",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "独在异乡为异客，",
      "每逢佳节倍思亲。",
      "遥知兄弟登高处，",
      "遍插茱萸少一人。"
    ]
  },
  {
    "id": "g4p1",
    "grade": 4,
    "title": "暮江吟",
    "author": "白居易",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "一道残阳铺水中，",
      "半江瑟瑟半江红。",
      "可怜九月初三夜，",
      "露似真珠月似弓。"
    ]
  },
  {
    "id": "g4p2",
    "grade": 4,
    "title": "题西林壁",
    "author": "苏轼",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "横看成岭侧成峰，",
      "远近高低各不同。",
      "不识庐山真面目，",
      "只缘身在此山中。"
    ]
  },
  {
    "id": "g4p3",
    "grade": 4,
    "title": "雪梅",
    "author": "卢钺",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "梅雪争春未肯降，",
      "骚人搁笔费评章。",
      "梅须逊雪三分白，",
      "雪却输梅一段香。"
    ]
  },
  {
    "id": "g4p4",
    "grade": 4,
    "title": "出塞",
    "author": "王昌龄",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "秦时明月汉时关，",
      "万里长征人未还。",
      "但使龙城飞将在，",
      "不教胡马度阴山。"
    ]
  },
  {
    "id": "g4p5",
    "grade": 4,
    "title": "凉州词",
    "author": "王翰",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "葡萄美酒夜光杯，",
      "欲饮琵琶马上催。",
      "醉卧沙场君莫笑，",
      "古来征战几人回？"
    ]
  },
  {
    "id": "g4p6",
    "grade": 4,
    "title": "夏日绝句",
    "author": "李清照",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "生当作人杰，",
      "死亦为鬼雄。",
      "至今思项羽，",
      "不肯过江东。"
    ]
  },
  {
    "id": "g4p7",
    "grade": 4,
    "title": "宿新市徐公店",
    "author": "杨万里",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "篱落疏疏一径深，",
      "树头新绿未成阴。",
      "儿童急走追黄蝶，",
      "飞入菜花无处寻。"
    ]
  },
  {
    "id": "g4p8",
    "grade": 4,
    "title": "四时田园杂兴（其二十五）",
    "author": "范成大",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "梅子金黄杏子肥，",
      "麦花雪白菜花稀。",
      "日长篱落无人过，",
      "惟有蜻蜓蛱蝶飞。"
    ]
  },
  {
    "id": "g4p9",
    "grade": 4,
    "title": "芙蓉楼送辛渐",
    "author": "王昌龄",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "寒雨连江夜入吴，",
      "平明送客楚山孤。",
      "洛阳亲友如相问，",
      "一片冰心在玉壶。"
    ]
  },
  {
    "id": "g4p10",
    "grade": 4,
    "title": "墨梅",
    "author": "王冕",
    "dynasty": "元",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "我家洗砚池头树，",
      "朵朵花开淡墨痕。",
      "不要人夸好颜色，",
      "只留清气满乾坤。"
    ]
  },
  {
    "id": "g5p1",
    "grade": 5,
    "title": "示儿",
    "author": "陆游",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "死去元知万事空，",
      "但悲不见九州同。",
      "王师北定中原日，",
      "家祭无忘告乃翁。"
    ]
  },
  {
    "id": "g5p2",
    "grade": 5,
    "title": "题临安邸",
    "author": "林升",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "山外青山楼外楼，",
      "西湖歌舞几时休？",
      "暖风熏得游人醉，",
      "直把杭州作汴州。"
    ]
  },
  {
    "id": "g5p3",
    "grade": 5,
    "title": "己亥杂诗",
    "author": "龚自珍",
    "dynasty": "清",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "九州生气恃风雷，",
      "万马齐喑究可哀。",
      "我劝天公重抖擞，",
      "不拘一格降人材。"
    ]
  },
  {
    "id": "g5p4",
    "grade": 5,
    "title": "山居秋暝",
    "author": "王维",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "空山新雨后，",
      "天气晚来秋。",
      "明月松间照，",
      "清泉石上流。",
      "竹喧归浣女，",
      "莲动下渔舟。",
      "随意春芳歇，",
      "王孙自可留。"
    ]
  },
  {
    "id": "g5p5",
    "grade": 5,
    "title": "枫桥夜泊",
    "author": "张继",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "月落乌啼霜满天，",
      "江枫渔火对愁眠。",
      "姑苏城外寒山寺，",
      "夜半钟声到客船。"
    ]
  },
  {
    "id": "g5p6",
    "grade": 5,
    "title": "四时田园杂兴（其三十一）",
    "author": "范成大",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "昼出耘田夜绩麻，",
      "村庄儿女各当家。",
      "童孙未解供耕织，",
      "也傍桑阴学种瓜。"
    ]
  },
  {
    "id": "g5p7",
    "grade": 5,
    "title": "稚子弄冰",
    "author": "杨万里",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "稚子金盆脱晓冰，",
      "彩丝穿取当银钲。",
      "敲成玉磬穿林响，",
      "忽作玻璃碎地声。"
    ]
  },
  {
    "id": "g5p8",
    "grade": 5,
    "title": "村晚",
    "author": "雷震",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "草满池塘水满陂，",
      "山衔落日浸寒漪。",
      "牧童归去横牛背，",
      "短笛无腔信口吹。"
    ]
  },
  {
    "id": "g5p9",
    "grade": 5,
    "title": "黄鹤楼送孟浩然之广陵",
    "author": "李白",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "故人西辞黄鹤楼，",
      "烟花三月下扬州。",
      "孤帆远影碧空尽，",
      "唯见长江天际流。"
    ]
  },
  {
    "id": "g5p10",
    "grade": 5,
    "title": "秋夜将晓出篱门迎凉有感",
    "author": "陆游",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "三万里河东入海，",
      "五千仞岳上摩天。",
      "遗民泪尽胡尘里，",
      "南望王师又一年。"
    ]
  },
  {
    "id": "g6p1",
    "grade": 6,
    "title": "宿建德江",
    "author": "孟浩然",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "移舟泊烟渚，",
      "日暮客愁新。",
      "野旷天低树，",
      "江清月近人。"
    ]
  },
  {
    "id": "g6p2",
    "grade": 6,
    "title": "六月二十七日望湖楼醉书",
    "author": "苏轼",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "黑云翻墨未遮山，",
      "白雨跳珠乱入船。",
      "卷地风来忽吹散，",
      "望湖楼下水如天。"
    ]
  },
  {
    "id": "g6p3",
    "grade": 6,
    "title": "西江月·夜行黄沙道中",
    "author": "辛弃疾",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "明月别枝惊鹊，",
      "清风半夜鸣蝉。",
      "稻花香里说丰年，",
      "听取蛙声一片。",
      "七八个星天外，",
      "两三点雨山前。",
      "旧时茅店社林边，",
      "路转溪桥忽见。"
    ]
  },
  {
    "id": "g6p4",
    "grade": 6,
    "title": "浪淘沙（其一）",
    "author": "刘禹锡",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "九曲黄河万里沙，",
      "浪淘风簸自天涯。",
      "如今直上银河去，",
      "同到牵牛织女家。"
    ]
  },
  {
    "id": "g6p5",
    "grade": 6,
    "title": "江南春",
    "author": "杜牧",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "千里莺啼绿映红，",
      "水村山郭酒旗风。",
      "南朝四百八十寺，",
      "多少楼台烟雨中。"
    ]
  },
  {
    "id": "g6p6",
    "grade": 6,
    "title": "书湖阴先生壁",
    "author": "王安石",
    "dynasty": "宋",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "茅檐长扫净无苔，",
      "花木成畦手自栽。",
      "一水护田将绿绕，",
      "两山排闼送青来。"
    ]
  },
  {
    "id": "g6p7",
    "grade": 6,
    "title": "马诗",
    "author": "李贺",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "大漠沙如雪，",
      "燕山月似钩。",
      "何当金络脑，",
      "快走踏清秋。"
    ]
  },
  {
    "id": "g6p8",
    "grade": 6,
    "title": "石灰吟",
    "author": "于谦",
    "dynasty": "明",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "千锤万凿出深山，",
      "烈火焚烧若等闲。",
      "粉骨碎身浑不怕，",
      "要留清白在人间。"
    ]
  },
  {
    "id": "g6p9",
    "grade": 6,
    "title": "竹石",
    "author": "郑燮",
    "dynasty": "清",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "咬定青山不放松，",
      "立根原在破岩中。",
      "千磨万击还坚劲，",
      "任尔东西南北风。"
    ]
  },
  {
    "id": "g6p10",
    "grade": 6,
    "title": "春夜喜雨",
    "author": "杜甫",
    "dynasty": "唐",
    "term": "拓展",
    "icon": "📜",
    "lines": [
      "好雨知时节，",
      "当春乃发生。",
      "随风潜入夜，",
      "润物细无声。",
      "野径云俱黑，",
      "江船火独明。",
      "晓看红湿处，",
      "花重锦官城。"
    ]
  }
]);

const PUNCT = /[，。！？、；：]/g;
const bare = (line) => line.replace(PUNCT, '');
const poemById = (id) => POEMS.find((p) => p.id === id);
// 每句一个音频：audio/lines/<诗id>-<句号>.mp3；诗名作者：<诗id>-0.mp3
const lineAudio = (poem, i) => `${poem.id}-${i + 1}`;

// 上句 → 下句（飞花令出题用）：同一首诗里相邻两句（排除《江南》中重复句式的歧义连句）
function linePairs(poems) {
  const pairs = [];
  for (const p of poems) {
    for (let i = 0; i + 1 < p.lines.length; i++) {
      if (p.id === 'jiangnan' && i > 0) continue;
      pairs.push({ poem: p, i, up: p.lines[i], down: p.lines[i + 1] });
    }
  }
  return pairs;
}

if (typeof module === 'object') module.exports = { POEMS, PUNCT, bare, poemById, lineAudio, linePairs };
