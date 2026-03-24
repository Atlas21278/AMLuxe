'use client'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-white/50 text-sm">Une erreur est survenue.</p>
      {error.digest && (
        <p className="text-white/20 text-xs font-mono">#{error.digest}</p>
      )}
      <button
        onClick={reset}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm text-white transition-colors"
      >
        Réessayer
      </button>
    </div>
  )
}
