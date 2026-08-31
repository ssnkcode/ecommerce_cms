import 'dotenv/config'
import app from './src/app.mjs'

const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, () => {
  console.log(`CMS API escuchando en http://localhost:${PORT}`)
  console.log(`  Health: http://localhost:${PORT}/api/health`)
})