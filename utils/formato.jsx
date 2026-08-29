export function renderBold(text) {
  if (!text) return ''
  const parts = String(text).split(/\*\*(.+?)\*\*/g)
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))
}