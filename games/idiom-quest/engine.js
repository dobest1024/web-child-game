// 纯游戏逻辑：计星与存档清洗。可以在 Node 里直接导入，绝不引用浏览器对象。
import { findIdiom, LEVEL_COUNT } from './levels.js';

// 一关内首次全对 3 星，错 1 题 2 星，其余过关 1 星。
export function starsFor(missed) {
  return missed <= 0 ? 3 : missed === 1 ? 2 : 1;
}

// 记录星数时只保留历史最好成绩。
export function recordStars(progress, levelId, stars) {
  const previous = progress.stars[levelId] || 0;
  if (!Number.isInteger(levelId) || levelId < 0 || levelId >= LEVEL_COUNT)
    return progress;
  if (stars <= previous) return progress;
  return { ...progress, stars: { ...progress.stars, [levelId]: stars } };
}

// 把答完的成语按顺序收进收集册，重复的自动忽略。
export function addCollected(progress, words) {
  const fresh = words.filter(
    (word) => findIdiom(word) && !progress.collected.includes(word),
  );
  return fresh.length
    ? { ...progress, collected: [...progress.collected, ...fresh] }
    : progress;
}

// 解析题目对应的答案成语词条（兼容补字题、接龙题）。
export function resolveQuestionIdiom(question) {
  if (!question) return undefined;
  const answerWord =
    question.tail ||
    question.options?.[question.answer] ||
    (typeof question.answer === 'string' ? question.answer : undefined);
  return findIdiom(question.word || answerWord || question.head);
}

// 提取题目完成后应收入收集册的成语列表。
export function collectableWords(question) {
  if (!question) return [];
  if (question.type === 'match') return question.pairs.map((pair) => pair.word);
  if (question.type === 'chain') {
    const answerWord =
      question.tail ||
      question.options?.[question.answer] ||
      (typeof question.answer === 'string' ? question.answer : undefined);
    return [question.head, answerWord].filter(Boolean);
  }
  return question.word ? [question.word] : [];
}

// 清洗读到的存档：只保留合法的关卡星数与库内成语，顺序保持不变。
export function normalizeProgress(raw) {
  const progress = { stars: {}, collected: [] };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return progress;
  if (raw.stars && typeof raw.stars === 'object' && !Array.isArray(raw.stars)) {
    for (const [mark, value] of Object.entries(raw.stars)) {
      const id = Number(mark);
      if (
        Number.isInteger(id) &&
        id >= 0 &&
        id < LEVEL_COUNT &&
        (value === 1 || value === 2 || value === 3)
      )
        progress.stars[id] = value;
    }
  }
  if (Array.isArray(raw.collected)) {
    for (const item of raw.collected)
      if (typeof item === 'string' && findIdiom(item) && !progress.collected.includes(item))
        progress.collected.push(item);
  }
  return progress;
}
