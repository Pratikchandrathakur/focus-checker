// Picture-in-Picture Service for FocusChecker
// Supports:
// 1. Chrome/Edge Document Picture-in-Picture API (floating native window)
// 2. Universal HTML5 Canvas/Video Picture-in-Picture (floating video stream on top of any OS window)

class PictureInPictureService {
  private pipWindow: Window | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private video: HTMLVideoElement | null = null;
  private animFrameId: number | null = null;

  public isSupported(): boolean {
    const docPip = typeof window !== 'undefined' && 'documentPictureInPicture' in window;
    const videoPip = typeof document !== 'undefined' && document.pictureInPictureEnabled;
    return Boolean(docPip || videoPip);
  }

  // Launch Universal Canvas / Video Picture-in-Picture
  public async requestCanvasPiP(
    getTimeText: () => string,
    getModeText: () => string,
    getProgress: () => number,
    getIsActive: () => boolean
  ): Promise<boolean> {
    try {
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 400;
        this.canvas.height = 240;
      }
      if (!this.video) {
        this.video = document.createElement('video');
        this.video.muted = true;
        this.video.playsInline = true;
      }

      const stream = this.canvas.captureStream(15);
      this.video.srcObject = stream;
      await this.video.play();

      // Render loop on canvas
      const render = () => {
        if (!this.canvas) return;
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;

        const time = getTimeText();
        const mode = getModeText();
        const progress = getProgress();
        const active = getIsActive();

        // Background (Soft clay slate)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 400, 240);

        // Circular gauge
        const cx = 100;
        const cy = 120;
        const r = 60;

        // Base ring
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#1e293b';
        ctx.stroke();

        // Active Arc
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * progress));
        ctx.lineWidth = 10;
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineCap = 'round';
        ctx.stroke();

        // Inner circle
        ctx.beginPath();
        ctx.arc(cx, cy, r - 12, 0, 2 * Math.PI);
        ctx.fillStyle = '#1e293b';
        ctx.fill();

        // Text Info (Right column)
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText(mode.toUpperCase(), 200, 85);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 44px monospace';
        ctx.fillText(time, 200, 140);

        ctx.fillStyle = active ? '#10b981' : '#f59e0b';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText(active ? '● IN SESSION' : '⏸ PAUSED', 200, 180);

        this.animFrameId = requestAnimationFrame(render);
      };

      render();

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return false;
      }

      await this.video.requestPictureInPicture();

      this.video.addEventListener('leavepictureinpicture', () => {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      }, { once: true });

      return true;
    } catch (err) {
      console.warn('PiP launch error:', err);
      return false;
    }
  }

  public isPiPActive(): boolean {
    return Boolean(document.pictureInPictureElement || this.pipWindow);
  }

  public async exitPiP() {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      if (this.pipWindow) {
        this.pipWindow.close();
        this.pipWindow = null;
      }
      if (this.animFrameId) {
        cancelAnimationFrame(this.animFrameId);
      }
    } catch {}
  }
}

export const pipService = new PictureInPictureService();
