import React, { useRef, useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { useTheme } from '../../../../packages/shared-ui/themes/useTheme';
import Hls from 'hls.js';

interface VideoPlayerProps {
  video: any;
}

export const VideoPlayer = ({ video }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [quality, setQuality] = useState('1080p');
  const [subtitle, setSubtitle] = useState('off');
  const [pluginEvents, setPluginEvents] = useState<any[]>([]);
  const { colors, spacing, radii, typography, shadows, tokens } = useTheme();

  // WebSocket for live events (e.g. reactions, live chat)
  useEffect(() => {
    if (!video) return;
    const ws = new WebSocket(`wss://api.coinet.com/video/${video.id}/events`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPluginEvents((prev) => [...prev, data]);
    };
    return () => ws.close();
  }, [video]);

  React.useEffect(() => {
    if (videoRef.current && Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(video.streamUrl);
      hls.attachMedia(videoRef.current);
    }
  }, [video]);

  // Handlers
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setPlaying(!playing);
  };
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(Number(e.target.value));
    if (videoRef.current) videoRef.current.volume = Number(e.target.value);
  };
  const handleProgress = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = (Number(e.target.value) / 100) * videoRef.current.duration;
    videoRef.current.currentTime = time;
    setProgress(Number(e.target.value));
  };
  const handleFullscreen = () => {
    if (!videoRef.current) return;
    if (!fullscreen) {
      videoRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setFullscreen(!fullscreen);
  };
  // ... Quality and Subtitle handlers would go here ...

  useEffect(() => {
    if (!videoRef.current) return;
    const updateProgress = () => {
      setProgress((videoRef.current!.currentTime / videoRef.current!.duration) * 100);
    };
    videoRef.current.addEventListener('timeupdate', updateProgress);
    return () => {
      videoRef.current?.removeEventListener('timeupdate', updateProgress);
    };
  }, [videoRef]);

  if (!video) return <div style={{ background: '#000', borderRadius: 16, minHeight: 400 }} />;
  return (
    <div style={{
      borderRadius: tokens.borderRadius.lg,
      boxShadow: tokens.shadow.md,
      overflow: 'hidden',
      background: tokens.colors.background,
      position: 'relative',
      maxWidth: 900,
      margin: '0 auto'
    }} aria-label="Coinet Video Player" role="region">
      <video
        ref={videoRef}
        src={video.streamUrl}
        style={{ width: '100%', height: 'auto', background: tokens.colors.background }}
        poster={video.thumbnail}
        controls={false}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        aria-label="Video playback"
      />
      {/* Animated play/pause overlay */}
      {!playing && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.2)', pointerEvents: 'none'
        }}>
          <svg width={64} height={64} viewBox="0 0 64 64" fill={tokens.colors.primary}><polygon points="16,12 56,32 16,52" /></svg>
        </div>
      )}
      <div style={{ ...typography.caption, padding: spacing.md, background: colors.surface, borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg }}>
        Example video player with overlays and controls.
      </div>
      {/* Atomic Controls */}
      <div style={{ position: 'absolute', bottom: 24, left: 24, right: 24, display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(20,20,20,0.7)', borderRadius: 12, padding: 12 }}>
        <PlayButton playing={playing} onClick={handlePlayPause} />
        <VolumeControl volume={volume} onChange={handleVolume} />
        <ProgressBar progress={progress} onChange={handleProgress} />
        <QualitySelector quality={quality} onChange={setQuality} />
        <SubtitleSelector subtitle={subtitle} onChange={setSubtitle} />
        <FullscreenToggle fullscreen={fullscreen} onClick={handleFullscreen} />
        <PluginDock events={pluginEvents} />
      </div>
    </div>
  );
};

// Atomic Subcomponents
const PlayButton = ({ playing, onClick }: { playing: boolean; onClick: () => void }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>
    {playing ? '❚❚' : '►'}
  </button>
);
const VolumeControl = ({ volume, onChange }: { volume: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <input type="range" min={0} max={1} step={0.01} value={volume} onChange={onChange} style={{ width: 80 }} />
);
const ProgressBar = ({ progress, onChange }: { progress: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) => (
  <input type="range" min={0} max={100} value={progress} onChange={onChange} style={{ flex: 1 }} />
);
const FullscreenToggle = ({ fullscreen, onClick }: { fullscreen: boolean; onClick: () => void }) => (
  <button onClick={onClick} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>
    {fullscreen ? '⤢' : '⤡'}
  </button>
);
const QualitySelector = ({ quality, onChange }: { quality: string; onChange: (q: string) => void }) => (
  <select value={quality} onChange={e => onChange(e.target.value)} style={{ borderRadius: 6, padding: 4 }}>
    <option value="1080p">1080p</option>
    <option value="720p">720p</option>
    <option value="480p">480p</option>
  </select>
);
const SubtitleSelector = ({ subtitle, onChange }: { subtitle: string; onChange: (s: string) => void }) => (
  <select value={subtitle} onChange={e => onChange(e.target.value)} style={{ borderRadius: 6, padding: 4 }}>
    <option value="off">Subtitles Off</option>
    <option value="en">English</option>
    <option value="de">German</option>
  </select>
);
const PluginDock = ({ events }: { events: any[] }) => (
  <div style={{ marginLeft: 16, display: 'flex', gap: 8 }}>
    {/* Render plugin events, e.g. live reactions */}
    {events.slice(-3).map((e, i) => (
      <span key={i} style={{ color: '#FFD60A', fontSize: 18 }}>{e.type === 'reaction' ? e.emoji : null}</span>
    ))}
  </div>
);

export default VideoPlayer; 