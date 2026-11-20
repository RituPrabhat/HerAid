// "I Can Help" page: list open requests and let a student accept one

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const thanksEl = document.getElementById('thanks');
const msgEl = document.getElementById('msg');

let requests = [];   // latest open requests from the server

function ordinal(n) {
  return { 1: '1st', 2: '2nd', 3: '3rd' }[n] || n + 'th';
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

function showMessage(text, type) {
  msgEl.textContent = text;
  msgEl.className = 'form-msg ' + type;
}

function buildCard(r) {
  const card = document.createElement('div');
  card.className = 'card req-card';
  card.dataset.id = r.id;

  const top = document.createElement('div');
  top.className = 'req-top';
  const item = document.createElement('span');
  item.className = 'req-item';
  item.textContent = r.item;
  const time = document.createElement('span');
  time.className = 'req-time';
  time.dataset.left = r.seconds_left;
  top.append(item, time);

  const who = document.createElement('div');
  who.className = 'req-who';
  who.textContent = ordinal(r.requester_year) + ' year · ' + r.requester_department;

  const where = document.createElement('div');
  where.className = 'req-where';
  where.textContent = r.venue + ', ' + r.floor + ' floor' + (r.note ? ' · ' + r.note : '');

  card.append(top, who, where);

  if (r.is_mine) {
    const tag = document.createElement('div');
    tag.className = 'mine-tag';
    tag.textContent = 'This is your request';
    card.append(tag);
  } else {
    const btn = document.createElement('button');
    btn.className = 'btn btn-block';
    btn.textContent = 'I Can Help';
    btn.addEventListener('click', () => accept(r.id, btn));
    card.append(btn);
  }
  return card;
}

function render() {
  listEl.innerHTML = '';
  emptyEl.classList.toggle('hidden', requests.length > 0);
  requests.forEach(r => listEl.append(buildCard(r)));
  updateTimers();
}

function updateTimers() {
  document.querySelectorAll('.req-time').forEach(el => {
    const left = Math.max(0, Number(el.dataset.left));
    el.textContent = formatTime(left) + ' left';
    el.classList.toggle('low', left <= 180);
  });
}

async function load() {
  try {
    const res = await fetch('/api/requests');
    if (res.status === 401) {
      window.location.href = 'login.html?next=requests.html';
      return;
    }
    if (!res.ok) throw new Error('bad response');
    requests = await res.json();
    msgEl.className = 'form-msg';
    render();
  } catch (e) {
    showMessage('Could not load requests. Restart the server (Ctrl + C, then node server.js) and refresh.', 'error');
  }
}

async function accept(id, btn) {
  btn.disabled = true;
  msgEl.className = 'form-msg';
  try {
    const res = await fetch('/api/requests/' + id + '/accept', { method: 'PATCH' });
    const data = await res.json();

    if (!res.ok) {
      showMessage(data.error, 'error');
      return load();
    }

    const r = data.request;
    thanksEl.innerHTML = '';
    const h = document.createElement('h2');
    h.textContent = 'Thank you for helping!';
    const p = document.createElement('p');
    p.textContent =
      'Please bring ' + r.item + ' to ' + r.venue + ', ' + r.floor + ' floor' +
      (r.note ? ' (' + r.note + ')' : '') + '. She is waiting.';
    thanksEl.append(h, p);
    thanksEl.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    load();
  } catch (e) {
    showMessage('Cannot reach the server. Is it running?', 'error');
    btn.disabled = false;
  }
}

// Countdown ticks every second; list refreshes from the server every 5 seconds
setInterval(() => {
  document.querySelectorAll('.req-time').forEach(el => {
    el.dataset.left = Math.max(0, Number(el.dataset.left) - 1);
  });
  updateTimers();
}, 1000);

setInterval(load, 5000);
load();
