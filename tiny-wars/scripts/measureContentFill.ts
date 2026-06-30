/**
 * Prints alpha-trim content fill for card idle sheets (frame 0).
 * Requires ImageMagick (`magick` on PATH).
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { CARD_ASSET_BUNDLES } from '../src/data/AssetManifest.ts'
import { MEASURED_CONTENT_FILL } from '../src/data/MeasuredContentFill.ts'

const PUBLIC = resolve(import.meta.dirname, '../public')

function trimFill(imagePath: string, fw: number, fh: number): number | null {
  if (!existsSync(imagePath)) return null
  const tmp = `/tmp/content_fill_${process.pid}.png`
  execSync(`magick "${imagePath}" -crop ${fw}x${fh}+0+0 +repage "${tmp}"`, { stdio: 'pipe' })
  const trimH = Number(execSync(`magick "${tmp}" -alpha on -trim -format "%h" info:`, { encoding: 'utf8' }).trim())
  if (!Number.isFinite(trimH) || trimH <= 0) return null
  return Math.round((trimH / fh) * 100) / 100
}

function main(): void {
  console.log('cardId\tframe\tmeasured\tmanifest')
  for (const bundle of CARD_ASSET_BUNDLES) {
    const sheet = bundle.player.idle.sheet
    const fw = sheet.frameWidth ?? 192
    const fh = sheet.frameHeight ?? 192
    const path = resolve(PUBLIC, sheet.path)
    const measured = trimFill(path, fw, fh)
    const manifest = bundle.contentFill ?? '—'
    const expected = MEASURED_CONTENT_FILL[bundle.cardId as keyof typeof MEASURED_CONTENT_FILL]
    const flag = measured != null && expected != null && measured !== expected ? ' ← drift' : ''
    console.log(`${bundle.cardId}\t${fw}×${fh}\t${measured ?? 'MISSING'}\t${manifest}${flag}`)
  }
}

main()
