'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useUploadThing } from '@/lib/uploadthing'

interface Props {
  articleId: number
  photos: string[]
  onUpdate: (photos: string[]) => void
}

export default function PhotosArticle({ articleId, photos, onUpdate }: Props) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputId = `photo-upload-${articleId}`

  const { startUpload } = useUploadThing('articlePhoto')

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const result = await startUpload([file])
      if (!result?.[0]) {
        toast.error('Erreur lors du téléversement')
        return
      }
      const url = result[0].ufsUrl

      const res = await fetch(`/api/articles/${articleId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Erreur lors de l\'enregistrement')
        return
      }
      const { photos: updated } = await res.json()
      onUpdate(updated)
      toast.success('Photo ajoutée')
    } catch {
      toast.error('Erreur lors du téléversement')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (index: number) => {
    const res = await fetch(`/api/articles/${articleId}/photos`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ index }),
    })
    if (!res.ok) { toast.error('Erreur lors de la suppression'); return }
    const { photos: updated } = await res.json()
    onUpdate(updated)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {photos.map((photo, i) => (
          <div key={i} className="relative group w-20 h-20">
            <img
              src={photo}
              alt={`Photo ${i + 1}`}
              className="w-20 h-20 object-cover rounded-lg border border-white/10 cursor-pointer"
              onClick={() => setPreview(photo)}
            />
            <button
              type="button"
              onClick={() => handleDelete(i)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}
        {photos.length < 6 && (
          <label
            htmlFor={inputId}
            className={`w-20 h-20 border border-dashed border-white/15 rounded-lg flex flex-col items-center justify-center gap-1 text-white/30 hover:text-white/60 hover:border-white/30 transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs">Photo</span>
              </>
            )}
          </label>
        )}
      </div>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleUpload(file)
          e.target.value = ''
        }}
      />
      <p className="text-xs text-white/25">{photos.length}/6 photos • Max 2 Mo par photo</p>

      {/* Lightbox */}
      {preview && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <img src={preview} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white p-2"
            onClick={() => setPreview(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
