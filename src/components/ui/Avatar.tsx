interface AvatarProps {
  photo?: string | null
  name?: string
  size?: number
  className?: string
}

const getFileUrl = (path: string | null) => {
  if (!path) return ""
  if (path.startsWith("http") || path.startsWith("data:")) return path
  const normalized = path.replace(/\\/g, "/")
  const idx = normalized.indexOf("uploads/")
  if (idx !== -1) {
    const rel = normalized.substring(idx)
    let root = (
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api/"
    ).replace(/\/api\/?$/, "")
    if (root.endsWith("/")) {
      root = root.slice(0, -1)
    }
    return `${root}/${rel}`
  }
  return path
}

export function Avatar({ photo, name = '?', size = 32, className = '' }: AvatarProps) {
  if (photo) {
    const resolvedPhoto = getFileUrl(photo)
    return (
      <img
        src={resolvedPhoto}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }

  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')

  return (
    <div
      className={`
        rounded-full flex items-center justify-center
        bg-gold-dim border border-border
        font-bold text-gold
        ${className}
      `}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.35,
      }}
    >
      {initials}
    </div>
  )
}
