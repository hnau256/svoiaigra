var QTYPE = { SIMPLE:'simple', AUCTION:'auction', CAT:'cat_in_bag' };

var TYPE_LABELS = { simple:'Обычный', auction:'Аукцион', cat_in_bag:'Кот в мешке' };

function createDefaultData() {
  return {
    title: 'Новая игра',
    prices: [100, 200, 300, 400, 500],
    topics: [
      {
        name: 'Тема 1',
        questions: [
          { question:'', answer:'', type:'simple' },
          { question:'', answer:'', type:'simple' },
          { question:'', answer:'', type:'simple' },
          { question:'', answer:'', type:'simple' },
          { question:'', answer:'', type:'simple' }
        ]
      }
    ]
  };
}

function createEmptyQuestion() {
  return { question:'', answer:'', type:'simple' };
}

function validateGameData(data) {
  if (!data || typeof data !== 'object') return err('Неверный формат данных');
  if (!Array.isArray(data.prices) || data.prices.length === 0) return err('Список цен пуст');
  if (!Array.isArray(data.topics) || data.topics.length === 0) return err('Список тем пуст');

  for (var i = 0; i < data.prices.length; i++) {
    if (typeof data.prices[i] !== 'number' || data.prices[i] <= 0 || !isFinite(data.prices[i])) {
      return err('Некорректная цена: ' + data.prices[i]);
    }
  }

  for (var ti = 0; ti < data.topics.length; ti++) {
    var topic = data.topics[ti];
    if (!topic.name || typeof topic.name !== 'string' || topic.name.trim() === '') {
      return err('Тема #' + (ti + 1) + ': отсутствует название');
    }
    if (!Array.isArray(topic.questions)) {
      return err('Тема "' + topic.name + '": нет списка вопросов');
    }
    if (topic.questions.length !== data.prices.length) {
      return err('Тема "' + topic.name + '": вопросов (' + topic.questions.length +
        ') не совпадает с цен (' + data.prices.length + ')');
    }

    for (var qi = 0; qi < topic.questions.length; qi++) {
      var q = topic.questions[qi];
      var price = data.prices[qi];
      if (!q || typeof q !== 'object') return err('Тема "' + topic.name + '", цена ' + price + ': вопрос не задан');
      if (!q.question || q.question.trim() === '') return err('Тема "' + topic.name + '", цена ' + price + ': нет текста вопроса');
      if (!q.answer || q.answer.trim() === '') return err('Тема "' + topic.name + '", цена ' + price + ': нет ответа');
      if ([QTYPE.SIMPLE, QTYPE.AUCTION, QTYPE.CAT].indexOf(q.type) === -1) {
        return err('Тема "' + topic.name + '", цена ' + price + ': неверный тип "' + q.type + '"');
      }
      if (q.type === QTYPE.CAT) {
        if (!q.bonus_topic || typeof q.bonus_topic !== 'string' || q.bonus_topic.trim() === '') {
          return err('Тема "' + topic.name + '", цена ' + price + ': для "кота в мешке" не указана тема');
        }
        if (typeof q.bonus_price !== 'number' || q.bonus_price <= 0) {
          return err('Тема "' + topic.name + '", цена ' + price + ': для "кота в мешке" не указана цена');
        }
      }
    }
  }

  return { valid:true };
}

function err(msg) { return { valid:false, error:msg }; }

function readFile(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() {
      try {
        resolve(JSON.parse(reader.result));
      } catch (e) {
        reject(new Error('Файл не является корректным JSON'));
      }
    };
    reader.onerror = function() { reject(new Error('Ошибка чтения файла')); };
    reader.readAsText(file);
  });
}

function downloadFile(data, filename) {
  var json = JSON.stringify(data, null, 2);
  var blob = new Blob([json], { type:'application/octet-stream' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename || 'игра.json.si';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
}

async function saveWithFilePicker(data, suggestedName) {
  if (window.showSaveFilePicker) {
    try {
      var handle = await window.showSaveFilePicker({
        suggestedName: suggestedName || 'игра.json.si',
        types: [{ description:'Своя игра', accept:{ 'application/octet-stream':['.si','.json.si'] } }]
      });
      var writable = await handle.createWritable();
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      return handle;
    } catch (e) {
      if (e.name === 'AbortError') return null;
      throw e;
    }
  } else {
    downloadFile(data, suggestedName);
    return null;
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}
