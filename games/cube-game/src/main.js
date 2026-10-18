import "./style.css";
import {
  createIcons,
  Compass,
  Gamepad2,
  BookOpen,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  Star,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Lightbulb,
  Check,
  CheckCheck,
  LockKeyhole,
  Sparkles,
  Flame,
  Clock,
  Target,
  Sprout,
  Rocket,
  Settings2,
  Plus,
  Box,
  Layers,
  Sun,
  Users,
  Flag,
  Search,
  CircleHelp,
  Home,
  Shuffle,
  Headphones,
  MousePointer2,
  RefreshCw,
  Medal,
} from "lucide";
import { TwistyPlayer } from "cubing/twisty";
import { Alg } from "cubing/alg";
import { puzzles } from "cubing/puzzles";
import { courses, formulas, moveWords } from "./content.js";
import { cubeArt } from "./art.js";
import {
  baseOrientation,
  remainingMoves,
  puzzleSolved,
  normalizedMoves,
} from "./mechanics.js";
import {
  cfopChapters,
  lessonKey,
  lessonStep,
  migrateProgress,
} from "./cfop.js";
import {
  teachingMarkup,
  checkMarkup,
  caseDiagram,
  updateTeaching,
} from "./teaching.js";
import { renderLearning } from "./learning.js";
import voiceManifest from "./voice-manifest.json";

const icons = {
  Compass,
  Gamepad2,
  BookOpen,
  Trophy,
  ArrowRight,
  ArrowLeft,
  Volume2,
  VolumeX,
  Star,
  ChevronRight,
  ChevronLeft,
  X,
  Play,
  Pause,
  RotateCcw,
  Undo2,
  Lightbulb,
  Check,
  CheckCheck,
  LockKeyhole,
  Sparkles,
  Flame,
  Clock,
  Target,
  Sprout,
  Rocket,
  Settings2,
  Plus,
  Box,
  Layers,
  Sun,
  Users,
  Flag,
  Search,
  CircleHelp,
  Home,
  Shuffle,
  Headphones,
  MousePointer2,
  RefreshCw,
  Medal,
};
const $ = (s) => document.querySelector(s);
const icon = (name, cls = "") => `<i data-lucide="${name}" class="${cls}"></i>`;
const paintIcons = () => createIcons({ icons, attrs: { "stroke-width": 1.8 } });
const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
let saved;
try {
  saved = JSON.parse(localStorage.getItem("cube-island-v1") || "{}");
} catch {
  saved = {};
}
saved = saved && typeof saved === "object" ? saved : {};
const state = {
  page: "adventure",
  filter: "all",
  completed: migrateProgress(saved.completed, courses),
  voice: saved.voice !== false,
  rate: saved.rate === 1 ? 1 : 0.8,
  formulaFilter: "全部",
  query: "",
};
let game = null;
let learningCleanup = null;
let lastFocus = null;
let speakId = 0;
let toastTimer;
const persist = () => {
  try {
    localStorage.setItem(
      "cube-island-v1",
      JSON.stringify({
        completed: state.completed,
        voice: state.voice,
        rate: state.rate,
      }),
    );
  } catch {
    toast("当前浏览器无法保存进度，仍可继续玩。");
  }
};
const progress = (c) =>
  c.stages.filter((_, i) => state.completed.includes(lessonKey(c, i))).length;
const totalStars = () => state.completed.length * 3;
const nextStage = (c) =>
  Math.max(
    0,
    c.stages.findIndex((_, i) => !state.completed.includes(lessonKey(c, i))),
  );
const labelPages = {
  adventure: "探险地图",
  learning: "魔方小学堂",
  practice: "自由练习",
  formulas: "公式口袋",
  badges: "我的成就",
};

function toast(text) {
  let el = $("#toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role", "status");
    document.body.append(el);
  }
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3500);
}
const narrator = new Audio();
narrator.id = "coach-audio";
narrator.preload = "auto";
document.body.append(narrator);
let speechFinished = null;
function stopSpeech() {
  speakId++;
  narrator.pause();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  speechFinished?.();
  speechFinished = null;
  $("#listen")?.classList.remove("speaking");
}
function speak(text, force = false) {
  stopSpeech();
  if (!state.voice && !force) return Promise.resolve();
  const current = speakId;
  return new Promise((resolve) => {
    let ended = false;
    let fallbackStarted = false;
    const finish = () => {
      if (ended) return;
      ended = true;
      if (current === speakId) $("#listen")?.classList.remove("speaking");
      resolve();
    };
    speechFinished = finish;
    const fallback = () => {
      if (fallbackStarted) return;
      fallbackStarted = true;
      if (current !== speakId) {
        finish();
        return;
      }
      const voice = window.speechSynthesis
        ?.getVoices()
        .find((v) => /^zh/i.test(v.lang));
      if (!voice) {
        toast("语音暂时没有加载成功，请点小喇叭重试。文字提示也可以跟练。");
        finish();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = voice;
      utterance.lang = "zh-CN";
      utterance.rate = state.rate;
      utterance.onend = finish;
      utterance.onerror = finish;
      speechSynthesis.speak(utterance);
    };
    if (!voiceManifest[text]) {
      fallback();
      return;
    }
    narrator.src = voiceManifest[text];
    narrator.playbackRate = state.rate;
    narrator.onplaying = () => {
      if (current === speakId) $("#listen")?.classList.add("speaking");
    };
    narrator.onended = finish;
    narrator.onerror = fallback;
    narrator.play().catch((error) => {
      if (current !== speakId) {
        finish();
        return;
      }
      if (error.name === "NotAllowedError") {
        toast("点一下小喇叭，就能听小方讲解啦。");
        finish();
      } else fallback();
    });
  });
}

function shell() {
  $("#app").innerHTML =
    `<aside class="sidebar"><a href="#" class="brand" aria-label="魔方小岛首页"><span class="brand-mark">${icon("box")}</span><span>魔方小岛<small>CUBE ISLAND</small></span></a><div class="sidebar-label">一起开启魔方冒险</div><nav aria-label="主导航">${[
      ["adventure", "compass"],
      ["learning", "sprout"],
      ["practice", "gamepad-2"],
      ["formulas", "book-open"],
      ["badges", "trophy"],
    ]
      .map(
        ([p, i]) =>
          `<button class="nav-item ${state.page === p ? "active" : ""}" data-page="${p}" ${state.page === p ? 'aria-current="page"' : ""}>${icon(i)}${labelPages[p]}${p === "adventure" ? '<span class="nav-dot"></span>' : ""}</button>`,
      )
      .join(
        "",
      )}</nav><div class="side-bottom"><div class="coach-mini"><div class="mini-spark">✦</div><span class="mini-cube">${cubeArt("2x2x2", { mascot: true })}</span><strong>每个高手，<br>都从第一步开始。</strong><p>每天玩一会儿，进步一点点。</p><button class="text-link" id="encourage">听听小方怎么说 ${icon("volume-2")}</button></div><button class="parent-link" id="parent-help">${icon("circle-help")} 给爸爸妈妈的小贴士</button><span class="side-foot">为 6–10 岁的小探险家设计 <span>♡</span></span></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumbs">小岛大厅 ${icon("chevron-right")} <strong>${labelPages[state.page]}</strong></div><div class="top-actions"><span class="star-balance">${icon("star")} <b>${totalStars()}</b><span>小星星</span></span><button id="voice-toggle" class="icon-button" aria-label="${state.voice ? "关闭" : "开启"}语音" title="${state.voice ? "关闭" : "开启"}语音">${icon(state.voice ? "volume-2" : "volume-x")}</button><div class="profile"><span class="avatar">☺</span><span>小小探险家<small>今天也一起加油！</small></span></div></div></header><main id="main"></main><footer class="footer"><span>${icon("sprout")} 慢慢来，每一次转动都算数。</span><span>魔方小岛 · 让好奇心转起来</span></footer></div><div id="modal-root"></div><div id="toast" role="status"></div>`;
  document
    .querySelectorAll("[data-page]")
    .forEach((el) => (el.onclick = () => navigate(el.dataset.page)));
  $(".brand").onclick = (e) => {
    e.preventDefault();
    navigate("adventure");
  };
  $("#voice-toggle").onclick = () => {
    state.voice = !state.voice;
    persist();
    stopSpeech();
    shell();
    renderPage();
    toast(state.voice ? "语音小教练已开启" : "语音已关闭，文字提示仍会陪着你");
  };
  $("#encourage").onclick = () =>
    speak(
      "嗨，小探险家！我是小方。魔方不需要一次就学会。今天学会一个小动作，也是一件很棒的事情。拿起魔方，我们一起出发吧！",
      true,
    );
  $("#parent-help").onclick = () =>
    infoModal(
      "陪孩子，慢慢转",
      `<p>先到魔方小学堂认识中心、棱块和角块，再选择完整复原。每次 5–10 分钟，先观察，再转动；不计时、不排名。</p><p>探险地图的单关使用预设局面练习一个知识点；小学堂的完整复原会在同一颗随机打乱的魔方上连续教学。孩子完成练习后，可以拿实体魔方对照尝试；不同局面要先识别情况，不能机械套公式。</p><p>CFOP 先理解十字、角棱配对、顶面翻色、顶层换位。本版 CFOP 有 ${courses[3].stages.length} 关，包含 10 种两步 OLL 情况、6 种两步 PLL 情况和最后对齐。完整 57 OLL / 21 PLL 留到以后再学。</p><p>语音由本地 IndexTTS 2.5 大模型生成，使用内置中文女声音色。若没有声音，请检查设备音量，或点击关卡里的小喇叭重播。进度只保存在当前浏览器，不需要孩子注册账号。</p><p class="source-links">语音参考音色：FLEURS © Google LLC（CC BY 4.0），经 BaoCut 预处理；本站通过 IndexTTS 2.5 生成新讲解，并调整响度与编码。<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">查看许可</a></p><p class="source-links">教学参考：<a href="https://jperm.net/3x3/cfop" target="_blank" rel="noopener noreferrer">J Perm · CFOP</a> · <a href="https://www.cubeskills.com/uploads/pdf/tutorials/4-look-last-layer.pdf" target="_blank" rel="noopener noreferrer">CubeSkills · 两步 OLL / PLL</a> · <a href="https://js.cubing.net/cubing/" target="_blank" rel="noopener noreferrer">cubing.js 魔方引擎</a></p>`,
    );
}
function navigate(page) {
  closeModal();
  state.page = page;
  shell();
  renderPage();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function renderPage() {
  ({
    adventure: renderAdventure,
    learning: () => renderLearning({ container: $("#main"), mountModal, closeModal, speak, stopSpeech, toast, startGame, refresh: renderPage, setCleanup: (cleanup) => { learningCleanup = cleanup; } }),
    practice: renderPractice,
    formulas: renderFormulas,
    badges: renderBadges,
  })[state.page]();
  paintIcons();
}
function sectionHeading(title, sub, right = "") {
  return `<div class="section-heading"><div><h2>${title}</h2><p>${sub}</p></div>${right}</div>`;
}
function renderAdventure() {
  const c = courses[0],
    done = progress(c);
  $("#main").innerHTML =
    `<section class="hero"><div class="hero-content"><span class="eyebrow"><span></span> 欢迎来到魔方小岛</span><h1>小手转一转，<br>开启<span class="highlight">大冒险 <svg viewBox="0 0 245 10"><path d="M3 6Q105-1 240 5"/></svg></span></h1><p>和小方一起，听一听、转一转。<br>把五彩的魔方，一步步变回整齐的模样！</p><button class="button primary" id="start-adventure">${icon("play")} ${done ? "继续我的冒险" : "开始我的冒险"} ${icon("arrow-right")}</button><div class="hero-promises"><span>${icon("headphones")} 语音陪你学</span><span>${icon("gamepad-2")} 边玩边学会</span><span>${icon("star")} 收集小星星</span></div></div><div class="hero-art"><span class="hero-orbit orbit-one"></span><span class="hero-orbit orbit-two"></span><span class="doodle star-one">✦</span><span class="doodle star-two">✧</span><span class="doodle ring-one"></span><span class="float-label label-top">你好呀，我是小方！ <span>✌</span></span><div class="hero-cube">${cubeArt("3x3x3", { mascot: true })}</div><span class="float-label label-bottom">${icon("sparkles")} 一起把“不可能”变成“我会啦”</span><span class="art-dot dot-one"></span><span class="art-dot dot-two"></span></div></section><section class="journey-strip"><div class="journey-icon">${icon("flag")}</div><div class="journey-text"><strong>${done ? "小小进步，值得被看见" : "你的第一颗星星，在等你"}</strong><span>${done ? `你已完成 ${done} 个三阶关卡，继续向前吧！` : "完成一关，就能点亮你的探险地图。"}</span></div><div class="journey-meter"><span>三阶入门进度 <b>${done} / ${c.stages.length} 关</b></span><div class="progress-track"><i style="width:${(done / c.stages.length) * 100}%"></i></div></div><button class="round-link" aria-label="查看三阶关卡" id="journey-open">${icon("arrow-right")}</button></section><section class="worlds">${sectionHeading(
      "选一座小岛，出发吧！",
      "从零开始也没关系，每座小岛都有小方陪你。",
      `<div class="segmented" aria-label="难度筛选">${[
        ["all", "全部小岛"],
        ["starter", "新手入门"],
        ["advanced", "进阶挑战"],
      ]
        .map(
          ([v, t]) =>
            `<button class="${state.filter === v ? "selected" : ""}" data-filter="${v}">${t}</button>`,
        )
        .join("")}</div>`,
    )}<div class="course-grid">${courses
      .filter(
        (c) =>
          state.filter === "all" ||
          (state.filter === "advanced" ? c.id === "cfop" : c.id !== "cfop"),
      )
      .map(courseCard)
      .join(
        "",
      )}</div></section><section class="bottom-grid"><div class="how-card"><span class="tiny-label">小岛探险指南</span><h3>学会魔方，只要小小三步</h3><div class="how-steps"><div><span class="how-icon purple">${icon("headphones")}</span><strong>1. 听一听</strong><p>小方把每一步讲给你听</p></div><span class="step-dots">···</span><div><span class="how-icon orange">${icon("mouse-pointer-2")}</span><strong>2. 转一转</strong><p>跟着提示，亲手试试看</p></div><span class="step-dots">···</span><div><span class="how-icon green">${icon("star")}</span><strong>3. 我会啦</strong><p>复原成功，收下小星星</p></div></div></div><div class="tip-card"><span class="tip-heading">${icon("lightbulb")} 小方的悄悄话</span><h3>不用背几百个公式，<br>也可以开始玩！</h3><p>先学层先法，再认识 CFOP。<br>每次只学一点点，你会越转越明白。</p><button id="cfop-info" class="text-link">认识 CFOP ${icon("arrow-right")}</button><span class="tip-doodle">✦</span></div></section>`;
  $("#start-adventure").onclick = () => startGame(c.id, nextStage(c));
  $("#journey-open").onclick = () => openCourse("beginner");
  $("#cfop-info").onclick = () => openCourse("cfop");
  document.querySelectorAll("[data-filter]").forEach(
    (b) =>
      (b.onclick = () => {
        state.filter = b.dataset.filter;
        renderAdventure();
        paintIcons();
      }),
  );
  const learningEntry = document.createElement("section");
  learningEntry.className = "learning-entry";
  learningEntry.innerHTML = '<div><span class="eyebrow">新内容 · 魔方小学堂</span><h2>从认清一块，到独立复原整颗</h2><p>24 个知识小游戏 + 三种魔方完整路线。先听懂，再自己试。</p></div><button class="button primary" id="open-learning">进入小学堂 →</button>';
  $(".worlds").before(learningEntry);
  $("#open-learning").onclick = () => navigate("learning");
  bindCourses();
}
function courseCard(c) {
  const p = progress(c);
  return `<button class="course-card ${c.color}" data-course="${c.id}"><div class="course-image"><span class="course-tag">${c.id === "beginner" ? icon("sprout") : c.id === "cfop" ? icon("rocket") : icon("sparkles")}${c.tag}</span><span class="course-decoration">${c.id === "cfop" ? "✦" : "✧"}</span>${cubeArt(c.puzzle)}${c.id === "cfop" ? '<span class="speed-line speed-one"></span><span class="speed-line speed-two"></span>' : ""}</div><div class="course-body"><div class="course-title"><h3>${c.name}</h3>${icon("arrow-right")}</div><p>${c.subtitle}</p><div class="course-meta"><span>${c.method}</span><span>${c.stages.length} 个小关卡</span></div><div class="card-progress"><div class="progress-track"><i style="width:${(p / c.stages.length) * 100}%"></i></div><span>${p}/${c.stages.length}</span></div></div></button>`;
}
function bindCourses() {
  document
    .querySelectorAll("[data-course]")
    .forEach((el) => (el.onclick = () => openCourse(el.dataset.course)));
}
function renderPractice() {
  $("#main").innerHTML =
    `<div class="page-heading"><span class="eyebrow">PLAYGROUND · 自由探索</span><h1>这里，每一种转法都可以试。</h1><p>选一个魔方，打乱、转动、撤回。没有倒计时，慢慢玩。</p></div><div class="practice-grid">${courses
      .slice(0, 3)
      .map(
        (c) =>
          `<article class="practice-card ${c.color}"><div class="practice-art">${cubeArt(c.puzzle)}</div><h2>${c.name}</h2><p>自由转动 · 可撤回 · 复原检测</p><button class="button primary" data-practice="${c.id}">${icon("gamepad-2")} 开始玩</button></article>`,
      )
      .join(
        "",
      )}</div><div class="soft-note">${icon("lightbulb")} 拖动画面可以换个角度观察魔方；用下方按钮转动某一层。迷路了就按“撤回”，一步一步找回方向。</div>`;
  document
    .querySelectorAll("[data-practice]")
    .forEach(
      (b) =>
        (b.onclick = () => startGame(b.dataset.practice, 0, { free: true })),
    );
}
function renderFormulas() {
  $("#main").innerHTML =
    `<div class="page-heading"><span class="eyebrow">LITTLE TOOLKIT · 每次学一点</span><h1>把小诀窍，装进口袋。</h1><p>公式是动作的小纸条。先看懂、再跟练，记不住也没关系。</p></div><div class="formula-intro"><div class="how-icon purple">${icon("book-open")}</div><div><strong>字母，其实是魔方的方向</strong><p>R 右 · L 左 · U 上 · D 下 · F 前 · B 后　｜　' 反着转　｜　2 转半圈</p><small>顺逆时针，都要正对着正在转动的那一面看。金字塔每步 120°，三阶 / 二阶每步 90°。</small></div></div><div class="formula-toolbar"><div class="segmented">${["全部", "基础", "层先法", "OLL", "PLL", "金字塔"].map((t) => `<button data-fgroup="${t}" class="${state.formulaFilter === t ? "selected" : ""}">${t}</button>`).join("")}</div><label class="search-field">${icon("search")}<input id="formula-search" placeholder="找一个小诀窍…" aria-label="搜索公式" value="${escape(state.query)}"></label></div><p class="catalog-note">本版精选 ${formulas.length} 个入门练习。完整 OLL 有 57 种、PLL 有 21 种；先从会用的几个开始。</p><div id="formula-results" class="formula-grid"></div>`;
  document.querySelectorAll("[data-fgroup]").forEach(
    (b) =>
      (b.onclick = () => {
        state.formulaFilter = b.dataset.fgroup;
        renderFormulas();
        paintIcons();
      }),
  );
  $("#formula-search").oninput = (e) => {
    state.query = e.target.value;
    renderFormulaResults();
  };
  renderFormulaResults();
}
function renderFormulaResults() {
  const list = formulas
    .map((f, i) => ({ ...f, i }))
    .filter(
      (f) =>
        (state.formulaFilter === "全部" || f.group === state.formulaFilter) &&
        `${f.name} ${f.alg} ${f.detail}`
          .toLowerCase()
          .includes(state.query.toLowerCase()),
    );
  $("#formula-results").innerHTML = list.length
    ? list
        .map(
          (f) =>
            `<article class="formula-card"><span class="pill">${f.group}</span><h3>${f.name}</h3><code>${f.alg}</code><p>${f.detail}</p><button class="text-link" data-formula="${f.i}">${icon("play")} 看一看，跟着练 ${icon("arrow-right")}</button></article>`,
        )
        .join("")
    : `<div class="empty-state">${icon("search")}<h3>这个小诀窍还没有收入口袋</h3><p>换个词试试，例如“小鱼”或“棱块”。</p></div>`;
  document.querySelectorAll("[data-formula]").forEach(
    (b) =>
      (b.onclick = () => {
        const f = formulas[Number(b.dataset.formula)];
        if (f.lessonId) {
          startGame(
            f.course,
            courses
              .find((c) => c.id === f.course)
              .stages.findIndex((s) => s.id === f.lessonId),
          );
          return;
        }
        startGame(f.course, 0, {
          formula: {
            name: f.name,
            alg: f.alg,
            intro: f.detail,
            tip: "这是从公式的逆序生成的标准练习局面。真实魔方上需要先识别情况和拿法。",
            goal: "观察每一步，完成这个公式练习。",
          },
        });
      }),
  );
  paintIcons();
}
function renderBadges() {
  const done = state.completed.length;
  const badges = [
    ["sprout", "第一步冒险", "完成任意 1 关", done >= 1],
    ["star", "小小收藏家", "完成任意 5 关", done >= 5],
    ["box", "三阶小达人", "完成三阶全部关卡", progress(courses[0]) === 7],
    ["gamepad-2", "迷你魔方家", "完成二阶全部关卡", progress(courses[1]) === 4],
    ["compass", "三角探险家", "完成金字塔全部关卡", progress(courses[2]) === 4],
    [
      "rocket",
      "速拧新星",
      "完成 CFOP 入门关卡",
      progress(courses[3]) === courses[3].stages.length,
    ],
  ];
  $("#main").innerHTML =
    `<div class="page-heading"><span class="eyebrow">YOUR LITTLE WINS · 每一步都闪光</span><h1>看，这是你的成长！</h1><p>星星记录努力，徽章纪念进步。按自己的节奏就很好。</p></div><div class="stat-row"><div>${icon("star")}<strong>${totalStars()}</strong><span>收集的小星星</span></div><div>${icon("flag")}<strong>${done}</strong><span>完成的小关卡</span></div><div>${icon("trophy")}<strong>${badges.filter((b) => b[3]).length}</strong><span>点亮的徽章</span></div></div><h2 class="badge-title">我的探险徽章</h2><div class="badge-grid">${badges.map(([i, n, d, yes]) => `<article class="badge-card ${yes ? "earned" : ""}"><div class="badge-medal">${icon(i)}</div><h3>${n}</h3><p>${d}</p><span>${icon(yes ? "check" : "lock-keyhole")}${yes ? "已点亮" : "等你来点亮"}</span></article>`).join("")}</div><p class="catalog-note">进度自动保存在这台设备的当前浏览器中。每关首次完成获得 3 颗星，重复练习不会重复计星。</p>`;
}

function mountModal(html, cls = "") {
  closeModal();
  lastFocus = document.activeElement;
  $("#modal-root").innerHTML =
    `<div class="modal-backdrop"><section class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${html}</section></div>`;
  document.body.classList.add("modal-open");
  $(".sidebar").inert = true;
  $(".workspace").inert = true;
  $(".modal-backdrop").onclick = (e) => {
    if (e.target === e.currentTarget) closeModal();
  };
  $("#close-modal").onclick = closeModal;
  $("#close-modal").focus();
  paintIcons();
}
function closeModal() {
  const wasLearning = !!learningCleanup;
  learningCleanup?.();
  learningCleanup = null;
  if (game) {
    game.stopped = true;
    clearTimeout(game.moveTimer);
    clearTimeout(game.autoTimer);
    game.player?.pause();
    game = null;
  }
  stopSpeech();
  const root = $("#modal-root");
  if (root) root.innerHTML = "";
  document.body.classList.remove("modal-open");
  if ($(".sidebar")) $(".sidebar").inert = false;
  if ($(".workspace")) $(".workspace").inert = false;
  lastFocus?.focus();
  lastFocus = null;
  if (wasLearning && state.page === "learning") renderPage();
}
function infoModal(title, text) {
  mountModal(
    `<div class="modal-heading"><h2 id="modal-title">${title}</h2><button id="close-modal" class="icon-button" aria-label="关闭">${icon("x")}</button></div><div class="info-content">${text}</div>`,
    "info-modal",
  );
}
function openCourse(id) {
  const c = courses.find((c) => c.id === id),
    p = progress(c);
  mountModal(
    `<div class="modal-heading"><span class="pill">${c.method} · ${c.level}</span><button id="close-modal" class="icon-button" aria-label="关闭关卡地图">${icon("x")}</button></div><div class="map-header ${c.color}"><div><h2 id="modal-title">${c.name}探险</h2><p>${c.description}</p><span>${p} / ${c.stages.length} 关完成 · 每关 3 颗星</span></div>${cubeArt(c.puzzle)}</div>${id === "cfop" ? `<div class="cfop-roadmap"><p>先学会层先法，再按四章慢慢来。两步 OLL + 两步 PLL 共 16 种情况；十字与 F2L 先学观察和配对。</p><div class="chapter-tabs" role="group" aria-label="CFOP 四章">${cfopChapters.map((chapter, i) => `<button data-chapter="${chapter.id}" aria-pressed="${i === 0}"><b>${chapter.letter}</b>${chapter.name}</button>`).join("")}</div><div id="chapter-intro"></div></div>` : ""}<div class="stage-list">${c.stages
      .map((s, i) => {
        const done = state.completed.includes(lessonKey(c, i));
        return `<button class="stage-row ${done ? "done" : ""}" data-stage="${i}" ${s.chapter ? `data-stage-chapter="${s.chapter}"` : ""}><span class="stage-number">${done ? icon("check") : String(i + 1).padStart(2, "0")}</span><span><strong>${s.name}</strong><small>${s.goal}</small></span><span class="stage-stars">${done ? "★★★" : icon("chevron-right")}</span></button>`;
      })
      .join(
        "",
      )}</div><div class="map-note">${icon("lightbulb")} 每关是一个准备好的局部练习。建议按顺序学，也可以自由重玩。</div>`,
    "map-modal",
  );
  if (id === "cfop") {
    const selectChapter = (chapterId) => {
      const chapter = cfopChapters.find((c) => c.id === chapterId);
      document
        .querySelectorAll("[data-chapter]")
        .forEach((b) =>
          b.setAttribute(
            "aria-pressed",
            String(b.dataset.chapter === chapterId),
          ),
        );
      document
        .querySelectorAll("[data-stage-chapter]")
        .forEach((b) => (b.hidden = b.dataset.stageChapter !== chapterId));
      $("#chapter-intro").innerHTML =
        `<h3>${chapter.subtitle}</h3><p>${chapter.explanation}</p><p class="chapter-next">过关检查：${chapter.next}</p>`;
    };
    document
      .querySelectorAll("[data-chapter]")
      .forEach((b) => (b.onclick = () => selectChapter(b.dataset.chapter)));
    selectChapter("cross");
  }
  document
    .querySelectorAll("[data-stage]")
    .forEach((b) => (b.onclick = () => startGame(id, Number(b.dataset.stage))));
}

async function startGame(id, index, options = {}) {
  const course = courses.find((c) => c.id === id),
    lesson = options.formula || course.stages[index];
  const free = !!options.free;
  mountModal(
    `<div class="game-header"><div><span class="eyebrow">${free ? "自由练习" : options.formula ? "公式口袋" : `${course.method} · 第 ${index + 1} 关 / 共 ${course.stages.length} 关`}</span><h2 id="modal-title">${free ? course.name + "游乐场" : lesson.name}</h2></div>${lesson.groups ? '<button id="back-to-map" class="text-link">返回四章地图</button>' : ""}<button id="close-modal" class="icon-button" aria-label="离开练习">${icon("x")}</button></div><div class="game-layout"><div class="play-area"><div class="canvas-top"><span class="live-badge"><i></i> ${course.name} · 3D 魔方</span><span id="move-count">0 次转动</span></div><div id="cube-host"><span class="loading">小方正在准备魔方…</span></div><div class="orbit-hint">${icon("mouse-pointer-2")} 拖动看其他面 · 下方按钮转动魔方</div>${lesson.groups ? '<details class="manual-controls"><summary>自己试着转（可选）</summary>' : ""}<div class="move-pad" id="move-pad"></div>${lesson.groups ? "</details>" : ""}<div class="play-toolbar"><button id="undo-move" disabled>${icon("undo-2")} 撤回</button><button id="reset-game" disabled>${icon("rotate-ccw")} ${free ? "回到整齐" : "重新挑战"}</button>${free ? `<button id="shuffle-game" disabled>${icon("shuffle")} 打乱魔方</button>` : `<button id="toggle-hint">${icon("lightbulb")} 方向小提示</button>`}</div><p id="direction-help" class="direction-help" hidden>正对正在转动的那一面看：↻ 是顺时针，↺ 是逆时针。${course.puzzle === "pyraminx" ? "大写转整层，小写只转尖角，每步 120°。" : "每步 90°；带 2 的动作转 180°。"}拖动画面只改变观察角度，不会改变 R / U / F 指的面。按重新挑战可以恢复初始视角。</p></div><aside class="lesson-panel"><div class="coach-heading"><span class="coach-avatar">${cubeArt("2x2x2", { mascot: true })}</span><div><strong>小方陪你转</strong><span>别着急，我们一步一步来</span></div><button class="icon-button" id="listen" aria-label="朗读本关讲解">${icon("volume-2")}</button></div><div class="speech-bubble"><p>${free ? "这里是自由练习的小天地！点转动按钮，看看颜色怎么变化。打乱以后，可以用“下一步提示”按原路回到整齐。" : lesson.intro}</p></div>${lesson.groups ? teachingMarkup(lesson) : ""}<section id="lesson-follow" ${lesson.groups ? "hidden" : ""}><div class="goal-label">${icon("target")} ${free ? "今天的小目标" : "这一关的小目标"}</div><p class="goal-text">${free ? "自由探索，让所有面重新变成同一种颜色。" : lesson.goal}</p><div class="lesson-separator"></div><div class="next-heading"><strong>${free ? "小方来帮忙" : "跟着动作小纸条"}</strong><span id="step-count"></span></div><div id="alg-steps" class="alg-steps"></div>${lesson.groups ? '<div id="step-purpose" class="step-purpose"></div><button class="text-link" id="listen-group">听听这组为什么这样转</button>' : ""}<div id="next-move" class="next-move" aria-live="polite"></div><button class="button primary full" id="guided-step" disabled>${icon("play")} ${free ? "下一步提示" : "跟我转这一步"}</button><div class="lesson-options"><button id="auto-demo" disabled>${icon("play")} 自动演示</button><button id="speech-rate">${icon("headphones")} ${state.rate === 0.8 ? "慢慢讲" : "正常语速"}</button></div><div class="lesson-tip">${icon("lightbulb")}<p>${free ? "提示会倒着撤销你走过的动作，帮助你理解每一次变化；这不是最短解法。" : lesson.tip}</p></div></section>${lesson.groups ? checkMarkup(lesson) : ""}<div id="game-status" role="status" aria-live="polite"></div></aside></div>`,
    "game-modal",
  );
  const current = {
    course,
    index,
    lesson,
    free,
    formula: !!options.formula,
    history: [],
    base: baseOrientation(course.puzzle),
    setup: [
      baseOrientation(course.puzzle),
      free ? "" : new Alg(lesson.alg).invert().toString(),
    ]
      .filter(Boolean)
      .join(" "),
    solution: free ? [] : lesson.alg.split(" "),
    stopped: false,
    busy: false,
    auto: false,
    won: false,
    player: null,
    kpuzzle: null,
  };
  game = current;
  if (lesson.groups) {
    $("#back-to-map").onclick = () => openCourse("cfop");
    const selectTab = (tab) => {
      current.lessonTab = tab;
      $(".game-modal").dataset.lessonView = tab;
      for (const name of ["observe", "follow", "check"])
        $(`#lesson-${name}`).hidden = name !== tab;
      document
        .querySelectorAll("[data-lesson-tab]")
        .forEach((b) =>
          b.setAttribute("aria-pressed", String(b.dataset.lessonTab === tab)),
        );
      if (tab !== "follow" && current.auto) {
        current.auto = false;
        current.autoRun = (current.autoRun || 0) + 1;
        clearTimeout(current.autoTimer);
        stopSpeech();
        updateGame();
      }
    };
    current.selectTab = selectTab;
    document
      .querySelectorAll("[data-lesson-tab]")
      .forEach((b) => (b.onclick = () => selectTab(b.dataset.lessonTab)));
    $("#begin-follow").onclick = () => {
      stopSpeech();
      selectTab("follow");
    };
    $("#return-follow").onclick = () => selectTab("follow");
    $("#listen-detail").onclick = () => {
      pauseDemo(current);
      speak(lesson.narration, true);
    };
    $("#listen-group").onclick = () => {
      pauseDemo(current);
      const step = lessonStep(
        lesson,
        normalizedMoves(current.history, course.puzzle).length,
      );
      if (step) speak(step.why, true);
    };
  }
  $("#listen").onclick = () => {
    pauseDemo(current);
    if (!narrator.paused) {
      stopSpeech();
      return;
    }
    speak(
      free
        ? "这里可以自由转动魔方。打乱后，点击下一步提示，沿着原路回到整齐。"
        : lesson.narration || lesson.intro,
      true,
    );
  };
  $("#speech-rate").onclick = () => {
    state.rate = state.rate === 0.8 ? 1 : 0.8;
    persist();
    $("#speech-rate").innerHTML =
      `${icon("headphones")} ${state.rate === 0.8 ? "慢慢讲" : "正常语速"}`;
    paintIcons();
  };
  $("#undo-move").onclick = undoMove;
  $("#reset-game").onclick = () => resetGame(current);
  if (free) $("#shuffle-game").onclick = () => shuffleGame(current);
  else
    $("#toggle-hint").onclick = () => {
      $("#direction-help").hidden = !$("#direction-help").hidden;
    };
  $("#guided-step").onclick = () => guidedStep();
  $("#auto-demo").onclick = () => {
    clearTimeout(current.autoTimer);
    current.autoRun = (current.autoRun || 0) + 1;
    current.auto = !current.auto;
    if (!current.auto) stopSpeech();
    updateGame();
    if (current.auto) autoStep(current, current.autoRun);
  };
  const moves =
    course.puzzle === "pyraminx"
      ? ["R", "U", "L", "B", "u", "r", "l", "b"]
      : [
          ...new Set([
            "R",
            "U",
            "F",
            "L",
            "D",
            "B",
            ...current.solution.map((m) => m[0]),
          ]),
        ];
  $("#move-pad").innerHTML = moves
    .map(
      (m) =>
        `<div class="move-pair"><button disabled data-move="${m}" aria-label="${moveWords(m, course.puzzle)}"><b>${m}</b> ↻<small>${m === "M" ? "夹心中层" : m === "r" && course.puzzle !== "pyraminx" ? "右边两层" : moveWords(m, course.puzzle).split("顺")[0]}</small></button><button disabled data-move="${m}'" aria-label="${moveWords(m + "'", course.puzzle)}"><b>${m}'</b> ↺</button>${course.puzzle !== "pyraminx" ? `<button disabled data-move="${m}2" aria-label="${moveWords(m + "2", course.puzzle)}"><b>${m}2</b><small>半圈</small></button>` : ""}</div>`,
    )
    .join("");
  document
    .querySelectorAll("[data-move]")
    .forEach((b) => (b.onclick = () => doMove(b.dataset.move)));
  paintIcons();
  try {
    current.kpuzzle = await puzzles[course.puzzle].kpuzzle();
    if (game !== current) return;
    const player = new TwistyPlayer({
      puzzle: course.puzzle,
      experimentalSetupAlg: current.setup,
      alg: "",
      background: "none",
      controlPanel: "none",
      hintFacelets: "none",
      experimentalDragInput: "auto",
      experimentalMovePressInput: "none",
      cameraLatitude: 28,
      cameraLongitude: 30,
      tempoScale: 0.7,
    });
    current.player = player;
    player.setAttribute("role", "img");
    player.setAttribute("aria-label", `${course.name}三维模型，可拖动观察`);
    $("#cube-host").replaceChildren(player);
    if (lesson.groups)
      $("#case-initial").innerHTML = caseDiagram(
        current.kpuzzle.defaultPattern().applyAlg(current.setup),
      );
    updateGame();
    speak(
      free
        ? "这里可以自由转动魔方。打乱后，点击下一步提示，沿着原路回到整齐。"
        : lesson.intro,
    );
  } catch (e) {
    if (game !== current) return;
    $("#cube-host").innerHTML =
      '<div class="empty-state"><h3>魔方暂时没准备好</h3><p>请关闭后重试，或换用支持 WebGL 的浏览器。</p></div>';
    toast("魔方加载失败，请重试。");
    console.error(e);
  }
}
function pauseDemo(g) {
  if (!g.auto) return;
  g.auto = false;
  g.autoRun = (g.autoRun || 0) + 1;
  clearTimeout(g.autoTimer);
  updateGame();
}
function remaining(g) {
  return remainingMoves(g.history, g.solution, g.free, g.course.puzzle);
}
function isSolved(g) {
  return puzzleSolved(g.kpuzzle, g.setup, g.history, g.base);
}
function updateGame() {
  const g = game;
  if (!g || !g.kpuzzle || !g.player) return;
  const walked = normalizedMoves(g.history, g.course.puzzle);
  const rest = g.won ? [] : remaining(g),
    ready = !g.busy && !g.won;
  updateTeaching(g);
  if ($("#listen-group"))
    $("#listen-group").disabled =
      g.won || !walked.every((m, i) => m === g.solution[i]);
  $("#move-count").textContent = `${g.history.length} 次转动`;
  $("#step-count").textContent = g.free
    ? `${rest.length} 步可原路返回`
    : `还剩 ${rest.length} 步`;
  $("#alg-steps").innerHTML = g.free
    ? ""
    : g.solution
        .map(
          (m, i) =>
            `<span class="alg-token ${walked.slice(0, i + 1).join(" ") === g.solution.slice(0, i + 1).join(" ") ? "finished" : ""}">${m}</span>`,
        )
        .join("");
  $("#next-move").innerHTML = g.won
    ? `<span>${g.course.puzzle === "pyraminx" ? "四" : "六"}面整齐，成功啦！</span>`
    : rest.length
      ? `<b>${rest[0]}</b><span>${moveWords(rest[0], g.course.puzzle)}<small>正对这一面，认清顺逆时针</small></span>`
      : "<span>魔方整整齐齐，试着转一转吧！</span>";
  document
    .querySelectorAll("[data-move]")
    .forEach((b) => (b.disabled = !ready || g.auto));
  $("#guided-step").disabled = !ready || !rest.length || g.auto;
  $("#undo-move").disabled = g.busy || !g.history.length || g.auto;
  $("#reset-game").disabled = g.busy;
  if ($("#shuffle-game")) $("#shuffle-game").disabled = g.busy || g.auto;
  $("#auto-demo").disabled = g.won || !rest.length;
  $("#auto-demo").innerHTML =
    `${icon(g.auto ? "pause" : "play")} ${g.auto ? "暂停演示" : "自动演示"}`;
  paintIcons();
}
function doMove(move, { guided = false, demo = false } = {}) {
  const g = game;
  if (!g || g.busy || g.won || (!demo && g.auto) || !g.player) return false;
  const walked = normalizedMoves(g.history, g.course.puzzle);
  const step =
    g.lesson.groups && walked.every((m, i) => m === g.solution[i])
      ? lessonStep(g.lesson, walked.length)
      : null;
  g.selectTab?.("follow");
  g.busy = true;
  g.history.push(move);
  g.player.experimentalAddMove(move);
  updateGame();
  g.lastSpeech = guided
    ? speakSequence([
        moveWords(move, g.course.puzzle),
        ...(step?.within === 1 ? [step.why] : []),
      ])
    : Promise.resolve();
  g.moveTimer = setTimeout(() => {
    if (game !== g) return;
    g.busy = false;
    if (isSolved(g) && g.history.length) winGame(g);
    else updateGame();
  }, 700);
  return true;
}
async function speakSequence(texts) {
  for (const text of texts) {
    const pending = speak(text);
    const id = speakId;
    await pending;
    if (speakId !== id) return false;
  }
  return true;
}
function guidedStep(demo = false) {
  if (!game) return;
  const rest = remaining(game);
  if (rest.length) return doMove(rest[0], { guided: true, demo });
}
async function autoStep(g, run) {
  if (game !== g || !g.auto || g.won || run !== g.autoRun) return;
  if (g.busy) {
    g.autoTimer = setTimeout(() => autoStep(g, run), 150);
    return;
  }
  guidedStep(true);
  await g.lastSpeech;
  if (game === g && g.auto && !g.won && run === g.autoRun)
    g.autoTimer = setTimeout(() => autoStep(g, run), 850);
}

function undoMove() {
  const g = game;
  if (!g || g.busy || !g.history.length) return;
  g.auto = false;
  g.won = false;
  $("#game-status").innerHTML = "";
  g.history.pop();
  g.player.alg = g.history.join(" ");
  g.player.jumpToEnd();
  stopSpeech();
  updateGame();
}
function resetGame(g) {
  if (game !== g || g.busy || !g.player) return;
  clearTimeout(g.autoTimer);
  g.autoRun = (g.autoRun || 0) + 1;
  g.auto = false;
  g.won = false;
  g.history = [];
  g.selectTab?.("observe");
  g.player.alg = "";
  g.player.experimentalSetupAlg = g.setup;
  g.player.cameraLatitude = 28;
  g.player.cameraLongitude = 30;
  g.player.jumpToStart();
  $("#game-status").innerHTML = "";
  stopSpeech();
  updateGame();
}
function shuffleGame(g) {
  if (game !== g || g.busy || !g.player) return;
  resetGame(g);
  const faces =
    g.course.puzzle === "pyraminx"
      ? ["R", "U", "L", "B", "u", "r"]
      : ["R", "U", "F", "L", "D", "B"];
  let last = "";
  for (let i = 0; i < 12; i++) {
    let face;
    do {
      face = faces[Math.floor(Math.random() * faces.length)];
    } while (face === last);
    last = face;
    g.history.push(face + (Math.random() > 0.5 ? "'" : ""));
  }
  g.player.alg = g.history.join(" ");
  g.player.jumpToEnd();
  updateGame();
  toast("打乱好了！观察颜色，试着让它们回家。");
}
function winGame(g) {
  g.won = true;
  g.auto = false;
  g.selectTab?.("check");
  clearTimeout(g.autoTimer);
  const key = lessonKey(g.course, g.index);
  const first = !g.free && !g.formula && !state.completed.includes(key);
  if (first) {
    state.completed.push(key);
    persist();
  }
  $("#game-status").innerHTML =
    `<div class="win-card"><div class="win-stars">${g.free || g.formula ? "✦" : "★ ★ ★"}</div><h3>${g.free ? "你把魔方复原啦！" : g.formula ? "小诀窍，学会啦！" : "这一关，成功啦！"}</h3><p>${first ? "收下 3 颗小星星，送给认真练习的你。" : g.free ? "每一个小动作，都藏着你的进步。" : "再练习一次，就会更熟悉一点。"}</p><button id="next-level" class="button primary full">${g.free ? "再打乱玩一次" : g.formula ? "回到公式口袋" : g.index < g.course.stages.length - 1 ? "出发，下一关！" : "查看我的成就"} ${icon("arrow-right")}</button></div>`;
  $("#next-level").onclick = () => {
    if (g.free) shuffleGame(g);
    else if (g.formula) {
      closeModal();
      renderPage();
    } else if (g.index < g.course.stages.length - 1)
      startGame(g.course.id, g.index + 1);
    else navigate("badges");
  };
  const stars = $(".star-balance b");
  if (stars) stars.textContent = totalStars();
  renderPage();
  updateGame();
  Promise.resolve(g.lastSpeech).then((completed) => {
    if (completed !== false && game === g && g.won)
      speak("太棒啦！魔方复原成功。每一步练习，都让你更厉害一点！");
  });
  const confetti = document.createElement("div");
  confetti.className = "confetti";
  confetti.setAttribute("aria-hidden", "true");
  confetti.innerHTML = Array.from(
    { length: 28 },
    (_, i) =>
      `<i style="--x:${Math.random() * 100}%;--delay:${Math.random() * 0.6}s;--color:${["#f7ca5c", "#8f77df", "#77c8ae", "#fa9c7b"][i % 4]};--rotate:${Math.random() * 360}deg"></i>`,
  ).join("");
  $(".modal").append(confetti);
  setTimeout(() => confetti.remove(), 2500);
}

document.addEventListener("keydown", (e) => {
  const modal = $(".modal");
  if (!modal) return;
  if (e.key === "Escape") {
    closeModal();
    renderPage();
    return;
  }
  if (e.key === "Tab") {
    const els = [
      ...modal.querySelectorAll(
        'button:not(:disabled),a[href],input,select,summary,[tabindex="0"]',
      ),
    ].filter(
      (el) =>
        !el.hidden && !el.closest("[hidden]") && el.getClientRects().length > 0,
    );
    const first = els[0],
      last = els.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});
window.addEventListener("pagehide", () => { closeModal(); });
shell();
renderPage();
