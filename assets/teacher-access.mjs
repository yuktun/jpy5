import {firebaseConfig} from './firebase-config.mjs';
import {createTeacherController, fetchTeacherNote} from './teacher-access-core.mjs';
import {teacherDraftReady} from './teacher-progress-privacy.mjs';

// Reconstruct only inert, permitted markup. Never execute stored HTML as code.
export function safeTeacherFragment(html, documentRef = document) {
  const template = documentRef.createElement('template');
  template.innerHTML = html;
  const tags = new Set('HEADER DIV SPAN H2 H3 H4 P A NAV ARTICLE UL OL LI DETAILS SUMMARY ASIDE BUTTON STRONG B EM SMALL RUBY RT RP WBR BR TABLE THEAD TBODY TR TH TD SECTION'.split(' '));
  const attributes = new Set('class id lang hidden open type start scope colspan rowspan aria-label aria-labelledby aria-controls aria-expanded data-answer-toggle data-word-meaning data-word-usage data-source-page data-question-count data-extract-length'.split(' '));
  for (const node of [...template.content.querySelectorAll('*')]) {
    if (!tags.has(node.tagName)) { node.remove(); continue; }
    for (const attribute of [...node.attributes]) {
      if (attribute.name === 'href' && node.tagName === 'A') {
        const value = attribute.value;
        if (!/^(?:https:\/\/drive\.google\.com\/|chapter-(?:13|14|15|16|17|18|19|20)-[a-z]+\.html(?:#[-\w]+)?$|#[-\w]+$)/.test(value)) node.removeAttribute('href');
      } else if (!attributes.has(attribute.name)) node.removeAttribute(attribute.name);
    }
    if (node.tagName === 'BUTTON') node.type = 'button';
    if (node.tagName === 'A') node.rel = 'noopener noreferrer';
  }
  return template.content;
}

const messages = {
  'signed-out': '請用 Google 帳戶登入；只有管理員核准的帳戶可讀取老師文字。',
  ready: '已登入，正在驗證存取權限…',
  loading: '正在驗證權限及讀取老師文字…',
  loaded: '已通過存取驗證。保持連線時會自動重新驗證；文字不會存入離線套件。',
  denied: '此帳戶尚未獲核准。請聯絡管理員；登入本身不會取得權限。',
  missing: '老師文字尚未上載。請稍後重試。',
  offline: '老師文字需要網絡連線。一般課程內容仍可離線使用。',
  expired: '顯示時間已到，文字已清除。請重新讀取以驗證權限。',
  error: '無法讀取老師文字，內容已清除。請連線後重試；若登入服務未就緒，請重新整理此頁。'
};

export async function mountTeacherAccess(root, serviceFactory = createAuthService) {
  const content = root.querySelector('[data-teacher-content]'), status = root.querySelector('[data-teacher-status]');
  const login = root.querySelector('[data-teacher-login]'), read = root.querySelector('[data-teacher-load]'), logout = root.querySelector('[data-teacher-logout]');
  let serviceReady = false;
  const controller = createTeacherController({
    load: async (user, signal) => { await teacherDraftReady; return fetchTeacherNote({user, signal, projectId: firebaseConfig.projectId}); },
    render({state, signedIn, data, preserve}) {
      if (!preserve) content.replaceChildren();
      root.dataset.accessState = state;
      status.textContent = messages[state];
      login.hidden = signedIn;
      read.hidden = !signedIn || !['error','missing','expired'].includes(state);
      read.textContent = '重試讀取';
      if(logout)logout.hidden = !signedIn;
      status.hidden = state === 'loaded';
      login.disabled = !serviceReady;
      read.disabled = state === 'loading' || state === 'offline';
      if (data) content.append(safeTeacherFragment(data[root.dataset.teacherSection]));
    }
  });
  const resume=()=>{if(serviceReady&&!document.hidden&&navigator.onLine)void controller.read();};
  window.addEventListener('offline',()=>controller.clear());
  window.addEventListener('online',resume);
  window.addEventListener('pagehide',()=>controller.clear());
  window.addEventListener('pageshow',resume);
  document.addEventListener('visibilitychange',()=>document.hidden?controller.clear():resume());
  root.addEventListener('keydown', event => { if (event.target.closest('button,summary,a')) event.stopPropagation(); });
  content.addEventListener('click', event => {
    const button = event.target.closest('[data-answer-toggle]');
    if (button) {
      const answer = [...content.querySelectorAll('[id]')].find(node => node.id === button.getAttribute('aria-controls'));
      if (answer) { answer.hidden = !answer.hidden; button.setAttribute('aria-expanded', String(!answer.hidden)); }
    }
    const word = event.target.closest('[data-word-meaning]');
    if (word) {
      content.querySelector('[data-teacher-word-help]')?.remove();
      const help = document.createElement('p'); help.dataset.teacherWordHelp = ''; help.setAttribute('role', 'status');
      help.textContent = `${word.dataset.wordMeaning} ${word.dataset.wordUsage || ''}`;
      word.closest('.teacher-word-bank')?.after(help);
    }
  });
  read.addEventListener('click', () => controller.read());
  try {
    const service = await serviceFactory();
    serviceReady = true;
    service.subscribe(user => {if(controller.account(user)&&user)void controller.read();});
    login.addEventListener('click', async () => {
      controller.clear(); login.disabled = true;
      try { await service.login(); } catch { controller.unavailable(); }
      finally { login.disabled = false; }
    });
    logout?.addEventListener('click', async () => {
      controller.account(null);
      try { await service.logout(); } catch { controller.unavailable(); }
    });
  } catch { controller.unavailable(); login.hidden = true; }
  return controller;
}

export async function createAuthService() {
  const sdk = 'https://www.gstatic.com/firebasejs/10.14.1';
  const [apps, authSdk] = await Promise.all([import(`${sdk}/firebase-app.js`), import(`${sdk}/firebase-auth.js`)]);
  const app = apps.getApps().length ? apps.getApp() : apps.initializeApp(firebaseConfig);
  const auth = authSdk.getAuth(app);
  return {
    subscribe: callback => authSdk.onIdTokenChanged(auth, callback),
    login: () => { const provider = new authSdk.GoogleAuthProvider(); provider.setCustomParameters({prompt: 'select_account'}); return authSdk.signInWithPopup(auth, provider); },
    logout: () => window.JPY5Sync?.ready ? window.JPY5Sync.logout() : authSdk.signOut(auth)
  };
}

if (typeof document !== 'undefined') document.querySelectorAll('[data-teacher-section]').forEach(root => mountTeacherAccess(root));
