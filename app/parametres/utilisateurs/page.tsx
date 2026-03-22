'use client'

import { useState, useEffect } from 'react'

interface User {
  id: number
  email: string
  nom: string
  role: string
  actif: boolean
  createdAt: string
}

export default function UtilisateursPage() {
  const [users, setUsers] = useState<User[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [form, setForm] = useState({ nom: '', email: '', motDePasse: '', role: 'admin' })

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    const res = await fetch('/api/users')
    const data = await res.json()
    setUsers(data)
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    if (res.ok) {
      setShowModal(false)
      setForm({ nom: '', email: '', motDePasse: '', role: 'admin' })
      fetchUsers()
    } else {
      const data = await res.json()
      setError(data.error || 'Erreur lors de la création')
    }
    setSaving(false)
  }

  async function toggleActif(user: User) {
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !user.actif }),
    })
    fetchUsers()
  }

  async function handleDelete(id: number) {
    setDeleteError('')
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setConfirmDeleteId(null)
      fetchUsers()
    } else {
      const data = await res.json()
      setDeleteError(data.error || 'Erreur lors de la suppression')
      setConfirmDeleteId(null)
    }
  }

  return (
    <div className="page-enter p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
            <p className="text-sm text-white/40 mt-1">Gérez les accès à l&apos;application</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
            Nouvel utilisateur
          </button>
        </div>

        {/* Erreur suppression */}
        {deleteError && (
          <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {deleteError}
            <button onClick={() => setDeleteError('')} className="ml-auto text-red-400/50 hover:text-red-400">✕</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-[#13131c] border border-white/5 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="skeleton w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-4 w-40 ml-4" />
                  <div className="skeleton h-5 w-16 rounded-full ml-4" />
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-white/30">Aucun utilisateur</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-white/30 uppercase tracking-wider">Nom</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-white/30 uppercase tracking-wider">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-white/30 uppercase tracking-wider">Rôle</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-white/30 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-4" />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-600/20 border border-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">
                          {user.nom.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-white">{user.nom}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-white/60">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleActif(user)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
                          user.actif
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                        }`}
                      >
                        {user.actif ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setConfirmDeleteId(user.id)}
                        className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none">
                          <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal confirmation suppression */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative bg-[#13131c] border border-white/8 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Supprimer l&apos;utilisateur ?</p>
                <p className="text-xs text-white/40 mt-0.5">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-2 rounded-xl border border-white/8 text-white/60 hover:text-white hover:bg-white/5 text-sm transition-colors">
                Annuler
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#13131c] border border-white/8 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-5">Nouvel utilisateur</h2>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">Nom</label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-purple-500/50 focus:bg-purple-500/5 transition-colors"
                  placeholder="Jean Dupont"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-purple-500/50 focus:bg-purple-500/5 transition-colors"
                  placeholder="jean@amluxe.fr"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-wider mb-1.5">Mot de passe</label>
                <input
                  type="password"
                  value={form.motDePasse}
                  onChange={(e) => setForm({ ...form, motDePasse: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/5 border border-white/8 rounded-xl text-white text-sm outline-none focus:border-purple-500/50 focus:bg-purple-500/5 transition-colors"
                  placeholder="Minimum 8 caractères"
                  minLength={8}
                  required
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/8 text-white/60 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-medium transition-colors"
                >
                  {saving ? 'Création...' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
