// Shared by every page: shows Login or "Hi, name + Logout" in the navigation

async function loadUser() {
  const slot = document.getElementById('nav-auth');
  if (!slot) return null;

  let user = null;
  try {
    const res = await fetch('/api/me');
    if (res.ok) user = await res.json();
  } catch (e) { /* server not reachable: show as logged out */ }

  slot.innerHTML = '';
  if (user) {
    const hi = document.createElement('span');
    hi.className = 'nav-user';
    hi.textContent = 'Hi, ' + user.name.split(' ')[0];

    const btn = document.createElement('button');
    btn.className = 'link-btn';
    btn.textContent = 'Logout';
    btn.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = 'index.html';
    });

    slot.append(hi, btn);
  } else {
    const a = document.createElement('a');
    a.href = 'login.html';
    a.className = 'nav-login';
    a.textContent = 'Login';
    slot.append(a);
  }
  return user;
}

loadUser();
