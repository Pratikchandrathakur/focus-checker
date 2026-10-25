// Picture-in-Picture Service for FocusChecker
// Supports:
// 1. Chrome/Edge Document Picture-in-Picture API (floating native HTML window with interactive React controls)
// 2. High-DPI Canvas + Video Picture-in-Picture fallback (floating video stream with smooth continuous rendering)

export interface PipLiveState {
  time: string;
  mode: string;
  progress: number;
  isActive: boolean;
  isBreak: boolean;
  soundscape: string;
}

export interface PipCallbacks {
  onToggleTimer?: () => void;
  onResetTimer?: () => void;
  onStopSoundscape?: () => void;
}

class PictureInPictureService {
  private canvas: HTMLCanvasElement | null = null;
  private video: HTMLVideoElement | null = null;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;

  public isDocumentPiPSupported(): boolean {
    return typeof window !== 'undefined' && 'documentPictureInPicture' in window;
  }

  public isVideoPiPSupported(): boolean {
    return typeof document !== 'undefined' && Boolean(document.pictureInPictureEnabled);
  }

  public isSupported(): boolean {
    return this.isDocumentPiPSupported() || this.isVideoPiPSupported();
  }

  // Draw high-resolution claymorphic frame on canvas
  private drawFrame(
    ctx: CanvasRenderingContext2D,
    state: PipLiveState
  ) {
    const w = 600;
    const h = 340;

    // Reset transform & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // Clay background (deep slate carbon)
    ctx.fillStyle = '#0b111c';
    ctx.fillRect(0, 0, w, h);

    // Soft Card Container with rounded corners
    const cardX = 16;
    const cardY = 16;
    const cardW = w - 32;
    const cardH = h - 32;
    const radius = 24;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fillStyle = '#141d2e';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#27354f';
    ctx.stroke();

    // Subtle inner top highlight
    const grad = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // Circular Dial Gauge on the Left
    const cx = 150;
    const cy = 170;
    const dialRadius = 88;

    // Perimeter Ticks (36 ticks)
    ctx.save();
    for (let i = 0; i < 36; i++) {
      const angle = (i * 10 * Math.PI) / 180;
      const isMajor = i % 3 === 0;
      const tickInner = dialRadius + 14;
      const tickOuter = dialRadius + (isMajor ? 24 : 19);

      const x1 = cx + Math.cos(angle) * tickInner;
      const y1 = cy + Math.sin(angle) * tickInner;
      const x2 = cx + Math.cos(angle) * tickOuter;
      const y2 = cy + Math.sin(angle) * tickOuter;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = isMajor ? 2.5 : 1.2;
      ctx.strokeStyle = isMajor ? 'rgba(148, 163, 184, 0.45)' : 'rgba(148, 163, 184, 0.2)';
      ctx.stroke();
    }
    ctx.restore();

    // Dial Base Track
    ctx.beginPath();
    ctx.arc(cx, cy, dialRadius, 0, 2 * Math.PI);
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    // Dial Active Arc
    const progress = Math.max(0.01, Math.min(1, state.progress));
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + 2 * Math.PI * progress;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, dialRadius, startAngle, endAngle);
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';

    const arcGrad = ctx.createLinearGradient(cx - dialRadius, cy, cx + dialRadius, cy);
    if (state.isBreak) {
      arcGrad.addColorStop(0, '#10b981');
      arcGrad.addColorStop(1, '#34d399');
    } else if (state.mode.toLowerCase().includes('pomodoro') || state.mode.toLowerCase().includes('flow')) {
      arcGrad.addColorStop(0, '#f97316');
      arcGrad.addColorStop(1, '#ef4444');
    } else {
      arcGrad.addColorStop(0, '#0ea5e9');
      arcGrad.addColorStop(1, '#a855f7');
    }
    ctx.strokeStyle = arcGrad;
    ctx.stroke();
    ctx.restore();

    // Inner Disc
    ctx.beginPath();
    ctx.arc(cx, cy, dialRadius - 16, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#334155';
    ctx.stroke();

    // Center Icon inside Dial
    if (state.mode.toLowerCase().includes('pomodoro') || state.mode.toLowerCase().includes('flow')) {
      // Draw Tomato Icon
      const tx = cx;
      const ty = cy + 2;
      
      // Tomato Red Body
      ctx.save();
      ctx.beginPath();
      ctx.arc(tx, ty, 20, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444';
      ctx.fill();

      // Tomato highlight
      ctx.beginPath();
      ctx.arc(tx - 6, ty - 6, 6, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fill();

      // Calyx (Green Leafy Stem)
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(tx, ty - 18, 5, 8, 0, 0, 2 * Math.PI);
      ctx.ellipse(tx - 8, ty - 15, 4, 7, -0.4, 0, 2 * Math.PI);
      ctx.ellipse(tx + 8, ty - 15, 4, 7, 0.4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    } else {
      // Biometric Focus Icon
      ctx.save();
      ctx.fillStyle = state.isActive ? '#38bdf8' : '#94a3b8';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚡', cx, cy);
      ctx.restore();
    }

    // Right Column Information Area
    const textLeft = 280;

    // Header Mode Pill
    ctx.save();
    ctx.fillStyle = state.isBreak
      ? '#065f46'
      : state.mode.toLowerCase().includes('pomodoro')
      ? '#7c2d12'
      : '#0c4a6e';
    ctx.beginPath();
    ctx.roundRect(textLeft, 52, 180, 26, 13);
    ctx.fill();

    ctx.fillStyle = state.isBreak
      ? '#34d399'
      : state.mode.toLowerCase().includes('pomodoro')
      ? '#fb923c'
      : '#38bdf8';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.mode.toUpperCase(), textLeft + 90, 65);
    ctx.restore();

    // Big Digital Countdown Display
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 64px "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(state.time, textLeft, 155);
    ctx.restore();

    // Status Pill (Flowing vs Paused)
    ctx.save();
    const statusY = 195;
    ctx.beginPath();
    ctx.arc(textLeft + 7, statusY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = state.isActive ? '#10b981' : '#f59e0b';
    ctx.fill();

    ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = state.isActive ? '#10b981' : '#f59e0b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.isActive ? 'Active Deep Focus' : 'Session Paused', textLeft + 20, statusY);
    ctx.restore();

    // Audio status bar at bottom right
    ctx.save();
    const audioY = 245;
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.roundRect(textLeft, audioY, 280, 34, 10);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.stroke();

    const hasAudio = state.soundscape && state.soundscape !== 'none';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = hasAudio ? '#38bdf8' : '#94a3b8';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      hasAudio ? `♪ Soundscape: ${state.soundscape}` : '♪ Sound: Muted / Off',
      textLeft + 14,
      audioY + 17
    );
    ctx.restore();

    // Bottom subtle helper caption
    ctx.save();
    ctx.font = '10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'left';
    ctx.fillText('Use browser tab or OS media controls to Pause/Play', textLeft, 305);
    ctx.restore();
  }

  // Launch Canvas/Video Picture-in-Picture
  public async requestCanvasPiP(
    getState: () => PipLiveState,
    callbacks?: PipCallbacks
  ): Promise<boolean> {
    try {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 600;
        this.canvas.height = 340;
      }

      const ctx = this.canvas.getContext('2d');
      if (!ctx) return false;

      // Draw initial frame
      this.drawFrame(ctx, getState());

      if (!this.video) {
        this.video = document.createElement('video');
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.autoplay = true;
        this.video.style.cssText =
          'position:fixed;width:1px;height:1px;left:-9999px;opacity:0.01;pointer-events:none;';
      }

      if (!document.body.contains(this.video)) {
        document.body.appendChild(this.video);
      }

      const stream = this.canvas.captureStream(24);
      this.video.srcObject = stream;
      await this.video.play();

      this.isRunning = true;

      // Smooth continuous render loop that reads dynamic state every frame
      const render = () => {
        if (!this.isRunning || !this.canvas) return;
        const currentCtx = this.canvas.getContext('2d');
        if (currentCtx) {
          const currentState = getState();
          this.drawFrame(currentCtx, currentState);

          // Update navigator mediaSession metadata for lockscreen / OS overlay
          if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: `${currentState.time} • ${currentState.mode}`,
              artist: 'FocusChecker Pro',
              album: currentState.isActive ? 'Active Focus' : 'Paused',
            });
          }
        }
        this.animFrameId = requestAnimationFrame(render);
      };

      this.animFrameId = requestAnimationFrame(render);

      // Register OS MediaSession Actions so keyboard / headphone / PiP buttons work
      if ('mediaSession' in navigator && callbacks) {
        if (callbacks.onToggleTimer) {
          navigator.mediaSession.setActionHandler('play', () => callbacks.onToggleTimer?.());
          navigator.mediaSession.setActionHandler('pause', () => callbacks.onToggleTimer?.());
        }
        if (callbacks.onResetTimer) {
          navigator.mediaSession.setActionHandler('stop', () => callbacks.onResetTimer?.());
        }
      }

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return false;
      }

      await this.video.requestPictureInPicture();

      this.video.addEventListener(
        'leavepictureinpicture',
        () => {
          this.isRunning = false;
          if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
          }
        },
        { once: true }
      );

      return true;
    } catch (err) {
      console.warn('Canvas Picture-in-Picture failed:', err);
      this.isRunning = false;
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      return false;
    }
  }

  public isPiPActive(): boolean {
    return Boolean(document.pictureInPictureElement);
  }

  public async exitPiP() {
    try {
      this.isRunning = false;
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
        this.animFrameId = null;
      }
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
    } catch {}
  }
}

export const pipService = new PictureInPictureService();
