import { useRef, useState } from 'react';
import { importMediaFilesToTimeline } from '../io/mediaImport';
import { Icon } from './Icon';

export function MediaImportButton() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const importFiles = async (files: FileList | null) => {
    if (!files?.length || busy) return;
    setBusy(true);
    try {
      await importMediaFilesToTimeline(files);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input ref={input} type="file" accept="audio/*,video/*,image/*" multiple hidden
        onChange={(event) => void importFiles(event.currentTarget.files)} />
      <button className="media-import-button" disabled={busy} onClick={() => input.current?.click()}
        title="Import audio, video or images into the timeline">
        <Icon name="upload" size={14} /> {busy ? 'Importing…' : 'Import media'}
      </button>
    </>
  );
}
