/*
 * Adapted from the GDevelop GDJS Runtime TimeManager design.
 * Copyright (c) 2013-2016 Florian Rival.
 * The original GDJS source is distributed under the MIT License.
 * This adapted implementation is included under the same MIT terms.
 */
export interface SparkTimerState {
  name: string;
  elapsedMs: number;
  durationMs: number;
  repeat: boolean;
  finished: boolean;
}

export class SparkTimeManager {
  private elapsedTime = 0;
  private timeScale = 1;
  private timeFromStart = 0;
  private firstFrame = true;
  private firstUpdateDone = false;
  private timers = new Map<string, SparkTimerState>();

  reset(): void {
    this.elapsedTime = 0;
    this.timeScale = 1;
    this.timeFromStart = 0;
    this.firstFrame = true;
    this.firstUpdateDone = false;
    this.timers.clear();
  }

  update(frameDeltaMs: number, minimumFps = 30): void {
    if (this.firstUpdateDone) this.firstFrame = false;
    this.firstUpdateDone = true;
    const safeMinimumFps = Math.max(1, Math.floor(minimumFps));
    this.elapsedTime = Math.min(Math.max(0, frameDeltaMs), 1000 / safeMinimumFps) * this.timeScale;
    for (const timer of this.timers.values()) {
      if (timer.finished) continue;
      timer.elapsedMs += this.elapsedTime;
      if (timer.durationMs > 0 && timer.elapsedMs >= timer.durationMs) {
        if (timer.repeat) timer.elapsedMs %= timer.durationMs;
        else {
          timer.elapsedMs = timer.durationMs;
          timer.finished = true;
        }
      }
    }
    this.timeFromStart += this.elapsedTime;
  }

  setTimeScale(value: number): void {
    if (Number.isFinite(value) && value >= 0) this.timeScale = value;
  }

  getTimeScale(): number { return this.timeScale; }
  getElapsedTime(): number { return this.elapsedTime; }
  getTimeFromStart(): number { return this.timeFromStart; }
  isFirstFrame(): boolean { return this.firstFrame; }

  addTimer(name: string, durationMs = 0, repeat = false): void {
    this.timers.set(name, { name, elapsedMs: 0, durationMs: Math.max(0, durationMs), repeat, finished: false });
  }

  hasTimer(name: string): boolean { return this.timers.has(name); }
  getTimer(name: string): SparkTimerState | undefined { return this.timers.get(name); }
  removeTimer(name: string): void { this.timers.delete(name); }
}
