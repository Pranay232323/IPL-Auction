// Lightweight Canvas Celebration Confetti (Zero Dependency)

interface ConfettiParticle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  opacity: number;
}

export function fireTeamConfetti(primaryColor?: string, secondaryColor?: string): void {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const colors = [
    primaryColor || '#F59E0B',
    secondaryColor || '#3B82F6',
    '#FBBF24', // Gold
    '#FFFFFF', // White shine
    '#10B981', // Emerald
    '#EC4899', // Pink
  ];

  const particleCount = 120;
  const particles: ConfettiParticle[] = [];

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI - Math.PI / 2; // Fan out upwards
    const speed = 7 + Math.random() * 12;
    particles.push({
      x: width * (0.2 + Math.random() * 0.6),
      y: height * 0.7,
      w: 8 + Math.random() * 8,
      h: 5 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
      vy: -Math.abs(Math.sin(angle) * speed) - 4,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      opacity: 1,
    });
  }

  let animationId: number;
  let startTime = performance.now();

  function render(time: number) {
    if (!ctx) return;
    const elapsed = time - startTime;
    ctx.clearRect(0, 0, width, height);

    let activeCount = 0;

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // Gravity
      p.vx *= 0.985; // Air drag
      p.rotation += p.vRot;

      if (elapsed > 1200) {
        p.opacity -= 0.025;
      }

      if (p.opacity > 0 && p.y < height + 50) {
        activeCount++;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }

    if (activeCount > 0 && elapsed < 3500) {
      animationId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationId);
      canvas.remove();
    }
  }

  animationId = requestAnimationFrame(render);
}

