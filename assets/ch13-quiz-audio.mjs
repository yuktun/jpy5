import {firebaseConfig} from './firebase-config.mjs';
import {createTeacherController, verifyTeacherAccess} from './teacher-access-core.mjs';
import {createAuthService} from './teacher-access.mjs';

// This is a public asset. Authorization limits the player UI, not access to the file.
export const quiz13AudioSource = new URL('./audio/lesson13-quiz1-dictation.mp3', import.meta.url).href;

export async function mountQuiz13Audio(root, {
  serviceFactory = createAuthService,
  verify = verifyTeacherAccess,
  source = quiz13AudioSource,
  controllerOptions = {}
} = {}) {
  let audio = null, serviceReady = false, unsubscribe;
  root.hidden = true;
  function clearPlayer() {
    root.hidden = true;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio = null;
    }
    root.replaceChildren();
  }
  function showPlayer() {
    if (audio) return;
    const title = document.createElement('h3');
    title.id = 'quiz13-audio-title';
    title.textContent = 'Quiz① 聽寫錄音';
    root.setAttribute('aria-labelledby', title.id);
    const note = document.createElement('p');
    note.className = 'teacher-source-note';
    note.textContent = '播放器只向已登入並獲核准帳戶顯示；錄音檔本身是公開檔案，不包括在離線套件。';
    const media = document.createElement('audio');
    media.controls = true;
    media.preload = 'none';
    media.setAttribute('aria-label', '第13課 Quiz① 聽寫錄音');
    const status = document.createElement('p');
    status.className = 'teacher-source-note';
    status.setAttribute('role', 'status');
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'text-button';
    retry.textContent = '重試載入錄音';
    retry.hidden = true;
    media.addEventListener('error', () => {
      if (audio !== media) return;
      status.textContent = '錄音暫時未能載入，請稍後重試。';
      retry.hidden = false;
    });
    retry.addEventListener('click', () => {
      controller.clear();
      void controller.read();
    });
    audio = media;
    root.append(title, note, media, status, retry);
    window.JPY5PlaybackSpeed?.attach([media]);
    media.src = source;
    root.hidden = false;
  }
  const controller = createTeacherController({
    ...controllerOptions,
    load: async (user, signal) => {
      const result = await verify({user, signal, projectId:firebaseConfig.projectId});
      if (result?.approved !== true) throw Object.assign(new Error('Authorization denied'), {code:'denied'});
      return result;
    },
    render({state, data, preserve}) {
      root.dataset.accessState = state;
      if (state === 'loaded' && (data?.approved === true || preserve)) showPlayer();
      else clearPlayer();
    }
  });
  const resume = () => { if (serviceReady && !document.hidden && navigator.onLine) void controller.read(); };
  const clear = () => controller.clear();
  const visibility = () => document.hidden ? clear() : resume();
  window.addEventListener('offline', clear);
  window.addEventListener('online', resume);
  window.addEventListener('pagehide', clear);
  window.addEventListener('pageshow', resume);
  document.addEventListener('visibilitychange', visibility);
  try {
    const service = await serviceFactory();
    serviceReady = true;
    unsubscribe = service.subscribe(user => { if (controller.account(user) && user) void controller.read(); });
  } catch { controller.unavailable(); }
  return {controller, dispose() {
    unsubscribe?.();
    serviceReady = false;
    controller.account(null);
    window.removeEventListener('offline', clear);
    window.removeEventListener('online', resume);
    window.removeEventListener('pagehide', clear);
    window.removeEventListener('pageshow', resume);
    document.removeEventListener('visibilitychange', visibility);
  }};
}

function start() {
  const host = document.getElementById('lesson13-quiz1');
  const anchor = host?.querySelector('.quiz13-nav');
  if (!anchor || host.querySelector('[data-quiz13-audio]')) return;
  const root = document.createElement('section');
  root.className = 'quiz13-audio';
  root.dataset.quiz13Audio = '';
  root.hidden = true;
  anchor.before(root);
  void mountQuiz13Audio(root);
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
}
