export function computeClues(line: number[] | Uint8Array): number[] {
    const o: number[] = [];
    let n = 0;
    for (const v of line) {
        if (v) n++;
        else if (n) { o.push(n); n = 0; }
    }
    if (n) o.push(n);
    return o.length ? o : [0];
}

export function getDeterminableCells(L: number, runs: number[]): number[] {
    if (runs.length === 0) { const res = []; for (let i = 0; i < L; i++) res.push(i); return res; }
    const sum = runs.reduce((a, b) => a + b, 0);
    const slack = L - sum - (runs.length - 1);
    if (slack < 0) return [];
    if (slack === 0) { const res = []; for (let i = 0; i < L; i++) res.push(i); return res; }
    const res = [];
    let curr = 0;
    for (const c of runs) {
        if (c > slack) {
            const start = curr + slack;
            const end = curr + c;
            for (let i = start; i < end; i++) res.push(i);
        }
        curr += c + 1;
    }
    return res;
}

export function evaluateSolvability(grid: number[][] | Uint8Array[], rClues: number[][], cClues: number[][]) {
    const rows = grid.length, cols = grid[0].length;
    const known = Array.from({ length: rows }, () => new Uint8Array(cols));
    for (let r = 0; r < rows; r++) {
        const det = getDeterminableCells(cols, rClues[r]);
        for (const idx of det) known[r][idx] = 1;
    }
    for (let c = 0; c < cols; c++) {
        const det = getDeterminableCells(rows, cClues[c]);
        for (const idx of det) known[idx][c] = 1;
    }
    let kc = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (known[r][c]) kc++;
    return { pct: kc / (rows * cols), known };
}

export function getDifficultyRating(totalCells: number, solPct: number): string {
    if (totalCells <= 100 && solPct >= 0.5) return 'Easy';
    if (solPct >= 0.6) return 'Easy';
    if (solPct >= 0.3) return 'Medium';
    if (solPct >= 0.1) return 'Hard';
    return 'Expert';
}
