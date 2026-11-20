// Login page: switch between Login / Register and talk to the server

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const msg = document.getElementById('msg');

function showMessage(text, type) {
  msg.textContent = text;
  msg.className = 'form-msg ' + type;
}

function clearMessage() {
  msg.textContent = '';
  msg.className = 'form-msg';
}

function showTab(which) {
  const isLogin = which === 'login';
  loginForm.classList.toggle('hidden', !isLogin);
  registerForm.classList.toggle('hidden', isLogin);
  tabLogin.classList.toggle('active', isLogin);
  tabRegister.classList.toggle('active', !isLogin);
  clearMessage();
}

tabLogin.addEventListener('click', () => showTab('login'));
tabRegister.addEventListener('click', () => showTab('register'));

// After login, go back to the page the student wanted (login.html?next=request.html)
function goNext() {
  const next = new URLSearchParams(window.location.search).get('next');
  const safe = next && /^[a-z-]+\.html$/.test(next) ? next : 'index.html';
  window.location.href = safe;
}

async function send(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  return { ok: res.ok, data };
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();
  try {
    const { ok, data } = await send('/api/login', {
      email: document.getElementById('login-email').value,
      password: document.getElementById('login-password').value
    });
    if (!ok) return showMessage(data.error, 'error');
    showMessage('Welcome back, ' + data.name + '!', 'ok');
    setTimeout(goNext, 600);
  } catch (err) {
    showMessage('Cannot reach the server. Is it running?', 'error');
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage();
  try {
    const { ok, data } = await send('/api/register', {
      name: document.getElementById('reg-name').value,
      email: document.getElementById('reg-email').value,
      password: document.getElementById('reg-password').value,
      department: document.getElementById('reg-department').value,
      year: document.getElementById('reg-year').value
    });
    if (!ok) return showMessage(data.error, 'error');
    showMessage('Account created. Welcome, ' + data.name + '!', 'ok');
    setTimeout(goNext, 800);
  } catch (err) {
    showMessage('Cannot reach the server. Is it running?', 'error');
  }
});

// Already logged in? No need to see this page.
fetch('/api/me').then(res => { if (res.ok) goNext(); });
