import Link from 'next/link'

export default function MotDePasseOubliePage() {
  return (
    <div className="min-h-screen bg-[#0f0f13] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1a1a26] border border-white/10 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center mx-auto mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-white mb-2">Mot de passe oublié</h1>
        <p className="text-sm text-white/50 mb-6">
          Cette application ne dispose pas de réinitialisation automatique par email.
          Contactez votre administrateur pour qu&apos;il réinitialise votre mot de passe.
        </p>

        <div className="bg-white/5 border border-white/8 rounded-xl p-4 text-left mb-6">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-2 font-medium">Pour les administrateurs</p>
          <p className="text-sm text-white/60">
            Rendez-vous dans{' '}
            <span className="text-purple-400 font-medium">Paramètres → Utilisateurs</span>{' '}
            pour modifier le mot de passe d&apos;un compte.
          </p>
        </div>

        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Retour à la connexion
        </Link>
      </div>
    </div>
  )
}
