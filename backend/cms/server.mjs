import 'dotenv/config'
import app from './src/app.mjs'

const PORT = Number(process.env.PORT) || 3001
app.listen(PORT, '0.0.0.0', () => {
  console.log(`CMS API escuchando en http://localhost:${PORT}`)
  console.log(`  Health: http://localhost:${PORT}/api/health`)
  console.log(`  Red local: http://192.168.56.1:${PORT}/api/health`)
})