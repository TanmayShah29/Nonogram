import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision'

let segmenter: ImageSegmenter | null = null

async function getSegmenter(): Promise<ImageSegmenter> {
    if (segmenter) return segmenter

    const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )

    segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite',
            delegate: 'GPU'
        },
        outputCategoryMask: true,
        outputConfidenceMasks: false,
        runningMode: 'IMAGE'
    })

    return segmenter
}

export async function segmentSubject(
    canvas: HTMLCanvasElement
): Promise<number[][] | null> {
    try {
        const seg = await getSegmenter()
        const result = seg.segment(canvas)

        if (!result.categoryMask) return null

        const mask = result.categoryMask.getAsUint8Array()
        const width = result.categoryMask.width
        const height = result.categoryMask.height

        // Convert flat mask array to 2D grid
        // mask value 0 = background, 1 = subject/person
        const grid: number[][] = []
        for (let r = 0; r < height; r++) {
            grid[r] = []
            for (let c = 0; c < width; c++) {
                grid[r][c] = mask[r * width + c] > 0 ? 1 : 0
            }
        }

        result.categoryMask.close()
        return grid

    } catch (err) {
        console.warn('Segmentation failed, falling back to Otsu:', err)
        return null
    }
}
