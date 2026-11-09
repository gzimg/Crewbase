import axios from "axios";

/**
 * Shared /api/@me lookup. Several parts of the app ask "who is logged in?" at
 * the same moment when a page loads; this makes them share one request
 * (and reuse the answer for a few seconds) instead of each sending their own.
 */
let inflight: { at: number; promise: Promise<any> } | null = null;

export function fetchMe(): Promise<any> {
  if (inflight && Date.now() - inflight.at < 5000) return inflight.promise;
  const promise = axios.get("/api/@me");
  inflight = { at: Date.now(), promise };
  // Errors shouldn't be cached for long
  promise.catch(() => {
    if (inflight?.promise === promise) inflight = null;
  });
  return promise;
}

export function clearMe() {
  inflight = null;
}
