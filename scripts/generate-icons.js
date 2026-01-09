/**
 * Generate PNG icons from SVG for PWA manifest
 * Creates 192x192 and 512x512 PNG icons with dark background
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const publicDir = path.join(rootDir, 'public')
const svgPath = path.join(publicDir, 'dguild-logo-p2p.svg')

// Check if sharp is available, if not, provide instructions
let sharp
try {
  sharp = (await import('sharp')).default
} catch (err) {
  console.error('\n❌ Error: sharp package is required to generate PNG icons')
  console.error('Please install it by running: npm install --save-dev sharp\n')
  process.exit(1)
}

// Dark background color (matching the app's background)
const darkBackground = '#0a0a0f'

async function generateIcon(size, outputPath) {
  try {
    // Read SVG
    const svgBuffer = fs.readFileSync(svgPath)
    
    // Create a square canvas with dark background
    const canvas = sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: darkBackground
      }
    })
    
    // Load and resize SVG to fit within the canvas (with padding)
    const svgSize = Math.floor(size * 0.8)
    const padding = Math.floor(size * 0.1)
    
    const svg = sharp(svgBuffer)
      .resize(svgSize, svgSize, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
    
    // Composite SVG onto dark background (centered)
    const composite = await canvas
      .composite([{
        input: await svg.toBuffer(),
        top: padding,
        left: padding
      }])
      .png()
      .toFile(outputPath)
    
    console.log(`✅ Generated ${size}x${size} icon: ${path.relative(rootDir, outputPath)}`)
    return composite
  } catch (error) {
    console.error(`❌ Error generating ${size}x${size} icon:`, error.message)
    throw error
  }
}

async function main() {
  console.log('\n🎨 Generating PWA icons from SVG...\n')
  
  // Check if SVG exists
  if (!fs.existsSync(svgPath)) {
    console.error(`❌ SVG file not found: ${svgPath}`)
    process.exit(1)
  }
  
  // Generate icons
  const sizes = [192, 512]
  const iconNames = ['android-chrome-192x192.png', 'android-chrome-512x512.png']
  
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i]
    const outputPath = path.join(publicDir, iconNames[i])
    await generateIcon(size, outputPath)
  }
  
  console.log('\n✨ Icon generation complete!\n')
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error)
  process.exit(1)
})
