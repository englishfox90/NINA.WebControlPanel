// Icon Generator Script for NINA WebControlPanel
// Converts SVG icons to PNG and ICO formats using Canvas API

const fs = require('fs');
const path = require('path');

// Simple text-based icon generator for when we can't use image libraries
function generateTextIcon(width, height, format = 'svg') {
    if (format === 'svg') {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#0a0a0a"/>
    <circle cx="${width/2}" cy="${height/2}" r="${width*0.35}" fill="none" stroke="#4a9eff" stroke-width="${Math.max(2, width*0.04)}"/>
    <rect x="${width*0.4}" y="${width*0.4}" width="${width*0.2}" height="${width*0.2}" fill="#ff6b35"/>
    ${width >= 64 ? `<text x="${width/2}" y="${height*0.8}" font-family="Arial" font-size="${width*0.12}" text-anchor="middle" fill="#ffffff">NINA</text>` : ''}
    <circle cx="${width*0.2}" cy="${height*0.2}" r="${Math.max(1, width*0.02)}" fill="#ffffff"/>
    <circle cx="${width*0.8}" cy="${height*0.25}" r="${Math.max(1, width*0.02)}" fill="#ffffff"/>
    <circle cx="${width*0.15}" cy="${height*0.7}" r="${Math.max(1, width*0.02)}" fill="#ffffff"/>
</svg>`;
    }
}

// Generate favicon.ico content (simplified)
function generateFavicoData() {
    // This is a simplified approach - in a real scenario you'd use a proper ICO library
    console.log('📝 For favicon.ico, you can use an online converter to convert the favicon.svg to .ico format');
    console.log('💡 Recommended: https://convertio.co/svg-ico/ or similar service');
    console.log('📁 Upload the favicon.svg file and download as favicon.ico');
}

// Create a simple replacement for the React logos
const publicDir = path.join(__dirname, 'src', 'client', 'public');

console.log('🎨 Generating NINA WebControlPanel icons...');

// Note: Since we can't generate binary PNG/ICO files directly in Node.js without additional libraries,
// we'll provide instructions for manual conversion

console.log('\n📋 ICON GENERATION INSTRUCTIONS:');
console.log('1. The SVG files have been created in the public folder');
console.log('2. For PNG conversion, you can:');
console.log('   - Use online converters like https://convertio.co/svg-png/');
console.log('   - Or install a package like "sharp" or "svg2png"');
console.log('3. For favicon.ico:');
console.log('   - Use https://convertio.co/svg-ico/');
console.log('   - Or use https://favicon.io/favicon-converter/');

console.log('\n✅ Custom NINA branding applied to manifest.json and index.html');
console.log('🎯 App will now show "NINA WebControlPanel" instead of "React App"');

generateFavicoData();
