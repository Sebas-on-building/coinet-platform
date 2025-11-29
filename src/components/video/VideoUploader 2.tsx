import React, { useRef, useState } from 'react';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { sanitizeText } from '@/utils/sanitize';

const MAX_SIZE_MB = 500;
const ACCEPTED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

const VideoUploader = React.memo(() => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    handleFile(f);
  };
  const handleFile = (f: File) => {
    if (!f) return;
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Unsupported file type.');
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setError('File is too large.');
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    handleFile(f!);
  };
  const onUpload = () => {
    if (!file) return;
    setUploading(true);
    setProgress(0);
    // Simulate upload
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setUploading(false);
          return 100;
        }
        return p + 10;
      });
    }, 200);
  };
  return (
    <Card style={{ padding: 'var(--spacing-lg)', minWidth: 340, minHeight: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-md)' }}>
      <div
        onDrop={onDrop}
        onDragOver={e => e.preventDefault()}
        style={{
          border: '2px dashed var(--color-border)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--spacing-lg)',
          width: 300,
          textAlign: 'center',
          background: 'var(--color-bg-elevated)',
          cursor: 'pointer',
        }}
        onClick={() => inputRef.current?.click()}
        aria-label="Upload video"
      >
        {file ? sanitizeText(file.name) : 'Drag & drop or click to select a video'}
        <input ref={inputRef} type="file" accept={ACCEPTED_TYPES.join(',')} style={{ display: 'none' }} onChange={onChange} />
      </div>
      {error && <div style={{ color: 'var(--color-error)' }}>{error}</div>}
      {preview && <video src={preview} controls style={{ width: 240, borderRadius: 8, marginTop: 8 }} />}
      {uploading && <div style={{ width: '100%' }}><div style={{ height: 8, background: 'var(--color-border)', borderRadius: 4 }}><div style={{ width: `${progress}%`, height: 8, background: 'var(--color-primary)', borderRadius: 4, transition: 'width 0.2s' }} /></div></div>}
      <Button onClick={onUpload} disabled={!file || uploading} variant="primary" size="md">Upload</Button>
    </Card>
  );
});

export default VideoUploader; 