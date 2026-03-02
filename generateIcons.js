const fs = require('fs');
const { createCanvas } = require('canvas');

function generateIcon(size, name) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#f4845f';
    ctx.fillRect(0, 0, size, size);

    // 2x2 grid centered
    const squareSize = size * 0.2;
    const gap = size * 0.05;
    const totalSize = squareSize * 2 + gap;

    const startX = (size - totalSize) / 2;
    const startY = (size - totalSize) / 2;

    ctx.fillStyle = '#ffffff';
    // top left
    ctx.fillRect(startX, startY, squareSize, squareSize);
    // top right
    ctx.fillRect(startX + squareSize + gap, startY, squareSize, squareSize);
    // bottom left
    ctx.fillRect(startX, startY + squareSize + gap, squareSize, squareSize);
    // bottom right
    ctx.fillRect(startX + squareSize + gap, startY + squareSize + gap, squareSize, squareSize);

    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`public/${name}`, buffer);
    console.log(`Generated public/${name}`);
}

generateIcon(180, 'apple-touch-icon.png');
generateIcon(192, 'icon-192.png');
generateIcon(512, 'icon-512.png');
