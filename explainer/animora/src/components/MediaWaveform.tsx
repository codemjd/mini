import { useEffect, useState } from 'react';
import { readAudioWaveform } from '../io/waveform';

export function MediaWaveform({ source, sourceStart, sourceDuration }: {
  source: string;
  sourceStart: number;
  sourceDuration: number;
}) {
  const [peaks, setPeaks] = useState<number[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    setPeaks(null);
    void readAudioWaveform(source).then((result) => {
      if (!cancelled) setPeaks(result);
    });
    return () => { cancelled = true; };
  }, [source]);

  if (!peaks?.length) return null;
  const duration = Math.max(0.01, sourceDuration || 0.01);
  const start = Math.max(0, Math.min(peaks.length - 1, Math.floor((sourceStart / duration) * peaks.length)));
  const end = Math.max(start + 1, Math.min(peaks.length, Math.ceil(((sourceStart + duration) / duration) * peaks.length)));
  const visible = peaks.slice(start, end);
  return (
    <svg className="media-waveform" viewBox={`0 0 ${visible.length} 20`} preserveAspectRatio="none" aria-hidden="true">
      {visible.map((peak, index) => {
        const height = Math.max(1, peak * 17);
        return <rect key={index} x={index + 0.12} y={(20 - height) / 2} width="0.76" height={height} rx="0.25" />;
      })}
    </svg>
  );
}
