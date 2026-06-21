import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const desktopRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const iconPaths = [
  resolve(desktopRoot, 'build/icon.ico'),
  resolve(desktopRoot, 'dist/assets/icon.ico'),
]

const icon = createIco([
  createIconBitmap(16),
  createIconBitmap(24),
  createIconBitmap(32),
  createIconBitmap(48),
  createIconBitmap(64),
  createIconBitmap(128),
  createIconBitmap(256),
])

await Promise.all(iconPaths.map(async (path) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, icon)
}))

function createIconBitmap(size) {
  const pixels = new Uint8Array(size * size * 4)
  const inset = Math.max(1, Math.round(size * 0.04))
  const outerRadius = Math.round(size * 0.16)
  const innerInset = Math.round(size * 0.14)
  const innerRadius = Math.round(size * 0.1)
  const stroke = Math.max(2, Math.round(size * 0.075))
  const bar = Math.max(2, Math.round(size * 0.095))
  const dark = [55, 52, 53, 255]
  const transparent = [0, 0, 0, 0]

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const insideOuter = roundedRect(x, y, inset, inset, size - inset * 2, size - inset * 2, outerRadius)
      const insideInner = roundedRect(x, y, innerInset, innerInset, size - innerInset * 2, size - innerInset * 2, innerRadius)
      const insideInnerHole = roundedRect(
        x,
        y,
        innerInset + stroke,
        innerInset + stroke,
        size - (innerInset + stroke) * 2,
        size - (innerInset + stroke) * 2,
        Math.max(0, innerRadius - stroke),
      )

      const verticalLeft = x >= Math.round(size * 0.28) && x <= Math.round(size * 0.28) + bar
      const verticalRight = x >= Math.round(size * 0.64) && x <= Math.round(size * 0.64) + bar
      const horizontalTop = y >= Math.round(size * 0.28) && y <= Math.round(size * 0.28) + bar
      const horizontalBottom = y >= Math.round(size * 0.64) && y <= Math.round(size * 0.64) + bar
      const barBounds = x >= Math.round(size * 0.18) && x <= Math.round(size * 0.82)
        && y >= Math.round(size * 0.18) && y <= Math.round(size * 0.82)

      const draw = (insideOuter && !insideInner)
        || (insideInner && !insideInnerHole)
        || (barBounds && (verticalLeft || verticalRight || horizontalTop || horizontalBottom))
      setPixel(pixels, size, x, y, draw ? dark : transparent)
    }
  }

  return { width: size, height: size, bgra: pixels }
}

function roundedRect(x, y, left, top, width, height, radius) {
  const right = left + width - 1
  const bottom = top + height - 1
  const cx = x < left + radius ? left + radius : x > right - radius ? right - radius : x
  const cy = y < top + radius ? top + radius : y > bottom - radius ? bottom - radius : y
  const dx = x - cx
  const dy = y - cy
  return x >= left && x <= right && y >= top && y <= bottom && dx * dx + dy * dy <= radius * radius
}

function setPixel(pixels, size, x, y, rgba) {
  const index = (y * size + x) * 4
  pixels[index] = rgba[2]
  pixels[index + 1] = rgba[1]
  pixels[index + 2] = rgba[0]
  pixels[index + 3] = rgba[3]
}

function createIco(images) {
  const headerSize = 6
  const directorySize = images.length * 16
  const entries = []
  const imageBuffers = []
  let offset = headerSize + directorySize

  for (const image of images) {
    const bitmap = createBitmapInfo(image)
    imageBuffers.push(bitmap)
    entries.push({ image, size: bitmap.length, offset })
    offset += bitmap.length
  }

  const output = Buffer.alloc(offset)
  output.writeUInt16LE(0, 0)
  output.writeUInt16LE(1, 2)
  output.writeUInt16LE(images.length, 4)

  entries.forEach((entry, index) => {
    const position = headerSize + index * 16
    output[position] = entry.image.width >= 256 ? 0 : entry.image.width
    output[position + 1] = entry.image.height >= 256 ? 0 : entry.image.height
    output[position + 2] = 0
    output[position + 3] = 0
    output.writeUInt16LE(1, position + 4)
    output.writeUInt16LE(32, position + 6)
    output.writeUInt32LE(entry.size, position + 8)
    output.writeUInt32LE(entry.offset, position + 12)
  })

  let imageOffset = headerSize + directorySize
  for (const bitmap of imageBuffers) {
    bitmap.copy(output, imageOffset)
    imageOffset += bitmap.length
  }

  return output
}

function createBitmapInfo({ width, height, bgra }) {
  const headerSize = 40
  const xorSize = width * height * 4
  const maskStride = Math.ceil(width / 32) * 4
  const maskSize = maskStride * height
  const output = Buffer.alloc(headerSize + xorSize + maskSize)

  output.writeUInt32LE(headerSize, 0)
  output.writeInt32LE(width, 4)
  output.writeInt32LE(height * 2, 8)
  output.writeUInt16LE(1, 12)
  output.writeUInt16LE(32, 14)
  output.writeUInt32LE(0, 16)
  output.writeUInt32LE(xorSize + maskSize, 20)
  output.writeInt32LE(0, 24)
  output.writeInt32LE(0, 28)
  output.writeUInt32LE(0, 32)
  output.writeUInt32LE(0, 36)

  for (let y = 0; y < height; y += 1) {
    const sourceY = height - 1 - y
    const sourceStart = sourceY * width * 4
    const targetStart = headerSize + y * width * 4
    Buffer.from(bgra.buffer, bgra.byteOffset + sourceStart, width * 4).copy(output, targetStart)
  }

  return output
}
