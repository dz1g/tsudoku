import { Difficulty, GameBoardData } from './types.js';

// Seedable PRNG (Mulberry32)
export function createPRNG(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleArray<T>(array: T[], prng: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class SudokuEngine {
  private static getBoxIndex(r: number, c: number): number {
    return Math.floor(r / 3) * 3 + Math.floor(c / 3);
  }

  // Count the number of solutions up to limit (typically 2 to check uniqueness)
  public static countSolutions(grid: number[][], limit: number = 2): number {
    const rowMask = new Uint16Array(9);
    const colMask = new Uint16Array(9);
    const boxMask = new Uint16Array(9);
    const emptyCells: [number, number][] = [];

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const val = grid[r][c];
        if (val !== 0) {
          const bit = 1 << val;
          rowMask[r] |= bit;
          colMask[c] |= bit;
          boxMask[this.getBoxIndex(r, c)] |= bit;
        } else {
          emptyCells.push([r, c]);
        }
      }
    }

    let solutions = 0;

    function solve(index: number) {
      if (index === emptyCells.length) {
        solutions++;
        return;
      }

      // MRV (Minimum Remaining Values) heuristic could be used, but sequential index with bitmask is already blazing fast
      const [r, c] = emptyCells[index];
      const box = SudokuEngine.getBoxIndex(r, c);
      const used = rowMask[r] | colMask[c] | boxMask[box];

      for (let d = 1; d <= 9; d++) {
        const bit = 1 << d;
        if ((used & bit) === 0) {
          rowMask[r] |= bit;
          colMask[c] |= bit;
          boxMask[box] |= bit;

          solve(index + 1);

          rowMask[r] &= ~bit;
          colMask[c] &= ~bit;
          boxMask[box] &= ~bit;

          if (solutions >= limit) return;
        }
      }
    }

    solve(0);
    return solutions;
  }

  // Generate a fully solved random valid 9x9 Sudoku board
  public static generateSolvedBoard(prng: () => number = Math.random): number[][] {
    const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
    const rowMask = new Uint16Array(9);
    const colMask = new Uint16Array(9);
    const boxMask = new Uint16Array(9);

    function fillCell(r: number, c: number): boolean {
      if (r === 9) return true;
      const nextR = c === 8 ? r + 1 : r;
      const nextC = c === 8 ? 0 : c + 1;

      const box = SudokuEngine.getBoxIndex(r, c);
      const digits = shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9], prng);

      for (const d of digits) {
        const bit = 1 << d;
        if (((rowMask[r] | colMask[c] | boxMask[box]) & bit) === 0) {
          grid[r][c] = d;
          rowMask[r] |= bit;
          colMask[c] |= bit;
          boxMask[box] |= bit;

          if (fillCell(nextR, nextC)) return true;

          grid[r][c] = 0;
          rowMask[r] &= ~bit;
          colMask[c] &= ~bit;
          boxMask[box] &= ~bit;
        }
      }
      return false;
    }

    fillCell(0, 0);
    return grid;
  }

  // Generate a puzzle with a guaranteed unique solution for the requested difficulty
  public static generate(difficulty: Difficulty = 'medium', seed: number = Date.now()): GameBoardData {
    const prng = createPRNG(seed);
    const solution = this.generateSolvedBoard(prng);
    const puzzle: number[][] = solution.map(row => [...row]);

    // Target clues count based on difficulty
    const targetCluesMap: Record<Difficulty, number> = {
      easy: 40,
      medium: 32,
      hard: 28,
      expert: 24,
    };
    const targetClues = targetCluesMap[difficulty] || 32;

    // Generate coordinate list and shuffle
    const coords: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        coords.push([r, c]);
      }
    }
    const shuffledCoords = shuffleArray(coords, prng);

    let currentClues = 81;

    for (const [r, c] of shuffledCoords) {
      if (currentClues <= targetClues) break;

      const temp = puzzle[r][c];
      puzzle[r][c] = 0;

      // Check if board still has a unique solution
      if (this.countSolutions(puzzle, 2) === 1) {
        currentClues--;
      } else {
        puzzle[r][c] = temp; // restore
      }
    }

    return {
      initial: puzzle,
      solution: solution,
    };
  }

  // Helper to validate whether a single cell placement matches solution
  public static isCellCorrect(solution: number[][], row: number, col: number, val: number): boolean {
    return solution[row][col] === val;
  }

  // Check if an entire 9x9 board is completely and correctly solved
  public static isBoardSolved(board: number[][], solution: number[][]): boolean {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] === 0 || board[r][c] !== solution[r][c]) {
          return false;
        }
      }
    }
    return true;
  }

  // Calculate completion percentage of empty cells
  public static calculateProgress(currentBoard: number[][], initialBoard: number[][], solution: number[][]): number {
    let emptyCells = 0;
    let correctCells = 0;

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (initialBoard[r][c] === 0) {
          emptyCells++;
          if (currentBoard[r][c] === solution[r][c]) {
            correctCells++;
          }
        }
      }
    }

    if (emptyCells === 0) return 100;
    return Math.round((correctCells / emptyCells) * 100);
  }
}
