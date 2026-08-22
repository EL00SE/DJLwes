/** Schedules `fn` to run once, one tick after being called, and returns a
 * cleanup function to cancel it. Meant to be called (and its cleanup
 * returned) from inside a `useEffect` body whose only job is to set some
 * client-only initial state — calling `setState` synchronously at the top
 * level of an effect trips the `react-hooks/set-state-in-effect` lint
 * rule (confirmed: removing the deferral there is a real lint error, not
 * just an overcautious pattern), so this exists to avoid hand-rolling the
 * same `setTimeout`/`clearTimeout` pair at every call site that needs it. */
export function deferOnce(fn: () => void): () => void {
  const timeoutId = setTimeout(fn, 0);
  return () => clearTimeout(timeoutId);
}
