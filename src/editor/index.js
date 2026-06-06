(function(){
'use strict';

var R = document.getElementById.bind(document);

var state = null;
var fileHandle = null;
var fileName = 'новая_игра.json.si';
var isDirty = false;

function initState() {
  state = createDefaultData();
  fileHandle = null;
  fileName = 'новая_игра.json.si';
  isDirty = false;
}

function markDirty() { isDirty = true; updateToolbar(); }

// ============== RENDERING ==============

function render() {
  renderToolbar();
  updateToolbar();
}

function updateToolbar() {
  var fn = R('toolbar-filename');
  if (fn) fn.textContent = fileName + (isDirty ? ' (изменён)' : '');
}

function renderToolbar() {
  R('app').innerHTML =
    '<div class="toolbar">' +
      '<button class="btn" data-action="new-file">Новый</button>' +
      '<button class="btn" data-action="open-file">Открыть</button>' +
      '<button class="btn btn-primary" data-action="save-file">Сохранить</button>' +
      '<button class="btn" data-action="saveas-file">Сохранить как</button>' +
      '<span class="toolbar-spacer"></span>' +
      '<span class="toolbar-filename" id="toolbar-filename"></span>' +
    '</div>' +
    '<div class="editor-body" id="editor-body"></div>';

  renderBody();
  updateToolbar();
}

function renderBody() {
  R('editor-body').innerHTML =
    '<div class="section">' +
      '<div class="section-title">Название игры</div>' +
      '<input class="input" id="input-title" value="' + escapeHtml(state.title) + '" style="max-width:400px">' +
    '</div>' +
    '<div class="section">' +
      '<div class="section-title">Цены</div>' +
      '<div class="prices-bar" id="prices-bar"></div>' +
    '</div>' +
    '<div id="topics-area"></div>';

  var ti = R('input-title');
  ti.oninput = function(){ state.title = this.value; markDirty(); };

  renderPrices();
  renderTopics();
}

function renderPrices() {
  var bar = R('prices-bar');
  if (!bar) return;
  var many = state.prices.length > 1;

  var html = '';
  for (var i = 0; i < state.prices.length; i++) {
    html += '<div class="price-tag" data-pi="' + i + '">' +
      '<input type="number" step="100" min="100" value="' + state.prices[i] + '" data-action="edit-price" data-pi="' + i + '">' +
      '<span class="price-remove' + (many ? '' : ' hidden') +
        '" data-action="remove-price" data-pi="' + i + '">&times;</span>' +
    '</div>';
  }
  html += '<button class="btn btn-sm" data-action="add-price">+ Цена</button>';
  bar.innerHTML = html;
}

function renderTopics() {
  var area = R('topics-area');
  if (!area) return;

  if (state.topics.length === 0) {
    area.innerHTML = '<div class="empty-state">Нет тем. Добавьте тему.</div>';
    return;
  }

  var html = '';
  var many = state.topics.length > 1;

  for (var ti = 0; ti < state.topics.length; ti++) {
    var topic = state.topics[ti];

    html += '<div class="topic-card" data-ti="' + ti + '">' +
      '<div class="topic-header-bar">' +
        '<input value="' + escapeHtml(topic.name) + '" data-action="edit-topic-name" data-ti="' + ti + '">' +
        '<div class="topic-header-ctrls">' +
          '<button class="btn btn-sm' + (ti === 0 ? ' hidden' : '') +
            '" data-action="move-topic-up" data-ti="' + ti + '">&uarr;</button>' +
          '<button class="btn btn-sm' + (ti === state.topics.length - 1 ? ' hidden' : '') +
            '" data-action="move-topic-down" data-ti="' + ti + '">&darr;</button>' +
          '<button class="btn btn-sm btn-danger' + (!many ? ' hidden' : '') +
            '" data-action="remove-topic" data-ti="' + ti + '">&times;</button>' +
        '</div>' +
      '</div>';

    for (var pi = 0; pi < topic.questions.length; pi++) {
      var q = topic.questions[pi];
      var price = state.prices[pi];

      html += '<div class="q-row" data-ti="' + ti + '" data-pi="' + pi + '">' +
        '<div class="q-row-header">' +
          '<span class="q-row-price">' + price + '</span>' +
          '<div class="q-row-select">' +
            '<select data-action="change-qtype" data-ti="' + ti + '" data-pi="' + pi + '">' +
              '<option value="simple"' + (q.type === 'simple' ? ' selected' : '') + '>Обычный</option>' +
              '<option value="auction"' + (q.type === 'auction' ? ' selected' : '') + '>Аукцион</option>' +
              '<option value="cat_in_bag"' + (q.type === 'cat_in_bag' ? ' selected' : '') + '>Кот в мешке</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="q-row-fields">' +
          '<input placeholder="Текст вопроса" value="' + escapeHtml(q.question) +
            '" data-action="edit-question" data-ti="' + ti + '" data-pi="' + pi + '">' +
          '<input placeholder="Правильный ответ" value="' + escapeHtml(q.answer) +
            '" data-action="edit-answer" data-ti="' + ti + '" data-pi="' + pi + '">' +
        '</div>' +
        (q.type === QTYPE.CAT ? renderBonusFields(ti, pi, q) : '') +
      '</div>';
    }

    html += '</div>';
  }

  html += '<div class="add-topic-area">' +
    '<button class="btn" data-action="add-topic">+ Тема</button>' +
    '</div>';

  area.innerHTML = html;
}

function renderBonusFields(ti, pi, q) {
  return '<div class="q-bonus-row" data-ti="' + ti + '" data-pi="' + pi + '">' +
    '<div class="q-bonus-header">Кот в мешке</div>' +
    '<div class="q-bonus-fields">' +
      '<div class="field">' +
        '<label class="label" style="color:var(--red)">Тема</label>' +
        '<input class="input bonus-input" placeholder="К какой теме относится вопрос" value="' + escapeHtml(q.bonus_topic || '') +
          '" data-action="edit-bonus-topic" data-ti="' + ti + '" data-pi="' + pi + '">' +
      '</div>' +
      '<div class="field">' +
        '<label class="label" style="color:var(--red)">Цена</label>' +
        '<input class="input bonus-input" type="number" placeholder="Цена" value="' + (q.bonus_price || '') +
          '" data-action="edit-bonus-price" data-ti="' + ti + '" data-pi="' + pi + '">' +
      '</div>' +
    '</div>' +
  '</div>';
}

// ============== OPERATIONS ==============

function addTopic() {
  var name = 'Тема ' + (state.topics.length + 1);
  var questions = [];
  for (var i = 0; i < state.prices.length; i++) {
    questions.push(createEmptyQuestion());
  }
  state.topics.push({ name: name, questions: questions });
  markDirty();
  renderTopics();
}

function removeTopic(ti) {
  if (state.topics.length <= 1) return;
  if (!confirm('Удалить тему "' + state.topics[ti].name + '"?')) return;
  state.topics.splice(ti, 1);
  markDirty();
  renderTopics();
  renderPrices();
}

function moveTopicLeft(ti) {
  if (ti <= 0) return;
  var tmp = state.topics[ti];
  state.topics[ti] = state.topics[ti - 1];
  state.topics[ti - 1] = tmp;
  markDirty();
  renderTopics();
}

function moveTopicRight(ti) {
  if (ti >= state.topics.length - 1) return;
  var tmp = state.topics[ti];
  state.topics[ti] = state.topics[ti + 1];
  state.topics[ti + 1] = tmp;
  markDirty();
  renderTopics();
}

function addPrice() {
  var newPrice = state.prices.length > 0 ? state.prices[state.prices.length - 1] + 100 : 100;
  state.prices.push(newPrice);
  for (var i = 0; i < state.topics.length; i++) {
    state.topics[i].questions.push(createEmptyQuestion());
  }
  markDirty();
  renderPrices();
  renderTopics();
}

function removePrice(pi) {
  if (state.prices.length <= 1) return;
  state.prices.splice(pi, 1);
  for (var i = 0; i < state.topics.length; i++) {
    state.topics[i].questions.splice(pi, 1);
  }
  markDirty();
  renderPrices();
  renderTopics();
}

// ============== INLINE EDITING ==============

function handleEditQuestion(el) {
  var ti = parseInt(el.getAttribute('data-ti'), 10);
  var pi = parseInt(el.getAttribute('data-pi'), 10);
  state.topics[ti].questions[pi].question = el.value;
  markDirty();
}

function handleEditAnswer(el) {
  var ti = parseInt(el.getAttribute('data-ti'), 10);
  var pi = parseInt(el.getAttribute('data-pi'), 10);
  state.topics[ti].questions[pi].answer = el.value;
  markDirty();
}

function handleChangeQtype(el) {
  var ti = parseInt(el.getAttribute('data-ti'), 10);
  var pi = parseInt(el.getAttribute('data-pi'), 10);
  var q = state.topics[ti].questions[pi];
  q.type = el.value;

  if (q.type !== QTYPE.CAT) {
    delete q.bonus_topic;
    delete q.bonus_price;
  }

  markDirty();
  // Re-render the specific question row to show/hide bonus fields
  updateQuestionRow(ti, pi);
}

function handleEditBonusTopic(el) {
  var ti = parseInt(el.getAttribute('data-ti'), 10);
  var pi = parseInt(el.getAttribute('data-pi'), 10);
  var q = state.topics[ti].questions[pi];
  q.bonus_topic = el.value;
  markDirty();
}

function handleEditBonusPrice(el) {
  var ti = parseInt(el.getAttribute('data-ti'), 10);
  var pi = parseInt(el.getAttribute('data-pi'), 10);
  var q = state.topics[ti].questions[pi];
  q.bonus_price = parseInt(el.value, 10) || 0;
  markDirty();
}

function handleEditTopicName(el) {
  var ti = parseInt(el.getAttribute('data-ti'), 10);
  state.topics[ti].name = el.value.trim() || state.topics[ti].name;
  if (state.topics[ti].name !== el.value.trim()) {
    el.value = state.topics[ti].name;
  }
  markDirty();
}

function handleEditPrice(el) {
  var pi = parseInt(el.getAttribute('data-pi'), 10);
  var val = parseInt(el.value, 10);
  if (isNaN(val) || val < 100) {
    el.value = 100;
    state.prices[pi] = 100;
  } else {
    val = Math.round(val / 100) * 100;
    if (val < 100) val = 100;
    el.value = val;
    state.prices[pi] = val;
  }
  markDirty();
  renderTopics();
}

function updateQuestionRow(ti, pi) {
  var q = state.topics[ti].questions[pi];
  var row = document.querySelector('.q-row[data-ti="' + ti + '"][data-pi="' + pi + '"]');
  if (!row) return;

  var bonusContainer = row.querySelector('.q-bonus-row');
  if (q.type === QTYPE.CAT) {
    if (!bonusContainer) {
      var div = document.createElement('div');
      div.innerHTML = renderBonusFields(ti, pi, q);
      row.appendChild(div.firstElementChild);
    }
  } else {
    if (bonusContainer) bonusContainer.remove();
  }
}

// ============== FILE OPERATIONS ==============

function newFile() {
  if (isDirty && !confirm('Есть несохранённые изменения. Создать новый файл?')) return;
  initState();
  render();
}

async function openFile() {
  try {
    var file = await pickFile();
    if (!file) return;
    var data = await readFile(file);
    var result = validateGameData(data);
    if (!result.valid) {
      alert('Ошибка в файле:\n' + result.error);
      return;
    }
    state = data;
    fileHandle = null;
    fileName = file.name;
    isDirty = false;
    render();
  } catch (e) {
    alert('Не удалось открыть файл: ' + e.message);
  }
}

async function saveFile() {
  var result = validateGameData(state);
  if (!result.valid) {
    alert('Нельзя сохранить: ' + result.error);
    return;
  }

  try {
    if (fileHandle) {
      var writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(state, null, 2));
      await writable.close();
      isDirty = false;
      updateToolbar();
      return;
    }
  } catch (e) {
    // fall through
  }

  await saveFileAs();
}

async function saveFileAs() {
  var result = validateGameData(state);
  if (!result.valid) {
    alert('Нельзя сохранить: ' + result.error);
    return;
  }

  try {
    var handle = await saveWithFilePicker(state, fileName);
    if (handle) {
      fileHandle = handle;
      fileName = handle.name;
      isDirty = false;
      updateToolbar();
    } else if (handle === null) {
      isDirty = false;
      updateToolbar();
    }
  } catch (e) {
    if (e.name !== 'AbortError') {
      alert('Ошибка сохранения: ' + e.message);
    }
  }
}

function pickFile() {
  return new Promise(function(resolve) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json.si,.json';
    input.onchange = function() { resolve(input.files[0]); };
    input.click();
  });
}

// ============== EVENT DELEGATION ==============

document.addEventListener('click', function(e){
  var el = e.target;

  if (!el.closest) return;

  var btn;

  if ((btn = el.closest('[data-action="new-file"]'))) { newFile(); return; }
  if ((btn = el.closest('[data-action="open-file"]'))) { openFile(); return; }
  if ((btn = el.closest('[data-action="save-file"]'))) { saveFile(); return; }
  if ((btn = el.closest('[data-action="saveas-file"]'))) { saveFileAs(); return; }

  if ((btn = el.closest('[data-action="add-topic"]'))) { addTopic(); return; }
  if ((btn = el.closest('[data-action="add-price"]'))) { addPrice(); return; }

  if ((btn = el.closest('[data-action="remove-topic"]'))) {
    if (state.topics.length <= 1) return;
    removeTopic(parseInt(btn.getAttribute('data-ti'), 10));
    return;
  }
  if ((btn = el.closest('[data-action="remove-price"]'))) {
    if (state.prices.length <= 1) return;
    removePrice(parseInt(btn.getAttribute('data-pi'), 10));
    return;
  }
  if ((btn = el.closest('[data-action="move-topic-up"]'))) {
    moveTopicLeft(parseInt(btn.getAttribute('data-ti'), 10));
    return;
  }
  if ((btn = el.closest('[data-action="move-topic-down"]'))) {
    moveTopicRight(parseInt(btn.getAttribute('data-ti'), 10));
    return;
  }
});

// Input change handlers
document.addEventListener('input', function(e){
  var el = e.target;
  if (!el.matches) return;

  if (el.matches('[data-action="edit-question"]')) {
    handleEditQuestion(el);
  } else if (el.matches('[data-action="edit-answer"]')) {
    handleEditAnswer(el);
  } else if (el.matches('[data-action="edit-bonus-topic"]')) {
    handleEditBonusTopic(el);
  } else if (el.matches('[data-action="edit-bonus-price"]')) {
    handleEditBonusPrice(el);
  }
});

// Select change
document.addEventListener('change', function(e){
  var el = e.target;
  if (!el.matches) return;

  if (el.matches('[data-action="change-qtype"]')) {
    handleChangeQtype(el);
  }
});

// Blur for price and topic name (commit and validate)
document.addEventListener('blur', function(e){
  var el = e.target;
  if (!el.matches) return;

  if (el.matches('[data-action="edit-topic-name"]')) {
    handleEditTopicName(el);
  } else if (el.matches('[data-action="edit-price"]')) {
    handleEditPrice(el);
  }
}, true);

// Enter to commit
document.addEventListener('keydown', function(e){
  if (e.key === 'Enter') {
    var el = e.target;
    if (!el.matches) return;

    if (el.matches('[data-action="edit-topic-name"]')) {
      handleEditTopicName(el);
      el.blur();
    } else if (el.matches('[data-action="edit-price"]')) {
      handleEditPrice(el);
      el.blur();
    }
  }
});

// ============== INIT ==============

function init() {
  initState();
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
