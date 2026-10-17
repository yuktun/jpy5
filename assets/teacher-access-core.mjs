// REST with a Firebase ID token is evaluated by Firestore Security Rules.
// Keep this separate from the progress SDK's persistent cache.
export async function fetchTeacherNote({user, projectId, signal, fetchImpl = fetch}) {
  const token = await user.getIdToken();
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const response = await fetchImpl(`https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/jpy5TeacherNotes/lesson14`, {
    headers: {Authorization: `Bearer ${token}`}, cache: 'no-store', credentials: 'omit', redirect: 'error', signal
  });
  if (!response.ok) throw Object.assign(new Error('Teacher note unavailable'), {code: response.status === 403 ? 'denied' : response.status === 404 ? 'missing' : 'error'});
  const data = (await response.json()).fields;
  if (data?.schemaVersion?.integerValue !== '1' || typeof data?.exercises?.stringValue !== 'string' || typeof data?.adverbs?.stringValue !== 'string') throw new Error('Unsupported teacher note');
  return {exercises: data.exercises.stringValue, adverbs: data.adverbs.stringValue};
}

export function createTeacherController({load, render, online = () => navigator.onLine, visible = () => !document.hidden, timeoutMs = 15000, leaseMs = 60000}) {
  let user = null, generation = 0, request, expiry;
  function clear(state) {
    generation++; request?.abort(); request = null; clearTimeout(expiry);
    render({state, signedIn: Boolean(user)});
  }
  function idle() { return !online() ? 'offline' : user ? 'ready' : 'signed-out'; }
  return {
    account(next) { user = next; clear(idle()); },
    clear() { clear(idle()); },
    unavailable() { clear(online() ? 'error' : 'offline'); },
    async read() {
      clear(idle());
      if (!user || !online() || !visible()) return;
      const epoch = generation, identity = user;
      request = new AbortController();
      const signal = request.signal;
      render({state: 'loading', signedIn: true});
      const timeout = setTimeout(() => { if (epoch === generation) clear('error'); }, timeoutMs);
      try {
        const data = await load(identity, signal);
        if (epoch !== generation || signal.aborted || !online() || !visible()) return;
        render({state: 'loaded', signedIn: true, data});
        // Bound stale display after an administrator revokes access. No background
        // fetch: the next explicit read must pass server authorization again.
        expiry = setTimeout(() => clear('expired'), leaseMs);
      } catch (error) {
        if (epoch === generation) clear(error.code === 'denied' ? 'denied' : error.code === 'missing' ? 'missing' : 'error');
      } finally { clearTimeout(timeout); }
    }
  };
}
