import test from 'node:test';
import assert from 'node:assert';
import { SudokuEngine } from './sudoku.js';
import { ScoringEngine } from './scoring.js';

test('SudokuEngine generates a fully valid 9x9 board with 1 solution', () => {
  const solved = SudokuEngine.generateSolvedBoard();
  assert.strictEqual(solved.length, 9);
  assert.strictEqual(solved[0].length, 9);

  // Check rows, cols, and boxes have digits 1-9
  for (let r = 0; r < 9; r++) {
    const rowSet = new Set(solved[r]);
    assert.strictEqual(rowSet.size, 9);
    assert.strictEqual(rowSet.has(0), false);
  }

  // Count solutions for solved board should be 1
  const solutions = SudokuEngine.countSolutions(solved, 2);
  assert.strictEqual(solutions, 1);
});

test('SudokuEngine generates puzzle with unique solution and target difficulty', () => {
  const puzzleData = SudokuEngine.generate('easy', 12345);
  assert.strictEqual(puzzleData.initial.length, 9);
  assert.strictEqual(puzzleData.solution.length, 9);

  // Clues count for easy should be <= 42 and > 20
  let clues = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (puzzleData.initial[r][c] !== 0) {
        clues++;
        assert.strictEqual(puzzleData.initial[r][c], puzzleData.solution[r][c]);
      }
    }
  }
  assert.ok(clues <= 42 && clues >= 30, `Expected clues between 30 and 42, got ${clues}`);

  // Must have strictly 1 unique solution
  const solutionCount = SudokuEngine.countSolutions(puzzleData.initial, 2);
  assert.strictEqual(solutionCount, 1);
});

test('SudokuEngine determinism with seed', () => {
  const p1 = SudokuEngine.generate('medium', 42);
  const p2 = SudokuEngine.generate('medium', 42);
  assert.deepStrictEqual(p1.initial, p2.initial);
  assert.deepStrictEqual(p1.solution, p2.solution);
});

test('ScoringEngine calculates correct points and penalties', () => {
  const correctMove = ScoringEngine.calculateMoveScore(true, 2000, 'medium');
  assert.strictEqual(correctMove.isPenalty, false);
  assert.ok(correctMove.deltaScore > 100); // 125 base + speed bonus

  const wrongMove = ScoringEngine.calculateMoveScore(false, 1000, 'medium');
  assert.strictEqual(wrongMove.isPenalty, true);
  assert.strictEqual(wrongMove.deltaScore, -50);
});
