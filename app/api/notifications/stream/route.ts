import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { subscribeToEvents } from '@/lib/events'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Message de connexion initiale
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event: 'connected' })}\n\n`))

      const unsubscribe = subscribeToEvents((data) => {
        try {
          controller.enqueue(encoder.encode(data))
        } catch {
          unsubscribe()
        }
      })

      // Heartbeat toutes les 25s pour maintenir la connexion
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
          unsubscribe()
        }
      }, 25000)

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        unsubscribe()
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
