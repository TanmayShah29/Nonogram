import LZString from 'lz-string';

export interface PuzzleData {
    id?: string;
    pw?: string | null;
    title: string;
    thumb: string;
    cols: number;
    rows: number;
    grid: number[][]; // actual answer grid 0/1
    rowClues: number[][];
    colClues: number[][];
    diffIdx: number;
    logicDiff: string;
}

export function encodePuzzle(data: PuzzleData): string {
    return LZString.compressToEncodedURIComponent(JSON.stringify(data));
}

export function decodePuzzle(encoded: string): PuzzleData | null {
    try {
        const decompressed = LZString.decompressFromEncodedURIComponent(encoded);
        if (!decompressed) return null;
        const data = JSON.parse(decompressed);
        if (!data || !data.grid || !Array.isArray(data.grid)) return null;
        return data as PuzzleData;
    } catch {
        return null;
    }
}
