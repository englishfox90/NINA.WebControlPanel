/**
 * Generate Icon Script
 * 
 * Generates all necessary icon sizes from Icon.png with rounded corners
 * Following the "liquid glass" aesthetic with 14px radius (12px-16px range)
 * 
 * Required sizes:
 * - favicon.ico (16x16, 32x32, 48x48)
 * - favicon.svg (with radius)
 * - logo192.png (192x192)
 * - logo512.png (512x512)
 * - Apple touch icons (180x180)
 * - Windows tiles (various sizes)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Icon sizes needed
const SIZES = {
  favicon: [16, 32, 48],
  pwa: [192, 512],
  apple: [180],
  windows: [70, 150, 310],
  standard: [64, 128, 256]
};

// Radius for rounded corners (liquid glass aesthetic)
const CORNER_RADIUS = 14; // 14px is middle of 12-16px range

const SOURCE_PNG = path.join(__dirname, '../../src/client/public/Icon.png');
const OUTPUT_DIR = path.join(__dirname, '../../src/client/public');

console.log('🎨 Generating icons with rounded corners...');
console.log(`📐 Corner radius: ${CORNER_RADIUS}px`);
console.log(`📁 Source: Icon.png`);
console.log('');

/**
 * Check if ImageMagick is available
 */
function checkImageMagick() {
  try {
    execSync('magick --version', { stdio: 'ignore' });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Generate PNG icons with rounded corners using ImageMagick
 */
function generatePngIcons() {
  console.log('');
  console.log('🖼️  Generating PNG icons with rounded corners...');
  
  const hasImageMagick = checkImageMagick();
  
  if (!hasImageMagick) {
    console.log('   ⚠️  ImageMagick not found - skipping PNG generation');
    console.log('');
    console.log('   To generate PNG files, install ImageMagick:');
    console.log('   Windows: https://imagemagick.org/script/download.php#windows');
    console.log('   Or run: npm run install-imagemagick');
    console.log('');
    // Still generate SVG even without ImageMagick
    generateSvgFavicon();
    return;
  }
  
  console.log('   Using ImageMagick for PNG generation...');
  console.log('');
  
  // Generate all size variants with rounded corners
  const allSizes = [...SIZES.favicon, ...SIZES.pwa, ...SIZES.apple, ...SIZES.windows, ...SIZES.standard];
  const uniqueSizes = [...new Set(allSizes)].sort((a, b) => a - b);
  
  uniqueSizes.forEach(size => {
    try {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);
      const radius = Math.round((size / 1024) * CORNER_RADIUS);
      
      // ImageMagick command to add rounded corners
      const cmd = `magick "${SOURCE_PNG}" -resize ${size}x${size} ` +
                  `( +clone -alpha extract -draw "fill black polygon 0,0 0,${radius} ${radius},0 fill white circle ${radius},${radius} ${radius},0" ` +
                  `( +clone -flip ) -compose Multiply -composite ` +
                  `( +clone -flop ) -compose Multiply -composite ) ` +
                  `-alpha off -compose CopyOpacity -composite "${outputPath}"`;
      
      execSync(cmd, { stdio: 'ignore' });
      console.log(`   ✅ icon-${size}.png (${size}x${size}, radius: ${radius}px)`);
    } catch (e) {
      console.log(`   ❌ Failed: icon-${size}.png - ${e.message}`);
    }
  });
  
  // Generate favicon.ico (multi-resolution)
  console.log('');
  console.log('   Generating multi-resolution favicon.ico...');
  try {
    const tempFiles = SIZES.favicon.map(s => {
      const temp = path.join(OUTPUT_DIR, `temp-${s}.png`);
      const radius = Math.round((s / 1024) * CORNER_RADIUS);
      
      const cmd = `magick "${SOURCE_PNG}" -resize ${s}x${s} ` +
                  `( +clone -alpha extract -draw "fill black polygon 0,0 0,${radius} ${radius},0 fill white circle ${radius},${radius} ${radius},0" ` +
                  `( +clone -flip ) -compose Multiply -composite ` +
                  `( +clone -flop ) -compose Multiply -composite ) ` +
                  `-alpha off -compose CopyOpacity -composite "${temp}"`;
      
      execSync(cmd, { stdio: 'ignore' });
      return temp;
    });
    
    const icoPath = path.join(OUTPUT_DIR, 'favicon.ico');
    execSync(`magick ${tempFiles.join(' ')} "${icoPath}"`, { stdio: 'ignore' });
    
    // Clean up temp files
    tempFiles.forEach(f => fs.unlinkSync(f));
    
    console.log(`   ✅ favicon.ico (${SIZES.favicon.join('x')})`);
  } catch (e) {
    console.log(`   ❌ Failed to create favicon.ico: ${e.message}`);
  }
  
  // Generate SVG version
  generateSvgFavicon();
}

/**
 * Generate SVG favicon with rounded corners (doesn't require ImageMagick)
 */
function generateSvgFavicon() {
  console.log('');
  console.log('   Generating SVG favicon...');
  try {
    const svgPath = path.join(OUTPUT_DIR, 'favicon.svg');
    const radius = CORNER_RADIUS;
    
    // Convert PNG to embedded SVG with rounded corners
    const pngData = fs.readFileSync(SOURCE_PNG);
    const base64 = pngData.toString('base64');
    
    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <clipPath id="roundedCorners">
      <rect width="1024" height="1024" rx="${radius}" ry="${radius}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#roundedCorners)">
    <image width="1024" height="1024" xlink:href="data:image/png;base64,${base64}"/>
  </g>
</svg>`;
    
    fs.writeFileSync(svgPath, svgContent);
    console.log(`   ✅ favicon.svg (with rounded corners)`);
  } catch (e) {
    console.log(`   ❌ Failed to create favicon.svg: ${e.message}`);
  }
}

/**
 * Generate manifest.json with new icons
 */
function updateManifest() {
  console.log('');
  console.log('📱 Updating manifest.json...');
  
  const manifestPath = path.join(OUTPUT_DIR, 'manifest.json');
  let manifest = {};
  
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
  
  manifest.icons = [
    {
      src: "icon-192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable"
    },
    {
      src: "icon-512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable"
    }
  ];
  
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('   ✅ Updated manifest.json');
}

/**
 * Generate HTML snippet for index.html
 */
function generateHtmlSnippet() {
  console.log('');
  console.log('📝 HTML snippet for index.html:');
  console.log('');
  console.log('<!-- Favicon with rounded corners -->');
  console.log('<link rel="icon" type="image/svg+xml" href="%PUBLIC_URL%/favicon.svg" />');
  console.log('<link rel="icon" type="image/x-icon" href="%PUBLIC_URL%/favicon.ico" />');
  console.log('');
  console.log('<!-- Apple Touch Icon -->');
  console.log('<link rel="apple-touch-icon" href="%PUBLIC_URL%/icon-180.png" />');
  console.log('');
  console.log('<!-- PWA Icons -->');
  console.log('<link rel="manifest" href="%PUBLIC_URL%/manifest.json" />');
  console.log('');
  console.log('<!-- Windows Tiles -->');
  console.log('<meta name="msapplication-TileImage" content="%PUBLIC_URL%/icon-150.png" />');
  console.log('<meta name="msapplication-TileColor" content="#0F1117" />');
}

// Main execution
try {
  // Verify source file exists
  if (!fs.existsSync(SOURCE_PNG)) {
    console.error('❌ Error: Icon.png not found at:', SOURCE_PNG);
    console.log('');
    console.log('Please ensure Icon.png exists in src/client/public/');
    process.exit(1);
  }
  
  console.log('Starting icon generation...');
  console.log('━'.repeat(50));
  console.log('');
  
  generatePngIcons();
  updateManifest();
  generateHtmlSnippet();
  
  console.log('');
  console.log('━'.repeat(50));
  console.log('✨ Icon generation complete!');
  console.log('');
  console.log('📁 Generated files in:', OUTPUT_DIR);
  console.log('');
  console.log('Next steps:');
  console.log('1. Check the generated icons in src/client/public/');
  console.log('2. Update index.html with the HTML snippet above');
  console.log('3. Icons include rounded corners (14px radius)');
  console.log('');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
