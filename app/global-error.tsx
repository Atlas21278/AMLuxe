'use client'

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body style={{ background: '#0f0f13', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', fontFamily: 'sans-serif' }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem' }}>Une erreur est survenue.</p>
        <button
          onClick={reset}
          style={{ padding: '0.5rem 1rem', background: '#7c3aed', border: 'none', borderRadius: '0.5rem', color: 'white', fontSize: '0.875rem', cursor: 'pointer' }}
        >
          Réessayer
        </button>
      </body>
    </html>
  )
}
