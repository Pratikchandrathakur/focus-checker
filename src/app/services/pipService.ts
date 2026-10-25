// Picture-in-Picture Service for FocusChecker
// Supports:
// 1. Chrome/Edge Document Picture-in-Picture API (floating native HTML window)
// 2. HTML5 Canvas/Video Picture-in-Picture (floating video stream with canvas rendering)

class PictureInPictureService {
  private pipWindow: Window | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private video: HTMLVideoElement | null = null;
  private animFrameId: number | null = null;

  public isSupported(): boolean {
    const docPip = typeof window !== 'undefined' && 'documentPictureInPicture' in window;
    const videoPip = typeof document !== 'undefined' && Boolean(document.pictureInPictureEnabled);
    return Boolean(docPip || videoPip);
  }

  // Draw a frame onto the canvas
  private drawFrame(
    ctx: CanvasRenderingContext2D,
    time: string,
    mode: string,
    progress: number,
    active: boolean
  ) {
    // Background (Soft clay carbon)
    ctx.fillStyle = '#0b111c';
    ctx.fillRect(0, 0, 400, 240);

    // Circular dial gauge
    const cx = 95;
    const cy = 120;
    const r = 58;

    // Base track
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#1e293b';
    ctx.stroke();

    // Active progress arc
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * Math.max(0.01, progress)));
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineCap = 'round';
    ctx.stroke();

    // Inner disc
    ctx.beginPath();
    ctx.arc(cx, cy, r - 12, 0, 2 * Math.PI);
    ctx.fillStyle = '#162032';
    ctx.fill();

    // Fingerprint indicator icon inside inner disc
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', cx, cy + 6);

    // Right Column Information
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(mode.toUpperCase(), 185, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px monospace';
    ctx.fillText(time, 185, 135);

    ctx.fillStyle = active ? '#10b981' : '#f59e0b';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(active ? '● IN FLOW' : '⏸ PAUSED', 185, 175);
  }

  public async requestCanvasPiP(
    getTimeText: () => string,
    getModeText: () => string,
    getProgress: () => number,
    getIsActive: () => boolean
  ): Promise<boolean> {
    try {
      // 1. Check if Document Picture-in-Picture API is supported (Chrome 116+)
      if (typeof window !== 'undefined' && 'documentPictureInPicture' in window) {
        try {
          const pipWin = await (window as any).documentPictureInPicture.requestWindow({
            width: 320,
            height: 220,
          });

          // Copy stylesheets
          [...document.styleSheets].forEach((styleSheet) => {
            try {
              const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
              const style = document.createElement('style');
              style.textContent = cssRules;
              pipWin.document.head.appendChild(style);
            } catch {
              const link = document.createElement('link');
              link.rel = 'stylesheet';
              link.type = styleSheet.type;
              link.media = styleSheet.media;
              link.href = styleSheet.href;
              pipWin.document.head.appendChild(link);
            }
          });

          const body = pipWin.document.body;
          body.style.margin = '0';
          body.style.padding = '16px';
          body.style.background = '#0b111c';
          body.style.color = '#ffffff';
          body.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          body.style.display = 'flex';
          body.style.flexDirection = 'column';
          body.style.justifyContent = 'center';
          body.style.alignItems = 'center';
          body.style.height = '100vh';
          body.style.boxSizing = 'border-box';

          const container = pipWin.document.createElement('div');
          container.style.textAlign = 'center';
          body.appendChild(container);

          const updateDoc = () => {
            if (!this.pipWindow) return;
            const time = getTimeText();
            const mode = getModeText();
            const active = getIsActive();

            container.innerHTML = `
              <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                ${mode}
              </div>
              <div style="font-size: 40px; font-weight: 800; font-family: monospace; letter-spacing: -1px; margin-bottom: 6px;">
                ${time}
              </div>
              <div style="font-size: 12px; font-weight: 700; color: ${active ? '#10b981' : '#f59e0b'};">
                ${active ? '● Active Focus' : '⏸ Session Paused'}
              </div>
            `;
          };

          this.pipWindow = pipWin;
          updateDoc();
          const timer = setInterval(updateDoc, 500);

          pipWin.addEventListener('pagehide', () => {
            clearInterval(timer);
            this.pipWindow = null;
          });

          return true;
        } catch (docErr) {
          console.warn('Document PiP request rejected, attempting Canvas fallback:', docErr);
        }
      }

      // 2. Fallback: Universal HTML5 Canvas + Video PiP
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 400;
        this.canvas.height = 240;
      }

      const ctx = this.canvas.getContext('2d');
      if (!ctx) return false;

      // Draw initial frame BEFORE captureStream to ensure video has valid dimensions
      this.drawFrame(ctx, getTimeText(), getModeText(), getProgress(), getIsActive());

      if (!this.video) {
        this.video = document.createElement('video');
        this.video.muted = true;
        this.video.playsInline = true;
        this.video.autoplay = true;
        this.video.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;opacity:0.01;pointer-events:none;';
      }

      if (!document.body.contains(this.video)) {
        document.body.appendChild(this.video);
      }

      const stream = this.canvas.captureStream(20);
      this.video.srcObject = stream;

      await this.video.play();

      // Continuous render loop
      const render = () => {
        if (!this.canvas) return;
        const currentCtx = this.canvas.getContext('2d');
        if (!currentCtx) return;

        this.drawFrame(currentCtx, getTimeText(), getModeText(), getProgress(), getIsActive());
        this.animFrameId = requestAnimationFrame(render);
      };

      render();

      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return false;
      }

      // Request Picture in Picture on user gesture
      await this.video.requestPictureInPicture();

      this.video.addEventListener('leavepictureinpicture', () => {
        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      }, { once: true });

      return true;
    } catch (err) {
      console.warn('Picture-in-Picture failed:', err);
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
