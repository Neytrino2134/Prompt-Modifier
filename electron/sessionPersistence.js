// Session writes must finish in order. Atomic files alone do not prevent an
// older, slower save from overwriting a newer save.
export function createSessionWriteQueue() {
  let pending = Promise.resolve();
  let committedAt = 0;
  return {
    run(session, write) {
      const operation = pending.then(async () => {
        if (session.savedAt < committedAt) return { success: true, skipped: true, savedAt: committedAt };
        const result = await write();
        if (result?.success) committedAt = Math.max(committedAt, session.savedAt);
        return result;
      });
      pending = operation.catch(() => {});
      return operation;
    },
    idle: () => pending
  };
}

export function isValidSession(session) {
  return !!session && Array.isArray(session.tabs) && session.tabs.length > 0
    && session.tabs.every(tab => tab && typeof tab.id === 'string' && tab.state && Array.isArray(tab.state.nodes));
}
