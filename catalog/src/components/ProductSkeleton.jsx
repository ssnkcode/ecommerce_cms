export default function ProductSkeleton({ count = 8 }) {
  return (
    <div className="cat-skeleton-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div className="cat-skeleton-card" key={i}>
          <div className="cat-skeleton-img" />
          <div className="cat-skeleton-lines">
            <div className="cat-skeleton-line w60" />
            <div className="cat-skeleton-line w90" />
            <div className="cat-skeleton-line w40" />
          </div>
        </div>
      ))}
    </div>
  )
}