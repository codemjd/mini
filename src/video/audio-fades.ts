export function getNarrationVolume(
  frame: number,
  durationInFrames: number,
  fadeOutFrames: number,
  fadeInFrames = 6
): number {
  const duration = Math.max(1, Math.floor(durationInFrames));
  const lastFrame = duration - 1;
  if (lastFrame <= 0) return 0;

  const currentFrame = Math.min(lastFrame, Math.max(0, Math.floor(frame)));
  const fadeIn = Math.min(Math.max(0, Math.floor(fadeInFrames)), Math.floor(lastFrame / 2));
  const fadeOut = Math.min(
    Math.max(0, Math.floor(fadeOutFrames)),
    Math.max(0, lastFrame - fadeIn)
  );

  if (fadeIn > 0 && currentFrame < fadeIn) {
    return currentFrame / fadeIn;
  }

  if (fadeOut > 0) {
    const fadeOutStart = lastFrame - fadeOut;
    if (currentFrame > fadeOutStart) {
      return Math.max(0, (lastFrame - currentFrame) / fadeOut);
    }
  }

  return 1;
}
