'use client'

import Modal from './Modal'

interface Shortcut {
  key: string
  label: string
}

interface Props {
  shortcuts: Shortcut[]
  onClose: () => void
}

export default function ShortcutsHelp({ shortcuts, onClose }: Props) {
  return (
    <Modal title="Raccourcis clavier" onClose={onClose} size="md">
      <div className="space-y-1.5">
        {shortcuts.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-1.5">
            <span className="text-sm text-white/70">{label}</span>
            <kbd className="px-2 py-0.5 bg-white/8 border border-white/15 rounded text-xs font-mono text-white/60">
              {key}
            </kbd>
          </div>
        ))}
        <p className="text-xs text-white/30 pt-2 border-t border-white/8 mt-2">
          Les raccourcis sont inactifs quand un champ de saisie est sélectionné.
        </p>
      </div>
    </Modal>
  )
}
