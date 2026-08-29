export default function CatalogToolbar({ search, onSearch, category, onCategory, categories }) {
  return (
    <div className="cat-toolbar">
      <label className="cat-search">
        <svg
          className="cat-search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Buscar productos..."
          aria-label="Buscar productos"
        />
        {search && (
          <button className="cat-search-clear" onClick={() => onSearch('')} aria-label="Limpiar búsqueda">
            &times;
          </button>
        )}
      </label>

      <div className="cat-chips" aria-label="Filtrar por categoría">
        <button
          type="button"
          className={`cat-chip ${category === 'all' ? 'active' : ''}`}
          onClick={() => onCategory('all')}
        >
          Todos
        </button>
        {categories.map((c) => (
          <button
            type="button"
            key={c}
            className={`cat-chip ${category === c ? 'active' : ''}`}
            onClick={() => onCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}