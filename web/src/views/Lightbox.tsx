import type { ListingPhoto } from '../types.ts'

export function Lightbox({ photos, index, title, onClose, onChange }: {
  photos: ListingPhoto[]
  index: number
  title: string
  onClose: () => void
  onChange: (i: number) => void
}) {
  const photo = photos[index]
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        onClick={e => { e.stopPropagation(); onClose() }}
        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
        aria-label="Close"
      >
        ✕
      </button>
      {photos.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); onChange((index - 1 + photos.length) % photos.length) }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-lg font-semibold text-white hover:bg-white/20"
            aria-label="Previous photo"
          >
            ‹
          </button>
          <button
            onClick={e => { e.stopPropagation(); onChange((index + 1) % photos.length) }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-lg font-semibold text-white hover:bg-white/20"
            aria-label="Next photo"
          >
            ›
          </button>
        </>
      )}
      <img
        src={photo.url}
        alt={title}
        onClick={e => e.stopPropagation()}
        className="max-h-[92vh] max-w-[92vw] object-contain"
      />
      {photos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
          {index + 1} / {photos.length}
        </div>
      )}
    </div>
  )
}
