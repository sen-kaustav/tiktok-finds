// Copies the classified CSV from the data pipeline into the app's public folder so the
// app can fetch it. Runs automatically before `dev` and `build`.
import { copyFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const src = resolve(here, '../../02_Data_Cleansing/classified_videos.csv')
const dest = resolve(here, '../public/data/videos.csv')

if (!existsSync(src)) {
  console.error(`Missing ${src}. Run /classify-videos first.`)
  process.exit(1)
}
mkdirSync(dirname(dest), { recursive: true })
copyFileSync(src, dest)
console.log('Synced classified_videos.csv -> public/data/videos.csv')
