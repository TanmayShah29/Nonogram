/**
 * imageToNonogram.ts
 * ==================
 * Complete, smart image → nonogram puzzle conversion pipeline.
 * Drop this file into your Next.js /lib/ folder.
 *
 * Pipeline:
 *  1. Load image onto canvas → raw RGBA pixels
 *  2. Correct EXIF orientation (iPhone photos)
 *  3. Composite transparent PNGs onto white
 *  4. Convert to perceptual greyscale (luminance formula)
 *  5. Smart downsampling to target grid size (area averaging)
 *  6. Otsu's method for optimal threshold
 *  7. Fill ratio check + adaptive nudge
 *  8. Generate nonogram clues
 *  9. Solvability scoring
 * 10. Difficulty rating
 * 11. Smart grid size suggestions based on image aspect ratio
 */

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface GridOption {
    label: 'Sketch' | 'Simple' | 'Balanced' | 'Crisp' | 'Ultra'
    cols: number
    rows: number
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert'
    fillRatio?: number       // populated after preview generation
    isBestPick?: boolean
    warning?: string
    thresholdOffset?: number
}

export interface NonogramPuzzle {
    grid: number[][]         // 1 = filled, 0 = empty  [row][col]
    rowClues: number[][]
    colClues: number[][]
    rows: number
    cols: number
    difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert'
    difficultyScore: number  // 0–100
    solvabilityScore: number // 0–100, how many cells are immediately deterministic
    fillRatio: number        // 0–1
    threshold: number        // the Otsu threshold used
    warnings: string[]
}

export interface ProcessedImage {
    greyscale: number[][]    // [row][col], 0–255
    width: number
    height: number
    aspectRatio: number
}

// ─────────────────────────────────────────────
// STEP 1 — LOAD IMAGE FROM FILE
// ─────────────────────────────────────────────

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file)
        const img = new Image()
        img.onload = () => {
            URL.revokeObjectURL(url)
            resolve(img)
        }
        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = url
    })
}

// ─────────────────────────────────────────────
// STEP 2 — EXIF ORIENTATION CORRECTION
// iPhone photos are often rotated in metadata.
// We read the EXIF orientation tag and rotate the
// canvas accordingly before processing.
// ─────────────────────────────────────────────

async function getExifOrientation(file: File): Promise<number> {
    return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            const view = new DataView(e.target?.result as ArrayBuffer)
            if (view.getUint16(0, false) !== 0xFFD8) return resolve(1)
            let offset = 2
            while (offset < view.byteLength) {
                const marker = view.getUint16(offset, false)
                offset += 2
                if (marker === 0xFFE1) {
                    if (view.getUint32(offset += 2, false) !== 0x45786966) return resolve(1)
                    const little = view.getUint16(offset += 6, false) === 0x4949
                    offset += view.getUint32(offset + 4, little)
                    const tags = view.getUint16(offset, little)
                    offset += 2
                    for (let i = 0; i < tags; i++) {
                        if (view.getUint16(offset + i * 12, little) === 0x0112) {
                            return resolve(view.getUint16(offset + i * 12 + 8, little))
                        }
                    }
                } else if ((marker & 0xFF00) !== 0xFF00) break
                else offset += view.getUint16(offset, false)
            }
            resolve(1)
        }
        reader.readAsArrayBuffer(file.slice(0, 64 * 1024))
    })
}

function drawImageWithOrientation(
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    orientation: number,
    width: number,
    height: number
): void {
    ctx.save()
    switch (orientation) {
        case 2: ctx.transform(-1, 0, 0, 1, width, 0); break
        case 3: ctx.transform(-1, 0, 0, -1, width, height); break
        case 4: ctx.transform(1, 0, 0, -1, 0, height); break
        case 5: ctx.transform(0, 1, 1, 0, 0, 0); break
        case 6: ctx.transform(0, 1, -1, 0, height, 0); break
        case 7: ctx.transform(0, -1, -1, 0, height, width); break
        case 8: ctx.transform(0, -1, 1, 0, 0, width); break
    }
    ctx.drawImage(img, 0, 0)
    ctx.restore()
}

// ─────────────────────────────────────────────
// STEP 3+4 — RGBA → PERCEPTUAL GREYSCALE
// Uses the ITU-R BT.709 luminance formula.
// Simple RGB average gives wrong results (green
// looks too dark, blue too light to human eye).
// ─────────────────────────────────────────────

export function rgbaToGreyscale(r: number, g: number, b: number, a: number): number {
    // Composite onto white background first (handles transparent PNGs)
    const alpha = a / 255
    const rr = Math.round(r * alpha + 255 * (1 - alpha))
    const gg = Math.round(g * alpha + 255 * (1 - alpha))
    const bb = Math.round(b * alpha + 255 * (1 - alpha))
    // Perceptual luminance — NOT simple average
    return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb
}

// ─────────────────────────────────────────────
// STEP 5 — SMART DOWNSAMPLING (Area Averaging)
// For each target cell, average ALL source pixels
// that fall within that cell's area. Much better
// than nearest-neighbour which causes aliasing.
// ─────────────────────────────────────────────

export function downsampleGreyscale(
    pixels: Uint8ClampedArray | Buffer,
    srcW: number,
    srcH: number,
    targetCols: number,
    targetRows: number
): number[][] {
    const result: number[][] = []

    for (let row = 0; row < targetRows; row++) {
        result[row] = []
        const y0 = (row / targetRows) * srcH
        const y1 = ((row + 1) / targetRows) * srcH

        for (let col = 0; col < targetCols; col++) {
            const x0 = (col / targetCols) * srcW
            const x1 = ((col + 1) / targetCols) * srcW

            let sum = 0
            let count = 0

            // Integer pixel loop over the source area
            for (let py = Math.floor(y0); py < Math.ceil(y1); py++) {
                for (let px = Math.floor(x0); px < Math.ceil(x1); px++) {
                    // Weight by how much of this source pixel falls in the area
                    const xWeight = Math.min(px + 1, x1) - Math.max(px, x0)
                    const yWeight = Math.min(py + 1, y1) - Math.max(py, y0)
                    const weight = xWeight * yWeight

                    const idx = (py * srcW + px) * 4
                    const grey = rgbaToGreyscale(
                        pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]
                    )
                    sum += grey * weight
                    count += weight
                }
            }

            result[row][col] = count > 0 ? sum / count : 255
        }
    }

    return result
}

// ─────────────────────────────────────────────
// STEP 6 — OTSU'S METHOD (Optimal Threshold)
// Finds the threshold T that maximizes the
// between-class variance of dark vs light pixels.
// Works far better than a fixed 128 threshold,
// especially for night photos and overexposed shots.
// ─────────────────────────────────────────────

export function otsuThreshold(greyscale: number[][]): number {
    const histogram = new Array(256).fill(0)
    const rows = greyscale.length
    const cols = greyscale[0].length
    const total = rows * cols

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            histogram[Math.round(greyscale[r][c])]++
        }
    }

    let sum = 0
    for (let i = 0; i < 256; i++) sum += i * histogram[i]

    let sumB = 0
    let wB = 0
    let maxVariance = 0
    let threshold = 128

    for (let t = 0; t < 256; t++) {
        wB += histogram[t]
        if (wB === 0) continue
        const wF = total - wB
        if (wF === 0) break

        sumB += t * histogram[t]
        const mB = sumB / wB
        const mF = (sum - sumB) / wF
        const variance = wB * wF * (mB - mF) * (mB - mF)

        if (variance > maxVariance) {
            maxVariance = variance
            threshold = t
        }
    }

    return threshold
}

// ─────────────────────────────────────────────
// STEP 7 — SMART MULTI-STAGE THRESHOLDING
// Applies contrast stretching, Sobel edges, and
// adaptive thresholding. Picks best fill ratio.
// ─────────────────────────────────────────────

export function stretchContrast(greyscale: number[][]): number[][] {
    let min = 255
    let max = 0

    for (const row of greyscale) {
        for (const val of row) {
            if (val < min) min = val
            if (val > max) max = val
        }
    }

    if (max === min) return greyscale

    const range = max - min
    return greyscale.map(row =>
        row.map(val => Math.round(((val - min) / range) * 255))
    )
}


export function applyThreshold(greyscale: number[][], threshold: number): number[][] {
    return greyscale.map(row =>
        row.map(val => val <= threshold ? 1 : 0)
    )
}

export function calculateFillRatio(grid: number[][]): number {
    let filled = 0
    let total = 0
    for (const row of grid) {
        for (const cell of row) {
            if (cell === 1) filled++
            total++
        }
    }
    return filled / total
}

export function morphologicalCleanup(grid: number[][]): number[][] {
    const rows = grid.length
    const cols = grid[0].length
    const result = grid.map(row => [...row])

    for (let r = 1; r < rows - 1; r++) {
        for (let c = 1; c < cols - 1; c++) {
            const neighbours = [
                grid[r - 1][c], grid[r + 1][c],
                grid[r][c - 1], grid[r][c + 1]
            ]
            const filledNeighbours = neighbours.filter(n => n === 1).length

            // Remove isolated filled pixels
            if (grid[r][c] === 1 && filledNeighbours === 0) {
                result[r][c] = 0
            }
            // Fill isolated empty pixels
            if (grid[r][c] === 0 && filledNeighbours === 4) {
                result[r][c] = 1
            }
        }
    }
    return result
}


export function applyBoxBlur(greyscale: number[][], radius: number = 1): number[][] {
    const rows = greyscale.length
    const cols = greyscale[0].length
    const result: number[][] = []

    for (let r = 0; r < rows; r++) {
        result[r] = []
        for (let c = 0; c < cols; c++) {
            let sum = 0
            let count = 0
            for (let br = Math.max(0, r - radius); br <= Math.min(rows - 1, r + radius); br++) {
                for (let bc = Math.max(0, c - radius); bc <= Math.min(cols - 1, c + radius); bc++) {
                    sum += greyscale[br][bc]
                    count++
                }
            }
            result[r][c] = sum / count
        }
    }
    return result
}

export function removeSmallIslands(grid: number[][], minSize: number = 3): number[][] {
    const rows = grid.length
    const cols = grid[0].length
    const visited = Array.from({ length: rows }, () => new Array(cols).fill(false))
    const result = grid.map(row => [...row])

    function floodFill(startR: number, startC: number): [number, number][] {
        const component: [number, number][] = []
        const stack: [number, number][] = [[startR, startC]]
        while (stack.length > 0) {
            const [r, c] = stack.pop()!
            if (r < 0 || r >= rows || c < 0 || c >= cols) continue
            if (visited[r][c] || grid[r][c] !== 1) continue
            visited[r][c] = true
            component.push([r, c])
            stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1])
        }
        return component
    }

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r][c] === 1 && !visited[r][c]) {
                const component = floodFill(r, c)
                if (component.length < minSize) {
                    for (const [cr, cc] of component) {
                        result[cr][cc] = 0
                    }
                }
            }
        }
    }
    return result
}

export function smartThreshold(greyscale: number[][]): {
    grid: number[][]
    fillRatio: number
    method: string
    baseThreshold: number
    imageType: string
    dofDetected: boolean
} {
    // STEP 1 — Contrast stretch
    // Always do this first. Guarantees full 0-255 range regardless of
    // how dark or bright the original photo was.
    const stretched = stretchContrast(greyscale)

    // STEP 2 — Gentle blur
    // Radius 1 box blur. Removes single-pixel texture noise (fur, leaves,
    // brick, fabric) while keeping large shapes intact.
    // This is the single most universally helpful operation.
    const blurred = applyBoxBlur(stretched, 1)

    // STEP 3 — Otsu threshold
    // Find the single best global threshold on the blurred image.
    // No classification. No adaptive. Just Otsu.
    const threshold = otsuThreshold(blurred)
    let grid = applyThreshold(blurred, threshold)
    let fillRatio = calculateFillRatio(grid)

    // STEP 4 — Inversion check
    // If fill ratio is over 60%, we probably filled the background instead
    // of the subject. Try inverting and see if it's closer to ideal.
    // This handles dark backgrounds, night photos, architecture automatically.
    if (fillRatio > 0.60) {
        const invertedGrid = grid.map(row => row.map(c => c === 1 ? 0 : 1))
        const invertedFill = calculateFillRatio(invertedGrid)
        // Only invert if it genuinely improves fill ratio toward ideal 35%
        if (Math.abs(invertedFill - 0.35) < Math.abs(fillRatio - 0.35)) {
            grid = invertedGrid
            fillRatio = invertedFill
        }
    }

    // STEP 5 — Threshold nudge
    // If fill ratio is still outside acceptable range, nudge threshold
    // up or down until it lands in 15-75%. Max 20 attempts.
    let nudgedThreshold = threshold
    let attempts = 0
    while ((fillRatio < 0.15 || fillRatio > 0.75) && attempts < 20) {
        nudgedThreshold += fillRatio < 0.15 ? 8 : -8
        nudgedThreshold = Math.max(0, Math.min(255, nudgedThreshold))
        grid = applyThreshold(blurred, nudgedThreshold)
        fillRatio = calculateFillRatio(grid)
        attempts++
    }

    // STEP 6 — Morphological cleanup + island removal
    // Remove single isolated pixels (noise).
    // Remove disconnected groups smaller than 3 cells.
    // Fill isolated empty holes surrounded by filled cells.
    grid = morphologicalCleanup(grid)
    grid = removeSmallIslands(grid, 3)
    fillRatio = calculateFillRatio(grid)

    return {
        grid,
        fillRatio,
        method: attempts > 0 ? 'otsu-nudged' : 'otsu',
        baseThreshold: nudgedThreshold,
        imageType: 'auto',
        dofDetected: false,
    }
}

function generateClues(sequence: number[]): number[] {
    const clues: number[] = []
    let run = 0

    for (const cell of sequence) {
        if (cell === 1) {
            run++
        } else if (run > 0) {
            clues.push(run)
            run = 0
        }
    }
    if (run > 0) clues.push(run)
    return clues.length > 0 ? clues : [0]
}

export function generateAllClues(grid: number[][]): {
    rowClues: number[][]
    colClues: number[][]
} {
    const cols = grid[0].length;

    const rowClues = grid.map(row => generateClues(row))

    const colClues: number[][] = []
    for (let c = 0; c < cols; c++) {
        const col = grid.map(row => row[c])
        colClues.push(generateClues(col))
    }

    return { rowClues, colClues }
}

function countDeterministicCells(clues: number[][], lineLength: number): number {
    let deterministic = 0

    for (const clue of clues) {
        if (clue.length === 1 && clue[0] === 0) {
            deterministic += lineLength
            continue
        }

        const minSpace = clue.reduce((a, b) => a + b, 0) + (clue.length - 1)
        const slack = lineLength - minSpace

        for (const run of clue) {
            const forced = Math.max(0, run - slack)
            deterministic += forced
        }
    }

    return deterministic
}

export function scoreSolvability(
    rowClues: number[][],
    colClues: number[][],
    rows: number,
    cols: number
): number {
    const totalCells = rows * cols
    const rowDet = countDeterministicCells(rowClues, cols)
    const colDet = countDeterministicCells(colClues, rows)
    const totalDet = Math.min(totalCells, rowDet + colDet)
    return Math.round((totalDet / totalCells) * 100)
}

export function rateDifficulty(
    rows: number,
    cols: number,
    fillRatio: number,
    solvabilityScore: number,
    rowClues: number[][],
    colClues: number[][]
): { difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert', score: number } {
    const avgRowGroups = rowClues.reduce((s, c) => s + (c[0] === 0 ? 0 : c.length), 0) / rows
    const avgColGroups = colClues.reduce((s, c) => s + (c[0] === 0 ? 0 : c.length), 0) / cols
    const avgGroups = (avgRowGroups + avgColGroups) / 2

    const sizeScore = Math.min(100, (rows * cols) / 6)
    const groupScore = Math.min(100, avgGroups * 20)
    const solvScore = 100 - solvabilityScore
    const balanceScore = Math.abs(fillRatio - 0.5) * 100

    const totalScore = Math.round(
        sizeScore * 0.25 +
        groupScore * 0.30 +
        solvScore * 0.35 +
        balanceScore * 0.10
    )

    let difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert'
    if (totalScore < 25) difficulty = 'Easy'
    else if (totalScore < 50) difficulty = 'Medium'
    else if (totalScore < 75) difficulty = 'Hard'
    else difficulty = 'Expert'

    return { difficulty, score: totalScore }
}

const GRID_LABELS: GridOption['label'][] = ['Sketch', 'Simple', 'Balanced', 'Crisp', 'Ultra']
const DIFFICULTY_MAP: GridOption['difficulty'][] = ['Easy', 'Easy', 'Medium', 'Hard', 'Expert']
const TARGET_LONG_SIDES = [6, 10, 15, 20, 25]

export function suggestGridSizes(imageWidth: number, imageHeight: number): GridOption[] {
    const isLandscape = imageWidth >= imageHeight
    const longSide = Math.max(imageWidth, imageHeight)
    const shortSide = Math.min(imageWidth, imageHeight)
    const ratio = shortSide / longSide

    const options: GridOption[] = []
    const warnings: string[] = []

    if (ratio < 0.3) {
        warnings.push('This image is very wide or very tall — consider cropping for a better puzzle')
    }

    for (let i = 0; i < TARGET_LONG_SIDES.length; i++) {
        const targetLong = TARGET_LONG_SIDES[i]
        const targetShort = Math.max(4, Math.round(targetLong * ratio))

        const finalLong = Math.min(30, targetLong)
        const finalShort = Math.max(4, targetShort)

        const cols = isLandscape ? finalLong : finalShort
        const rows = isLandscape ? finalShort : finalLong

        options.push({
            label: GRID_LABELS[i],
            cols,
            rows,
            difficulty: DIFFICULTY_MAP[i],
            isBestPick: false,
            warning: warnings[0],
            thresholdOffset: 0
        })
    }

    options[2].isBestPick = true
    return options
}

export function updateBestPick(options: GridOption[]): GridOption[] {
    let bestIdx = 0
    let bestScore = Infinity

    for (let i = 0; i < options.length; i++) {
        const ratio = options[i].fillRatio ?? 0.5
        const score = Math.abs(ratio - 0.40)
        if (score < bestScore) {
            bestScore = score
            bestIdx = i
        }
    }

    return options.map((opt, i) => ({ ...opt, isBestPick: i === bestIdx }))
}

export function downsampleBinaryMask(
    mask: number[][],
    srcW: number,
    srcH: number,
    targetCols: number,
    targetRows: number
): number[][] {
    const result: number[][] = []

    for (let row = 0; row < targetRows; row++) {
        result[row] = []
        const y0 = Math.floor((row / targetRows) * srcH)
        const y1 = Math.floor(((row + 1) / targetRows) * srcH)

        for (let col = 0; col < targetCols; col++) {
            const x0 = Math.floor((col / targetCols) * srcW)
            const x1 = Math.floor(((col + 1) / targetCols) * srcW)

            let subjectCount = 0
            let total = 0

            for (let py = y0; py < y1; py++) {
                for (let px = x0; px < x1; px++) {
                    if (py < mask.length && px < mask[0].length) {
                        subjectCount += mask[py][px]
                        total++
                    }
                }
            }

            result[row][col] = total > 0 && (subjectCount / total) > 0.5 ? 1 : 0
        }
    }

    return result
}

export async function processImage(
    file: File,
    gridOption: GridOption
): Promise<NonogramPuzzle> {
    const { cols: targetCols, rows: targetRows, thresholdOffset = 0 } = gridOption
    const warnings: string[] = []

    const img = await loadImageFromFile(file)
    const orientation = await getExifOrientation(file)
    const swapDims = orientation >= 5 && orientation <= 8
    const canvasW = swapDims ? img.height : img.width
    const canvasH = swapDims ? img.width : img.height

    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')!

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasW, canvasH)
    drawImageWithOrientation(ctx, img, orientation, canvasW, canvasH)

    let segmentationMask: number[][] | null = null
    try {
        const { segmentSubject } = await import('./segmentation')
        segmentationMask = await segmentSubject(canvas)
    } catch {
        // segmentation not available, fall through
    }

    let grid: number[][]
    let method = 'otsu'
    let fillRatio = 0
    let threshold = 0

    if (segmentationMask && thresholdOffset === 0) {
        grid = downsampleBinaryMask(segmentationMask, canvasW, canvasH, targetCols, targetRows)
        method = 'ai-segmentation'
        fillRatio = calculateFillRatio(grid)

        // Sanity check
        if (fillRatio < 0.05 || fillRatio > 0.90) {
            segmentationMask = null
        }
    }

    if (!segmentationMask || thresholdOffset !== 0) {
        const imageData = ctx.getImageData(0, 0, canvasW, canvasH)
        const pixels = imageData.data
        const greyscale = downsampleGreyscale(pixels, canvasW, canvasH, targetCols, targetRows)

        const result = smartThreshold(greyscale)
        grid = result.grid
        method = result.method
        let baseThreshold = result.baseThreshold
        threshold = baseThreshold

        if (thresholdOffset !== 0) {
            threshold = Math.max(0, Math.min(255, baseThreshold + thresholdOffset))
            const blurred = applyBoxBlur(stretchContrast(greyscale), 1)
            grid = applyThreshold(blurred, threshold)
            method = 'manual-threshold'
        }
    }

    grid = morphologicalCleanup(grid!)
    grid = removeSmallIslands(grid, 3)
    fillRatio = calculateFillRatio(grid)

    if (fillRatio < 0.15) warnings.push('Very few filled cells — try a darker photo or larger grid')
    if (fillRatio > 0.85) warnings.push('Almost entirely filled — try a lighter photo or smaller grid')
    if (fillRatio < 0.10 || fillRatio > 0.90) warnings.push('This photo may not make a good puzzle at this size')

    const { rowClues, colClues } = generateAllClues(grid)
    const solvabilityScore = scoreSolvability(rowClues, colClues, targetRows, targetCols)

    if (solvabilityScore < 20) warnings.push('This puzzle may require a lot of guessing — try a different grid size')

    const { difficulty, score: difficultyScore } = rateDifficulty(
        targetRows, targetCols, fillRatio, solvabilityScore, rowClues, colClues
    )

    return {
        grid, rowClues, colClues,
        rows: targetRows, cols: targetCols,
        difficulty, difficultyScore, solvabilityScore,
        fillRatio, threshold, warnings,
    }
}

export async function generatePreview(
    file: File,
    cols: number,
    rows: number
): Promise<{ grid: number[][], fillRatio: number, greyscale: number[][], baseThreshold: number, method: string, imageType: string, dofDetected: boolean, debugMetrics: any }> {
    const img = await loadImageFromFile(file)
    const orientation = await getExifOrientation(file)
    const swapDims = orientation >= 5 && orientation <= 8
    const canvasW = swapDims ? img.height : img.width
    const canvasH = swapDims ? img.width : img.height

    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasW, canvasH)
    drawImageWithOrientation(ctx, img, orientation, canvasW, canvasH)

    let segmentationMask: number[][] | null = null
    try {
        const { segmentSubject } = await import('./segmentation')
        segmentationMask = await segmentSubject(canvas)
    } catch {
    }

    let grid: number[][]
    let method: string

    if (segmentationMask) {
        grid = downsampleBinaryMask(segmentationMask, canvasW, canvasH, cols, rows)
        method = 'ai-segmentation'
        const fillScale = calculateFillRatio(grid)
        if (fillScale < 0.05 || fillScale > 0.90) {
            segmentationMask = null
        }
    }

    const pixels = ctx.getImageData(0, 0, canvasW, canvasH).data
    const greyscale = downsampleGreyscale(pixels, canvasW, canvasH, cols, rows)
    const otsuResult = smartThreshold(greyscale)

    if (!segmentationMask) {
        grid = otsuResult.grid
        method = otsuResult.method
    }

    let fillRatio = calculateFillRatio(grid!)
    grid = morphologicalCleanup(grid!)
    grid = removeSmallIslands(grid, 3)
    fillRatio = calculateFillRatio(grid)

    return { grid, fillRatio, greyscale, baseThreshold: otsuResult.baseThreshold, method: method!, imageType: 'auto', dofDetected: false, debugMetrics: {} }
}

// ─────────────────────────────────────────────
// RESIZE HELPER — resizeForStorage()
// Resizes the original image to max 400px longest
// side for storage in URL / KV / Blob.
// Returns a base64 JPEG string.
// ─────────────────────────────────────────────

export async function resizeForStorage(file: File, maxSize = 400): Promise<string> {
    const img = await loadImageFromFile(file)
    const orientation = await getExifOrientation(file)
    const swapDims = orientation >= 5 && orientation <= 8
    const srcW = swapDims ? img.height : img.width
    const srcH = swapDims ? img.width : img.height

    const scale = Math.min(1, maxSize / Math.max(srcW, srcH))
    const w = Math.round(srcW * scale)
    const h = Math.round(srcH * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
    drawImageWithOrientation(ctx, img, orientation, w, h)

    return canvas.toDataURL('image/jpeg', 0.82)
}
