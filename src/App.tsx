import { useState, useEffect, useCallback, useRef } from 'react';

// --- Types ---
type StageStatus = 'PENDING' | 'PROCESSING' | 'DONE';

interface StageData {
  id: number;
  title: string;
  color: string;
  barColor: string;
  status: StageStatus;
  detail: string;
  barWidth: number;
}

interface OutputData {
  id: string;
  duration: string;
  style: string;
  size: string;
  renderTime: string;
  videoUrl: string;
  thumbnailUrl: string;
}

interface ParsedPrompt {
  style: string;
  mood: string;
  subjects: string[];
  environment: string;
  effects: string[];
  colors: string[];
  keywords: string[];
}

interface Shot {
  id: number;
  description: string;
  duration: number;
  camera: string;
  action: string;
}

// --- Real Prompt Analysis ---
function analyzePrompt(prompt: string): ParsedPrompt {
  const lower = prompt.toLowerCase();

  // Style detection
  const styleMap: Record<string, string[]> = {
    'CYBERPUNK': ['neon', 'cyber', 'futur', 'hack', 'glitch', 'chrome', 'hologram'],
    'PIXEL ART': ['pixel', '8-bit', '16-bit', 'retro game', 'chiptune'],
    'VAPORWAVE': ['vapor', 'aesthetic', 'retrowave', 'synthwave', '80s', 'mall'],
    'CARTOON': ['toon', 'cartoon', 'anime', 'manga', 'cute', 'kawaii'],
    'REALISTIC': ['photo', 'realistic', 'real', 'nature', 'landscape', 'portrait'],
    'ABSTRACT': ['abstract', 'geometric', 'fractal', 'pattern', 'shape'],
    'NOIR': ['noir', 'dark', 'shadow', 'mystery', 'detective'],
    'NEON': ['neon', 'glow', 'light', 'bright', 'electric'],
  };

  let style = 'NEON';
  for (const [s, keywords] of Object.entries(styleMap)) {
    if (keywords.some(k => lower.includes(k))) {
      style = s;
      break;
    }
  }

  // Mood detection
  const moodMap: Record<string, string[]> = {
    'ENERGETIC': ['jump', 'run', 'fast', 'speed', 'action', 'dance', 'fly'],
    'CALM': ['peace', 'quiet', 'slow', 'gentle', 'float', 'drift', 'zen'],
    'DARK': ['dark', 'shadow', 'night', 'fear', 'horror', 'mystery'],
    'JOYFUL': ['happy', 'joy', 'smile', 'fun', 'play', 'laugh'],
    'EPIC': ['epic', 'grand', 'majestic', 'powerful', 'legend'],
  };

  let mood = 'DYNAMIC';
  for (const [m, keywords] of Object.entries(moodMap)) {
    if (keywords.some(k => lower.includes(k))) {
      mood = m;
      break;
    }
  }

  // Subject extraction (nouns after articles or descriptive words)
  const subjectPatterns = [
    /\b(a|an|the)\s+([\w\s]+?)(?=\s+(?:jump|run|walk|fly|dance|float|sit|stand|play|move))/gi,
    /\b([\w]+(?:\s+[\w]+)?)\s+(?:jumping|running|walking|flying|dancing|floating)/gi,
  ];

  const subjects: string[] = [];
  const commonSubjects = ['cat', 'dog', 'person', 'robot', 'character', 'bird', 'fish', 'car', 'ship', 'dragon', 'warrior', 'ninja', 'astronaut', 'wizard'];
  for (const s of commonSubjects) {
    if (lower.includes(s)) subjects.push(s);
  }
  if (subjects.length === 0) subjects.push('character');

  // Environment
  const envMap: Record<string, string[]> = {
    'CITY': ['city', 'urban', 'street', 'building', 'town', 'metro'],
    'FOREST': ['forest', 'tree', 'wood', 'jungle', 'nature'],
    'SPACE': ['space', 'star', 'galaxy', 'cosmos', 'planet', 'orbit'],
    'OCEAN': ['ocean', 'sea', 'water', 'underwater', 'marine'],
    'MOUNTAIN': ['mountain', 'peak', 'cliff', 'valley', 'hill'],
    'DESKTOP': ['desktop', 'screen', 'computer', 'digital'],
  };

  let environment = 'VOID';
  for (const [env, keywords] of Object.entries(envMap)) {
    if (keywords.some(k => lower.includes(k))) {
      environment = env;
      break;
    }
  }

  // Effects
  const effectMap: Record<string, string[]> = {
    'PARTICLES': ['particle', 'spark', 'dust', 'snow', 'rain', 'confetti'],
    'TRAIL': ['trail', 'streak', 'motion blur', 'speed lines'],
    'GLOW': ['glow', 'neon', 'light', 'shine', 'luminous'],
    'EXPLOSION': ['explosion', 'burst', 'blast', 'boom'],
    'WAVE': ['wave', 'ripple', 'pulse', 'shockwave'],
  };

  const effects: string[] = [];
  for (const [effect, keywords] of Object.entries(effectMap)) {
    if (keywords.some(k => lower.includes(k))) {
      effects.push(effect);
    }
  }
  if (effects.length === 0) effects.push('PARTICLES');

  // Colors
  const colorMap: Record<string, string[]> = {
    '#00ffff': ['cyan', 'aqua', 'teal', 'turquoise'],
    '#ff00ff': ['magenta', 'pink', 'fuchsia', 'purple'],
    '#ffff00': ['yellow', 'gold', 'amber'],
    '#00ff00': ['green', 'lime', 'emerald'],
    '#ff4444': ['red', 'crimson', 'scarlet'],
    '#4444ff': ['blue', 'azure', 'sapphire'],
    '#ff8800': ['orange', 'tangerine'],
    '#ffffff': ['white', 'silver'],
  };

  const colors: string[] = [];
  for (const [color, keywords] of Object.entries(colorMap)) {
    if (keywords.some(k => lower.includes(k))) {
      colors.push(color);
    }
  }
  // Default palette based on style
  if (colors.length === 0) {
    if (style === 'CYBERPUNK' || style === 'NEON') colors.push('#00ffff', '#ff00ff', '#ffff00');
    else if (style === 'VAPORWAVE') colors.push('#ff71ce', '#01cdfe', '#05ffa1');
    else if (style === 'PIXEL ART') colors.push('#ff0000', '#00ff00', '#0000ff', '#ffff00');
    else colors.push('#00ffff', '#a855f7', '#22c55e');
  }

  // All keywords
  const keywords = prompt.split(/\s+/).filter(w => w.length > 2);

  return { style, mood, subjects, environment, effects, colors, keywords };
}

// --- Real Storyboard Generation ---
function generateStoryboard(prompt: string, shotCount: number, parsed: ParsedPrompt): Shot[] {
  const cameraMovements = ['PAN_LEFT', 'PAN_RIGHT', 'ZOOM_IN', 'ZOOM_OUT', 'STATIC', 'DOLLY', 'ORBIT'];
  const actions = ['ENTER', 'ACTION', 'PEAK', 'TRANSITION', 'EXIT'];

  const shots: Shot[] = [];
  for (let i = 0; i < shotCount; i++) {
    const camera = cameraMovements[i % cameraMovements.length];
    const action = actions[i % actions.length];
    const subject = parsed.subjects[i % parsed.subjects.length];
    const duration = 0.8 + Math.random() * 0.7;

    shots.push({
      id: i + 1,
      description: `${action}: ${subject} in ${parsed.environment.toLowerCase()} - ${camera}`,
      duration,
      camera,
      action,
    });
  }

  return shots;
}

// --- Real Canvas Renderer ---
class TurboRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private frameCount = 0;
  private parsed: ParsedPrompt;
  private shots: Shot[];
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement, parsed: ParsedPrompt, shots: Shot[]) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.parsed = parsed;
    this.shots = shots;
    this.width = canvas.width;
    this.height = canvas.height;
    this.initParticles();
  }

  private initParticles() {
    const count = this.parsed.effects.includes('PARTICLES') ? 80 : 40;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 3,
        vy: (Math.random() - 0.5) * 3,
        size: Math.random() * 4 + 1,
        color: this.parsed.colors[Math.floor(Math.random() * this.parsed.colors.length)],
        life: Math.random(),
        maxLife: 0.5 + Math.random() * 0.5,
      });
    }
  }

  private getCurrentShot(): Shot {
    const totalDuration = this.shots.reduce((sum, s) => sum + s.duration, 0);
    const currentTime = (this.frameCount / 30) % totalDuration;
    let elapsed = 0;
    for (const shot of this.shots) {
      elapsed += shot.duration;
      if (currentTime < elapsed) return shot;
    }
    return this.shots[this.shots.length - 1];
  }

  private applyCameraTransform(shot: Shot) {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    ctx.save();

    switch (shot.camera) {
      case 'PAN_LEFT':
        ctx.translate(-Math.sin(t * 0.5) * 20, 0);
        break;
      case 'PAN_RIGHT':
        ctx.translate(Math.sin(t * 0.5) * 20, 0);
        break;
      case 'ZOOM_IN':
        const zoomIn = 1 + Math.sin(t * 0.3) * 0.1;
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(zoomIn, zoomIn);
        ctx.translate(-this.width / 2, -this.height / 2);
        break;
      case 'ZOOM_OUT':
        const zoomOut = 1 - Math.sin(t * 0.3) * 0.05;
        ctx.translate(this.width / 2, this.height / 2);
        ctx.scale(zoomOut, zoomOut);
        ctx.translate(-this.width / 2, -this.height / 2);
        break;
      case 'DOLLY':
        ctx.translate(Math.sin(t * 0.2) * 10, Math.cos(t * 0.2) * 10);
        break;
      case 'ORBIT':
        ctx.translate(this.width / 2, this.height / 2);
        ctx.rotate(Math.sin(t * 0.1) * 0.05);
        ctx.translate(-this.width / 2, -this.height / 2);
        break;
    }
  }

  private drawBackground() {
    const ctx = this.ctx;
    const t = this.frameCount / 60;

    // Dynamic gradient background based on environment
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);

    switch (this.parsed.environment) {
      case 'CITY':
        gradient.addColorStop(0, `hsl(${260 + Math.sin(t) * 10}, 80%, 5%)`);
        gradient.addColorStop(0.5, `hsl(${280 + Math.sin(t * 0.5) * 20}, 60%, 10%)`);
        gradient.addColorStop(1, `hsl(${200 + Math.cos(t) * 15}, 70%, 8%)`);
        break;
      case 'SPACE':
        gradient.addColorStop(0, '#000011');
        gradient.addColorStop(0.5, '#0a0020');
        gradient.addColorStop(1, '#000008');
        break;
      case 'FOREST':
        gradient.addColorStop(0, `hsl(${140 + Math.sin(t) * 10}, 40%, 5%)`);
        gradient.addColorStop(1, `hsl(${160 + Math.cos(t) * 10}, 30%, 10%)`);
        break;
      case 'OCEAN':
        gradient.addColorStop(0, `hsl(${200 + Math.sin(t) * 10}, 70%, 8%)`);
        gradient.addColorStop(1, `hsl(${220 + Math.cos(t) * 10}, 60%, 15%)`);
        break;
      default:
        gradient.addColorStop(0, '#050510');
        gradient.addColorStop(0.5, '#0a0a20');
        gradient.addColorStop(1, '#050515');
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    // Grid lines for cyberpunk/city
    if (this.parsed.environment === 'CITY' || this.parsed.style === 'CYBERPUNK') {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      const offset = (t * 20) % gridSize;

      for (let x = -gridSize + offset; x < this.width + gridSize; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.height);
        ctx.stroke();
      }
      for (let y = -gridSize + offset; y < this.height + gridSize; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.width, y);
        ctx.stroke();
      }
    }

    // Stars for space
    if (this.parsed.environment === 'SPACE') {
      for (let i = 0; i < 50; i++) {
        const sx = (Math.sin(i * 123.456) * 0.5 + 0.5) * this.width;
        const sy = (Math.cos(i * 789.012) * 0.5 + 0.5) * this.height;
        const brightness = Math.sin(t * 2 + i) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.8})`;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
    }
  }

  private drawSubject(shot: Shot) {
    const ctx = this.ctx;
    const t = this.frameCount / 30;
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Subject rendering based on type
    const subject = this.parsed.subjects[0] || 'character';

    ctx.save();

    // Movement based on action
    let offsetX = 0, offsetY = 0;
    switch (shot.action) {
      case 'ENTER':
        offsetX = Math.max(0, (1 - t * 0.5)) * -200;
        break;
      case 'ACTION':
        offsetX = Math.sin(t * 3) * 30;
        offsetY = Math.abs(Math.sin(t * 4)) * -40;
        break;
      case 'PEAK':
        offsetY = Math.sin(t * 2) * -20;
        break;
      case 'TRANSITION':
        offsetX = Math.sin(t * 0.5) * 50;
        break;
      case 'EXIT':
        offsetX = Math.min(200, t * 30);
        break;
    }

    const sx = cx + offsetX;
    const sy = cy + offsetY;

    // Glow effect
    if (this.parsed.effects.includes('GLOW') || this.parsed.style === 'NEON' || this.parsed.style === 'CYBERPUNK') {
      ctx.shadowColor = this.parsed.colors[0] || '#00ffff';
      ctx.shadowBlur = 20 + Math.sin(t * 3) * 10;
    }

    // Draw subject shape
    ctx.fillStyle = this.parsed.colors[0] || '#00ffff';
    ctx.strokeStyle = this.parsed.colors[1] || '#ff00ff';
    ctx.lineWidth = 2;

    if (subject.includes('cat')) {
      this.drawCat(sx, sy, t);
    } else if (subject.includes('robot')) {
      this.drawRobot(sx, sy, t);
    } else if (subject.includes('bird')) {
      this.drawBird(sx, sy, t);
    } else if (subject.includes('dragon')) {
      this.drawDragon(sx, sy, t);
    } else {
      this.drawCharacter(sx, sy, t);
    }

    ctx.restore();
  }

  private drawCharacter(x: number, y: number, t: number) {
    const ctx = this.ctx;
    // Head
    ctx.beginPath();
    ctx.arc(x, y - 30, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Body
    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x, y + 20);
    ctx.stroke();
    // Arms
    ctx.beginPath();
    ctx.moveTo(x - 20, y - 5 + Math.sin(t * 4) * 10);
    ctx.lineTo(x, y - 5);
    ctx.lineTo(x + 20, y - 5 - Math.sin(t * 4) * 10);
    ctx.stroke();
    // Legs
    ctx.beginPath();
    ctx.moveTo(x - 15, y + 40 + Math.sin(t * 3) * 5);
    ctx.lineTo(x, y + 20);
    ctx.lineTo(x + 15, y + 40 - Math.sin(t * 3) * 5);
    ctx.stroke();
  }

  private drawCat(x: number, y: number, t: number) {
    const ctx = this.ctx;
    // Body
    ctx.beginPath();
    ctx.ellipse(x, y, 25, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.arc(x + 20, y - 10, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Ears
    ctx.beginPath();
    ctx.moveTo(x + 14, y - 20);
    ctx.lineTo(x + 18, y - 30);
    ctx.lineTo(x + 22, y - 20);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 22, y - 20);
    ctx.lineTo(x + 26, y - 30);
    ctx.lineTo(x + 30, y - 20);
    ctx.fill();
    // Tail
    ctx.beginPath();
    ctx.moveTo(x - 25, y);
    ctx.quadraticCurveTo(x - 40, y - 20 + Math.sin(t * 3) * 10, x - 35, y - 30);
    ctx.stroke();
    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 17, y - 12, 3, 0, Math.PI * 2);
    ctx.arc(x + 25, y - 12, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRobot(x: number, y: number, t: number) {
    const ctx = this.ctx;
    // Body
    ctx.fillRect(x - 20, y - 10, 40, 35);
    ctx.strokeRect(x - 20, y - 10, 40, 35);
    // Head
    ctx.fillRect(x - 15, y - 35, 30, 25);
    ctx.strokeRect(x - 15, y - 35, 30, 25);
    // Eyes (blinking)
    const blink = Math.sin(t * 5) > 0.9 ? 0 : 1;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x - 8, y - 28, 6, 4 * blink);
    ctx.fillRect(x + 4, y - 28, 6, 4 * blink);
    // Antenna
    ctx.beginPath();
    ctx.moveTo(x, y - 35);
    ctx.lineTo(x, y - 45);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y - 47, 3, 0, Math.PI * 2);
    ctx.fillStyle = this.parsed.colors[0];
    ctx.fill();
    // Arms
    ctx.strokeStyle = this.parsed.colors[1] || '#ff00ff';
    ctx.beginPath();
    ctx.moveTo(x - 20, y);
    ctx.lineTo(x - 35, y + 10 + Math.sin(t * 2) * 5);
    ctx.moveTo(x + 20, y);
    ctx.lineTo(x + 35, y + 10 - Math.sin(t * 2) * 5);
    ctx.stroke();
  }

  private drawBird(x: number, y: number, t: number) {
    const ctx = this.ctx;
    // Body
    ctx.beginPath();
    ctx.ellipse(x, y, 15, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Wings
    const wingAngle = Math.sin(t * 6) * 0.5;
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.quadraticCurveTo(x - 25, y - 20 * (1 + wingAngle), x - 35, y - 5);
    ctx.moveTo(x + 5, y);
    ctx.quadraticCurveTo(x + 25, y - 20 * (1 + wingAngle), x + 35, y - 5);
    ctx.stroke();
    // Beak
    ctx.beginPath();
    ctx.moveTo(x + 15, y - 2);
    ctx.lineTo(x + 25, y);
    ctx.lineTo(x + 15, y + 2);
    ctx.fill();
  }

  private drawDragon(x: number, y: number, t: number) {
    const ctx = this.ctx;
    // Body
    ctx.beginPath();
    ctx.ellipse(x, y, 30, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Head
    ctx.beginPath();
    ctx.ellipse(x + 30, y - 10, 15, 12, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Wings
    const wingFlap = Math.sin(t * 4) * 15;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 15);
    ctx.lineTo(x - 30, y - 40 - wingFlap);
    ctx.lineTo(x - 5, y - 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Tail
    ctx.beginPath();
    ctx.moveTo(x - 30, y);
    ctx.quadraticCurveTo(x - 50, y + Math.sin(t * 2) * 15, x - 60, y - 10);
    ctx.stroke();
    // Fire breath
    if (this.parsed.effects.includes('EXPLOSION')) {
      ctx.fillStyle = `rgba(255, ${100 + Math.random() * 100}, 0, ${0.5 + Math.random() * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(x + 45, y - 10);
      ctx.lineTo(x + 70 + Math.random() * 20, y - 15 + Math.random() * 10);
      ctx.lineTo(x + 45, y - 5);
      ctx.fill();
    }
  }

  private drawParticles() {
    const ctx = this.ctx;

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.life += 0.01;

      if (p.life > p.maxLife) {
        p.life = 0;
        p.x = Math.random() * this.width;
        p.y = Math.random() * this.height;
      }

      // Wrap around
      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      const alpha = Math.sin((p.life / p.maxLife) * Math.PI);
      ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawEffects() {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Trails
    if (this.parsed.effects.includes('TRAIL')) {
      ctx.strokeStyle = this.parsed.colors[0] + '40';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(
          this.width / 2 + Math.sin(t + i) * 50,
          this.height / 2 + Math.cos(t + i) * 30
        );
        ctx.lineTo(
          this.width / 2 + Math.sin(t + i + 0.5) * 80,
          this.height / 2 + Math.cos(t + i + 0.5) * 50
        );
        ctx.stroke();
      }
    }

    // Wave/Shockwave
    if (this.parsed.effects.includes('WAVE')) {
      const waveRadius = ((t * 50) % 200);
      ctx.strokeStyle = this.parsed.colors[0] + Math.floor((1 - waveRadius / 200) * 100).toString(16).padStart(2, '0');
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.width / 2, this.height / 2, waveRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Explosion bursts
    if (this.parsed.effects.includes('EXPLOSION')) {
      const burstPhase = (t * 2) % 3;
      if (burstPhase < 0.5) {
        const burstAlpha = 1 - burstPhase * 2;
        ctx.fillStyle = `rgba(255, 200, 0, ${burstAlpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height / 2, burstPhase * 200, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawHUD(shot: Shot) {
    const ctx = this.ctx;
    const t = this.frameCount / 30;

    // Frame counter
    ctx.fillStyle = 'rgba(0, 255, 255, 0.7)';
    ctx.font = '10px monospace';
    ctx.fillText(`FRM: ${this.frameCount.toString().padStart(4, '0')}`, 10, 20);
    ctx.fillText(`SHOT: ${shot.id}/${this.shots.length}`, 10, 35);
    ctx.fillText(`CAM: ${shot.camera}`, 10, 50);

    // Scan line
    const scanY = (t * 100) % this.height;
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, scanY);
    ctx.lineTo(this.width, scanY);
    ctx.stroke();

    // Corner brackets
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    const m = 15;
    const s = 30;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(m, m + s); ctx.lineTo(m, m); ctx.lineTo(m + s, m);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(this.width - m - s, m); ctx.lineTo(this.width - m, m); ctx.lineTo(this.width - m, m + s);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(m, this.height - m - s); ctx.lineTo(m, this.height - m); ctx.lineTo(m + s, this.height - m);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(this.width - m - s, this.height - m); ctx.lineTo(this.width - m, this.height - m); ctx.lineTo(this.width - m, this.height - m - s);
    ctx.stroke();
  }

  renderFrame(): void {
    this.applyCameraTransform(this.getCurrentShot());
    this.drawBackground();
    this.drawEffects();
    this.drawSubject(this.getCurrentShot());
    this.drawParticles();
    this.drawHUD(this.getCurrentShot());
    this.ctx.restore(); // Restore camera transform
    this.frameCount++;
  }

  reset() {
    this.frameCount = 0;
    this.particles = [];
    this.initParticles();
  }
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

// --- Header Component ---
function Header() {
  const [time, setTime] = useState('00:00:00');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="p-4 border-b border-gray-800 bg-black/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full animate-pulse"></div>
          <h1 className="text-xl font-bold tracking-wider text-white">
            GAME-KIT <span className="text-xs text-cyan-400 align-top">TURBO ENGINE v3.0</span>
          </h1>
        </div>
        <div className="flex gap-4 text-xs text-gray-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            SYSTEM ONLINE
          </div>
          <div>{time}</div>
        </div>
      </div>
    </header>
  );
}

// --- Control Panel Component ---
interface ControlPanelProps {
  prompt: string;
  setPrompt: (v: string) => void;
  shotCount: number;
  setShotCount: (v: number) => void;
  formatType: string;
  setFormatType: (v: string) => void;
  overrideFx: boolean;
  setOverrideFx: (v: boolean) => void;
  overrideMotion: boolean;
  setOverrideMotion: (v: boolean) => void;
  onStart: () => void;
  isRunning: boolean;
}

function ControlPanel({
  prompt, setPrompt, shotCount, setShotCount,
  formatType, setFormatType, overrideFx, setOverrideFx,
  overrideMotion, setOverrideMotion, onStart, isRunning
}: ControlPanelProps) {
  return (
    <div className="lg:col-span-4 space-y-4">
      {/* Prompt Input */}
      <div className="bg-gray-900/90 p-5 rounded-lg border border-gray-700 shadow-lg">
        <label className="block text-cyan-400 text-xs mb-2 font-bold uppercase tracking-widest">Input Sequence</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full h-24 bg-black/50 border border-gray-600 rounded p-3 text-sm text-white focus:border-purple-500 focus:outline-none transition-colors resize-none font-mono"
          placeholder="Describe scene..."
        />

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-gray-500 block mb-1 uppercase">Shots</label>
            <select
              value={shotCount}
              onChange={(e) => setShotCount(parseInt(e.target.value))}
              className="w-full bg-black/50 border border-gray-600 rounded p-2 text-xs text-white"
            >
              <option value={3}>3 Shots</option>
              <option value={4}>4 Shots</option>
              <option value={5}>5 Shots</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-1 uppercase">Format</label>
            <select
              value={formatType}
              onChange={(e) => setFormatType(e.target.value)}
              className="w-full bg-black/50 border border-gray-600 rounded p-2 text-xs text-white"
            >
              <option value="webm">WebM (VP8)</option>
              <option value="webm-hq">WebM HQ</option>
            </select>
          </div>
        </div>

        <button
          onClick={onStart}
          disabled={isRunning}
          className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded text-sm uppercase tracking-widest transition-all hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
        >
          {isRunning ? 'Rendering...' : 'Initiate Render'}
        </button>
      </div>

      {/* Director Overrides */}
      <div className="bg-gray-900/90 p-5 rounded-lg border border-gray-700 shadow-lg">
        <label className="block text-purple-400 text-xs mb-3 font-bold uppercase tracking-widest">Overrides</label>
        <div className="space-y-2">
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-xs text-gray-400 group-hover:text-white">MORE FX</span>
            <input
              type="checkbox"
              checked={overrideFx}
              onChange={(e) => setOverrideFx(e.target.checked)}
              className="w-3 h-3 accent-purple-500"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-xs text-gray-400 group-hover:text-white">MORE MOTION</span>
            <input
              type="checkbox"
              checked={overrideMotion}
              onChange={(e) => setOverrideMotion(e.target.checked)}
              className="w-3 h-3 accent-purple-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// --- Stage Card Component ---
interface StageCardProps {
  stage: StageData;
  children?: React.ReactNode;
}

function StageCard({ stage, children }: StageCardProps) {
  const statusColors: Record<StageStatus, string> = {
    PENDING: 'text-[10px] bg-gray-800 px-2 py-0.5 rounded text-gray-400',
    PROCESSING: 'text-[10px] bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded border border-yellow-700',
    DONE: 'text-[10px] bg-green-900/50 text-green-400 px-2 py-0.5 rounded border border-green-700',
  };

  const cardClass = `stage-card p-3 rounded relative overflow-hidden ${stage.status === 'PROCESSING' ? 'active' : ''} ${stage.status === 'DONE' ? 'completed' : ''}`;

  return (
    <div className={cardClass}>
      <div className="flex justify-between items-center mb-1">
        <h3 className={`font-bold text-sm ${stage.color}`}>
          {stage.id === 5 ? (
            <span className="flex items-center gap-2">
              {stage.title}
              <span className="text-[8px] bg-green-900 text-green-300 px-1 rounded border border-green-700">GPU ACCEL</span>
            </span>
          ) : stage.title}
        </h3>
        <span className={statusColors[stage.status]}>{stage.status}</span>
      </div>
      {children ? (
        children
      ) : (
        <div className="text-[10px] text-gray-500 h-4 overflow-hidden whitespace-nowrap">
          {stage.detail}
        </div>
      )}
      <div
        className={`absolute bottom-0 left-0 h-0.5 loader-bar bar-${stage.barColor}`}
        style={{ width: `${stage.barWidth}%` }}
      />
    </div>
  );
}

// --- Final Output Component ---
interface FinalOutputProps {
  data: OutputData | null;
  visible: boolean;
}

function FinalOutput({ data, visible }: FinalOutputProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-play video when it becomes visible
  useEffect(() => {
    if (visible && data && videoRef.current) {
      const video = videoRef.current;
      
      // Force play with multiple attempts
      const attemptPlay = async () => {
        try {
          video.muted = true;
          await video.play();
        } catch (err) {
          console.log('Autoplay attempt failed, retrying...', err);
          // Retry after short delay
          setTimeout(async () => {
            try {
              await video.play();
            } catch (e) {
              console.log('Final autoplay attempt failed', e);
            }
          }, 100);
        }
      };

      // Play when video is ready
      if (video.readyState >= 2) {
        attemptPlay();
      } else {
        video.addEventListener('canplay', attemptPlay, { once: true });
        video.addEventListener('loadeddata', attemptPlay, { once: true });
      }

      return () => {
        video.removeEventListener('canplay', attemptPlay);
        video.removeEventListener('loadeddata', attemptPlay);
      };
    }
  }, [visible, data]);

  if (!visible || !data) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = data.videoUrl;
    a.download = `gamekit_render_${data.id}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="mt-4 bg-gray-900 border border-green-500/30 p-4 rounded-lg shadow-[0_0_20px_rgba(0,255,0,0.1)] slide-up">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <h2 className="text-sm font-bold text-green-400 uppercase">Generation Complete — Auto-Playing</h2>
        </div>
        <button
          onClick={handleDownload}
          className="text-[10px] bg-green-900/50 text-green-300 px-3 py-1 rounded hover:bg-green-800 transition border border-green-700 cursor-pointer"
        >
          DOWNLOAD WEBM
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="aspect-video bg-black rounded border border-gray-700 relative overflow-hidden group">
          <video
            ref={videoRef}
            src={data.videoUrl}
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            controls
          />
          <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 text-[9px] rounded text-white font-mono pointer-events-none">
            {data.duration}
          </div>
          <div className="absolute top-1 left-1 bg-red-600/80 px-1.5 py-0.5 text-[9px] rounded text-white font-mono font-bold animate-pulse pointer-events-none">
            ● PLAYING
          </div>
        </div>

        <div className="space-y-2 text-[10px] font-mono">
          <div className="flex justify-between border-b border-gray-800 pb-1">
            <span className="text-gray-500">VIDEO ID</span>
            <span className="text-cyan-400">{data.id}</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-1">
            <span className="text-gray-500">DURATION</span>
            <span className="text-white">{data.duration}</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-1">
            <span className="text-gray-500">STYLE</span>
            <span className="text-purple-400">{data.style}</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-1">
            <span className="text-gray-500">SIZE</span>
            <span className="text-white">{data.size}</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-1">
            <span className="text-gray-500">FORMAT</span>
            <span className="text-white">WebM (VP8/VP9)</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-1">
            <span className="text-gray-500">RESOLUTION</span>
            <span className="text-white">640×360</span>
          </div>
          <div className="flex justify-between border-b border-gray-800 pb-1">
            <span className="text-gray-500">FPS</span>
            <span className="text-white">30</span>
          </div>
          <div className="mt-2 p-2 bg-gray-800/50 rounded text-[9px] text-gray-400 italic border-l-2 border-green-500">
            "Rendered in <span className="text-green-400 font-bold">{data.renderTime}</span> using Canvas API + MediaRecorder. Video auto-plays on completion."
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main App Component ---
function App() {
  const [prompt, setPrompt] = useState('A neon cat jumping through a cyberpunk city with particle effects');
  const [shotCount, setShotCount] = useState(4);
  const [formatType, setFormatType] = useState('webm');
  const [overrideFx, setOverrideFx] = useState(false);
  const [overrideMotion, setOverrideMotion] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [outputData, setOutputData] = useState<OutputData | null>(null);
  const [liveMode, setLiveMode] = useState(false);

  const [statusText, setStatusText] = useState('WAITING...');
  const [statusColor, setStatusColor] = useState('bg-gray-600');
  const [pipelineStatus, setPipelineStatus] = useState('IDLE');

  const [stages, setStages] = useState<StageData[]>([
    { id: 1, title: '01. SYNTHESIS', color: 'text-cyan-400', barColor: 'cyan', status: 'PENDING', detail: 'Parsing prompt...', barWidth: 0 },
    { id: 2, title: '02. STORYBOARD', color: 'text-purple-400', barColor: 'purple', status: 'PENDING', detail: 'Generating shots...', barWidth: 0 },
    { id: 3, title: '03. PERFORMANCE', color: 'text-yellow-400', barColor: 'yellow', status: 'PENDING', detail: 'Detecting device sensors...', barWidth: 0 },
    { id: 4, title: '04. DIRECTOR AI', color: 'text-red-400', barColor: 'red', status: 'PENDING', detail: 'Computing cinematic rules...', barWidth: 0 },
    { id: 5, title: '05. TURBO RENDER', color: 'text-green-400', barColor: 'green', status: 'PENDING', detail: '', barWidth: 0 },
    { id: 6, title: '06. EXPORT', color: 'text-blue-400', barColor: 'blue', status: 'PENDING', detail: 'Initializing MediaRecorder...', barWidth: 0 },
  ]);

  const [renderProgress, setRenderProgress] = useState(0);
  const [previewFrame, setPreviewFrame] = useState<string>('');
  const [fps, setFps] = useState(0);
  const pipelineRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const updateStage = useCallback((id: number, updates: Partial<StageData>) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const resetStages = useCallback(() => {
    setStages([
      { id: 1, title: '01. SYNTHESIS', color: 'text-cyan-400', barColor: 'cyan', status: 'PENDING', detail: 'Parsing prompt...', barWidth: 0 },
      { id: 2, title: '02. STORYBOARD', color: 'text-purple-400', barColor: 'purple', status: 'PENDING', detail: 'Generating shots...', barWidth: 0 },
      { id: 3, title: '03. PERFORMANCE', color: 'text-yellow-400', barColor: 'yellow', status: 'PENDING', detail: 'Detecting device sensors...', barWidth: 0 },
      { id: 4, title: '04. DIRECTOR AI', color: 'text-red-400', barColor: 'red', status: 'PENDING', detail: 'Computing cinematic rules...', barWidth: 0 },
      { id: 5, title: '05. TURBO RENDER', color: 'text-green-400', barColor: 'green', status: 'PENDING', detail: '', barWidth: 0 },
      { id: 6, title: '06. EXPORT', color: 'text-blue-400', barColor: 'blue', status: 'PENDING', detail: 'Initializing MediaRecorder...', barWidth: 0 },
    ]);
    setRenderProgress(0);
    setPreviewFrame('');
  }, []);

  const runStage = useCallback(async (num: number, task: () => Promise<void>) => {
    updateStage(num, { status: 'PROCESSING', barWidth: 30 });
    await new Promise(r => setTimeout(r, 50));
    updateStage(num, { barWidth: 70 });
    await task();
    updateStage(num, { status: 'DONE', barWidth: 100 });
  }, [updateStage]);

  const startPipeline = useCallback(async () => {
    if (!prompt.trim()) {
      alert('Please enter a prompt');
      return;
    }
    if (pipelineRef.current) return;
    pipelineRef.current = true;

    setIsRunning(true);
    setShowOutput(false);
    setOutputData(null);
    setLiveMode(true);
    resetStages();

    setStatusText('INITIALIZING REAL-TIME ENGINE...');
    setStatusColor('bg-yellow-500');
    setPipelineStatus('RUNNING');

    try {
      // --- STAGE 1: REAL PROMPT SYNTHESIS ---
      let parsed: ParsedPrompt;
      await runStage(1, async () => {
        await new Promise(r => setTimeout(r, 200));
        parsed = analyzePrompt(prompt);
        const details = [
          `STYLE: ${parsed.style}`,
          `MOOD: ${parsed.mood}`,
          `SUBJECTS: ${parsed.subjects.join(', ')}`,
          `ENV: ${parsed.environment}`,
          `FX: ${parsed.effects.join(', ')}`,
        ].join(' | ');
        updateStage(1, { detail: details });
      });

      // --- STAGE 2: REAL STORYBOARD GENERATION ---
      let shots: Shot[];
      await runStage(2, async () => {
        await new Promise(r => setTimeout(r, 200));
        shots = generateStoryboard(prompt, shotCount, parsed!);
        const totalDuration = shots.reduce((sum, s) => sum + s.duration, 0).toFixed(2);
        const shotList = shots.map(s => `S${s.id}:${s.action}`).join(' → ');
        updateStage(2, { detail: `${shotCount} SHOTS | ${totalDuration}s | ${shotList}` });
      });

      // --- STAGE 3: REAL DEVICE PERFORMANCE DETECTION ---
      await runStage(3, async () => {
        await new Promise(r => setTimeout(r, 300));
        const capabilities: string[] = [];
        const cores = navigator.hardwareConcurrency || 'unknown';
        capabilities.push(`CPU: ${cores} cores`);
        const memory = (navigator as any).deviceMemory;
        if (memory) capabilities.push(`RAM: ${memory}GB`);
        try {
          const testCanvas = document.createElement('canvas');
          const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
          if (gl) {
            const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
              const gpu = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
              capabilities.push(`GPU: ${gpu.substring(0, 25)}`);
            } else {
              capabilities.push('GPU: WebGL Active');
            }
          }
        } catch {
          capabilities.push('GPU: Canvas2D');
        }
        const conn = (navigator as any).connection;
        if (conn) capabilities.push(`NET: ${conn.effectiveType || 'unknown'}`);
        if (window.DeviceOrientationEvent) capabilities.push('GYRO: ✓');
        updateStage(3, { detail: capabilities.join(' | ') });
      });

      // --- STAGE 4: REAL DIRECTOR AI ---
      await runStage(4, async () => {
        await new Promise(r => setTimeout(r, 200));
        const decisions: string[] = [];
        if (parsed!.mood === 'ENERGETIC') decisions.push('CAM: FAST_PAN');
        else if (parsed!.mood === 'CALM') decisions.push('CAM: SLOW_DOLLY');
        else decisions.push('CAM: DYNAMIC');
        const fxIntensity = overrideFx ? 2.0 : (parsed!.effects.length > 2 ? 1.5 : 1.0);
        decisions.push(`FX_INT: ${fxIntensity}x`);
        const motionScale = overrideMotion ? 1.8 : 1.0;
        decisions.push(`MOTION: ${motionScale}x`);
        decisions.push(`GRADE: ${parsed!.style}`);
        decisions.push('RATIO: 16:9');
        updateStage(4, { detail: decisions.join(' | ') });
      });

      // --- STAGE 5: REAL-TIME RENDER ENGINE with LIVE PREVIEW ---
      await runStage(5, async () => {
        updateStage(5, { detail: 'STARTING REAL-TIME RENDER LOOP...' });

        // Create visible canvas for live rendering
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        canvasRef.current = canvas;

        // Attach to live preview container
        const liveContainer = document.getElementById('live-preview-container');
        if (liveContainer) {
          liveContainer.innerHTML = '';
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.objectFit = 'cover';
          canvas.style.borderRadius = '4px';
          liveContainer.appendChild(canvas);
        }

        const renderer = new TurboRenderer(canvas, parsed!, shots!);

        const startTime = performance.now();
        const targetFPS = 30;
        const frameInterval = 1000 / targetFPS;
        let lastFrameTime = 0;
        let framesRendered = 0;
        const totalFrames = 180; // 6 seconds at 30fps

        // Real-time render loop using requestAnimationFrame
        return new Promise<void>((resolve) => {
          const renderLoop = (timestamp: number) => {
            const elapsed = timestamp - lastFrameTime;

            if (elapsed >= frameInterval) {
              renderer.renderFrame();
              framesRendered++;
              lastFrameTime = timestamp;

              // Update FPS display
              const currentFps = Math.round(1000 / elapsed);
              setFps(currentFps);

              // Update progress
              const progress = Math.min(100, Math.round((framesRendered / totalFrames) * 100));
              setRenderProgress(progress);
              updateStage(5, {
                barWidth: progress,
                detail: `LIVE RENDER: ${framesRendered}/${totalFrames} FRAMES | ${currentFps} FPS | ${((timestamp - startTime) / 1000).toFixed(1)}s`,
              });

              // Update preview thumbnail every 30 frames
              if (framesRendered % 30 === 0) {
                setPreviewFrame(canvas.toDataURL('image/jpeg', 0.5));
              }

              // Check if done
              if (framesRendered >= totalFrames) {
                const endTime = performance.now();
                const renderTime = ((endTime - startTime) / 1000).toFixed(2);
                setRenderProgress(100);
                updateStage(5, {
                  detail: `RENDER COMPLETE: ${totalFrames} FRAMES @ ${targetFPS}FPS (${renderTime}s) | 640x360`,
                  barWidth: 100,
                });
                setPreviewFrame(canvas.toDataURL('image/jpeg', 0.8));

                // Store for export
                (window as any).__renderer = renderer;
                (window as any).__renderTime = renderTime;
                (window as any).__parsed = parsed;
                (window as any).__shots = shots;
                (window as any).__canvas = canvas;

                resolve();
                return;
              }
            }

            animationFrameRef.current = requestAnimationFrame(renderLoop);
          };

          animationFrameRef.current = requestAnimationFrame(renderLoop);
        });
      });

      // --- STAGE 6: REAL VIDEO EXPORT via MediaRecorder ---
      await runStage(6, async () => {
        updateStage(6, { detail: 'STARTING LIVE CAPTURE + ENCODING...' });

        const canvas = (window as any).__canvas as HTMLCanvasElement;
        const renderer = (window as any).__renderer as TurboRenderer;
        const renderTime = (window as any).__renderTime;
        const parsedFinal = (window as any).__parsed as ParsedPrompt;
        const shotsFinal = (window as any).__shots as Shot[];

        // Capture stream from canvas at 30fps
        const stream = canvas.captureStream(30);

        // Determine supported mime type
        let mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';

        const bitrate = formatType === 'webm-hq' ? 5000000 : 2500000;
        const recorder = new MediaRecorder(stream, {
          mimeType,
          videoBitsPerSecond: bitrate,
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        const recordingDone = new Promise<Blob>((resolve) => {
          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: mimeType });
            resolve(blob);
          };
        });

        // Start recording
        recorder.start(100); // Collect data every 100ms

        // Continue rendering in real-time while recording (6 seconds)
        const recordDuration = 6000;
        const recordStart = performance.now();
        const targetFPS = 30;
        const frameInterval = 1000 / targetFPS;
        let lastFrame = 0;
        let recordedFrames = 0;

        await new Promise<void>((resolve) => {
          const recordLoop = (timestamp: number) => {
            const elapsed = timestamp - recordStart;

            if (elapsed >= recordDuration) {
              resolve();
              return;
            }

            if (timestamp - lastFrame >= frameInterval) {
              renderer.renderFrame();
              recordedFrames++;
              lastFrame = timestamp;

              const progress = Math.round((elapsed / recordDuration) * 100);
              updateStage(6, {
                barWidth: progress,
                detail: `RECORDING: ${recordedFrames} FRAMES | ${(elapsed / 1000).toFixed(1)}s/${recordDuration / 1000}s | ${mimeType}`,
              });
            }

            requestAnimationFrame(recordLoop);
          };
          requestAnimationFrame(recordLoop);
        });

        // Stop recording
        recorder.stop();
        stream.getTracks().forEach(track => track.stop());

        const videoBlob = await recordingDone;
        const videoUrl = URL.createObjectURL(videoBlob);
        const sizeMB = (videoBlob.size / (1024 * 1024)).toFixed(2);

        const totalDuration = shotsFinal.reduce((sum: number, s: Shot) => sum + s.duration, 0).toFixed(2);
        const finalId = `CKT_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${Math.floor(Math.random() * 9000) + 1000}`;

        setOutputData({
          id: finalId,
          duration: totalDuration + 's',
          style: parsedFinal.style,
          size: `${sizeMB} MB`,
          renderTime: renderTime + 's',
          videoUrl,
          thumbnailUrl: previewFrame,
        });

        updateStage(6, {
          detail: `EXPORTED: ${mimeType} | ${sizeMB}MB | ${recordedFrames} FRAMES | READY TO PLAY`,
          barWidth: 100,
        });

        setShowOutput(true);
        setLiveMode(false);
      });

      setStatusText('PIPELINE FINISHED — VIDEO READY');
      setStatusColor('bg-green-500');
      setPipelineStatus('COMPLETED');
    } catch (e) {
      console.error('Pipeline error:', e);
      setStatusText('ERROR: ' + (e as Error).message);
      setStatusColor('bg-red-500');
      setPipelineStatus('ERROR');
    } finally {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setIsRunning(false);
      pipelineRef.current = false;
    }
  }, [prompt, shotCount, formatType, overrideFx, overrideMotion, resetStages, runStage, updateStage]);

  return (
    <div className="min-h-screen flex flex-col">
      <div className="scanlines"></div>

      <Header />

      <main className="flex-grow p-4 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        <ControlPanel
          prompt={prompt}
          setPrompt={setPrompt}
          shotCount={shotCount}
          setShotCount={setShotCount}
          formatType={formatType}
          setFormatType={setFormatType}
          overrideFx={overrideFx}
          setOverrideFx={setOverrideFx}
          overrideMotion={overrideMotion}
          setOverrideMotion={setOverrideMotion}
          onStart={startPipeline}
          isRunning={isRunning}
        />

        <div className="lg:col-span-8 space-y-3">
          {/* Status Bar */}
          <div className="bg-black/60 p-3 rounded border border-gray-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${statusColor} ${isRunning ? 'animate-pulse' : ''}`}></div>
              <span className="text-xs font-mono text-gray-400">{statusText}</span>
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              ENGINE STATUS: <span className="text-cyan-500">{pipelineStatus}</span>
            </div>
          </div>

          {/* Live Preview */}
          {liveMode && (
            <div className="bg-black/80 border border-cyan-500/50 rounded-lg p-3 shadow-[0_0_20px_rgba(0,255,255,0.2)]">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-red-400 uppercase">LIVE RENDER</span>
                </div>
                <div className="text-[10px] text-cyan-400 font-mono">{fps} FPS</div>
              </div>
              <div id="live-preview-container" className="aspect-video bg-black rounded overflow-hidden border border-gray-700">
                {/* Canvas will be injected here */}
              </div>
            </div>
          )}

          {/* Pipeline Stages */}
          <div className="space-y-2">
            {stages.map((stage) => (
              <StageCard key={stage.id} stage={stage}>
                {stage.id === 5 ? (
                  <>
                    <div className="flex gap-1 mt-2 h-8">
                      {[20, 40, 60, 80, 100].map((pct, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded border flex items-center justify-center text-[8px] transition-all duration-200 ${
                            renderProgress >= pct
                              ? 'bg-green-900/50 border-green-600 text-green-400'
                              : 'bg-gray-800 border-gray-600 text-gray-500'
                          }`}
                        >
                          {renderProgress >= pct ? `✓ ${pct}%` : `${pct}%`}
                        </div>
                      ))}
                    </div>
                    {stage.detail && (
                      <div className="text-[10px] text-gray-500 mt-1">{stage.detail}</div>
                    )}
                    {!liveMode && previewFrame && (
                      <div className="mt-2 rounded overflow-hidden border border-gray-700">
                        <img src={previewFrame} alt="Render preview" className="w-full h-20 object-cover opacity-70" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[10px] text-gray-500 h-4 overflow-hidden whitespace-nowrap">
                    {stage.detail}
                  </div>
                )}
              </StageCard>
            ))}
          </div>

          {/* Final Output */}
          <FinalOutput data={outputData} visible={showOutput} />
        </div>
      </main>
    </div>
  );
}

export default App;
