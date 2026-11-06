// 风力帆船航海记 - 核心物理与帆船动力学计算引擎

export const NO_GO_ANGLE = 45; // 顶风角（度）：船头与来风方向夹角小于 45 度为禁航区

// 计算来风方向与船头朝向的夹角 (0° 表示正顶风, 180° 表示正顺风, 90° 表示正侧风)
export function calculateApparentWindAngle(shipHeadingDeg, windOriginDeg) {
  // windOriginDeg: 风吹来的方向（如 0° 表示正北风，从北往南吹）
  let diff = Math.abs(shipHeadingDeg - windOriginDeg) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff; // 0°: 直接对着风头冲(顶风); 180°: 顺风
}

// 判定是否在顶风禁航区内
export function isInNoGoZone(shipHeadingDeg, windOriginDeg) {
  const angle = calculateApparentWindAngle(shipHeadingDeg, windOriginDeg);
  return angle < NO_GO_ANGLE;
}

// 计算帆船向前推进力系数 (0 ~ 1.0)
export function calculateThrust(shipHeadingDeg, windOriginDeg, sailTrim = 1) {
  const angle = calculateApparentWindAngle(shipHeadingDeg, windOriginDeg);

  // 1. 顶风禁航区：无升力，帆面剧烈抖动失速
  if (angle < NO_GO_ANGLE) {
    return -0.2; // 倒退阻力
  }

  // 2. 侧风抢风迎风区 (45° ~ 110°): 伯努利机翼升力效应，速度最快！
  if (angle <= 110) {
    const ratio = (angle - NO_GO_ANGLE) / (110 - NO_GO_ANGLE);
    return (0.6 + 0.4 * Math.sin(ratio * Math.PI / 2)) * sailTrim;
  }

  // 3. 顺风区 (110° ~ 180°): 纯风阻推动
  const downwindRatio = (180 - angle) / 70;
  return (0.7 + 0.15 * downwindRatio) * sailTrim;
}

// 碰撞检测：圆与圆碰撞
export function checkCollision(x1, y1, r1, x2, y2, r2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
}

// 判定是否到达终点
export function isAtDestination(shipX, shipY, destX, destY, destRadius = 32) {
  const dx = shipX - destX;
  const dy = shipY - destY;
  return dx * dx + dy * dy <= destRadius * destRadius;
}

export function calculateStars(timeUsedSec, parTimeSec, crashCount) {
  if (crashCount > 0) return 1;
  if (timeUsedSec <= parTimeSec) return 3;
  if (timeUsedSec <= parTimeSec * 1.5) return 2;
  return 1;
}

export function sanitizeProgress(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const clean = {};
  for (const [k, v] of Object.entries(raw)) {
    const levelNum = Number(k);
    const stars = Number(v);
    if (Number.isInteger(levelNum) && levelNum >= 1 && levelNum <= 100) {
      clean[levelNum] = Math.max(1, Math.min(3, Math.floor(stars) || 1));
    }
  }
  return clean;
}
