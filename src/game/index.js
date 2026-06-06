(function(){
'use strict';

var R = document.getElementById.bind(document);

var gameData = null;
var answered = {};   // "ti-qi" -> true
var answerRevealed = false;
var currentTi = -1;
var currentQi = -1;

// ============== LOAD SCREEN ==============

function showLoadScreen() {
  gameData = null;
  answered = {};
  currentTi = -1;
  currentQi = -1;
  answerRevealed = false;
  document.removeEventListener('keydown', questionKeyHandler);
  R('modal-container').innerHTML = '';

  R('app').innerHTML =
    '<div class="load-screen">' +
      '<h1 class="load-title">СВОЯ ИГРА</h1>' +
      '<p class="load-subtitle">Загрузите файл с вопросами, чтобы начать</p>' +
      '<div class="drop-zone" id="drop-zone">' +
        '<div class="drop-icon">&#128196;</div>' +
        '<div class="drop-text">Перетащите файл <strong>.json.si</strong> сюда</div>' +
        '<div class="drop-hint">или нажмите, чтобы выбрать</div>' +
      '</div>' +
      '<input type="file" id="file-input" accept=".json.si,.json" style="display:none">' +
    '</div>';

  var dz = R('drop-zone');
  var fi = R('file-input');

  dz.addEventListener('click', function(){ fi.click(); });
  fi.addEventListener('change', function(){ handleFile(fi.files[0]); });

  dz.addEventListener('dragover', function(e){ e.preventDefault(); dz.classList.add('drag-over'); });
  dz.addEventListener('dragleave', function(){ dz.classList.remove('drag-over'); });
  dz.addEventListener('drop', function(e){
    e.preventDefault();
    dz.classList.remove('drag-over');
    var file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });
}

async function handleFile(file) {
  try {
    if (!file) return;
    var data = await readFile(file);
    var result = validateGameData(data);
    if (!result.valid) {
      alert('Ошибка в файле:\n' + result.error);
      return;
    }
    gameData = data;
    answered = {};
    showGameScreen();
  } catch (e) {
    alert('Не удалось загрузить файл: ' + e.message);
  }
}

// ============== GAME SCREEN ==============

function showGameScreen() {
  if (!gameData) return;

  var headerHtml =
    '<div class="game-header">' +
      '<div class="game-title">' + escapeHtml(gameData.title || 'Своя игра') + '</div>' +
      '<button class="btn" data-action="new-game">Новая игра</button>' +
    '</div>';

  R('app').innerHTML =
    '<div class="game-screen">' +
      headerHtml +
      '<div class="game-body">' +
        '<div id="game-grid"></div>' +
      '</div>' +
    '</div>';

  renderGrid();
}

function renderGrid() {
  if (!gameData) return;
  var container = R('game-grid');
  if (!container) return;

  var topics = gameData.topics;
  var prices = gameData.prices;
  var allAnswered = true;

  var html = '<table class="game-table"><thead><tr>' +
    '<th class="col-price"></th>';

  for (var ti = 0; ti < topics.length; ti++) {
    html += '<th>' + escapeHtml(topics[ti].name) + '</th>';
  }
  html += '</tr></thead><tbody>';

  for (var qi = 0; qi < prices.length; qi++) {
    html += '<tr>';
    html += '<td class="game-cell answered" style="font-size:14px;color:var(--text-dim)">' + prices[qi] + '</td>';

    for (var ti = 0; ti < topics.length; ti++) {
      var key = ti + '-' + qi;
      var isAnswered = answered[key];
      if (!isAnswered) allAnswered = false;

      html += '<td class="game-cell' + (isAnswered ? ' answered' : '') +
        '" data-action="open-question" data-ti="' + ti + '" data-qi="' + qi + '">' +
        (isAnswered ? '' : prices[qi]) +
        '</td>';
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  container.innerHTML = html;

  if (allAnswered && Object.keys(answered).length > 0) {
    setTimeout(showEndScreen, 600);
  }
}

// ============== QUESTION MODAL ==============

function openQuestionModal(ti, qi) {
  if (!gameData) return;
  var topic = gameData.topics[ti];
  var q = topic.questions[qi];
  var price = gameData.prices[qi];

  currentTi = ti;
  currentQi = qi;
  answerRevealed = false;

  var typeHtml = '';
  if (q.type === QTYPE.AUCTION) {
    typeHtml = '<div class="qm-type"><span class="qm-type-badge auction">Аукцион</span></div>';
  } else if (q.type === QTYPE.CAT) {
    typeHtml = '<div class="qm-type"><span class="qm-type-badge cat">Кот в мешке</span></div>' +
      '<div class="qm-bonus-info">Тема: ' + escapeHtml(q.bonus_topic) + ' / Цена: ' + (q.bonus_price || '?') + '</div>';
  }

  var html =
    '<div class="modal-overlay" id="question-modal">' +
      '<div class="modal question-modal">' +
        typeHtml +
        '<div class="qm-topic-price">' +
          escapeHtml(topic.name) + ' &nbsp;/&nbsp; ' + price +
        '</div>' +
        '<div class="qm-question-wrapper">' +
          '<div class="qm-question">' + escapeHtml(q.question) + '</div>' +
        '</div>' +
        '<div class="qm-answer-area hidden-area" id="qm-answer-area">' +
          '<div class="qm-answer-reveal">' +
            '<div class="qm-answer-label">Правильный ответ</div>' +
            '<div class="qm-answer-text">' + escapeHtml(q.answer) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-actions" style="justify-content:center">' +
          '<button class="btn btn-primary btn-lg" id="qm-reveal-btn">Показать ответ</button>' +
          '<button class="btn btn-lg" id="qm-close-btn" style="display:none">Закрыть</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  R('modal-container').innerHTML = html;

  document.getElementById('qm-reveal-btn').addEventListener('click', revealAnswer);
  document.getElementById('qm-close-btn').addEventListener('click', closeQuestionModal);
  document.getElementById('question-modal').addEventListener('click', function(e){
    if (e.target === this) {
      if (answerRevealed) closeQuestionModal();
      else cancelQuestionModal();
    }
  });

  document.addEventListener('keydown', questionKeyHandler);
}

function revealAnswer() {
  answerRevealed = true;
  var area = document.getElementById('qm-answer-area');
  if (area) area.classList.remove('hidden-area');

  var revealBtn = document.getElementById('qm-reveal-btn');
  if (revealBtn) revealBtn.style.display = 'none';

  var closeBtn = document.getElementById('qm-close-btn');
  if (closeBtn) closeBtn.style.display = '';
}

function questionKeyHandler(e) {
  if (!answerRevealed) {
    if (e.key === 'Enter' || e.key === ' ') {
      if (e.target.tagName === 'BUTTON') return;
      e.preventDefault();
      revealAnswer();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelQuestionModal();
    }
  } else if (answerRevealed) {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      closeQuestionModal();
    }
  }
}

function cancelQuestionModal() {
  document.removeEventListener('keydown', questionKeyHandler);
  R('modal-container').innerHTML = '';
  currentTi = -1;
  currentQi = -1;
  answerRevealed = false;
}

function closeQuestionModal() {
  document.removeEventListener('keydown', questionKeyHandler);
  R('modal-container').innerHTML = '';

  if (currentTi >= 0 && currentQi >= 0) {
    answered[currentTi + '-' + currentQi] = true;
  }

  currentTi = -1;
  currentQi = -1;
  answerRevealed = false;

  renderGrid();
}

// ============== END SCREEN ==============

function showEndScreen() {
  R('modal-container').innerHTML = '';
  R('app').innerHTML =
    '<div class="end-screen">' +
      '<h1 class="end-title">Игра окончена!</h1>' +
      '<p class="end-subtitle">Все вопросы отвечены</p>' +
      '<button class="btn btn-primary btn-lg" data-action="new-game">Загрузить другой файл</button>' +
    '</div>';
}

// ============== EVENT DELEGATION ==============

document.addEventListener('click', function(e){
  var el = e.target;

  if (el.closest) {
    var actionBtn = el.closest('[data-action]');
    if (actionBtn) {
      var action = actionBtn.getAttribute('data-action');

      if (action === 'new-game') {
        showLoadScreen();
        return;
      }

      if (action === 'open-question') {
        var ti = parseInt(actionBtn.getAttribute('data-ti'), 10);
        var qi = parseInt(actionBtn.getAttribute('data-qi'), 10);
        var key = ti + '-' + qi;
        if (!answered[key]) {
          openQuestionModal(ti, qi);
        }
        return;
      }
    }
  }
});

// ============== INIT ==============

function init() {
  showLoadScreen();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
