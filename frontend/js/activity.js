// My Activity page: my requests and the help I gave

function ordinal(n) {
  return { 1: '1st', 2: '2nd', 3: '3rd' }[n] || n + 'th';
}

// The database stores UTC times like "2026-11-20 09:17:57"
function formatDate(s) {
  if (!s) return '';
  const d = new Date(s.replace(' ', 'T') + 'Z');
  return d.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function makeRow(main, meta, status) {
  const li = document.createElement('li');

  const left = document.createElement('div');
  const m = document.createElement('div');
  m.className = 'h-main';
  m.textContent = main;
  const t = document.createElement('div');
  t.className = 'h-meta';
  t.textContent = meta;
  left.append(m, t);

  const badge = document.createElement('span');
  badge.className = 'badge ' + status;
  badge.textContent = status;

  li.append(left, badge);
  return li;
}

async function load() {
  const res = await fetch('/api/requests/mine');
  if (res.status === 401) {
    window.location.href = 'login.html?next=my-activity.html';
    return;
  }
  const { asked, helped } = await res.json();

  document.getElementById('stat-helped').textContent = helped.filter(r => r.status === 'fulfilled').length;
  document.getElementById('stat-asked').textContent = asked.length;
  document.getElementById('stat-solved').textContent = asked.filter(r => r.status === 'fulfilled').length;

  const helpedList = document.getElementById('helped-list');
  helpedList.innerHTML = '';
  document.getElementById('helped-empty').style.display = helped.length ? 'none' : 'block';
  helped.forEach(r => {
    helpedList.append(makeRow(
      r.item + ' for a ' + ordinal(r.requester_year) + ' year student from ' + r.requester_department,
      r.venue + ', ' + r.floor + ' floor · ' + formatDate(r.accepted_at),
      r.status
    ));
  });

  const askedList = document.getElementById('asked-list');
  askedList.innerHTML = '';
  document.getElementById('asked-empty').style.display = asked.length ? 'none' : 'block';
  asked.forEach(r => {
    const by = r.helper_name ? ' · helped by ' + r.helper_name : '';
    askedList.append(makeRow(
      r.item,
      r.venue + ', ' + r.floor + ' floor · ' + formatDate(r.created_at) + by,
      r.status
    ));
  });
}

load();
