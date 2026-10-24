// Generates app icons in public/ from public/icon-source.png. Run: npm run icons
import sharp from 'sharp'

const src = 'public/icon-source.png'
const out = (name) => `public/${name}`

// Background color = mean of a patch near the top-left corner (the outermost pixels are slightly darker).
const patch = await sharp(src).extract({ left: 20, top: 20, width: 60, height: 60 }).png().toBuffer()
const { channels } = await sharp(patch).stats()
const [r, g, b] = channels.slice(0, 3).map((c) => Math.round(c.mean))
const background = { r, g, b, alpha: 1 }
const hex = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')

const resize = (size, name) => sharp(src).resize(size, size).png().toFile(out(name))

await resize(192, 'icon-192.png')
await resize(512, 'icon-512.png')
await resize(180, 'apple-touch-icon.png')
await resize(32, 'favicon-32.png')

// Maskable: image at ~72% centered, so Android's 80% safe zone keeps the whole heart.
const inner = Math.round(512 * 0.72)
await sharp({ create: { width: 512, height: 512, channels: 4, background } })
  .composite([{ input: await sharp(src).resize(inner, inner).png().toBuffer(), gravity: 'center' }])
  .png()
  .toFile(out('icon-maskable-512.png'))

console.log(`icons written, background ${hex}`)
