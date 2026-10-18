/*
 * quiz.js — 极简小测验。
 * 结构：
 * <div class="quiz">
 *   <div class="q">问题？</div>
 *   <button class="opt" data-correct="1">对的答案</button>
 *   <button class="opt">错的答案</button>
 *   <div class="fb" data-yes="答对啦！…" data-no="再想想～"></div>
 * </div>
 */
(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.quiz').forEach(function (quiz) {
      var fb = quiz.querySelector('.fb');
      quiz.querySelectorAll('.opt').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var correct = btn.getAttribute('data-correct') === '1';
          quiz.querySelectorAll('.opt').forEach(function (b) { b.disabled = false; });
          btn.classList.remove('right', 'wrong');
          btn.classList.add(correct ? 'right' : 'wrong');
          if (fb) {
            fb.textContent = correct ? (fb.getAttribute('data-yes') || '答对啦！🎉')
                                     : (fb.getAttribute('data-no') || '再想想，点点别的看看～');
            fb.style.color = correct ? '#2f8f5a' : '#e85d3a';
          }
        });
      });
    });
  });
})();
