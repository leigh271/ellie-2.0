export function chooseFinalTranscript(finalTranscript: string, liveTranscript: string): string {
  return finalTranscript.trim() || liveTranscript.trim();
}

export function createPartialScheduler(run: () => Promise<unknown>, intervalMs = 2500) {
  let timer: ReturnType<typeof setInterval> | null = null;
  let inFlight = false;
  let stopped = true;

  return {
    start() {
      if (timer !== null) return;
      stopped = false;
      timer = setInterval(() => {
        if (stopped || inFlight) return;
        inFlight = true;
        void Promise.resolve()
          .then(run)
          .catch(() => {})
          .finally(() => { inFlight = false; });
      }, intervalMs);
    },
    stop() {
      stopped = true;
      if (timer !== null) clearInterval(timer);
      timer = null;
    },
  };
}
