// Entry point para Vercel Serverless Functions (Express).
// El resto de peticiones las maneja vercel.json mediante rewrites.
import 'dotenv/config'
import app from '../src/app.mjs'

export default app