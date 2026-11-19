import { Difficulty } from './types.js';

export interface ScoreCalculationResult {
  deltaScore: number;
  isPenalty: boolean;
  speedBonus: number;
}

export class ScoringEngine {
  public static BASE_CORRECT_POINTS = 100;
  public static BASE_ERROR_PENALTY = -50;

  /**
   * Calculates score delta for a move in Race mode.
   * @param isCorrect Whether the placed number matches the solution
   * @param timeSpentMs Time spent since last move or cell focus (in ms)
   * @param difficulty Difficulty level
   */
  public static calculateMoveScore(
    isCorrect: boolean,
    timeSpentMs: number = 0,
    difficulty: Difficulty = 'medium'
  ): ScoreCalculationResult {
    if (!isCorrect) {
      return {
        deltaScore: this.BASE_ERROR_PENALTY,
        isPenalty: true,
        speedBonus: 0,
      };
    }

    // Difficulty multiplier
    const diffMultiplier: Record<Difficulty, number> = {
      easy: 1.0,
      medium: 1.25,
      hard: 1.5,
      expert: 2.0,
    };

    const multiplier = diffMultiplier[difficulty] || 1.0;
    const basePoints = Math.round(this.BASE_CORRECT_POINTS * multiplier);

    // Speed bonus: full 50 pts if within 3s, decays linearly to 0 pts at 15s
    let speedBonus = 0;
    if (timeSpentMs > 0 && timeSpentMs < 15000) {
      const ratio = Math.max(0, (15000 - timeSpentMs) / 15000);
      speedBonus = Math.round(50 * ratio * multiplier);
    }

    return {
      deltaScore: basePoints + speedBonus,
      isPenalty: false,
      speedBonus,
    };
  }

  /**
   * Future Extensibility Hook: Map / Territory Control scoring algorithm.
   * Calculates territory points weighted by accuracy and seconds taken to fill.
   */
  public static calculateTerritoryWeight(
    basePoints: number,
    timeToFillSec: number,
    difficulty: Difficulty = 'medium'
  ): number {
    // Faster completions retain higher percentage of territory control value
    // Minimum retention: 25%, drops by 5% every 10 seconds after first 5 seconds
    const decay = Math.max(0.25, 1.0 - Math.max(0, (timeToFillSec - 5) * 0.02));
    const diffBonus = difficulty === 'expert' ? 1.5 : difficulty === 'hard' ? 1.25 : 1.0;
    return Math.round(basePoints * decay * diffBonus);
  }
}
