// 七巧板小达人 · 关卡数据：七块积木定义与 12 个剪影设计。
// 每个设计直接给出七块积木的标准拼法顶点（h 坐标，8×8 为标准正方形），
// 摆法（旋转/翻转/平移）由 placementFor 反推，剪影由七块并集描边生成，从数据上保证可解。
import { transformPolygon, traceOutline, shoelace, minPresses } from './engine.js';

// 七块经典积木：顶点以自转中心为原点（h 单位）。
export const pieces = [
  { id: 'large-1', shape: 'large', name: '大三角', polygon: [[0, -2], [-4, 2], [4, 2]] },
  { id: 'large-2', shape: 'large', name: '大三角', polygon: [[0, -2], [-4, 2], [4, 2]] },
  { id: 'medium', shape: 'medium', name: '中三角', polygon: [[-2, -2], [2, -2], [-2, 2]] },
  { id: 'square', shape: 'square', name: '正方形', polygon: [[0, -2], [2, 0], [0, 2], [-2, 0]] },
  { id: 'small-1', shape: 'small', name: '小三角', polygon: [[0, -2], [-2, 0], [2, 0]] },
  { id: 'small-2', shape: 'small', name: '小三角', polygon: [[0, -2], [-2, 0], [2, 0]] },
  { id: 'para', shape: 'para', name: '平行四边形', chiral: true, polygon: [[-3, -1], [1, -1], [3, 1], [-1, 1]] },
];

const pieceById = new Map(pieces.map((piece) => [piece.id, piece]));

function sortedVertices(polygon) {
  return polygon
    .map(([x, y]) => [x, y])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}

function relativeShape(polygon) {
  const sorted = sortedVertices(polygon);
  const [ox, oy] = sorted[0];
  return JSON.stringify(sorted.map(([x, y]) => [x - ox, y - oy]));
}

// 反推一块积木摆成目标多边形所需的 { rot, flip, tx, ty }。设计数据有误会抛错。
export function placementFor(piece, polygon) {
  const target = relativeShape(polygon);
  for (let flip = 0; flip < 2; flip++)
    for (let rot = 0; rot < 8; rot++) {
      const base = transformPolygon(piece.polygon, { rot, flip, tx: 0, ty: 0 });
      if (relativeShape(base) !== target) continue;
      const sortedBase = sortedVertices(base);
      const [fx, fy] = sortedVertices(polygon)[0];
      return {
        rot,
        flip: Boolean(flip),
        tx: fx - sortedBase[0][0],
        ty: fy - sortedBase[0][1],
      };
    }
  throw new Error(`积木 ${piece.id} 无法摆成目标多边形 ${JSON.stringify(polygon)}`);
}

// 12 个剪影设计：slots 记录每块积木在成品中的顶点（h 坐标）。
const designs = [
  {
    name: '正方形',
    emoji: '🟧',
    hint: '两块大三角先拼出上面和左边，正方形小块住在中间。',
    slots: {
      'large-1': [[0, 0], [8, 0], [4, 4]],
      'large-2': [[0, 0], [4, 4], [0, 8]],
      medium: [[8, 8], [4, 8], [8, 4]],
      square: [[4, 4], [6, 6], [4, 8], [2, 6]],
      'small-1': [[0, 8], [4, 8], [2, 6]],
      'small-2': [[4, 4], [6, 2], [6, 6]],
      para: [[8, 0], [8, 4], [6, 6], [6, 2]],
    },
  },
  {
    name: '帆船',
    emoji: '⛵',
    hint: '船帆立在中间，船身从左往右铺平。',
    slots: {
      'large-1': [[4, 16], [8, 12], [0, 12]],
      'large-2': [[8, 12], [4, 16], [12, 16]],
      medium: [[8, 12], [4, 12], [8, 8]],
      square: [[12, 12], [14, 14], [12, 16], [10, 14]],
      'small-1': [[12, 12], [10, 10], [10, 14]],
      'small-2': [[14, 14], [16, 12], [12, 12]],
      para: [[10, 14], [10, 10], [8, 8], [8, 12]],
    },
  },
  {
    name: '小猫',
    emoji: '🐱',
    hint: '两只尖耳朵竖起来，尾巴收在下面。',
    slots: {
      'large-1': [[4, 8], [0, 12], [0, 4]],
      'large-2': [[4, 0], [8, 4], [4, 8]],
      medium: [[4, 4], [4, 8], [0, 4]],
      square: [[10, 6], [8, 8], [6, 6], [8, 4]],
      'small-1': [[4, 8], [6, 10], [6, 6]],
      'small-2': [[8, 4], [10, 2], [10, 6]],
      para: [[8, 12], [8, 8], [6, 6], [6, 10]],
    },
  },
  {
    name: '小马',
    emoji: '🐴',
    hint: '先摆身体的大三角，四条腿朝下站好。',
    slots: {
      'large-1': [[4, 8], [0, 4], [8, 4]],
      'large-2': [[0, 4], [4, 8], [0, 12]],
      medium: [[8, 12], [4, 12], [8, 8]],
      square: [[10, 2], [12, 4], [10, 6], [8, 4]],
      'small-1': [[10, 6], [8, 4], [8, 8]],
      'small-2': [[10, 2], [8, 0], [8, 4]],
      para: [[6, 10], [6, 6], [8, 4], [8, 8]],
    },
  },
  {
    name: '小狗',
    emoji: '🐶',
    hint: '头在前面的尖角上，身体连着小尾巴。',
    slots: {
      'large-1': [[8, 4], [12, 0], [4, 0]],
      'large-2': [[8, 4], [4, 8], [4, 0]],
      medium: [[4, 4], [4, 8], [0, 4]],
      square: [[12, 4], [14, 6], [12, 8], [10, 6]],
      'small-1': [[2, 2], [0, 4], [4, 4]],
      'small-2': [[8, 4], [10, 2], [10, 6]],
      para: [[12, 0], [12, 4], [10, 6], [10, 2]],
    },
  },
  {
    name: '松鼠',
    emoji: '🐿️',
    hint: '大尾巴在右边翘起来，头朝左看。',
    slots: {
      'large-1': [[8, 6], [12, 2], [4, 2]],
      'large-2': [[4, 2], [0, 6], [8, 6]],
      medium: [[4, 6], [8, 6], [4, 10]],
      square: [[8, 6], [10, 8], [8, 10], [6, 8]],
      'small-1': [[8, 2], [10, 0], [6, 0]],
      'small-2': [[8, 6], [10, 4], [10, 8]],
      para: [[2, 0], [6, 0], [8, 2], [4, 2]],
    },
  },
  {
    name: '金鱼',
    emoji: '🐠',
    hint: '大嘴巴朝左张开，尾巴收在右下角。',
    slots: {
      'large-1': [[4, 4], [8, 0], [0, 0]],
      'large-2': [[0, 0], [4, 4], [0, 8]],
      medium: [[8, 8], [8, 4], [4, 8]],
      square: [[4, 4], [6, 6], [4, 8], [2, 6]],
      'small-1': [[2, 6], [0, 8], [4, 8]],
      'small-2': [[10, 10], [12, 8], [8, 8]],
      para: [[4, 8], [8, 8], [10, 10], [6, 10]],
    },
  },
  {
    name: '鲸鱼',
    emoji: '🐳',
    hint: '大海豚朝右游，肚子平平贴着地。',
    slots: {
      'large-1': [[4, 2], [12, 2], [8, 6]],
      'large-2': [[4, 2], [8, 6], [4, 10]],
      medium: [[4, 6], [4, 10], [0, 6]],
      square: [[12, 2], [14, 4], [12, 6], [10, 4]],
      'small-1': [[14, 4], [16, 2], [12, 2]],
      'small-2': [[2, 0], [0, 2], [4, 2]],
      para: [[2, 0], [6, 0], [8, 2], [4, 2]],
    },
  },
  {
    name: '蝴蝶',
    emoji: '🦋',
    hint: '上下各两片翅膀，中间身子细细的。',
    slots: {
      'large-1': [[8, 6], [12, 2], [4, 2]],
      'large-2': [[4, 2], [8, 6], [4, 10]],
      medium: [[4, 2], [4, 6], [0, 2]],
      square: [[8, 6], [10, 8], [8, 10], [6, 8]],
      'small-1': [[6, 0], [8, 2], [4, 2]],
      'small-2': [[6, 8], [4, 10], [8, 10]],
      para: [[4, 6], [4, 10], [2, 12], [2, 8]],
    },
  },
  {
    name: '小鸟',
    emoji: '🐤',
    hint: '头在最上面，尾巴向右下翘起来。',
    slots: {
      'large-1': [[6, 12], [2, 8], [10, 8]],
      'large-2': [[2, 0], [6, 4], [2, 8]],
      medium: [[6, 0], [6, 4], [2, 0]],
      square: [[2, 8], [4, 10], [2, 12], [0, 10]],
      'small-1': [[2, 8], [6, 8], [4, 6]],
      'small-2': [[4, 10], [2, 12], [6, 12]],
      para: [[8, 14], [4, 14], [2, 12], [6, 12]],
    },
  },
  {
    name: '大雁',
    emoji: '🐦',
    hint: '两片翅膀竖起来，头朝左边飞。',
    slots: {
      'large-1': [[8, 4], [4, 0], [4, 8]],
      'large-2': [[4, 8], [0, 12], [8, 12]],
      medium: [[12, 8], [8, 8], [12, 4]],
      square: [[8, 4], [10, 6], [8, 8], [6, 6]],
      'small-1': [[6, 6], [4, 8], [8, 8]],
      'small-2': [[8, 4], [10, 2], [10, 6]],
      para: [[4, 4], [4, 8], [2, 10], [2, 6]],
    },
  },
  {
    name: '老鹰',
    emoji: '🦅',
    hint: '翅膀朝右上展开，爪子收在下面。',
    slots: {
      'large-1': [[6, 12], [10, 8], [2, 8]],
      'large-2': [[2, 0], [6, 4], [2, 8]],
      medium: [[8, 2], [12, 2], [8, 6]],
      square: [[6, 4], [8, 6], [6, 8], [4, 6]],
      'small-1': [[2, 8], [6, 8], [4, 6]],
      'small-2': [[6, 4], [8, 6], [8, 2]],
      para: [[2, 4], [2, 8], [0, 10], [0, 6]],
    },
  },
];

export const levels = designs.map((design, id) => {
  const slots = Object.entries(design.slots).map(([pieceId, polygon]) => {
    const piece = pieceById.get(pieceId);
    const placement = placementFor(piece, polygon);
    return { ...placement, pieceId, shape: piece.shape, name: piece.name, polygon };
  });
  const polygons = slots.map((slot) => slot.polygon);
  const outline = traceOutline(polygons)[0];
  const xs = outline.map(([x]) => x);
  const ys = outline.map(([, y]) => y);
  const baseRot = (id * 5 + 3) % 8;
  const budget = slots.reduce(
    (total, slot, index) =>
      total +
      minPresses(
        pieceById.get(slot.pieceId),
        {
          tx: slot.tx,
          ty: slot.ty,
          rot: (baseRot + index * 3) % 8,
          flip: slot.shape === 'para' ? id % 2 === 1 : false,
        },
        slot,
      ),
    0,
  );
  return {
    id,
    name: design.name,
    emoji: design.emoji,
    hint: design.hint,
    slots,
    silhouette: outline,
    area: Math.abs(shoelace(outline)),
    bounds: {
      minX: Math.min(...xs),
      minY: Math.min(...ys),
      maxX: Math.max(...xs),
      maxY: Math.max(...ys),
    },
    budget,
  };
});
