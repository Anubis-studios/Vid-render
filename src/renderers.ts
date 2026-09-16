// --- MASSIVELY UPGRADED STYLE RENDERERS ---
// Each style is now VISIBLY and DRAMATICALLY different

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  frameCount: number;
  parsed: any;
  shots: any[];
  options: any;
}

export abstract class BaseRenderer {
  protected ctx: CanvasRenderingContext2D;
  protected width: number;
  protected height: number;
  protected frameCount = 0;
  protected parsed: any;
  protected shots: any[];
  protected options: any;

  constructor(canvas: HTMLCanvasElement, parsed: any, shots: any[], options: any) {
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.parsed = parsed;
    this.shots = shots;
    this.options = options;
  }

  abstract renderFrame(): void;
}

// ============================================
// 1. CARTOON STYLE - Bright, bouncy, simple
// ============================================
export class CartoonRenderer extends BaseRenderer {
  renderFrame() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Bright blue sky
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, this.width, this.height);

    // Big yellow sun
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(this.width * 0.8, this.height * 0.2, 60, 0, Math.PI * 2);
    ctx.fill();

    // Green ground
    ctx.fillStyle = '#7EC850';
    ctx.fillRect(0, this.height * 0.7, this.width, this.height * 0.3);

    // Bouncy character
    const bounceY = Math.abs(Math.sin(t * 4)) * 50;
    const charX = this.width / 2;
    const charY = this.height * 0.6 - bounceY;

    // Squash and stretch
    const squash = bounceY > 40 ? 1.3 : 1;
    const stretch = bounceY > 40 ? 0.7 : 1;

    ctx.save();
    ctx.translate(charX, charY);
    ctx.scale(squash, stretch);

    // Red body
    ctx.fillStyle = '#FF6B6B';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Big eyes
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(-15, -10, 12, 0, Math.PI * 2);
    ctx.arc(15, -10, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pupils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-15, -10, 6, 0, Math.PI * 2);
    ctx.arc(15, -10, 6, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 5, 20, 0, Math.PI);
    ctx.stroke();

    ctx.restore();

    this.frameCount++;
  }
}

// ============================================
// 2. ANIME STYLE - Detailed, sakura, sunset
// ============================================
export class AnimeRenderer extends BaseRenderer {
  renderFrame() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Sunset gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#FF6B9D');
    grad.addColorStop(0.5, '#FFA07A');
    grad.addColorStop(1, '#87CEEB');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Large sun
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.arc(this.width * 0.7, this.height * 0.4, 80, 0, Math.PI * 2);
    ctx.fill();

    // Falling sakura petals
    ctx.fillStyle = '#FFB7C5';
    for (let i = 0; i < 20; i++) {
      const x = (i * 50 + t * 30) % this.width;
      const y = (i * 30 + t * 50) % this.height;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t + i);
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Anime character with big eyes
    const charX = this.width / 2;
    const charY = this.height * 0.6;

    // Hair (flowing)
    ctx.fillStyle = '#2C1810';
    ctx.beginPath();
    ctx.ellipse(charX, charY - 50, 50, 70, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = '#FFE4C4';
    ctx.beginPath();
    ctx.arc(charX, charY - 30, 35, 0, Math.PI * 2);
    ctx.fill();

    // HUGE anime eyes
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.ellipse(charX - 15, charY - 35, 12, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(charX + 15, charY - 35, 12, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Blue irises
    const irisGrad = ctx.createRadialGradient(charX - 15, charY - 35, 0, charX - 15, charY - 35, 10);
    irisGrad.addColorStop(0, '#4169E1');
    irisGrad.addColorStop(1, '#1E3A8A');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(charX - 15, charY - 35, 10, 0, Math.PI * 2);
    ctx.arc(charX + 15, charY - 35, 10, 0, Math.PI * 2);
    ctx.fill();

    // Highlights
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(charX - 18, charY - 38, 4, 0, Math.PI * 2);
    ctx.arc(charX + 12, charY - 38, 4, 0, Math.PI * 2);
    ctx.fill();

    this.frameCount++;
  }
}

// ============================================
// 3. PIXEL ART STYLE - 8-bit retro game
// ============================================
export class PixelRenderer extends BaseRenderer {
  private pixelSize = 8;

  private drawPixel(x: number, y: number, color: string) {
    const ctx = this.ctx;
    const ps = this.pixelSize;
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x / ps) * ps, Math.floor(y / ps) * ps, ps, ps);
  }

  renderFrame() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Dark blue sky
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.width, this.height);

    // Pixelated stars
    for (let i = 0; i < 30; i++) {
      const x = (Math.sin(i * 123) * 0.5 + 0.5) * this.width;
      const y = (Math.cos(i * 456) * 0.5 + 0.5) * this.height * 0.6;
      const blink = Math.sin(t * 2 + i) > 0 ? '#FFF' : '#888';
      this.drawPixel(x, y, blink);
    }

    // Green pixel ground
    for (let x = 0; x < this.width; x += this.pixelSize) {
      for (let y = this.height * 0.7; y < this.height; y += this.pixelSize) {
        const shade = ((x + y) / this.pixelSize) % 2 === 0 ? '#2d5a2d' : '#1a401a';
        this.drawPixel(x, y, shade);
      }
    }

    // Pixel character (walking animation)
    const frame = Math.floor(t * 4) % 4;
    const charX = this.width / 2;
    const charY = this.height * 0.6;
    const ps = this.pixelSize;

    // Head
    this.drawPixel(charX - ps, charY - ps * 4, '#FFE4C4');
    this.drawPixel(charX, charY - ps * 4, '#FFE4C4');
    this.drawPixel(charX + ps, charY - ps * 4, '#FFE4C4');
    this.drawPixel(charX - ps, charY - ps * 3, '#FFE4C4');
    this.drawPixel(charX, charY - ps * 3, '#FFE4C4');
    this.drawPixel(charX + ps, charY - ps * 3, '#FFE4C4');

    // Eyes
    this.drawPixel(charX - ps, charY - ps * 3, '#000');
    this.drawPixel(charX + ps, charY - ps * 3, '#000');

    // Body (red)
    this.drawPixel(charX - ps, charY - ps * 2, '#FF0000');
    this.drawPixel(charX, charY - ps * 2, '#FF0000');
    this.drawPixel(charX + ps, charY - ps * 2, '#FF0000');
    this.drawPixel(charX - ps, charY - ps, '#FF0000');
    this.drawPixel(charX, charY - ps, '#FF0000');
    this.drawPixel(charX + ps, charY - ps, '#FF0000');

    // Legs (animated)
    if (frame === 0 || frame === 2) {
      this.drawPixel(charX - ps, charY, '#0000FF');
      this.drawPixel(charX + ps, charY, '#0000FF');
    } else {
      this.drawPixel(charX - ps * 2, charY, '#0000FF');
      this.drawPixel(charX + ps * 2, charY, '#0000FF');
    }

    // HUD
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`SCORE: ${this.frameCount * 10}`, 20, 30);

    this.frameCount++;
  }
}

// ============================================
// 4. CYBERPUNK STYLE - Neon rain, glitch
// ============================================
export class CyberpunkRenderer extends BaseRenderer {
  renderFrame() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Dark purple gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0a0015');
    grad.addColorStop(0.5, '#1a0030');
    grad.addColorStop(1, '#0a0020');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Neon grid floor
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 10;

    for (let i = 0; i < 15; i++) {
      const y = this.height * 0.6 + i * 20;
      ctx.globalAlpha = 1 - i * 0.05;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    for (let i = -10; i <= 10; i++) {
      ctx.beginPath();
      ctx.moveTo(this.width / 2, this.height * 0.6);
      ctx.lineTo(this.width / 2 + i * 60, this.height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Rain
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 100; i++) {
      const x = (Math.sin(i * 45) * 0.5 + 0.5) * this.width;
      const y = ((t * 300 + i * 30) % this.height);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 1, y + 15);
      ctx.stroke();
    }

    // Neon character (wireframe)
    const charX = this.width / 2;
    const charY = this.height * 0.5;

    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;

    // Head (triangle)
    ctx.beginPath();
    ctx.moveTo(charX, charY - 60);
    ctx.lineTo(charX - 25, charY - 20);
    ctx.lineTo(charX + 25, charY - 20);
    ctx.closePath();
    ctx.stroke();

    // Body (diamond)
    ctx.strokeStyle = '#ff00ff';
    ctx.shadowColor = '#ff00ff';
    ctx.beginPath();
    ctx.moveTo(charX, charY - 20);
    ctx.lineTo(charX - 30, charY + 20);
    ctx.lineTo(charX, charY + 60);
    ctx.lineTo(charX + 30, charY + 20);
    ctx.closePath();
    ctx.stroke();

    // Glitch effect
    if (Math.sin(t * 7) > 0.95) {
      const sliceY = Math.random() * this.height;
      const sliceH = Math.random() * 20 + 5;
      const offset = (Math.random() - 0.5) * 30;
      const imageData = ctx.getImageData(0, sliceY, this.width, sliceH);
      ctx.putImageData(imageData, offset, sliceY);
    }

    ctx.shadowBlur = 0;
    this.frameCount++;
  }
}

// ============================================
// 5. WATERCOLOR STYLE - Soft, bleeding
// ============================================
export class WatercolorRenderer extends BaseRenderer {
  renderFrame() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Paper texture
    ctx.fillStyle = '#FAF0E6';
    ctx.fillRect(0, 0, this.width, this.height);

    // Watercolor blobs
    const colors = ['#FFB7C5', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C'];
    for (let i = 0; i < 15; i++) {
      const x = (Math.sin(i * 78 + t) * 0.5 + 0.5) * this.width;
      const y = (Math.cos(i * 45 + t) * 0.5 + 0.5) * this.height;
      const r = 80 + Math.sin(t + i) * 20;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, colors[i % 5] + 'AA');
      grad.addColorStop(0.7, colors[i % 5] + '44');
      grad.addColorStop(1, colors[i % 5] + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft character (blurred edges)
    const charX = this.width / 2;
    const charY = this.height * 0.6;

    // Body (soft gradient)
    const bodyGrad = ctx.createRadialGradient(charX, charY, 0, charX, charY, 50);
    bodyGrad.addColorStop(0, '#FF6B6BCC');
    bodyGrad.addColorStop(0.7, '#FF6B6B66');
    bodyGrad.addColorStop(1, '#FF6B6B00');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(charX, charY, 50, 0, Math.PI * 2);
    ctx.fill();

    // Head (soft)
    const headGrad = ctx.createRadialGradient(charX, charY - 40, 0, charX, charY - 40, 35);
    headGrad.addColorStop(0, '#FFE4C4CC');
    headGrad.addColorStop(0.8, '#FFE4C466');
    headGrad.addColorStop(1, '#FFE4C400');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(charX, charY - 40, 35, 0, Math.PI * 2);
    ctx.fill();

    // Soft eyes
    ctx.fillStyle = '#4169E1AA';
    ctx.beginPath();
    ctx.arc(charX - 12, charY - 45, 6, 0, Math.PI * 2);
    ctx.arc(charX + 12, charY - 45, 6, 0, Math.PI * 2);
    ctx.fill();

    this.frameCount++;
  }
}

// ============================================
// 6. COMIC BOOK STYLE - Halftone, POW!
// ============================================
export class ComicRenderer extends BaseRenderer {
  renderFrame() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Yellow background
    ctx.fillStyle = '#FFFF00';
    ctx.fillRect(0, 0, this.width, this.height);

    // Halftone dots
    ctx.fillStyle = '#FFA500';
    for (let x = 0; x < this.width; x += 12) {
      for (let y = 0; y < this.height; y += 12) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Radiating lines
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.strokeStyle = '#FF4500';
    ctx.lineWidth = 4;
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + t * 0.5;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 100, Math.sin(angle) * 100);
      ctx.lineTo(Math.cos(angle) * 500, Math.sin(angle) * 500);
      ctx.stroke();
    }
    ctx.restore();

    // Bold character
    const charX = this.width / 2;
    const charY = this.height * 0.6;

    ctx.fillStyle = '#FF0000';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(charX, charY, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Big eyes
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.ellipse(charX - 20, charY - 10, 15, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(charX + 20, charY - 10, 15, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // POW! text
    if (Math.floor(t * 2) % 3 === 0) {
      ctx.save();
      ctx.translate(charX + 100, charY - 80);
      ctx.rotate(Math.sin(t * 5) * 0.2);

      // Starburst
      ctx.fillStyle = '#FFF';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const r = i % 2 === 0 ? 60 : 40;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Text
      ctx.fillStyle = '#FF0000';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.font = 'bold 40px Arial Black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText('POW!', 0, 0);
      ctx.fillText('POW!', 0, 0);

      ctx.restore();
    }

    this.frameCount++;
  }
}

// ============================================
// 7. NOIR STYLE - Black & white, moody
// ============================================
export class NoirRenderer extends BaseRenderer {
  renderFrame() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Dark gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0a0a0a');
    grad.addColorStop(0.5, '#1a1a1a');
    grad.addColorStop(1, '#000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Venetian blind shadows
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 10; i++) {
      const y = i * 40 + Math.sin(t * 0.5) * 10;
      ctx.fillRect(0, y, this.width, 15);
    }

    // Street lamp glow
    const lampX = this.width * 0.2;
    const lampY = this.height * 0.3;
    const lampGrad = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, 150);
    lampGrad.addColorStop(0, 'rgba(255, 255, 200, 0.4)');
    lampGrad.addColorStop(1, 'rgba(255, 255, 200, 0)');
    ctx.fillStyle = lampGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Rain
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 50; i++) {
      const x = (Math.sin(i * 45) * 0.5 + 0.5) * this.width;
      const y = ((t * 200 + i * 30) % this.height);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + 15);
      ctx.stroke();
    }

    // Silhouette character
    const charX = this.width / 2;
    const charY = this.height * 0.6;

    ctx.fillStyle = '#000';
    // Trench coat
    ctx.beginPath();
    ctx.moveTo(charX - 30, charY - 40);
    ctx.lineTo(charX - 40, charY + 60);
    ctx.lineTo(charX + 40, charY + 60);
    ctx.lineTo(charX + 30, charY - 40);
    ctx.closePath();
    ctx.fill();

    // Fedora hat
    ctx.beginPath();
    ctx.ellipse(charX, charY - 50, 35, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(charX - 20, charY - 70, 40, 20);

    // Glowing eyes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(charX - 10, charY - 45, 3, 0, Math.PI * 2);
    ctx.arc(charX + 10, charY - 45, 3, 0, Math.PI * 2);
    ctx.fill();

    // Vignette
    const vigGrad = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.height * 0.3,
      this.width / 2, this.height / 2, this.height * 0.7
    );
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    this.frameCount++;
  }
}

// Factory function
export function createRenderer(style: string, canvas: HTMLCanvasElement, parsed: any, shots: any[], options: any): BaseRenderer {
  switch (style.toUpperCase()) {
    case 'CARTOON': return new CartoonRenderer(canvas, parsed, shots, options);
    case 'ANIME': return new AnimeRenderer(canvas, parsed, shots, options);
    case 'PIXEL ART':
    case 'PIXEL': return new PixelRenderer(canvas, parsed, shots, options);
    case 'CYBERPUNK': return new CyberpunkRenderer(canvas, parsed, shots, options);
    case 'WATERCOLOR': return new WatercolorRenderer(canvas, parsed, shots, options);
    case 'COMIC':
    case 'COMIC BOOK': return new ComicRenderer(canvas, parsed, shots, options);
    case 'NOIR': return new NoirRenderer(canvas, parsed, shots, options);
    default: return new CartoonRenderer(canvas, parsed, shots, options);
  }
}

export const AVAILABLE_STYLES = [
  { id: 'CARTOON', name: 'Cartoon', description: 'Bright bouncy characters' },
  { id: 'ANIME', name: 'Anime', description: 'Japanese animation style' },
  { id: 'PIXEL ART', name: 'Pixel Art', description: '8-bit retro game' },
  { id: 'CYBERPUNK', name: 'Cyberpunk', description: 'Neon rain & glitch' },
  { id: 'WATERCOLOR', name: 'Watercolor', description: 'Soft bleeding paint' },
  { id: 'COMIC BOOK', name: 'Comic Book', description: 'Halftone & POW!' },
  { id: 'NOIR', name: 'Film Noir', description: 'Black & white moody' },
];

export const DURATION_OPTIONS = [
  { value: 3, label: '3 seconds' },
  { value: 6, label: '6 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 15, label: '15 seconds' },
];

export const RESOLUTION_OPTIONS = [
  { value: '480p', label: '480p (640×360)', width: 640, height: 360 },
  { value: '720p', label: '720p (1280×720)', width: 1280, height: 720 },
];

export const FPS_OPTIONS = [
  { value: 24, label: '24 FPS' },
  { value: 30, label: '30 FPS' },
  { value: 60, label: '60 FPS' },
];

export interface RenderOptions {
  duration: number;
  fps: number;
  resolution: string;
  style: string;
}
