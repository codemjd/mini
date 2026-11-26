import { useCallback, useEffect, useRef, useState } from 'react';
import { NabraTTS } from './tts';
import type { GeneratedAudio, GenerateOptions, LoadOptions, ProgressInfo } from './types';

export type NabraStatus = 'idle' | 'loading' | 'ready' | 'generating' | 'error';

export interface UseNabraTTS {
  status: NabraStatus;
  /** Download progress, 0..1 across model + voice. */
  progress: number;
  error: Error | null;
  tts: NabraTTS | null;
  generate: (text: string, options?: GenerateOptions) => Promise<GeneratedAudio>;
  speak: (text: string, options?: GenerateOptions) => Promise<void>;
}

/**
 * Load Nabra TTS once per component and expose generate/speak.
 * Options are read on mount; remount (e.g. change `key`) to reload with new options.
 */
export function useNabraTTS(options: LoadOptions = {}): UseNabraTTS {
  const [tts, setTts] = useState<NabraTTS | null>(null);
  const [status, setStatus] = useState<NabraStatus>('loading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let disposed = false;
    let instance: NabraTTS | null = null;
    const files: Record<string, ProgressInfo> = {};
    setStatus('loading');
    NabraTTS.load({
      ...optionsRef.current,
      diacritize: optionsRef.current.diacritize && ((t) => optionsRef.current.diacritize!(t)),
      onProgress: (p) => {
        files[p.file] = p;
        const all = Object.values(files);
        const total = all.reduce((n, f) => n + f.total, 0);
        if (total) setProgress(all.reduce((n, f) => n + f.loaded, 0) / total);
        optionsRef.current.onProgress?.(p);
      },
    }).then(
      (t) => {
        if (disposed) return void t.dispose();
        instance = t;
        setTts(t);
        setProgress(1);
        setStatus('ready');
      },
      (err) => {
        if (disposed) return;
        setError(err);
        setStatus('error');
      },
    );
    return () => {
      disposed = true;
      instance?.dispose();
    };
  }, []);

  const run = useCallback(
    async <T,>(fn: (t: NabraTTS) => Promise<T>): Promise<T> => {
      if (!tts) throw new Error('nabra-tts: model not loaded yet');
      setStatus('generating');
      try {
        return await fn(tts);
      } finally {
        setStatus('ready');
      }
    },
    [tts],
  );

  const generate = useCallback((text: string, o?: GenerateOptions) => run((t) => t.generate(text, o)), [run]);
  const speak = useCallback((text: string, o?: GenerateOptions) => run((t) => t.speak(text, o)), [run]);

  return { status, progress, error, tts, generate, speak };
}

export { NabraTTS };
export type { GeneratedAudio, GenerateOptions, LoadOptions, ProgressInfo };
