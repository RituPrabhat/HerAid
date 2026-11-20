// "I Need Help" page: send an SOS, then follow its status live

const formCard = document.getElementById('form-card');
const statusCard = document.getElementById('status-card');
const form = document.getElementById('request-form');
const msg = document.getElementById('msg');
const statusMsg = document.getElementById('status-msg');
const badge = document.getElementById('status-badge');
const titleEl = document.getElementById('status-title');
const textEl = document.getElementById('status-text');
const timerEl = document.getElementById('timer');
const detailsEl = document.getElementById('details');
const receivedBtn = document.getElementById('received-btn');
const againBtn = document.getElementById('again-btn');

let currentId = null;       // the request we are showing
let secondsLeft = 0;        // countdown for an open request
let pollTimer = null;
let tickTimer = null;

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = 'form-msg ' + type;
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
}

function renderDetails(r) {
  detailsEl.innerHTML = '';
  [['Item', r.item], ['Venue', r.venue], ['Floor', r.floor], ['Note', r.note]]
    .filter(row => row[1])
    .forEach(([label, value]) => {
      const div = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = label;
      div.append(strong, document.createTextNode(value));
      detailsEl.append(div);
    });
}

function showForm() {
  currentId = null;
  formCard.classList.remove('hidden');
  statusCard.classList.add('hidden');
}

function showStatus(r) {
  formCard.classList.add('hidden');
  statusCard.classList.remove('hidden');
  currentId = r.id;
  renderDetails(r);

  badge.className = 'badge ' + r.status;
  badge.textContent = r.status;
  timerEl.classList.add('hidden');
  receivedBtn.classList.add('hidden');
  againBtn.classList.add('hidden');
  statusMsg.className = 'form-msg';

  if (r.status === 'open') {
    titleEl.textContent = 'Your SOS is out';
    textEl.textContent = 'Waiting for a student to accept. Stay where you are.';
    secondsLeft = r.seconds_left;
    timerEl.textContent = formatTime(secondsLeft);
    timerEl.classList.remove('hidden');
  } else if (r.status === 'accepted') {
    titleEl.textContent = r.helper_name + ' is coming to help';
    textEl.textContent = 'She will meet you at the venue above. Tap the button once you have it.';
    receivedBtn.classList.remove('hidden');
  } else if (r.status === 'fulfilled') {
    titleEl.textContent = 'All sorted. Thank you!';
    textEl.textContent = 'Your request is now part of "Recently Helped" on the homepage.';
    againBtn.classList.remove('hidden');
  } else if (r.status === 'expired') {
    titleEl.textContent = 'No one was available in time';
    textEl.textContent = 'Sorry! Nobody accepted within 15 minutes. You can send it again.';
    againBtn.classList.remove('hidden');
  }
}

// Ask the server for my requests and show the latest active one
async function refresh() {
  try {
    const res = await fetch('/api/requests/mine');
    if (res.status === 401) {
      window.location.href = 'login.html?next=request.html';
      return;
    }
    const data = await res.json();

    const active = data.asked.find(r => r.status === 'open' || r.status === 'accepted');
    if (active) return showStatus(active);

    // The request we were following just ended (expired or received): show how it ended
    if (currentId !== null) {
      const finished = data.asked.find(r => r.id === currentId);
      if (finished) return showStatus(finished);
    }

    showForm();
  } catch (e) { /* server busy: try again on the next poll */ }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  msg.className = 'form-msg';
  try {
    const res = await fetch('/api/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item: document.getElementById('item').value,
        venue: document.getElementById('venue').value,
        floor: document.getElementById('floor').value,
        note: document.getElementById('note').value
      })
    });
    const data = await res.json();
    if (!res.ok) return showMessage(msg, data.error, 'error');
    form.reset();
    refresh();
  } catch (err) {
    showMessage(msg, 'Cannot reach the server. Is it running?', 'error');
  }
});

receivedBtn.addEventListener('click', async () => {
  const res = await fetch('/api/requests/' + currentId + '/fulfill', { method: 'PATCH' });
  const data = await res.json();
  if (!res.ok) return showMessage(statusMsg, data.error, 'error');
  refresh();
});

againBtn.addEventListener('click', showForm);

// Countdown runs every second; the server is asked every 5 seconds
tickTimer = setInterval(() => {
  if (secondsLeft > 0 && badge.textContent === 'open') {
    secondsLeft -= 1;
    timerEl.textContent = formatTime(secondsLeft);
  }
}, 1000);

pollTimer = setInterval(() => {
  // Don't poll while the form is showing and nothing is being followed
  if (currentId !== null) refresh();
}, 5000);

refresh();
