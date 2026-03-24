/**
 * Bus d'événements en mémoire pour les notifications temps réel via SSE.
 * Fonctionne pour une instance unique (Railway single-pod).
 */

type Subscriber = (data: string) => void

const subscribers = new Set<Subscriber>()

export function subscribeToEvents(fn: Subscriber) {
  subscribers.add(fn)
  return () => subscribers.delete(fn)
}

export function emitEvent(event: string, data: unknown) {
  const payload = `data: ${JSON.stringify({ event, ...( typeof data === 'object' ? data : { message: data }) })}\n\n`
  for (const fn of subscribers) {
    try { fn(payload) } catch { /* subscriber disconnected */ }
  }
}
