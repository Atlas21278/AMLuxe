'use client'

import { useEffect, useCallback, useRef } from 'react'

export interface Notification {
  id: string
  event: string
  message: string
  timestamp: number
}

type NotificationHandler = (notif: Notification) => void

/**
 * S'abonne au flux SSE de notifications.
 * Rappelle `onNotification` à chaque événement métier reçu.
 */
export function useNotifications(onNotification: NotificationHandler, enabled = true) {
  const handlerRef = useRef(onNotification)
  handlerRef.current = onNotification

  const connect = useCallback(() => {
    if (!enabled) return

    const es = new EventSource('/api/notifications/stream')

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.event === 'connected' || !data.message) return
        handlerRef.current({
          id: `${Date.now()}-${Math.random()}`,
          event: data.event,
          message: data.message,
          timestamp: Date.now(),
        })
      } catch { /* ignore malformed messages */ }
    }

    es.onerror = () => {
      es.close()
      // Reconnexion après 5s
      setTimeout(connect, 5000)
    }

    return () => es.close()
  }, [enabled])

  useEffect(() => {
    const cleanup = connect()
    return cleanup
  }, [connect])
}
