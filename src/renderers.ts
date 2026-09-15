// --- Style Renderers ---
// Each renderer implements a distinct visual style

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  frameCount: number;
  parsed: ParsedPrompt;
  shots: Shot[];
  options: RenderOptions;
}

export interface ParsedPrompt {
  style: string;
  mood: string;
  subjects: string[];
  environment: string;
  effects: string[];
  colors: string[];
  keywords: string[];
}

export interface Shot {
  id: number;
  description: string;
  duration: number;
  camera: string;
  action: string;
}

export interface RenderOptions {
  duration: number; // seconds
  fps: number;
  resolution: string;
  style: string;
}

// --- Easing Functions ---
export function easeOutBounce(x: number): number {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

export function easeOutElastic(x: number): number {
  if (x === 0 || x === 1) return x;
  return Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI / 3)) + 1;
}

export function easeInOutQuad(x: number): number {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

// --- Base Renderer ---
export abstract class BaseRenderer {
  protected ctx: CanvasRenderingContext2D;
  protected width: number;
  protected height: number;
  protected frameCount = 0;
  protected parsed: ParsedPrompt;
  protected shots: Shot[];
  protected options: RenderOptions;
  protected charX: number;
  protected charY: number;
  protected charScaleX = 1;
  protected charScaleY = 1;
  protected charRotation = 0;

  constructor(canvas: HTMLCanvasElement, parsed: ParsedPrompt, shots: Shot[], options: RenderOptions) {
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
    this.parsed = parsed;
    this.shots = shots;
    this.options = options;
    this.charX = this.width / 2;
    this.charY = this.height * 0.65;
  }

  protected getCurrentShot(): Shot {
    const totalDuration = this.shots.reduce((sum, s) => sum + s.duration, 0);
    const currentTime = (this.frameCount / (this.options.fps || 30)) % totalDuration;
    let elapsed = 0;
    for (const shot of this.shots) {
      elapsed += shot.duration;
      if (currentTime < elapsed) return shot;
    }
    return this.shots[this.shots.length - 1];
  }

  protected applyCamera(shot: Shot) {
    const ctx = this.ctx;
    const t = this.frameCount / (this.options.fps || 30);
    ctx.save();
    switch (shot.camera) {
      case 'PAN_LEFT': ctx.translate(-Math.sin(t * 0.3) * 15, 0); break;
      case 'PAN_RIGHT': ctx.translate(Math.sin(t * 0.3) * 15, 0); break;
      case 'ZOOM_IN':
        const zi = 1 + Math.sin(t * 0.2) * 0.08;
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(zi, zi);
        ctx.translate(-this.width / 2, -this.height / 2);
        break;
      case 'ZOOM_OUT':
        const zo = 1 - Math.sin(t * 0.2) * 0.05;
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(zo, zo);
        ctx.translate(-this.width / 2, -this.height / 2);
        break;
      case 'DOLLY': ctx.translate(Math.sin(t * 0.15) * 8, Math.cos(t * 0.15) * 8); break;
      case 'ORBIT':
        ctx.translate(this.width / 2, this.height / 2);
        ctx.rotate(Math.sin(t * 0.08) * 0.03);
        ctx.translate(-this.width / 2, -this.height / 2);
        break;
    }
  }

  protected updateCharacterMotion(shot: Shot) {
    const t = this.frameCount / (this.options.fps || 30);
    let targetX = this.width / 2;
    let targetY = this.height * 0.65;

    switch (shot.action) {
      case 'ENTER':
        const ep = Math.min(1, t * 0.8);
        targetX = this.width * (1 - easeOutElastic(ep)) * 0.8 + this.width * 0.2;
        break;
      case 'ACTION':
        const jc = (t * 2) % 2;
        const jh = jc < 1 ? easeOutBounce(jc) : easeOutBounce(2 - jc);
        targetY = this.height * 0.65 - jh * 80;
        targetX = this.width / 2 + Math.sin(t * 3) * 40;
        if (jc < 0.2) { this.charScaleX = 1.3; this.charScaleY = 0.7; }
        else if (jc > 0.8 && jc < 1) { this.charScaleX = 0.8; this.charScaleY = 1.2; }
        else { this.charScaleX = 1; this.charScaleY = 1; }
        break;
      case 'PEAK': targetY = this.height * 0.65 - Math.abs(Math.sin(t * 2)) * 60; break;
      case 'TRANSITION': targetX = this.width / 2 + Math.sin(t * 0.5) * 100; break;
      case 'EXIT':
        const xp = Math.min(1, t * 0.6);
        targetX = this.width / 2 + easeInOutQuad(xp) * this.width * 0.6;
        break;
    }

    this.charX += (targetX - this.charX) * 0.1;
    this.charY += (targetY - this.charY) * 0.1;
    const dx = targetX - this.charX;
    this.charRotation = dx * 0.002;
  }

  abstract renderFrame(): void;

  reset() {
    this.frameCount = 0;
    this.charX = this.width / 2;
    this.charY = this.height * 0.65;
    this.charScaleX = 1;
    this.charScaleY = 1;
    this.charRotation = 0;
  }
}

// --- CARTOON STYLE ---
export class CartoonRenderer extends BaseRenderer {
  private particles: any[] = [];
  private bouncePhase = 0;
  private eyeBlink = 0;
  private tailWag = 0;
  private earFlop = 0;

  private palette = {
    bg: '#87CEEB', ground: '#7EC850',
    accent: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3']
  };

  constructor(canvas: HTMLCanvasElement, parsed: ParsedPrompt, shots: Shot[], options: RenderOptions) {
    super(canvas, parsed, shots, options);
    this.initParticles();
  }

  private initParticles() {
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 2,
        vy: -Math.random() * 2 - 1,
        size: Math.random() * 6 + 2,
        color: this.palette.accent[Math.floor(Math.random() * this.palette.accent.length)],
        life: Math.random(),
        maxLife: 1 + Math.random(),
        rotation: Math.random() * Math.PI * 2,
      });
    }
  }

  private drawCartoonEye(x: number, y: number, size: number) {
    const ctx = this.ctx;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 1.2, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x - size * 0.2, y - size * 0.2, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Sky
    ctx.fillStyle = this.palette.bg;
    ctx.fillRect(0, 0, this.width, this.height);

    // Sun
    ctx.fillStyle = '#FFE66D';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.width * 0.85, this.height * 0.15, 35, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Clouds
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 220 + t * 15) % (this.width + 150)) - 75;
      const cy = 60 + i * 40;
      ctx.beginPath();
      ctx.arc(cx, cy, 20, 0, Math.PI * 2);
      ctx.arc(cx + 20, cy - 5, 25, 0, Math.PI * 2);
      ctx.arc(cx + 45, cy, 20, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }

    // Ground
    ctx.fillStyle = this.palette.ground;
    ctx.fillRect(0, this.height * 0.75, this.width, this.height * 0.25);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.75);
    ctx.lineTo(this.width, this.height * 0.75);
    ctx.stroke();

    // Flowers
    for (let i = 0; i < 8; i++) {
      const fx = (Math.sin(i * 78.9) * 0.5 + 0.5) * this.width;
      const fy = this.height * 0.8 + (Math.cos(i * 34.5) * 0.5 + 0.5) * 40;
      ctx.fillStyle = this.palette.accent[i % 4];
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(fx + Math.cos(angle) * 5, fy + Math.sin(angle) * 5, 4, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle = '#FFE66D';
      ctx.beginPath();
      ctx.arc(fx, fy, 3, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const color = this.palette.accent[0];

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 50, 25, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 20, 20, 25, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(0, -25, 30, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Eyes
    if (this.eyeBlink === 0) {
      this.drawCartoonEye(-10, -30, 8);
      this.drawCartoonEye(10, -30, 8);
    } else {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-15, -30); ctx.lineTo(-5, -30);
      ctx.moveTo(5, -30); ctx.lineTo(15, -30);
      ctx.stroke();
    }

    // Smile
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -15, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Arms
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-20, 10);
    ctx.lineTo(-35, 20 + Math.sin(this.bouncePhase) * 5);
    ctx.moveTo(20, 10);
    ctx.lineTo(35, 20 - Math.sin(this.bouncePhase) * 5);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(-10, 40); ctx.lineTo(-10, 55);
    ctx.moveTo(10, 40); ctx.lineTo(10, 55);
    ctx.stroke();

    ctx.restore();
  }

  private drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.life += 0.02;
      p.rotation += 0.1;

      if (p.life > p.maxLife) {
        p.life = 0;
        p.x = this.charX + (Math.random() - 0.5) * 80;
        p.y = this.charY;
        p.vx = (Math.random() - 0.5) * 4;
        p.vy = -Math.random() * 3 - 2;
      }

      const alpha = 1 - (p.life / p.maxLife);
      const size = p.size * alpha;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;

      // Star shape
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const ox = Math.cos(angle) * size;
        const oy = Math.sin(angle) * size;
        const ia = angle + Math.PI / 5;
        const ix = Math.cos(ia) * size * 0.4;
        const iy = Math.sin(ia) * size * 0.4;
        if (i === 0) ctx.moveTo(ox, oy);
        else ctx.lineTo(ox, oy);
        ctx.lineTo(ix, iy);
      }
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    const t = this.frameCount / 30;

    this.bouncePhase = t * 4;
    this.eyeBlink = Math.sin(t * 5) > 0.95 ? 1 : 0;
    this.tailWag = Math.sin(t * 6) * 0.3;
    this.earFlop = Math.sin(t * 4) * 0.2;

    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawCharacter();
    this.drawParticles();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- ANIME STYLE ---
export class AnimeRenderer extends BaseRenderer {
  private speedLines: { angle: number; length: number; width: number }[] = [];
  private sakura: { x: number; y: number; vx: number; vy: number; rot: number; size: number }[] = [];

  constructor(canvas: HTMLCanvasElement, parsed: ParsedPrompt, shots: Shot[], options: RenderOptions) {
    super(canvas, parsed, shots, options);
    this.initEffects();
  }

  private initEffects() {
    for (let i = 0; i < 30; i++) {
      this.sakura.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: Math.random() * 1 + 0.5,
        vy: Math.random() * 1 + 0.5,
        rot: Math.random() * Math.PI * 2,
        size: Math.random() * 6 + 3,
      });
    }
  }

  private drawAnimeEye(x: number, y: number, size: number) {
    const ctx = this.ctx;
    // Large anime eye
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.8, size * 1.3, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Iris gradient
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size);
    gradient.addColorStop(0, '#4169E1');
    gradient.addColorStop(0.7, '#1E3A8A');
    gradient.addColorStop(1, '#000033');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Highlights
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x - size * 0.3, y - size * 0.3, size * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size * 0.2, y + size * 0.2, size * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Eyelash
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x, y - size * 0.3, size * 0.9, size * 0.4, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
  }

  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Sunset gradient sky
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#FF6B9D');
    gradient.addColorStop(0.3, '#FFA07A');
    gradient.addColorStop(0.6, '#FFD700');
    gradient.addColorStop(1, '#87CEEB');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Sun
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.arc(this.width * 0.7, this.height * 0.4, 60, 0, Math.PI * 2);
    ctx.fill();

    // Distant mountains
    ctx.fillStyle = '#4B0082';
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.7);
    for (let x = 0; x <= this.width; x += 40) {
      const y = this.height * 0.7 - Math.sin(x * 0.02) * 30 - Math.cos(x * 0.01) * 20;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.width, this.height);
    ctx.lineTo(0, this.height);
    ctx.closePath();
    ctx.fill();

    // Ground
    ctx.fillStyle = '#2F4F4F';
    ctx.fillRect(0, this.height * 0.8, this.width, this.height * 0.2);

    // Cherry blossom trees silhouette
    ctx.fillStyle = '#1a1a2e';
    for (let i = 0; i < 3; i++) {
      const tx = 100 + i * 200;
      const ty = this.height * 0.8;
      // Trunk
      ctx.fillRect(tx - 5, ty - 80, 10, 80);
      // Canopy
      ctx.beginPath();
      ctx.arc(tx, ty - 100, 40, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const t = this.frameCount / 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 55, 25, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hair (back)
    ctx.fillStyle = '#2C1810';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -20, 35, 45, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Body (school uniform style)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(0, 25, 18, 28, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Sailor collar
    ctx.fillStyle = '#1E3A8A';
    ctx.beginPath();
    ctx.moveTo(-18, 5);
    ctx.lineTo(0, 20);
    ctx.lineTo(18, 5);
    ctx.lineTo(15, 0);
    ctx.lineTo(-15, 0);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Head
    ctx.fillStyle = '#FFE4C4';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -25, 25, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Hair (front bangs)
    ctx.fillStyle = '#2C1810';
    ctx.beginPath();
    ctx.moveTo(-25, -30);
    ctx.quadraticCurveTo(-15, -50, 0, -48);
    ctx.quadraticCurveTo(15, -50, 25, -30);
    ctx.lineTo(20, -25);
    ctx.quadraticCurveTo(10, -35, 0, -32);
    ctx.quadraticCurveTo(-10, -35, -20, -25);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Eyes
    this.drawAnimeEye(-8, -25, 7);
    this.drawAnimeEye(8, -25, 7);

    // Mouth
    ctx.strokeStyle = '#CC0000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -12, 3, 0, Math.PI);
    ctx.stroke();

    // Blush
    ctx.fillStyle = 'rgba(255, 100, 100, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-15, -15, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(15, -15, 5, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-18, 15);
    ctx.lineTo(-30, 30 + Math.sin(t * 3) * 5);
    ctx.moveTo(18, 15);
    ctx.lineTo(30, 30 - Math.sin(t * 3) * 5);
    ctx.stroke();

    // Skirt
    ctx.fillStyle = '#1E3A8A';
    ctx.beginPath();
    ctx.moveTo(-18, 35);
    ctx.lineTo(-25, 55);
    ctx.lineTo(25, 55);
    ctx.lineTo(18, 35);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Legs
    ctx.strokeStyle = '#FFE4C4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, 55); ctx.lineTo(-8, 70);
    ctx.moveTo(8, 55); ctx.lineTo(8, 70);
    ctx.stroke();

    ctx.restore();
  }

  private drawSakura() {
    const ctx = this.ctx;
    for (const p of this.sakura) {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += 0.05;

      if (p.x > this.width + 10) p.x = -10;
      if (p.y > this.height + 10) { p.y = -10; p.x = Math.random() * this.width; }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = '#FFB7C5';
      ctx.strokeStyle = '#FF69B4';
      ctx.lineWidth = 1;

      // Petal shape
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.restore();
    }
  }

  private drawSpeedLines() {
    const ctx = this.ctx;
    const shot = this.getCurrentShot();
    if (shot.action !== 'ACTION' && shot.action !== 'ENTER') return;

    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;

    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const innerR = 100 + Math.random() * 50;
      const outerR = this.width;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
      ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawSpeedLines();
    this.drawCharacter();
    this.drawSakura();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- PIXEL ART STYLE ---
export class PixelRenderer extends BaseRenderer {
  private pixelSize = 8;

  private drawPixelRect(x: number, y: number, w: number, h: number, color: string) {
    const ctx = this.ctx;
    const ps = this.pixelSize;
    ctx.fillStyle = color;
    ctx.fillRect(
      Math.round(x / ps) * ps,
      Math.round(y / ps) * ps,
      Math.round(w / ps) * ps,
      Math.round(h / ps) * ps
    );
  }

  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;
    const ps = this.pixelSize;

    // Pixelated sky
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, this.width, this.height);

    // Stars
    for (let i = 0; i < 30; i++) {
      const sx = Math.floor((Math.sin(i * 123) * 0.5 + 0.5) * this.width / ps) * ps;
      const sy = Math.floor((Math.cos(i * 456) * 0.5 + 0.5) * this.height * 0.6 / ps) * ps;
      const blink = Math.sin(t * 2 + i) > 0 ? '#FFFFFF' : '#888888';
      this.drawPixelRect(sx, sy, ps, ps, blink);
    }

    // Pixelated ground
    for (let x = 0; x < this.width; x += ps) {
      for (let y = Math.floor(this.height * 0.7 / ps) * ps; y < this.height; y += ps) {
        const shade = ((x + y) / ps) % 3 === 0 ? '#2d5a2d' : '#1a401a';
        this.drawPixelRect(x, y, ps, ps, shade);
      }
    }

    // Pixel buildings
    const buildingColors = ['#4a4a6a', '#3a3a5a', '#5a5a7a'];
    for (let i = 0; i < 6; i++) {
      const bx = Math.floor((i * 110 + 20) / ps) * ps;
      const bh = Math.floor((80 + Math.sin(i * 2) * 30) / ps) * ps;
      const by = Math.floor(this.height * 0.7 / ps) * ps - bh;
      const bw = Math.floor(80 / ps) * ps;

      this.drawPixelRect(bx, by, bw, bh, buildingColors[i % 3]);

      // Windows
      for (let wy = by + ps * 2; wy < by + bh - ps; wy += ps * 3) {
        for (let wx = bx + ps; wx < bx + bw - ps; wx += ps * 2) {
          const on = Math.sin(t + wx + wy) > 0;
          this.drawPixelRect(wx, wy, ps, ps * 2, on ? '#ffff00' : '#222222');
        }
      }
    }
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = Math.round(this.charX / this.pixelSize) * this.pixelSize;
    const y = Math.round(this.charY / this.pixelSize) * this.pixelSize;
    const ps = this.pixelSize;
    const t = this.frameCount / 30;
    const frame = Math.floor(t * 4) % 4;

    // Shadow
    this.drawPixelRect(x - ps * 2, y + ps * 5, ps * 4, ps, 'rgba(0,0,0,0.3)');

    // Body
    this.drawPixelRect(x - ps, y, ps * 2, ps * 3, '#ff6b6b');

    // Head
    this.drawPixelRect(x - ps * 1.5, y - ps * 3, ps * 3, ps * 3, '#ffe4c4');

    // Hair
    this.drawPixelRect(x - ps * 1.5, y - ps * 4, ps * 3, ps, '#8b4513');

    // Eyes
    const eyeFrame = Math.floor(t * 2) % 8;
    if (eyeFrame !== 7) {
      this.drawPixelRect(x - ps, y - ps * 2, ps, ps, '#000000');
      this.drawPixelRect(x + ps * 0.5, y - ps * 2, ps, ps, '#000000');
    }

    // Arms (animated)
    const armOffset = frame % 2 === 0 ? 0 : ps;
    this.drawPixelRect(x - ps * 2, y + armOffset, ps, ps * 2, '#ffe4c4');
    this.drawPixelRect(x + ps * 1.5, y + (ps - armOffset), ps, ps * 2, '#ffe4c4');

    // Legs (walking animation)
    if (frame === 0 || frame === 2) {
      this.drawPixelRect(x - ps, y + ps * 3, ps, ps * 2, '#4169e1');
      this.drawPixelRect(x, y + ps * 3, ps, ps * 2, '#4169e1');
    } else if (frame === 1) {
      this.drawPixelRect(x - ps * 1.5, y + ps * 3, ps, ps * 2, '#4169e1');
      this.drawPixelRect(x + ps * 0.5, y + ps * 3, ps, ps * 2, '#4169e1');
    } else {
      this.drawPixelRect(x - ps * 0.5, y + ps * 3, ps, ps * 2, '#4169e1');
      this.drawPixelRect(x + ps * 1, y + ps * 3, ps, ps * 2, '#4169e1');
    }
  }

  private drawPixelParticles() {
    const ctx = this.ctx;
    const ps = this.pixelSize;
    const t = this.frameCount / 30;
    const colors = ['#ffff00', '#ff00ff', '#00ffff', '#ff0000'];

    for (let i = 0; i < 15; i++) {
      const px = Math.floor(((Math.sin(i * 34 + t * 2) * 0.5 + 0.5) * this.width) / ps) * ps;
      const py = Math.floor(((Math.cos(i * 56 + t * 1.5) * 0.5 + 0.5) * this.height) / ps) * ps;
      this.drawPixelRect(px, py, ps, ps, colors[i % 4]);
    }
  }

  private drawHUD() {
    const ctx = this.ctx;
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(`SCORE: ${this.frameCount * 10}`, 10, 20);
    ctx.fillText(`LVL: ${Math.floor(this.frameCount / 100) + 1}`, 10, 35);

    // Health bar
    ctx.fillStyle = '#333333';
    ctx.fillRect(this.width - 110, 10, 100, 10);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(this.width - 110, 10, 100 * (0.5 + Math.sin(this.frameCount / 60) * 0.5), 10);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.width - 110, 10, 100, 10);
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawCharacter();
    this.drawPixelParticles();
    this.drawHUD();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- REALISTIC STYLE ---
export class RealisticRenderer extends BaseRenderer {
  private particles: any[] = [];

  constructor(canvas: HTMLCanvasElement, parsed: ParsedPrompt, shots: Shot[], options: RenderOptions) {
    super(canvas, parsed, shots, options);
    this.initParticles();
  }

  private initParticles() {
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: Math.random() * 0.5 + 0.2,
        size: Math.random() * 3 + 1,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }
  }

  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Realistic sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height * 0.7);
    skyGrad.addColorStop(0, '#1e3c72');
    skyGrad.addColorStop(0.4, '#2a5298');
    skyGrad.addColorStop(0.7, '#7db9e8');
    skyGrad.addColorStop(1, '#f0e68c');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Sun with glow
    const sunX = this.width * 0.75;
    const sunY = this.height * 0.25;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 100);
    sunGrad.addColorStop(0, 'rgba(255, 255, 200, 1)');
    sunGrad.addColorStop(0.3, 'rgba(255, 200, 100, 0.6)');
    sunGrad.addColorStop(1, 'rgba(255, 150, 50, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Realistic clouds with depth
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 150 + t * 5 * (i + 1)) % (this.width + 200)) - 100;
      const cy = 50 + i * 30;
      const scale = 1 - i * 0.1;

      ctx.fillStyle = `rgba(255, 255, 255, ${0.7 - i * 0.1})`;
      ctx.beginPath();
      for (let j = 0; j < 5; j++) {
        const ox = j * 25 * scale - 50 * scale;
        const oy = Math.sin(j * 1.5) * 10 * scale;
        const r = (20 + Math.random() * 10) * scale;
        ctx.arc(cx + ox, cy + oy, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // Mountains with atmospheric perspective
    for (let layer = 0; layer < 3; layer++) {
      const baseY = this.height * (0.5 + layer * 0.1);
      const alpha = 0.3 + layer * 0.2;
      const color = layer === 0 ? '#4a5568' : layer === 1 ? '#2d3748' : '#1a202c';

      ctx.fillStyle = color;
      ctx.globalAlpha = alpha + 0.3;
      ctx.beginPath();
      ctx.moveTo(0, baseY + 50);
      for (let x = 0; x <= this.width; x += 20) {
        const noise = Math.sin(x * 0.01 + layer) * 40 + Math.cos(x * 0.02 + layer * 2) * 20;
        ctx.lineTo(x, baseY - noise);
      }
      ctx.lineTo(this.width, this.height);
      ctx.lineTo(0, this.height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ground with texture
    const groundGrad = ctx.createLinearGradient(0, this.height * 0.75, 0, this.height);
    groundGrad.addColorStop(0, '#2d5016');
    groundGrad.addColorStop(0.5, '#1a3a0a');
    groundGrad.addColorStop(1, '#0f2006');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.height * 0.75, this.width, this.height * 0.25);
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const t = this.frameCount / 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    // Soft shadow
    const shadowGrad = ctx.createRadialGradient(0, 60, 0, 0, 60, 30);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.4)');
    shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad;
    ctx.beginPath();
    ctx.ellipse(0, 60, 30, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body with gradient shading
    const bodyGrad = ctx.createLinearGradient(-15, -10, 15, 50);
    bodyGrad.addColorStop(0, '#4a5568');
    bodyGrad.addColorStop(0.5, '#2d3748');
    bodyGrad.addColorStop(1, '#1a202c');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 20, 18, 30, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head with skin tone gradient
    const skinGrad = ctx.createRadialGradient(-3, -28, 0, 0, -25, 25);
    skinGrad.addColorStop(0, '#ffd7b5');
    skinGrad.addColorStop(0.7, '#e8b896');
    skinGrad.addColorStop(1, '#c89070');
    ctx.fillStyle = skinGrad;
    ctx.beginPath();
    ctx.arc(0, -25, 22, 0, Math.PI * 2);
    ctx.fill();

    // Hair
    const hairGrad = ctx.createLinearGradient(0, -50, 0, -20);
    hairGrad.addColorStop(0, '#3d2817');
    hairGrad.addColorStop(1, '#1a0f08');
    ctx.fillStyle = hairGrad;
    ctx.beginPath();
    ctx.arc(0, -30, 23, Math.PI, Math.PI * 2);
    ctx.fill();
    // Bangs
    ctx.beginPath();
    ctx.moveTo(-20, -35);
    ctx.quadraticCurveTo(-10, -45, 0, -42);
    ctx.quadraticCurveTo(10, -45, 20, -35);
    ctx.lineTo(15, -28);
    ctx.quadraticCurveTo(5, -35, -5, -32);
    ctx.quadraticCurveTo(-12, -35, -18, -28);
    ctx.closePath();
    ctx.fill();

    // Realistic eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-7, -25, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(7, -25, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Iris
    ctx.fillStyle = '#4a6741';
    ctx.beginPath();
    ctx.arc(-7, -25, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -25, 3, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-7, -25, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -25, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.strokeStyle = 'rgba(139, 90, 43, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -22);
    ctx.lineTo(-2, -15);
    ctx.stroke();

    // Mouth
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -10, 4, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Arms
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, 5);
    ctx.lineTo(-28, 25 + Math.sin(t * 2) * 3);
    ctx.moveTo(18, 5);
    ctx.lineTo(28, 25 - Math.sin(t * 2) * 3);
    ctx.stroke();

    // Legs
    ctx.strokeStyle = '#1a202c';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-8, 45);
    ctx.lineTo(-8, 65);
    ctx.moveTo(8, 45);
    ctx.lineTo(8, 65);
    ctx.stroke();

    ctx.restore();
  }

  private drawAtmosphericParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > this.height) { p.y = 0; p.x = Math.random() * this.width; }
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;

      ctx.fillStyle = `rgba(255, 255, 200, ${p.alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawVignette() {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.height * 0.3,
      this.width / 2, this.height / 2, this.height * 0.8
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawAtmosphericParticles();
    this.drawCharacter();
    this.drawVignette();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- WATERCOLOR STYLE ---
export class WatercolorRenderer extends BaseRenderer {
  private blobs: { x: number; y: number; r: number; color: string; alpha: number }[] = [];

  constructor(canvas: HTMLCanvasElement, parsed: ParsedPrompt, shots: Shot[], options: RenderOptions) {
    super(canvas, parsed, shots, options);
    this.initBlobs();
  }

  private initBlobs() {
    const colors = ['#FFB7C5', '#87CEEB', '#98FB98', '#DDA0DD', '#F0E68C'];
    for (let i = 0; i < 20; i++) {
      this.blobs.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        r: Math.random() * 60 + 30,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: Math.random() * 0.3 + 0.1,
      });
    }
  }

  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Paper texture base
    ctx.fillStyle = '#FAF0E6';
    ctx.fillRect(0, 0, this.width, this.height);

    // Watercolor blobs
    for (const blob of this.blobs) {
      const grad = ctx.createRadialGradient(
        blob.x + Math.sin(t + blob.x) * 5,
        blob.y + Math.cos(t + blob.y) * 5,
        0,
        blob.x, blob.y, blob.r
      );
      grad.addColorStop(0, blob.color + 'AA');
      grad.addColorStop(0.7, blob.color + '44');
      grad.addColorStop(1, blob.color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soft sky wash
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height * 0.6);
    skyGrad.addColorStop(0, 'rgba(135, 206, 235, 0.4)');
    skyGrad.addColorStop(1, 'rgba(135, 206, 235, 0)');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height * 0.6);

    // Watercolor ground
    const groundGrad = ctx.createLinearGradient(0, this.height * 0.7, 0, this.height);
    groundGrad.addColorStop(0, 'rgba(124, 179, 66, 0.5)');
    groundGrad.addColorStop(1, 'rgba(85, 139, 47, 0.7)');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.height * 0.7, this.width, this.height * 0.3);

    // Paper texture noise
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#000000' : '#FFFFFF';
      ctx.fillRect(Math.random() * this.width, Math.random() * this.height, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const t = this.frameCount / 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    // Watercolor body - soft edges
    const bodyGrad = ctx.createRadialGradient(0, 20, 0, 0, 20, 30);
    bodyGrad.addColorStop(0, 'rgba(255, 107, 107, 0.8)');
    bodyGrad.addColorStop(0.7, 'rgba(255, 107, 107, 0.4)');
    bodyGrad.addColorStop(1, 'rgba(255, 107, 107, 0)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 20, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    const headGrad = ctx.createRadialGradient(-3, -25, 0, 0, -25, 28);
    headGrad.addColorStop(0, 'rgba(255, 228, 196, 0.9)');
    headGrad.addColorStop(0.8, 'rgba(255, 200, 150, 0.5)');
    headGrad.addColorStop(1, 'rgba(255, 180, 120, 0)');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, -25, 28, 0, Math.PI * 2);
    ctx.fill();

    // Soft eyes
    ctx.fillStyle = 'rgba(70, 130, 180, 0.7)';
    ctx.beginPath();
    ctx.arc(-8, -28, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -28, 4, 0, Math.PI * 2);
    ctx.fill();

    // Soft smile
    ctx.strokeStyle = 'rgba(200, 100, 100, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -15, 6, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Flowing arms
    ctx.strokeStyle = 'rgba(255, 150, 150, 0.5)';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-20, 10);
    ctx.quadraticCurveTo(-35, 15 + Math.sin(t * 2) * 8, -40, 25);
    ctx.moveTo(20, 10);
    ctx.quadraticCurveTo(35, 15 - Math.sin(t * 2) * 8, 40, 25);
    ctx.stroke();

    ctx.restore();
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawCharacter();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- COMIC BOOK STYLE ---
export class ComicRenderer extends BaseRenderer {
  private halftonePhase = 0;

  private drawHalftone(x: number, y: number, w: number, h: number, color: string, density: number) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    const dotSize = 2;
    const spacing = 6;
    for (let px = x; px < x + w; px += spacing) {
      for (let py = y; py < y + h; py += spacing) {
        if (Math.random() < density) {
          ctx.beginPath();
          ctx.arc(px, py, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Comic panel background
    ctx.fillStyle = '#FFFFCC';
    ctx.fillRect(0, 0, this.width, this.height);

    // Halftone sky
    this.drawHalftone(0, 0, this.width, this.height * 0.5, '#87CEEB', 0.3);

    // Bold sun
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(this.width * 0.8, this.height * 0.2, 40, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Sun rays
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + t * 0.5;
      ctx.beginPath();
      ctx.moveTo(this.width * 0.8 + Math.cos(angle) * 45, this.height * 0.2 + Math.sin(angle) * 45);
      ctx.lineTo(this.width * 0.8 + Math.cos(angle) * 65, this.height * 0.2 + Math.sin(angle) * 65);
      ctx.stroke();
    }

    // Ground with halftone
    ctx.fillStyle = '#90EE90';
    ctx.fillRect(0, this.height * 0.75, this.width, this.height * 0.25);
    this.drawHalftone(0, this.height * 0.75, this.width, this.height * 0.25, '#006400', 0.2);

    // Ground line
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.75);
    ctx.lineTo(this.width, this.height * 0.75);
    ctx.stroke();

    // Panel border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, this.width - 6, this.height - 6);
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const t = this.frameCount / 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    // Bold shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(3, 53, 25, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body with halftone shading
    ctx.fillStyle = '#FF4444';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 20, 20, 28, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    this.drawHalftone(-15, 5, 30, 35, '#880000', 0.3);

    // Head
    ctx.fillStyle = '#FFDBAC';
    ctx.beginPath();
    ctx.arc(0, -25, 25, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Comic eyes (expressive)
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(-8, -28, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(8, -28, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-8, -28, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -28, 4, 0, Math.PI * 2);
    ctx.fill();

    // Bold mouth
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(0, -12, 8, 0, Math.PI);
    ctx.fill();

    // Action arms
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-20, 10);
    ctx.lineTo(-38, 0 + Math.sin(t * 4) * 10);
    ctx.moveTo(20, 10);
    ctx.lineTo(38, 0 - Math.sin(t * 4) * 10);
    ctx.stroke();

    // Fists
    ctx.fillStyle = '#FFDBAC';
    ctx.beginPath();
    ctx.arc(-38, 0 + Math.sin(t * 4) * 10, 6, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.arc(38, 0 - Math.sin(t * 4) * 10, 6, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    ctx.restore();
  }

  private drawActionText() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;
    const shot = this.getCurrentShot();

    if (shot.action === 'ACTION' && Math.floor(t * 2) % 3 === 0) {
      const texts = ['POW!', 'BAM!', 'WHAM!', 'ZAP!'];
      const text = texts[Math.floor(t) % texts.length];
      const x = this.charX + 80;
      const y = this.charY - 80;

      // Burst background
      ctx.fillStyle = '#FFFF00';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const r = i % 2 === 0 ? 45 : 30;
        const px = x + Math.cos(angle) * r;
        const py = y + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // Text
      ctx.fillStyle = '#FF0000';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.font = 'bold 28px Arial Black';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }
  }

  private drawSpeechBubble() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;
    const cycle = Math.floor(t / 3) % 4;
    const phrases = ['LET\'S GO!', 'HERE I COME!', 'POW!', 'YEAH!'];

    const x = this.charX + 50;
    const y = this.charY - 90;

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;

    // Bubble
    ctx.beginPath();
    ctx.ellipse(x, y, 50, 25, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Tail
    ctx.beginPath();
    ctx.moveTo(x - 20, y + 20);
    ctx.lineTo(x - 40, y + 40);
    ctx.lineTo(x - 10, y + 22);
    ctx.fill(); ctx.stroke();

    // Text
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(phrases[cycle], x, y);
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawCharacter();
    this.drawActionText();
    this.drawSpeechBubble();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- CYBERPUNK STYLE ---
export class CyberpunkRenderer extends BaseRenderer {
  private raindrops: { x: number; y: number; speed: number; length: number }[] = [];
  private neonPhase = 0;

  constructor(canvas: HTMLCanvasElement, parsed: ParsedPrompt, shots: Shot[], options: RenderOptions) {
    super(canvas, parsed, shots, options);
    this.initRain();
  }

  private initRain() {
    for (let i = 0; i < 100; i++) {
      this.raindrops.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        speed: Math.random() * 8 + 4,
        length: Math.random() * 15 + 5,
      });
    }
  }

  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Dark gradient sky
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0a0015');
    grad.addColorStop(0.5, '#1a0030');
    grad.addColorStop(1, '#0a0020');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Neon grid floor
    ctx.strokeStyle = '#ff00ff33';
    ctx.lineWidth = 1;
    const gridSize = 30;
    const perspective = 0.7;
    for (let y = this.height * 0.7; y < this.height; y += 15) {
      const depth = (y - this.height * 0.7) / (this.height * 0.3);
      ctx.globalAlpha = depth;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
    for (let x = -gridSize; x < this.width + gridSize; x += gridSize) {
      const offset = (t * 30) % gridSize;
      ctx.beginPath();
      ctx.moveTo(this.width / 2, this.height * 0.7);
      ctx.lineTo(x + offset, this.height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Buildings with neon
    for (let i = 0; i < 8; i++) {
      const bx = i * 85;
      const bh = 100 + Math.sin(i * 1.5) * 50;
      const by = this.height * 0.7 - bh;

      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(bx, by, 70, bh);

      // Neon windows
      for (let wy = by + 10; wy < by + bh - 10; wy += 20) {
        for (let wx = bx + 8; wx < bx + 62; wx += 18) {
          const on = Math.sin(t * 2 + wx + wy) > 0;
          if (on) {
            const neonColor = ['#ff00ff', '#00ffff', '#ffff00'][Math.floor((wx + wy) / 30) % 3];
            ctx.fillStyle = neonColor;
            ctx.shadowColor = neonColor;
            ctx.shadowBlur = 5;
            ctx.fillRect(wx, wy, 10, 12);
            ctx.shadowBlur = 0;
          }
        }
      }
    }

    // Neon signs
    const signs = ['NEON', 'CYBER', '2099'];
    for (let i = 0; i < 3; i++) {
      const sx = 100 + i * 200;
      const sy = this.height * 0.4;
      const flicker = Math.sin(t * 10 + i) > -0.3 ? 1 : 0.3;
      const color = ['#ff00ff', '#00ffff', '#ffff00'][i];

      ctx.fillStyle = color;
      ctx.globalAlpha = flicker;
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.font = 'bold 20px monospace';
      ctx.fillText(signs[i], sx, sy);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const t = this.frameCount / 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    // Neon glow shadow
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.ellipse(0, 55, 25, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Body with neon outline
    ctx.fillStyle = '#1a1a2e';
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, 20, 18, 28, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Cyber visor head
    ctx.fillStyle = '#0a0a1a';
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, -25, 22, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Visor
    const visorGrad = ctx.createLinearGradient(-15, -30, 15, -20);
    visorGrad.addColorStop(0, '#ff00ff');
    visorGrad.addColorStop(0.5, '#00ffff');
    visorGrad.addColorStop(1, '#ff00ff');
    ctx.fillStyle = visorGrad;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.fillRect(-15, -30, 30, 8);
    ctx.shadowBlur = 0;

    // Circuit lines on body
    ctx.strokeStyle = '#00ffff55';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const ly = 5 + i * 8;
      ctx.beginPath();
      ctx.moveTo(-10, ly);
      ctx.lineTo(10, ly);
      ctx.stroke();
    }

    // Arms with neon
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(-18, 10);
    ctx.lineTo(-30, 25 + Math.sin(t * 3) * 5);
    ctx.moveTo(18, 10);
    ctx.lineTo(30, 25 - Math.sin(t * 3) * 5);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Legs
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(-8, 45); ctx.lineTo(-8, 60);
    ctx.moveTo(8, 45); ctx.lineTo(8, 60);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private drawRain() {
    const ctx = this.ctx;
    ctx.strokeStyle = '#88ccff44';
    ctx.lineWidth = 1;

    for (const drop of this.raindrops) {
      drop.y += drop.speed;
      if (drop.y > this.height) {
        drop.y = -drop.length;
        drop.x = Math.random() * this.width;
      }
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - 1, drop.y + drop.length);
      ctx.stroke();
    }
  }

  private drawGlitch() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    if (Math.sin(t * 7) > 0.95) {
      // Random glitch slices
      for (let i = 0; i < 3; i++) {
        const y = Math.random() * this.height;
        const h = Math.random() * 10 + 2;
        const offset = (Math.random() - 0.5) * 20;
        const imageData = ctx.getImageData(0, y, this.width, h);
        ctx.putImageData(imageData, offset, y);
      }
    }
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawRain();
    this.drawCharacter();
    this.drawGlitch();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- SKETCH/PENCIL STYLE ---
export class SketchRenderer extends BaseRenderer {
  private drawSketchLine(x1: number, y1: number, x2: number, y2: number, passes: number = 2) {
    const ctx = this.ctx;
    for (let p = 0; p < passes; p++) {
      ctx.beginPath();
      ctx.moveTo(x1 + (Math.random() - 0.5) * 2, y1 + (Math.random() - 0.5) * 2);
      const steps = 5;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const x = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 1.5;
        const y = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 1.5;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Paper
    ctx.fillStyle = '#F5F5DC';
    ctx.fillRect(0, 0, this.width, this.height);

    // Paper texture
    ctx.globalAlpha = 0.03;
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = '#000000';
      ctx.fillRect(Math.random() * this.width, Math.random() * this.height, 1, 1);
    }
    ctx.globalAlpha = 1;

    // Sketchy horizon
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    this.drawSketchLine(0, this.height * 0.7, this.width, this.height * 0.7, 3);

    // Cross-hatching for ground
    ctx.strokeStyle = '#66666644';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < this.width; x += 8) {
      for (let y = this.height * 0.72; y < this.height; y += 8) {
        if (Math.random() > 0.5) {
          this.drawSketchLine(x, y, x + 6, y + 6, 1);
        }
      }
    }

    // Sketchy clouds
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 200 + t * 10) % (this.width + 100)) - 50;
      const cy = 60 + i * 30;
      for (let j = 0; j < 8; j++) {
        const angle = (j / 8) * Math.PI * 2;
        const r = 20 + Math.random() * 10;
        const sx = cx + Math.cos(angle) * r;
        const sy = cy + Math.sin(angle) * r * 0.5;
        const ex = cx + Math.cos(angle + 0.5) * r;
        const ey = cy + Math.sin(angle + 0.5) * r * 0.5;
        this.drawSketchLine(sx, sy, ex, ey, 1);
      }
    }
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const t = this.frameCount / 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;

    // Sketchy head
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      const offset = (Math.random() - 0.5) * 2;
      ctx.arc(offset, -25 + offset, 22 + Math.random(), 0, Math.PI * 2);
      ctx.stroke();
    }

    // Eyes (simple dots)
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(-7, -28, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -28, 2, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    this.drawSketchLine(-5, -15, 5, -15, 1);

    // Body
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.ellipse((Math.random() - 0.5) * 2, 20 + (Math.random() - 0.5) * 2, 16, 25, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Arms
    this.drawSketchLine(-16, 10, -30, 25 + Math.sin(t * 3) * 5, 2);
    this.drawSketchLine(16, 10, 30, 25 - Math.sin(t * 3) * 5, 2);

    // Legs
    this.drawSketchLine(-6, 42, -6, 58, 2);
    this.drawSketchLine(6, 42, 6, 58, 2);

    // Cross-hatching on body for shading
    ctx.strokeStyle = '#33333344';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 8; i++) {
      const hy = 5 + i * 5;
      this.drawSketchLine(-10, hy, 10, hy, 1);
    }

    ctx.restore();
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawCharacter();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- CLAYMATION STYLE ---
export class ClayRenderer extends BaseRenderer {
  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Soft gradient background
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#87CEEB');
    grad.addColorStop(0.6, '#B0E0E6');
    grad.addColorStop(1, '#90EE90');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Clay sun
    const sunGrad = ctx.createRadialGradient(
      this.width * 0.8, this.height * 0.2, 0,
      this.width * 0.8, this.height * 0.2, 40
    );
    sunGrad.addColorStop(0, '#FFE55C');
    sunGrad.addColorStop(0.8, '#FFC107');
    sunGrad.addColorStop(1, '#FF9800');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(this.width * 0.8, this.height * 0.2, 40, 0, Math.PI * 2);
    ctx.fill();

    // Clay clouds (rounded, 3D)
    for (let i = 0; i < 3; i++) {
      const cx = ((i * 200 + t * 8) % (this.width + 150)) - 75;
      const cy = 50 + i * 35;

      for (let j = 0; j < 4; j++) {
        const bx = cx + j * 20 - 30;
        const by = cy + Math.sin(j * 1.5) * 5;
        const r = 18 + Math.sin(j * 2) * 5;

        const cloudGrad = ctx.createRadialGradient(bx - 3, by - 3, 0, bx, by, r);
        cloudGrad.addColorStop(0, '#FFFFFF');
        cloudGrad.addColorStop(0.8, '#E8E8E8');
        cloudGrad.addColorStop(1, '#CCCCCC');
        ctx.fillStyle = cloudGrad;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Clay ground
    const groundGrad = ctx.createLinearGradient(0, this.height * 0.75, 0, this.height);
    groundGrad.addColorStop(0, '#7EC850');
    groundGrad.addColorStop(0.5, '#5DA03A');
    groundGrad.addColorStop(1, '#3D7A20');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, this.height * 0.75, this.width, this.height * 0.25);

    // Clay flowers
    for (let i = 0; i < 6; i++) {
      const fx = 50 + i * 100;
      const fy = this.height * 0.82;

      // Stem
      ctx.strokeStyle = '#2d5a2d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(fx, fy + 20);
      ctx.lineTo(fx, fy);
      ctx.stroke();

      // Petals (clay-like)
      const petalColors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#FF69B4'];
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2;
        const px = fx + Math.cos(angle) * 8;
        const py = fy + Math.sin(angle) * 8;
        const petalGrad = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, 6);
        petalGrad.addColorStop(0, petalColors[p % 4]);
        petalGrad.addColorStop(1, '#AA3333');
        ctx.fillStyle = petalGrad;
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Center
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const t = this.frameCount / 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    // Clay shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(2, 55, 25, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Clay body (3D gradient)
    const bodyGrad = ctx.createRadialGradient(-5, 15, 0, 0, 20, 25);
    bodyGrad.addColorStop(0, '#FF8A8A');
    bodyGrad.addColorStop(0.7, '#FF6B6B');
    bodyGrad.addColorStop(1, '#CC4444');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 20, 20, 28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Clay head
    const headGrad = ctx.createRadialGradient(-5, -30, 0, 0, -25, 28);
    headGrad.addColorStop(0, '#FFE4C4');
    headGrad.addColorStop(0.7, '#FFD4A4');
    headGrad.addColorStop(1, '#CC9966');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, -25, 25, 0, Math.PI * 2);
    ctx.fill();

    // Clay eyes (googly)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-8, -28, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -28, 7, 0, Math.PI * 2);
    ctx.fill();

    // Pupils (slightly offset for goofy look)
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-8 + Math.sin(t * 2) * 2, -28, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8 + Math.sin(t * 2) * 2, -28, 3, 0, Math.PI * 2);
    ctx.fill();

    // Clay smile
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -15, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Clay arms (rounded)
    ctx.strokeStyle = '#FFD4A4';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-18, 10);
    ctx.lineTo(-32, 22 + Math.sin(t * 3) * 5);
    ctx.moveTo(18, 10);
    ctx.lineTo(32, 22 - Math.sin(t * 3) * 5);
    ctx.stroke();

    // Clay legs
    ctx.strokeStyle = '#4169E1';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(-8, 45);
    ctx.lineTo(-8, 60);
    ctx.moveTo(8, 45);
    ctx.lineTo(8, 60);
    ctx.stroke();

    ctx.restore();
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawCharacter();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- VAPORWAVE STYLE ---
export class VaporwaveRenderer extends BaseRenderer {
  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Vaporwave sunset gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#2D1B69');
    grad.addColorStop(0.3, '#FF6B9D');
    grad.addColorStop(0.5, '#FF8E53');
    grad.addColorStop(0.7, '#FFC371');
    grad.addColorStop(1, '#1A0533');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Retro sun
    const sunX = this.width / 2;
    const sunY = this.height * 0.4;
    const sunGrad = ctx.createLinearGradient(sunX, sunY - 60, sunX, sunY + 60);
    sunGrad.addColorStop(0, '#FF1493');
    sunGrad.addColorStop(0.5, '#FF6B9D');
    sunGrad.addColorStop(1, '#FFD700');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 60, 0, Math.PI * 2);
    ctx.fill();

    // Sun horizontal lines
    ctx.fillStyle = '#2D1B69';
    for (let i = 0; i < 8; i++) {
      const ly = sunY - 50 + i * 14;
      const lw = Math.sqrt(3600 - Math.pow(ly - sunY, 2)) * 2;
      if (lw > 0) {
        ctx.fillRect(sunX - lw / 2, ly, lw, 4);
      }
    }

    // Perspective grid
    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#FF00FF';
    ctx.shadowBlur = 3;

    // Horizontal lines
    for (let i = 0; i < 15; i++) {
      const y = this.height * 0.6 + i * i * 1.5;
      if (y > this.height) break;
      ctx.globalAlpha = 1 - (y - this.height * 0.6) / (this.height * 0.4);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Vertical lines (perspective)
    for (let i = -10; i <= 10; i++) {
      const offset = (t * 20) % 40;
      ctx.beginPath();
      ctx.moveTo(this.width / 2, this.height * 0.6);
      ctx.lineTo(this.width / 2 + i * 60 + offset, this.height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Palm trees silhouette
    ctx.fillStyle = '#1A0533';
    for (let i = 0; i < 2; i++) {
      const px = i === 0 ? 80 : this.width - 80;
      const py = this.height * 0.6;

      // Trunk
      ctx.fillRect(px - 4, py - 100, 8, 100);

      // Fronds
      for (let f = 0; f < 5; f++) {
        const angle = (f / 5) * Math.PI - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(px, py - 100);
        ctx.quadraticCurveTo(
          px + Math.cos(angle) * 30,
          py - 100 + Math.sin(angle) * 10 - 20,
          px + Math.cos(angle) * 50,
          py - 100 + Math.sin(angle) * 20
        );
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#1A0533';
        ctx.stroke();
      }
    }
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const t = this.frameCount / 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    // Neon glow outline
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 15;

    // Wireframe body
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 20, 18, 28, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Wireframe head
    ctx.strokeStyle = '#FF00FF';
    ctx.shadowColor = '#FF00FF';
    ctx.beginPath();
    ctx.arc(0, -25, 22, 0, Math.PI * 2);
    ctx.stroke();

    // Neon eyes
    ctx.fillStyle = '#FFFF00';
    ctx.shadowColor = '#FFFF00';
    ctx.beginPath();
    ctx.arc(-7, -28, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -28, 3, 0, Math.PI * 2);
    ctx.fill();

    // Neon arms
    ctx.strokeStyle = '#00FFFF';
    ctx.shadowColor = '#00FFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 10);
    ctx.lineTo(-32, 25 + Math.sin(t * 3) * 5);
    ctx.moveTo(18, 10);
    ctx.lineTo(32, 25 - Math.sin(t * 3) * 5);
    ctx.stroke();

    // Neon legs
    ctx.strokeStyle = '#FF00FF';
    ctx.shadowColor = '#FF00FF';
    ctx.beginPath();
    ctx.moveTo(-8, 45); ctx.lineTo(-8, 60);
    ctx.moveTo(8, 45); ctx.lineTo(8, 60);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawCharacter();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- NOIR STYLE ---
export class NoirRenderer extends BaseRenderer {
  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Dark gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0a0a0a');
    grad.addColorStop(0.5, '#1a1a1a');
    grad.addColorStop(1, '#000000');
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
    const lampGrad = ctx.createRadialGradient(lampX, lampY, 0, lampX, lampY, 100);
    lampGrad.addColorStop(0, 'rgba(255, 255, 200, 0.3)');
    lampGrad.addColorStop(1, 'rgba(255, 255, 200, 0)');
    ctx.fillStyle = lampGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Lamp post
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(lampX, lampY);
    ctx.lineTo(lampX, this.height * 0.75);
    ctx.stroke();

    // Wet ground reflection
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(0, this.height * 0.75, this.width, this.height * 0.25);

    // Rain
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 50; i++) {
      const rx = (Math.sin(i * 45) * 0.5 + 0.5) * this.width;
      const ry = ((t * 200 + i * 30) % this.height);
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx - 2, ry + 15);
      ctx.stroke();
    }
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const t = this.frameCount / 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    // Dramatic shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.ellipse(5, 55, 30, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trench coat body
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(-20, -5);
    ctx.lineTo(-25, 50);
    ctx.lineTo(25, 50);
    ctx.lineTo(20, -5);
    ctx.closePath();
    ctx.fill();

    // Coat highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-18, 0);
    ctx.lineTo(-22, 45);
    ctx.stroke();

    // Head
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(0, -25, 20, 0, Math.PI * 2);
    ctx.fill();

    // Fedora hat
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(0, -40, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-15, -50, 30, 12);

    // Hat highlight
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-12, -48);
    ctx.lineTo(12, -48);
    ctx.stroke();

    // Eyes (just glints in shadow)
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(-6, -25, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -25, 2, 0, Math.PI * 2);
    ctx.fill();

    // Cigarette smoke
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const sx = 15 + Math.sin(t * 2 + i) * (i * 3);
      const sy = -15 - i * 10;
      ctx.beginPath();
      ctx.arc(sx, sy, 3 + i, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawVignette() {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.height * 0.2,
      this.width / 2, this.height / 2, this.height * 0.7
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawCharacter();
    this.drawVignette();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- STUDIO GHIBLI STYLE ---
export class GhibliRenderer extends BaseRenderer {
  private grassBlades: { x: number; height: number; phase: number }[] = [];

  constructor(canvas: HTMLCanvasElement, parsed: ParsedPrompt, shots: Shot[], options: RenderOptions) {
    super(canvas, parsed, shots, options);
    this.initGrass();
  }

  private initGrass() {
    for (let i = 0; i < 100; i++) {
      this.grassBlades.push({
        x: Math.random() * this.width,
        height: Math.random() * 20 + 10,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Soft sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, this.height * 0.7);
    skyGrad.addColorStop(0, '#87CEEB');
    skyGrad.addColorStop(0.5, '#B0E0E6');
    skyGrad.addColorStop(1, '#E0F7FA');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Fluffy cumulus clouds
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 180 + t * 5) % (this.width + 200)) - 100;
      const cy = 40 + i * 30;

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      for (let j = 0; j < 6; j++) {
        const bx = cx + j * 18 - 45;
        const by = cy + Math.sin(j * 1.2) * 5;
        const r = 15 + Math.sin(j * 2) * 5;
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Rolling hills
    ctx.fillStyle = '#7EC850';
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.7);
    for (let x = 0; x <= this.width; x += 5) {
      const y = this.height * 0.7 - Math.sin(x * 0.01) * 20 - Math.cos(x * 0.02) * 10;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.width, this.height);
    ctx.lineTo(0, this.height);
    ctx.closePath();
    ctx.fill();

    // Foreground grass
    ctx.fillStyle = '#5DA03A';
    ctx.fillRect(0, this.height * 0.8, this.width, this.height * 0.2);

    // Individual grass blades
    ctx.strokeStyle = '#3D7A20';
    ctx.lineWidth = 1.5;
    for (const blade of this.grassBlades) {
      const baseY = this.height * 0.82;
      const sway = Math.sin(t * 2 + blade.phase) * 5;
      ctx.beginPath();
      ctx.moveTo(blade.x, baseY);
      ctx.quadraticCurveTo(blade.x + sway, baseY - blade.height / 2, blade.x + sway * 1.5, baseY - blade.height);
      ctx.stroke();
    }

    // Distant trees
    for (let i = 0; i < 5; i++) {
      const tx = 80 + i * 130;
      const ty = this.height * 0.68;

      // Trunk
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(tx - 4, ty - 40, 8, 40);

      // Foliage
      ctx.fillStyle = '#228B22';
      ctx.beginPath();
      ctx.arc(tx, ty - 55, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2E8B57';
      ctx.beginPath();
      ctx.arc(tx - 8, ty - 50, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tx + 10, ty - 48, 16, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const t = this.frameCount / 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    // Soft shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 55, 22, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Simple dress body
    const dressGrad = ctx.createLinearGradient(0, -5, 0, 50);
    dressGrad.addColorStop(0, '#4169E1');
    dressGrad.addColorStop(1, '#1E3A8A');
    ctx.fillStyle = dressGrad;
    ctx.beginPath();
    ctx.moveTo(-15, -5);
    ctx.lineTo(-22, 50);
    ctx.lineTo(22, 50);
    ctx.lineTo(15, -5);
    ctx.closePath();
    ctx.fill();

    // White apron
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(-10, 5);
    ctx.lineTo(-14, 45);
    ctx.lineTo(14, 45);
    ctx.lineTo(10, 5);
    ctx.closePath();
    ctx.fill();

    // Head
    const skinGrad = ctx.createRadialGradient(-2, -28, 0, 0, -25, 22);
    skinGrad.addColorStop(0, '#FFE4C4');
    skinGrad.addColorStop(1, '#DEB887');
    ctx.fillStyle = skinGrad;
    ctx.beginPath();
    ctx.arc(0, -25, 20, 0, Math.PI * 2);
    ctx.fill();

    // Hair (brown, flowing)
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(0, -30, 21, Math.PI, Math.PI * 2);
    ctx.fill();

    // Hair sides
    ctx.beginPath();
    ctx.moveTo(-20, -25);
    ctx.quadraticCurveTo(-22, 0, -18, 10);
    ctx.lineTo(-15, -20);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(20, -25);
    ctx.quadraticCurveTo(22, 0, 18, 10);
    ctx.lineTo(15, -20);
    ctx.closePath();
    ctx.fill();

    // Big Ghibli eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.ellipse(-6, -26, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(6, -26, 5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4B3621';
    ctx.beginPath();
    ctx.arc(-6, -26, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6, -26, 3, 0, Math.PI * 2);
    ctx.fill();

    // Eye highlights
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(-7, -27, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -27, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Small smile
    ctx.strokeStyle = '#CC6666';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -18, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Blush
    ctx.fillStyle = 'rgba(255, 150, 150, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-12, -20, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(12, -20, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms
    ctx.strokeStyle = '#FFE4C4';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-15, 5);
    ctx.lineTo(-25, 20 + Math.sin(t * 2) * 3);
    ctx.moveTo(15, 5);
    ctx.lineTo(25, 20 - Math.sin(t * 2) * 3);
    ctx.stroke();

    ctx.restore();
  }

  private drawFloatingSeeds() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for (let i = 0; i < 10; i++) {
      const sx = ((i * 70 + t * 15) % (this.width + 50)) - 25;
      const sy = 100 + Math.sin(t + i * 2) * 30 + i * 20;
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();

      // Tiny stem
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + 3, sy + 5);
      ctx.stroke();
    }
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawFloatingSeeds();
    this.drawCharacter();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- POP ART STYLE ---
export class PopArtRenderer extends BaseRenderer {
  private drawBenDayDots(x: number, y: number, w: number, h: number, color: string, size: number = 4) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    const spacing = size * 2.5;
    for (let px = x; px < x + w; px += spacing) {
      for (let py = y; py < y + h; py += spacing) {
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Bold yellow background
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(0, 0, this.width, this.height);

    // Ben-Day dots pattern
    this.drawBenDayDots(0, 0, this.width, this.height, '#FFA500', 3);

    // Radiating lines
    ctx.save();
    ctx.translate(this.width / 2, this.height / 2);
    ctx.strokeStyle = '#FF4500';
    ctx.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2 + t * 0.3;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * 80, Math.sin(angle) * 80);
      ctx.lineTo(Math.cos(angle) * 400, Math.sin(angle) * 400);
      ctx.stroke();
    }
    ctx.restore();

    // Ground
    ctx.fillStyle = '#FF1493';
    ctx.fillRect(0, this.height * 0.75, this.width, this.height * 0.25);
    this.drawBenDayDots(0, this.height * 0.75, this.width, this.height * 0.25, '#C71585', 3);
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const t = this.frameCount / 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    // Bold black outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;

    // Body
    ctx.fillStyle = '#FF4500';
    ctx.beginPath();
    ctx.ellipse(0, 20, 22, 30, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Ben-Day dots on body
    this.drawBenDayDots(-15, 0, 30, 40, '#FF6347', 2);

    // Head
    ctx.fillStyle = '#FFDBAC';
    ctx.beginPath();
    ctx.arc(0, -25, 25, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Pop art hair
    ctx.fillStyle = '#FF1493';
    ctx.beginPath();
    ctx.arc(0, -35, 22, Math.PI, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Big pop eyes
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(-8, -28, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(8, -28, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Blue irises
    ctx.fillStyle = '#0000FF';
    ctx.beginPath();
    ctx.arc(-8, -28, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -28, 4, 0, Math.PI * 2);
    ctx.fill();

    // Bold red lips
    ctx.fillStyle = '#FF0000';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -12, 6, 0, Math.PI);
    ctx.fill(); ctx.stroke();

    // Arms
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-22, 10);
    ctx.lineTo(-35, 25 + Math.sin(t * 4) * 8);
    ctx.moveTo(22, 10);
    ctx.lineTo(35, 25 - Math.sin(t * 4) * 8);
    ctx.stroke();

    ctx.restore();
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawCharacter();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- MINIMALIST STYLE ---
export class MinimalistRenderer extends BaseRenderer {
  private drawBackground() {
    const ctx = this.ctx;

    // Clean white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, this.width, this.height);

    // Single accent line
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.75);
    ctx.lineTo(this.width, this.height * 0.75);
    ctx.stroke();

    // Minimal circle (sun/moon)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.width * 0.8, this.height * 0.2, 25, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const t = this.frameCount / 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Simple circle head
    ctx.beginPath();
    ctx.arc(0, -25, 18, 0, Math.PI * 2);
    ctx.stroke();

    // Two dots for eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-5, -27, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -27, 2, 0, Math.PI * 2);
    ctx.fill();

    // Simple line body
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(0, 25);
    ctx.stroke();

    // Simple arms
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.lineTo(-20, 15 + Math.sin(t * 2) * 3);
    ctx.moveTo(0, 5);
    ctx.lineTo(20, 15 - Math.sin(t * 2) * 3);
    ctx.stroke();

    // Simple legs
    ctx.beginPath();
    ctx.moveTo(0, 25);
    ctx.lineTo(-10, 45);
    ctx.moveTo(0, 25);
    ctx.lineTo(10, 45);
    ctx.stroke();

    ctx.restore();
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawCharacter();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- RETRO 80s STYLE ---
export class Retro80sRenderer extends BaseRenderer {
  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Dark purple gradient
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0a001a');
    grad.addColorStop(0.4, '#1a0033');
    grad.addColorStop(0.6, '#330066');
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // Chrome sun
    const sunX = this.width / 2;
    const sunY = this.height * 0.45;
    const sunGrad = ctx.createLinearGradient(sunX, sunY - 50, sunX, sunY + 50);
    sunGrad.addColorStop(0, '#FF6B00');
    sunGrad.addColorStop(0.5, '#FF0066');
    sunGrad.addColorStop(1, '#6600CC');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 50, 0, Math.PI * 2);
    ctx.fill();

    // Horizontal scan lines through sun
    ctx.fillStyle = '#0a001a';
    for (let i = 0; i < 8; i++) {
      const ly = sunY - 40 + i * 12;
      const halfW = Math.sqrt(Math.max(0, 2500 - Math.pow(ly - sunY, 2)));
      ctx.fillRect(sunX - halfW, ly, halfW * 2, 3);
    }

    // Grid floor
    ctx.strokeStyle = '#FF00FF';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#FF00FF';
    ctx.shadowBlur = 5;

    // Horizontal grid lines
    for (let i = 0; i < 20; i++) {
      const y = this.height * 0.6 + i * i * 1.2;
      if (y > this.height) break;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = -15; i <= 15; i++) {
      const offset = (t * 30) % 40;
      ctx.beginPath();
      ctx.moveTo(this.width / 2, this.height * 0.6);
      ctx.lineTo(this.width / 2 + i * 50 + offset, this.height);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Mountain silhouette
    ctx.fillStyle = '#1a0033';
    ctx.beginPath();
    ctx.moveTo(0, this.height * 0.6);
    for (let x = 0; x <= this.width; x += 20) {
      const y = this.height * 0.6 - Math.abs(Math.sin(x * 0.01)) * 40 - Math.cos(x * 0.02) * 20;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(this.width, this.height * 0.6);
    ctx.closePath();
    ctx.fill();
  }

  private drawCharacter() {
    const ctx = this.ctx;
    const x = this.charX;
    const y = this.charY;
    const t = this.frameCount / 30;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.charRotation);
    ctx.scale(this.charScaleX, this.charScaleY);

    // Neon wireframe character
    ctx.shadowColor = '#00FFFF';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 2;

    // Head (triangle)
    ctx.beginPath();
    ctx.moveTo(0, -45);
    ctx.lineTo(-18, -15);
    ctx.lineTo(18, -15);
    ctx.closePath();
    ctx.stroke();

    // Body (diamond)
    ctx.strokeStyle = '#FF00FF';
    ctx.shadowColor = '#FF00FF';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(-20, 15);
    ctx.lineTo(0, 40);
    ctx.lineTo(20, 15);
    ctx.closePath();
    ctx.stroke();

    // Arms
    ctx.strokeStyle = '#FFFF00';
    ctx.shadowColor = '#FFFF00';
    ctx.beginPath();
    ctx.moveTo(-20, 15);
    ctx.lineTo(-35, 5 + Math.sin(t * 3) * 8);
    ctx.moveTo(20, 15);
    ctx.lineTo(35, 5 - Math.sin(t * 3) * 8);
    ctx.stroke();

    // Legs
    ctx.strokeStyle = '#00FFFF';
    ctx.shadowColor = '#00FFFF';
    ctx.beginPath();
    ctx.moveTo(-10, 40);
    ctx.lineTo(-15, 60);
    ctx.moveTo(10, 40);
    ctx.lineTo(15, 60);
    ctx.stroke();

    // Eyes (glowing dots)
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(-5, -28, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -28, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  renderFrame(): void {
    const shot = this.getCurrentShot();
    this.updateCharacterMotion(shot);
    this.applyCamera(shot);
    this.drawBackground();
    this.drawCharacter();
    this.ctx.restore();
    this.frameCount++;
  }
}

// --- RENDERER FACTORY ---
export function createRenderer(
  style: string,
  canvas: HTMLCanvasElement,
  parsed: ParsedPrompt,
  shots: Shot[],
  options: RenderOptions
): BaseRenderer {
  switch (style.toUpperCase()) {
    case 'CARTOON': return new CartoonRenderer(canvas, parsed, shots, options);
    case 'ANIME': return new AnimeRenderer(canvas, parsed, shots, options);
    case 'PIXEL ART':
    case 'PIXEL': return new PixelRenderer(canvas, parsed, shots, options);
    case 'REALISTIC': return new RealisticRenderer(canvas, parsed, shots, options);
    case 'WATERCOLOR': return new WatercolorRenderer(canvas, parsed, shots, options);
    case 'COMIC':
    case 'COMIC BOOK': return new ComicRenderer(canvas, parsed, shots, options);
    case 'CYBERPUNK': return new CyberpunkRenderer(canvas, parsed, shots, options);
    case 'SKETCH':
    case 'PENCIL': return new SketchRenderer(canvas, parsed, shots, options);
    case 'CLAY':
    case 'CLAYMATION': return new ClayRenderer(canvas, parsed, shots, options);
    case 'VAPORWAVE': return new VaporwaveRenderer(canvas, parsed, shots, options);
    case 'NOIR': return new NoirRenderer(canvas, parsed, shots, options);
    case 'GHIBLI':
    case 'STUDIO GHIBLI': return new GhibliRenderer(canvas, parsed, shots, options);
    case 'POP ART': return new PopArtRenderer(canvas, parsed, shots, options);
    case 'MINIMALIST': return new MinimalistRenderer(canvas, parsed, shots, options);
    case 'RETRO 80S':
    case 'SYNTHWAVE': return new Retro80sRenderer(canvas, parsed, shots, options);
    default: return new CartoonRenderer(canvas, parsed, shots, options);
  }
}

// Available styles for UI
export const AVAILABLE_STYLES = [
  { id: 'CARTOON', name: 'Cartoon', description: 'Chibi-style with bold outlines' },
  { id: 'ANIME', name: 'Anime', description: 'Japanese animation with sakura' },
  { id: 'PIXEL ART', name: 'Pixel Art', description: '8-bit retro game style' },
  { id: 'REALISTIC', name: 'Realistic', description: 'Detailed shading & gradients' },
  { id: 'WATERCOLOR', name: 'Watercolor', description: 'Soft bleeding paint effects' },
  { id: 'COMIC BOOK', name: 'Comic Book', description: 'Halftone dots & action text' },
  { id: 'CYBERPUNK', name: 'Cyberpunk', description: 'Neon rain & glitch effects' },
  { id: 'SKETCH', name: 'Pencil Sketch', description: 'Hand-drawn rough lines' },
  { id: 'CLAYMATION', name: 'Claymation', description: '3D clay-like rounded shapes' },
  { id: 'VAPORWAVE', name: 'Vaporwave', description: 'Retro grids & neon wireframe' },
  { id: 'NOIR', name: 'Film Noir', description: 'Black & white detective mood' },
  { id: 'GHIBLI', name: 'Studio Ghibli', description: 'Soft nature & warm colors' },
  { id: 'POP ART', name: 'Pop Art', description: 'Bold colors & Ben-Day dots' },
  { id: 'MINIMALIST', name: 'Minimalist', description: 'Clean lines, simple forms' },
  { id: 'RETRO 80S', name: 'Retro 80s', description: 'Synthwave chrome sun' },
];

export const DURATION_OPTIONS = [
  { value: 3, label: '3 seconds' },
  { value: 6, label: '6 seconds' },
  { value: 10, label: '10 seconds' },
  { value: 15, label: '15 seconds' },
  { value: 20, label: '20 seconds' },
  { value: 30, label: '30 seconds' },
];

export const RESOLUTION_OPTIONS = [
  { value: '480p', label: '480p (640×360)', width: 640, height: 360 },
  { value: '720p', label: '720p (1280×720)', width: 1280, height: 720 },
  { value: '1080p', label: '1080p (1920×1080)', width: 1920, height: 1080 },
];

export const FPS_OPTIONS = [
  { value: 24, label: '24 FPS (Cinema)' },
  { value: 30, label: '30 FPS (Standard)' },
  { value: 60, label: '60 FPS (Smooth)' },
];
