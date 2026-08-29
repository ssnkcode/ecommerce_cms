import React from 'react'
import ReactDOM from 'react-dom/client'
import CatalogApp from './CatalogApp.jsx'
import './src/css/catalog.css'

ReactDOM.createRoot(document.getElementById('catalog-root')).render(
  <React.StrictMode>
    <CatalogApp />
  </React.StrictMode>,
)
