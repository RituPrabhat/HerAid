// Homepage: loads the "Just helped" chips and the monthly counter, refreshing every 10 seconds

function timeAgo(minutes) {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes + ' min ago';
  const h = Math.floor(minutes / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.floor(h / 24);
  return d + (d === 1 ? ' day ago' : ' days ago');
}

async function loadFeed() {
  const chips = document.getElementById('feed');
  const counter = document.getElementById('counter');

  try {
    const res = await fetch('/api/requests/feed');
    if (!res.ok) throw new Error('bad response');
    const data = await res.json();

    counter.textContent = data.helpedThisMonth +
      (data.helpedThisMonth === 1 ? ' student helped this month' : ' students helped this month');
    chips.innerHTML = '';

    if (data.feed.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'chips-empty';
      empty.textContent = 'No one yet. Be the first to lend a hand!';
      chips.append(empty);
      return;
    }

    // Show the 3 most recent
    data.feed.slice(0, 3).forEach(item => {
      const chip = document.createElement('div');
      chip.className = 'chip';
      chip.textContent =
        '✔ ' + item.requester_department + ' · ' + item.item + ' · ' + timeAgo(item.minutes_ago);
      chips.append(chip);
    });
  } catch (e) {
    // Server not reachable: keep the page clean
  }
}

loadFeed();
setInterval(loadFeed, 10000);
