'use client'

import { useEffect, useState, useRef } from 'react'
import { generatePreview, suggestGridSizes } from '@/lib/imageToNonogram'

// Block in production
import { redirect } from 'next/navigation'

const TEST_IMAGES = [
    { src: '/test-images/01-portrait.jpg', label: '01 — Portrait/Selfie' },
    { src: '/test-images/02-dog.jpg', label: '02 — Dog/Pet' },
    { src: '/test-images/03-cat.jpg', label: '03 — Cat' },
    { src: '/test-images/04-food.jpg', label: '04 — Food from above' },
    { src: '/test-images/05-landscape.jpg', label: '05 — Landscape panoramic' },
    { src: '/test-images/06-group.jpg', label: '06 — Group of people' },
    { src: '/test-images/07-night.jpg', label: '07 — Night/dark photo' },
    { src: '/test-images/08-object.jpg', label: '08 — Simple object' },
    { src: '/test-images/09-architecture.jpg', label: '09 — Architecture/building' },
    { src: '/test-images/10-baby.jpg', label: '10 — Baby/child' },
]

interface TestResult {
    label: string
    src: string
    grid: number[][] | null
    fillRatio: number
    method: string
    imageType: string
    dofDetected: boolean
    cols: number
    rows: number
    status: 'pending' | 'processing' | 'done' | 'error'
    error?: string
}

async function urlToFile(url: string, filename: string): Promise<File> {
    const response = await fetch(url)
    const blob = await response.blob()
    return new File([blob], filename, { type: blob.type || 'image/jpeg' })
}

function GridCanvas({ grid, cols, rows }: { grid: number[][], cols: number, rows: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas || !grid) return

        const CELL = Math.min(
            Math.floor(300 / cols),
            Math.floor(300 / rows)
        )

        canvas.width = CELL * cols
        canvas.height = CELL * rows

        const ctx = canvas.getContext('2d')!
        ctx.fillStyle = '#faf7f2'
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r][c] === 1) {
                    ctx.fillStyle = '#2d2d2d'
                    ctx.fillRect(
                        c * CELL + 1,
                        r * CELL + 1,
                        CELL - 1,
                        CELL - 1
                    )
                }
            }
        }
    }, [grid, cols, rows])

    return (
        <canvas
            ref={canvasRef}
            style={{
                borderRadius: '8px',
                maxWidth: '100%',
                display: 'block'
            }}
        />
    )
}

export default function TestPage() {
    const INITIAL_RESULTS: TestResult[] = TEST_IMAGES.map(img => ({
        label: img.label,
        src: img.src,
        grid: null,
        fillRatio: 0,
        method: '',
        imageType: '',
        dofDetected: false,
        cols: 0,
        rows: 0,
        status: 'pending'
    }))

    const [results, setResults] = useState<TestResult[]>(INITIAL_RESULTS)
    const [runKey, setRunKey] = useState(0)

    useEffect(() => {
        if (process.env.NODE_ENV === 'production') {
            redirect('/')
        }
    }, [])

    useEffect(() => {
        let isCancelled = false

        async function runTests() {
            for (let i = 0; i < TEST_IMAGES.length; i++) {
                if (isCancelled) break

                const img = TEST_IMAGES[i]

                setResults(prev => prev.map((r, idx) =>
                    idx === i ? { ...r, status: 'processing' } : r
                ))

                try {
                    const file = await urlToFile(img.src, img.src.split('/').pop()!)
                    const bitmap = await createImageBitmap(file)
                    const { width, height } = bitmap
                    bitmap.close()

                    const options = suggestGridSizes(width, height)
                    const ultraOption = options[options.length - 1]

                    const result = await generatePreview(file, ultraOption.cols, ultraOption.rows)

                    if (!isCancelled) {
                        setResults(prev => prev.map((r, idx) =>
                            idx === i ? {
                                ...r,
                                grid: result.grid,
                                fillRatio: result.fillRatio,
                                method: result.method,
                                imageType: result.imageType || 'unknown',
                                dofDetected: result.dofDetected || false,
                                cols: ultraOption.cols,
                                rows: ultraOption.rows,
                                status: 'done',
                            } : r
                        ))
                    }
                } catch (err) {
                    if (!isCancelled) {
                        setResults(prev => prev.map((r, idx) =>
                            idx === i ? {
                                ...r,
                                status: 'error',
                                error: String(err)
                            } : r
                        ))
                    }
                }
            }
        }

        runTests()

        return () => {
            isCancelled = true
        }
    }, [runKey])

    return (
        <div className="min-h-screen bg-[#faf7f2] p-8 font-sans text-text">
            <div className="max-w-[800px] mx-auto flex flex-col gap-6">
                <div className="flex flex-col gap-2 pb-4 border-b border-bdr">
                    <div className="flex items-center justify-between">
                        <h1 className="font-serif italic font-semibold text-2xl">TEST SUITE — Live Processing</h1>
                        <button
                            onClick={() => {
                                setResults(INITIAL_RESULTS)
                                setRunKey(k => k + 1)
                            }}
                            className="bg-terra text-white px-4 py-2 rounded-lg font-mono text-sm hover:opacity-90 transition-opacity"
                        >
                            🔄 Re-run all tests
                        </button>
                    </div>
                    <p className="text-sm text-body">
                        Images are fetched as real `File` blobs and processed live using depth detection.
                    </p>
                </div>

                <div className="flex flex-col gap-10">
                    {results.map((r, i) => (
                        <div key={i} className="flex flex-col gap-3">
                            <div className="flex flex-col">
                                <h2 className="font-mono text-sm font-bold">{r.label}</h2>
                                <div className="font-mono text-xs text-muted flex gap-2 w-full truncate">
                                    <span>Size: {r.cols}×{r.rows}</span>
                                    <span>·</span>
                                    <span>Fill: {(r.fillRatio * 100).toFixed(1)}%</span>
                                    <span>·</span>
                                    <span>Type: {r.imageType}</span>
                                    <span>·</span>
                                    <span>DoF: {r.dofDetected ? 'YES' : 'no'}</span>
                                    <span>·</span>
                                    <span className="truncate">Method: {r.method}</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap md:flex-nowrap gap-4">
                                <div className="w-[300px] h-[300px] bg-[#f0ece6] rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                                    <img src={r.src} className="w-full h-full object-contain" alt="Original" />
                                </div>

                                <div className="w-[300px] h-[300px] bg-white rounded-lg border border-bdr flex items-center justify-center shadow-sm shrink-0">
                                    {r.status === 'processing' && (
                                        <div className="text-xs font-mono text-body animate-pulse">Processing...</div>
                                    )}
                                    {r.status === 'error' && (
                                        <div className="text-xs font-mono text-[#e55039] px-4 text-center">Error: {r.error}</div>
                                    )}
                                    {r.status === 'pending' && (
                                        <div className="text-xs font-mono text-muted">Waiting...</div>
                                    )}
                                    {r.status === 'done' && r.grid && (
                                        <GridCanvas grid={r.grid} cols={r.cols} rows={r.rows} />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
