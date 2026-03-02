// scripts/testImages.ts
// Run with: npx ts-node --compiler-options '{"module":"commonjs","esModuleInterop":true}' scripts/testImages.ts

import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import {
    suggestGridSizes,
    downsampleGreyscale,
    otsuThreshold,
    smartThreshold,
    generateAllClues,
    scoreSolvability,
    rateDifficulty
} from '../lib/imageToNonogram';

const TEST_IMAGES = [
    { file: '01-portrait.jpg', desc: 'Portrait/selfie', expectedRatio: '3:4' },
    { file: '02-dog.jpg', desc: 'Dog/pet', expectedRatio: '4:3' },
    { file: '03-cat.jpg', desc: 'Cat', expectedRatio: '4:3' },
    { file: '04-food.jpg', desc: 'Food from above', expectedRatio: '1:1' },
    { file: '05-landscape.jpg', desc: 'Landscape panoramic', expectedRatio: '16:9' },
    { file: '06-group.jpg', desc: 'Group of people', expectedRatio: '4:3' },
    { file: '07-night.jpg', desc: 'Night/dark photo', expectedRatio: '3:4' },
    { file: '08-object.jpg', desc: 'Simple object', expectedRatio: '4:3' },
    { file: '09-architecture.jpg', desc: 'Architecture/building', expectedRatio: '4:3' },
    { file: '10-baby.jpg', desc: 'Baby/child', expectedRatio: '4:3' },
];

interface TestResult {
    image: string;
    description: string;
    imageDimensions: string;
    actualAspectRatio: string;
    gridOptions: {
        label: string;
        cols: number;
        rows: number;
        fillRatio: number;
        isBestPick: boolean;
        warnings: string[];
        solvability: number;
    }[];
    otsuThreshold: number;
    passed: boolean;
    failures: string[];
}

async function runTests() {
    console.log('═══════════════════════════════════════');
    console.log('REVELIO IMAGE PROCESSING TEST REPORT');
    console.log('═══════════════════════════════════════\n');

    let totalPassed = 0;
    const allResults: TestResult[] = [];

    for (const test of TEST_IMAGES) {
        const imgPath = path.join(__dirname, '../public/test-images', test.file);
        if (!fs.existsSync(imgPath)) {
            console.error(`Missing image: ${test.file}`);
            continue;
        }

        const image = sharp(imgPath);
        const metadata = await image.metadata();
        const width = metadata.width || 0;
        const height = metadata.height || 0;
        const actualRatio = width / height;

        // Get raw RGBA pixels
        const { data: pixels } = await image.raw().toBuffer({ resolveWithObject: true });

        const options = suggestGridSizes(width, height);
        const results: TestResult['gridOptions'] = [];

        let currentOtsu = 0;

        for (const opt of options) {
            const greyscale = downsampleGreyscale(pixels, width, height, opt.cols, opt.rows);
            const { grid: initialGrid, baseThreshold: otsuT } = smartThreshold(greyscale);
            currentOtsu = otsuT;
            const { grid, fillRatio } = smartThreshold(greyscale);
            const { rowClues, colClues } = generateAllClues(grid);
            const solvability = scoreSolvability(rowClues, colClues, opt.rows, opt.cols);

            results.push({
                label: opt.label,
                cols: opt.cols,
                rows: opt.rows,
                fillRatio: parseFloat(fillRatio.toFixed(2)),
                isBestPick: opt.isBestPick || false,
                warnings: [],
                solvability
            });
        }

        const failures: string[] = [];

        // Validation Rules
        const bestPick = results.find(r => r.isBestPick);
        if (!bestPick) failures.push('No Best Pick marked');

        if (test.desc === 'Night/dark photo' && bestPick && bestPick.fillRatio > 0.85) {
            failures.push('Night photo produced all-filled grid');
        }

        if (results.some(r => Math.min(r.cols, r.rows) < 4)) {
            failures.push('Grid option too small (<4 cells)');
        }

        if (results.some(r => Math.max(r.cols, r.rows) > 30)) {
            failures.push('Grid option too large (>30 cells)');
        }

        const passed = failures.length === 0;
        if (passed) totalPassed++;

        const result: TestResult = {
            image: test.file,
            description: test.desc,
            imageDimensions: `${width}×${height}px`,
            actualAspectRatio: actualRatio.toFixed(2),
            gridOptions: results,
            otsuThreshold: currentOtsu,
            passed,
            failures
        };

        allResults.push(result);

        console.log(`IMAGE: ${test.desc} (${test.file})`);
        console.log(`  Dimensions: ${result.imageDimensions}`);
        console.log(`  Aspect Ratio: ${result.actualAspectRatio}`);
        console.log(`  Grid Options:`);
        results.forEach(r => {
            console.log(`    ${r.label.padEnd(10)} ${r.cols}×${r.rows}  Fill: ${r.fillRatio}  Solvable: ${r.solvability}% ${r.isBestPick ? '← Best' : ''}`);
        });
        console.log(`  Otsu Threshold: ${result.otsuThreshold}`);
        console.log(`  Validation: ${passed ? '✅ PASSED' : '❌ FAILED: ' + failures.join(', ')}`);
        console.log('');
    }

    console.log('═══════════════════════════════════════');
    console.log('SUMMARY');
    console.log(`  Images tested: ${allResults.length}/10`);
    console.log(`  All validations passed: ${totalPassed}/${allResults.length}`);
    console.log('═══════════════════════════════════════');

    // Create report artifact
    const reportContent = allResults.map(res => `
### IMAGE: ${res.description} (${res.image})
- **Dimensions**: ${res.imageDimensions}
- **Aspect Ratio**: ${res.actualAspectRatio}
- **Status**: ${res.passed ? '✅ PASSED' : '❌ FAILED'}
${res.failures.length ? '- **Failures**: ' + res.failures.join(', ') : ''}
| Grid | Size | Fill Ratio | Solvability | Result |
|------|------|------------|-------------|--------|
${res.gridOptions.map(o => `| ${o.label} | ${o.cols}×${o.rows} | ${o.fillRatio} | ${o.solvability}% | ${o.isBestPick ? '**Best**' : '✓'} |`).join('\n')}
`).join('\n---\n');

    fs.writeFileSync(path.join(__dirname, '../image_test_report.md'), `
# Revelio Image Processing Test Report

${reportContent}

## Summary
- Images tested: ${allResults.length}/10
- Passed: ${totalPassed}/${allResults.length}
`);
}

runTests().catch(console.error);
