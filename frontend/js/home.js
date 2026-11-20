// Homepage: shows how many students were helped this month (refreshes every 10 seconds)

async function loadCount() {
  const countEl = document.getElementById('count');
  const labelEl = document.getElementById('count-label');

  try {
    const res = await fetch('/api/requests/feed');
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();

    countEl.textContent = data.helpedThisMonth;
    labelEl.textContent =
      (data.helpedThisMonth === 1 ? 'student' : 'students') + ' helped this month';
  } catch (e) {
    // Server not reachable: keep the page as it is
  }
}

loadCount();
setInterval(loadCount, 10000);
