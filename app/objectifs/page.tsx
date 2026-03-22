'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'

// ─── Paliers ────────────────────────────────────────────────────────────────

const PALIERS = [
  {
    montant: 1_000,
    nom: 'Renault Clio 2',
    tag: 'Niveau 1',
    color: '#64748b',
    glow: 'rgba(100,116,139,0.5)',
    gradient: 'from-slate-500 to-slate-700',
    bgCard: 'from-slate-900 to-slate-800',
    shape: 'hatch',
    image: '/voitures/clio2.png',
  },
  {
    montant: 2_000,
    nom: 'Peugeot 308',
    tag: 'Niveau 2',
    color: '#3b82f6',
    glow: 'rgba(59,130,246,0.5)',
    gradient: 'from-blue-500 to-blue-700',
    bgCard: 'from-blue-950 to-slate-900',
    shape: 'hatch',
    image: '/voitures/308.png',
  },
  {
    montant: 5_000,
    nom: 'Volkswagen Golf 6',
    tag: 'Niveau 3',
    color: '#6366f1',
    glow: 'rgba(99,102,241,0.5)',
    gradient: 'from-indigo-500 to-indigo-700',
    bgCard: 'from-indigo-950 to-slate-900',
    shape: 'hatch',
    image: '/voitures/golf6.png',
  },
  {
    montant: 10_000,
    nom: 'BMW Série 3 E92',
    tag: 'Niveau 4',
    color: '#a855f7',
    glow: 'rgba(168,85,247,0.5)',
    gradient: 'from-purple-500 to-purple-700',
    bgCard: 'from-purple-950 to-slate-900',
    shape: 'coupe',
    image: '/voitures/bmw-e92.png',
  },
  {
    montant: 20_000,
    nom: 'Mercedes C W205',
    tag: 'Niveau 5',
    color: '#ec4899',
    glow: 'rgba(236,72,153,0.5)',
    gradient: 'from-pink-500 to-violet-700',
    bgCard: 'from-pink-950 to-purple-950',
    shape: 'sedan',
    image: '/voitures/mercedes-c.png',
  },
  {
    montant: 50_000,
    nom: 'Porsche 718 Cayman',
    tag: 'Niveau 6',
    color: '#f97316',
    glow: 'rgba(249,115,22,0.6)',
    gradient: 'from-orange-500 to-amber-600',
    bgCard: 'from-orange-950 to-slate-900',
    shape: 'sports',
    image: '/voitures/porsche-718.png',
  },
  {
    montant: 100_000,
    nom: 'Audi RS6 C8',
    tag: '★ FINAL',
    color: '#eab308',
    glow: 'rgba(234,179,8,0.7)',
    gradient: 'from-yellow-400 to-amber-600',
    bgCard: 'from-yellow-950 to-amber-950',
    shape: 'wagon',
    special: true,
    image: '/voitures/rs6.png',
  },
]

// ─── SVG silhouettes ────────────────────────────────────────────────────────

const SILHOUETTES: Record<string, string> = {
  hatch: 'M 10 60 L 10 45 Q 15 45 25 30 L 55 30 Q 65 30 75 45 L 90 45 L 90 60 Q 80 65 72 65 Q 65 62 65 60 Q 65 54 58 54 Q 51 54 51 60 Q 51 62 45 65 Q 35 65 30 60 Q 30 54 23 54 Q 16 54 16 60 Q 16 62 10 60 Z M 25 42 L 28 32 L 52 32 L 60 42 Z',
  coupe: 'M 8 60 L 8 44 Q 15 44 28 28 L 62 28 Q 74 28 82 44 L 92 44 L 92 60 Q 82 65 74 65 Q 67 62 67 60 Q 67 54 60 54 Q 53 54 53 60 Q 53 62 47 65 Q 33 65 28 60 Q 28 54 21 54 Q 14 54 14 60 Q 14 62 8 60 Z',
  sedan: 'M 6 60 L 6 44 Q 14 44 22 32 L 38 32 L 62 32 L 78 44 L 94 44 L 94 60 Q 84 65 76 65 Q 69 62 69 60 Q 69 54 62 54 Q 55 54 55 60 Q 55 62 49 65 Q 31 65 25 60 Q 25 54 18 54 Q 11 54 11 60 Q 11 62 6 60 Z',
  sports: 'M 5 60 L 5 46 Q 15 46 32 28 L 68 28 Q 80 34 88 46 L 95 46 L 95 60 Q 85 65 77 65 Q 70 62 70 60 Q 70 54 63 54 Q 56 54 56 60 Q 56 62 50 65 Q 30 65 25 60 Q 25 54 18 54 Q 11 54 11 60 Q 11 62 5 60 Z',
  wagon: 'M 5 60 L 5 42 Q 10 42 18 30 L 82 30 Q 90 30 95 42 L 95 60 Q 85 65 77 65 Q 70 62 70 60 Q 70 54 63 54 Q 56 54 56 60 Q 56 62 50 65 Q 30 65 25 60 Q 25 54 18 54 Q 11 54 11 60 Q 11 62 5 60 Z',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatEur(n: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function getMessage(pct: number) {
  if (pct === 0) return 'Chaque grand voyage commence par un premier pas'
  if (pct < 20) return 'Tu viens de démarrer — l\'aventure commence ici'
  if (pct < 50) return 'Tu avances bien, continue sur cette lancée'
  if (pct < 80) return 'Tu es dans le top — le prochain palier est proche'
  if (pct < 100) return 'Tu y es presque — encore un effort !'
  return '🏆 Objectif final débloqué — légende absolue'
}

// ─── Composant Counter animé ─────────────────────────────────────────────────

function AnimatedCounter({ target, duration = 2000 }: { target: number; duration?: number }) {
  const [value, setValue] = useState(0)
  const ref = useRef<number>(0)

  useEffect(() => {
    const start = Date.now()
    const startVal = ref.current
    const diff = target - startVal

    const step = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out-cubic
      const current = Math.round(startVal + diff * eased)
      setValue(current)
      ref.current = current
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])

  return <>{formatEur(value)}</>
}

// ─── Particles de fond ────────────────────────────────────────────────────────

function Particles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width: `${Math.random() * 4 + 1}px`,
            height: `${Math.random() * 4 + 1}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `hsl(${260 + Math.random() * 60}, 80%, 70%)`,
            animation: `float ${4 + Math.random() * 8}s ease-in-out ${Math.random() * 5}s infinite alternate`,
          }}
        />
      ))}
      {/* Orbes lumineuses */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #a855f7, transparent)', filter: 'blur(60px)', animation: 'drift 12s ease-in-out infinite alternate' }} />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10"
        style={{ background: 'radial-gradient(circle, #3b82f6, transparent)', filter: 'blur(60px)', animation: 'drift 15s ease-in-out 3s infinite alternate-reverse' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
        style={{ background: 'radial-gradient(circle, #eab308, transparent)', filter: 'blur(80px)' }} />
    </div>
  )
}

// ─── Carte voiture ────────────────────────────────────────────────────────────

function CarCard({ palier, statut, montantActuel, index }: {
  palier: typeof PALIERS[0]
  statut: 'unlocked' | 'current' | 'locked'
  montantActuel: number
  index: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  const restant = Math.max(0, palier.montant - montantActuel)
  const pctCard = statut === 'current'
    ? Math.min(100, (montantActuel / palier.montant) * 100)
    : statut === 'unlocked' ? 100 : 0

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={statut !== 'locked' ? { y: -6, scale: 1.02 } : {}}
      className="relative rounded-2xl overflow-hidden cursor-default"
      style={{
        boxShadow: statut !== 'locked' ? `0 0 30px ${palier.glow}, 0 4px 20px rgba(0,0,0,0.5)` : '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${palier.bgCard} opacity-90`} />

      {/* Image PNG de la voiture */}
      <div className="absolute bottom-0 right-0 w-44 h-24 pointer-events-none">
        <img
          src={palier.image}
          alt={palier.nom}
          className={`w-full h-full object-contain object-right-bottom transition-all ${statut === 'locked' ? 'opacity-10 grayscale' : 'opacity-70 drop-shadow-lg'}`}
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        {/* SVG fallback watermark */}
        <svg viewBox="0 0 100 90" className="absolute inset-0 w-full h-full opacity-10" fill="currentColor"
          style={{ color: palier.color }}>
          <path d={SILHOUETTES[palier.shape]} />
        </svg>
      </div>

      {/* Overlay locked */}
      {statut === 'locked' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center z-10">
          <svg className="w-8 h-8 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
      )}

      {/* Contenu */}
      <div className="relative z-10 p-5">
        {/* Badge */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
            statut === 'unlocked' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
            statut === 'current' ? 'border-white/20 text-white/70' :
            'bg-white/5 text-white/20 border-white/10'
          }`}
            style={statut === 'current' ? { borderColor: palier.color, color: palier.color, background: `${palier.glow.replace('0.5', '0.1')}` } : {}}
          >
            {statut === 'unlocked' ? '✓ Débloqué' : statut === 'current' ? '⚡ En cours' : palier.tag}
          </span>

          {palier.special && (
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
              FINAL
            </span>
          )}
        </div>

        {/* Nom */}
        <h3 className={`text-lg font-bold mb-1 ${statut === 'locked' ? 'text-white/30' : 'text-white'}`}>
          {palier.nom}
        </h3>

        {/* Prix */}
        <p className="text-2xl font-black mb-4"
          style={{ color: statut === 'locked' ? 'rgba(255,255,255,0.2)' : palier.color }}>
          {formatEur(palier.montant)}
        </p>

        {/* Mini progress bar */}
        {statut !== 'locked' && (
          <div className="mb-2">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-white/40">{statut === 'unlocked' ? 'Complété' : `Reste ${formatEur(restant)}`}</span>
              <span style={{ color: palier.color }}>{pctCard.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={inView ? { width: `${pctCard}%` } : {}}
                transition={{ duration: 1.5, delay: index * 0.1 + 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${palier.color}99, ${palier.color})` }}
              />
            </div>
          </div>
        )}

        {/* Animation pulse pour current */}
        {statut === 'current' && (
          <div className="absolute -inset-px rounded-2xl pointer-events-none"
            style={{
              border: `1px solid ${palier.color}`,
              boxShadow: `inset 0 0 20px ${palier.glow.replace('0.5', '0.1')}`,
              animation: 'borderPulse 2s ease-in-out infinite',
            }}
          />
        )}
      </div>
    </motion.div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function ObjectifsPage() {
  const [montantActuel, setMontantActuel] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/articles').then((r) => r.ok ? r.json() : []),
      fetch('/api/abonnements').then((r) => r.ok ? r.json() : []),
    ]).then(([articles, abonnements]) => {
      const vendus = articles.filter((a: { statut: string; prixVenteReel?: number }) => a.statut === 'Vendu' && a.prixVenteReel)
      const ca = vendus.reduce((s: number, a: { prixVenteReel?: number }) => s + (a.prixVenteReel ?? 0), 0)
      const achats = vendus.reduce((s: number, a: { prixAchat: number }) => s + a.prixAchat, 0)
      const fraisVente = vendus.reduce((s: number, a: { fraisVente?: number }) => s + (a.fraisVente ?? 0), 0)
      const abonnementsTotal = abonnements.reduce((s: number, a: { montant: number }) => s + a.montant, 0)
      const benefice = Math.max(0, ca - achats - fraisVente - abonnementsTotal)
      setMontantActuel(benefice)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const MAX = PALIERS[PALIERS.length - 1].montant
  const palierActuel = PALIERS.find((p) => montantActuel < p.montant) ?? PALIERS[PALIERS.length - 1]
  const palierPrecedent = PALIERS[PALIERS.indexOf(palierActuel) - 1]
  const baseProgress = palierPrecedent?.montant ?? 0
  // progressPct absolu (pour la grande barre) — doit correspondre aux positions des marqueurs
  const progressPct = Math.min(100, (montantActuel / MAX) * 100)
  // progressPctCourant relatif (pour la carte "prochain objectif")
  const progressPctCourant = Math.min(100,
    ((montantActuel - baseProgress) / (palierActuel.montant - baseProgress)) * 100
  )
  const montantRestant = Math.max(0, palierActuel.montant - montantActuel)
  const message = getMessage(progressPctCourant)
  const dernierId = PALIERS[PALIERS.length - 1]

  const getStatut = (palier: typeof PALIERS[0]) => {
    if (montantActuel >= palier.montant) return 'unlocked' as const
    if (palier === palierActuel) return 'current' as const
    return 'locked' as const
  }

  const voituresDebloquees = PALIERS.filter((p) => montantActuel >= p.montant)

  return (
    <>
      {/* Styles globaux pour les animations */}
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) translateX(0px); }
          100% { transform: translateY(-20px) translateX(10px); }
        }
        @keyframes drift {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(40px, 30px) scale(1.1); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes ping-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes borderPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes goldAura {
          0% { box-shadow: 0 0 20px rgba(234,179,8,0.3), 0 0 60px rgba(234,179,8,0.1); }
          50% { box-shadow: 0 0 40px rgba(234,179,8,0.6), 0 0 100px rgba(234,179,8,0.2); }
          100% { box-shadow: 0 0 20px rgba(234,179,8,0.3), 0 0 60px rgba(234,179,8,0.1); }
        }
      `}</style>

      <div className="relative min-h-screen bg-[#060610] overflow-x-hidden">
        <Particles />

        <div className="relative z-10 page-enter px-4 sm:px-6 lg:px-8 py-10 max-w-6xl mx-auto">

          {/* ── HEADER ───────────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-14"
          >
            <p className="text-xs font-bold tracking-[0.3em] text-white/30 uppercase mb-3">
              Tableau de progression
            </p>
            <h1 className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tight">
              Tes{' '}
              <span className="bg-clip-text text-transparent"
                style={{ backgroundImage: `linear-gradient(135deg, #a855f7, #3b82f6, #a855f7)`, backgroundSize: '200%', animation: 'shimmer 3s linear infinite' }}>
                Objectifs
              </span>
            </h1>

            <AnimatePresence mode="wait">
              <motion.p
                key={message}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-white/40 text-sm mt-3 max-w-md mx-auto"
              >
                {message}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* ── MONTANT ACTUEL ────────────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-center mb-12"
          >
            <p className="text-xs font-semibold tracking-widest text-white/30 uppercase mb-2">Bénéfice net cumulé</p>
            {loading ? (
              <div className="h-20 w-64 mx-auto skeleton rounded-2xl" />
            ) : (
              <div className="text-6xl sm:text-7xl font-black tracking-tight"
                style={{
                  background: `linear-gradient(135deg, ${palierActuel.color}, white, ${palierActuel.color})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundSize: '200%',
                }}>
                <AnimatedCounter target={montantActuel} duration={2500} />
              </div>
            )}

            {!loading && montantRestant > 0 && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-white/40 text-sm mt-3"
              >
                Plus que{' '}
                <span className="font-bold" style={{ color: palierActuel.color }}>{formatEur(montantRestant)}</span>
                {' '}pour débloquer la <span className="text-white/70 font-medium">{palierActuel.nom}</span>
              </motion.p>
            )}
          </motion.div>

          {/* ── GRANDE BARRE DE PROGRESSION ───────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mb-16"
          >
            <div className="relative">
              {/* Track */}
              <div className="h-5 bg-white/5 rounded-full overflow-hidden border border-white/10 relative">
                {/* Fill */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 2.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${palierPrecedent?.color ?? '#6366f1'}, ${palierActuel.color})`,
                    boxShadow: `0 0 20px ${palierActuel.glow}`,
                  }}
                >
                  {/* Shimmer */}
                  <div className="absolute inset-0 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 w-1/3 bg-white/20 rounded-full"
                      style={{ animation: 'shimmer 2s ease-in-out infinite', filter: 'blur(4px)' }} />
                  </div>
                </motion.div>
              </div>

              {/* Marqueurs de paliers */}
              <div className="absolute inset-0 flex items-center">
                {PALIERS.map((p, i) => {
                  const position = (p.montant / PALIERS[PALIERS.length - 1].montant) * 100
                  const est = getStatut(p)
                  return (
                    <div key={p.montant}
                      className="absolute flex flex-col items-center"
                      style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.8 + i * 0.1, type: 'spring', stiffness: 400 }}
                        className="w-4 h-4 rounded-full border-2 relative z-10"
                        style={{
                          backgroundColor: est !== 'locked' ? p.color : '#1e1e2e',
                          borderColor: est !== 'locked' ? p.color : 'rgba(255,255,255,0.1)',
                          boxShadow: est !== 'locked' ? `0 0 12px ${p.glow}` : 'none',
                          animation: est === 'current' ? 'ping-slow 1.5s ease-in-out infinite' : 'none',
                        }}
                      >
                        {est === 'unlocked' && (
                          <svg className="w-2.5 h-2.5 absolute inset-0.5" fill="white" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </motion.div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Légende */}
            <div className="flex justify-between mt-2 text-xs text-white/20">
              <span>0 €</span>
              <span>100 000 €</span>
            </div>
          </motion.div>

          {/* ── PROCHAIN OBJECTIF (FEATURED) ─────────────────────────────── */}
          {montantRestant > 0 && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mb-16"
            >
              <p className="text-xs font-bold tracking-widest text-white/30 uppercase text-center mb-6">
                Prochain objectif
              </p>

              <div className="relative rounded-3xl overflow-hidden border"
                style={{
                  borderColor: `${palierActuel.color}40`,
                  boxShadow: `0 0 60px ${palierActuel.glow}, 0 20px 60px rgba(0,0,0,0.6)`,
                  animation: 'ping-slow 3s ease-in-out infinite',
                }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${palierActuel.bgCard} opacity-95`} />

                {/* Image PNG ou silhouette en fond */}
                <div className="absolute bottom-0 right-0 w-72 h-40 opacity-80 pointer-events-none">
                  <img
                    src={palierActuel.image}
                    alt={palierActuel.nom}
                    className="w-full h-full object-contain object-right-bottom drop-shadow-2xl"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                  />
                  {/* fallback SVG */}
                  <svg viewBox="0 0 100 90" className="absolute inset-0 w-full h-full opacity-10"
                    style={{ color: palierActuel.color, fill: 'currentColor' }}>
                    <path d={SILHOUETTES[palierActuel.shape]} />
                  </svg>
                </div>

                <div className="relative z-10 p-8 sm:p-10">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                    <div className="flex-1">
                      <span className="text-xs font-bold tracking-widest uppercase mb-2 block"
                        style={{ color: palierActuel.color }}>
                        {palierActuel.tag}
                      </span>
                      <h2 className="text-3xl sm:text-4xl font-black text-white mb-1">{palierActuel.nom}</h2>
                      <p className="text-5xl font-black mb-4"
                        style={{ color: palierActuel.color }}>
                        {formatEur(palierActuel.montant)}
                      </p>

                      {/* Progress */}
                      <div className="max-w-xs">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-white/50">Progression</span>
                          <span className="font-bold" style={{ color: palierActuel.color }}>
                            {progressPctCourant.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPctCourant}%` }}
                            transition={{ duration: 2, delay: 1, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full relative overflow-hidden"
                            style={{ background: `linear-gradient(90deg, ${palierActuel.color}80, ${palierActuel.color})` }}
                          >
                            <div className="absolute inset-0 w-1/2 bg-white/20"
                              style={{ animation: 'shimmer 2s linear infinite' }} />
                          </motion.div>
                        </div>
                        <p className="text-white/40 text-xs mt-2">
                          Reste <span className="text-white/80 font-semibold">{formatEur(montantRestant)}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── GRILLE DES PALIERS ────────────────────────────────────────── */}
          <div className="mb-16">
            <p className="text-xs font-bold tracking-widest text-white/30 uppercase text-center mb-8">
              Tous les niveaux
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PALIERS.map((palier, i) => (
                <div key={palier.montant}
                  className={palier.special ? 'sm:col-span-2 lg:col-span-3' : ''}
                  style={palier.special ? { animation: 'goldAura 3s ease-in-out infinite' } : {}}
                >
                  <CarCard
                    palier={palier}
                    statut={getStatut(palier)}
                    montantActuel={montantActuel}
                    index={i}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── GARAGE ───────────────────────────────────────────────────── */}
          {voituresDebloquees.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-10"
            >
              <p className="text-xs font-bold tracking-widest text-white/30 uppercase text-center mb-6">
                🏆 Ton garage — {voituresDebloquees.length} niveau{voituresDebloquees.length > 1 ? 'x' : ''} débloqué{voituresDebloquees.length > 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                {voituresDebloquees.map((p) => (
                  <motion.div
                    key={p.montant}
                    whileHover={{ scale: 1.05, y: -4 }}
                    className="px-5 py-3 rounded-2xl border text-sm font-semibold flex items-center gap-2"
                    style={{
                      background: `${p.glow.replace('0.5', '0.12')}`,
                      borderColor: `${p.color}40`,
                      color: p.color,
                      boxShadow: `0 0 20px ${p.glow.replace('0.5', '0.2')}`,
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {p.nom}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Objectif final atteint */}
          {montantActuel >= PALIERS[PALIERS.length - 1].montant && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <div className="text-6xl mb-4">👑</div>
              <h2 className="text-4xl font-black text-yellow-400 mb-2">Légende absolue</h2>
              <p className="text-white/50">Tu as atteint le niveau maximum. Félicitations.</p>
            </motion.div>
          )}

        </div>
      </div>
    </>
  )
}
