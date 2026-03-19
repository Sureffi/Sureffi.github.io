/* ============================================
   CYBERPUNK 2077 PORTFOLIO
   Boot → Canvas → Typing → Interactions
   ============================================ */

// ============================================
// BOOT SEQUENCE
// ============================================
(function () {
    const boot = document.getElementById('boot');
    const container = document.getElementById('bootLines');

    // Fallback — if boot elements missing, reveal everything immediately
    if (!boot || !container) {
        revealPage();
        return;
    }

    const lines = [
        { text: '> SYSTEM BOOT v2.077' },
        { text: '> NEURAL LINK ............ <span class="bl-green">ACTIVE</span>' },
        { text: '> SCANNING NET ........... <span class="bl-cyan">OK</span>' },
        { text: '> THREAT LEVEL ........... <span class="bl-red">MAXIMUM</span>' },
        { text: '> STATUS: ONLINE' },
        { text: '' },
        { text: '> WAKE UP, SAMURAI' },
    ];

    const els = lines.map((l) => {
        const div = document.createElement('div');
        div.className = 'boot-line';
        div.innerHTML = l.text || '&nbsp;';
        container.appendChild(div);
        return div;
    });

    let i = 0;
    const LINE_DELAY = 140;

    function showNext() {
        if (i < els.length) {
            els[i].classList.add('show');
            i++;
            setTimeout(showNext, LINE_DELAY);
        } else {
            setTimeout(killBoot, 500);
        }
    }

    function killBoot() {
        boot.classList.add('done');
        setTimeout(() => {
            boot.remove();
            revealPage();
        }, 480);
    }

    setTimeout(showNext, 200);

    function revealPage() {
        // Unlock scroll
        document.body.classList.remove('booting');

        // Show nav
        document.querySelector('.nav')?.classList.add('show');

        // Show hero name
        const name = document.querySelector('.hero-name');
        if (name) name.classList.add('show');

        // Show HUD elements
        document.querySelectorAll('.hud-corner, .hud-data').forEach((el) => {
            el.classList.add('show');
        });

        // Stagger hero reveals
        document.querySelectorAll('.hero-reveal').forEach((el, idx) => {
            setTimeout(() => el.classList.add('show'), 150 + idx * 160);
        });

        // Tell other modules boot is done
        document.dispatchEvent(new CustomEvent('bootcomplete'));
    }
})();


// ============================================
// HERO CANVAS — Perspective grid + rain + sparks
// HiDPI-aware, pauses when offscreen
// ============================================
(function () {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H, dpr;
    let gridOffset = 0;
    const GRID_SPEED = 0.003;
    const H_LINES = 26;
    const V_LINES = 22;

    const drops = [];
    const sparks = [];
    let isVisible = true;
    let rafId = null;

    function resize() {
        dpr = window.devicePixelRatio || 1;
        W = canvas.offsetWidth;
        H = canvas.offsetHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeDrop() {
        return {
            x: Math.random() * W,
            y: -(Math.random() * H),
            speed: Math.random() * 2.2 + 0.6,
            len: Math.random() * 35 + 12,
            alpha: Math.random() * 0.15 + 0.02,
        };
    }

    function makeSpark() {
        const colors = ['#FCE300', '#ff003c', '#ffb300', '#00fff5'];
        return {
            x: Math.random() * W,
            y: H + Math.random() * 20,
            vx: (Math.random() - 0.5) * 0.25,
            vy: -(Math.random() * 0.6 + 0.15),
            r: Math.random() * 1.2 + 0.4,
            alpha: Math.random() * 0.5 + 0.2,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: Math.random() * 250 + 80,
            age: 0,
        };
    }

    function initParticles() {
        drops.length = 0;
        sparks.length = 0;
        // Fewer particles on small screens
        const isMobile = W < 600;
        const dc = isMobile ? Math.min(40, Math.floor(W / 12)) : Math.min(100, Math.floor(W / 10));
        const sc = isMobile ? 15 : 30;
        for (let i = 0; i < dc; i++) drops.push(makeDrop());
        for (let i = 0; i < sc; i++) sparks.push(makeSpark());
    }

    function drawGrid() {
        const hy = H * 0.46;
        const cx = W / 2;
        const gh = H - hy;

        // Horizon glow — red/orange
        const g1 = ctx.createRadialGradient(cx, hy, 0, cx, hy, W * 0.5);
        g1.addColorStop(0, 'rgba(255, 0, 60, 0.14)');
        g1.addColorStop(0.3, 'rgba(252, 227, 0, 0.04)');
        g1.addColorStop(1, 'transparent');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, W, H);

        // Lower cyan ambient
        const g2 = ctx.createRadialGradient(cx, hy + 40, 0, cx, hy + 40, W * 0.25);
        g2.addColorStop(0, 'rgba(0, 255, 245, 0.04)');
        g2.addColorStop(1, 'transparent');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, W, H);

        // Horizontal grid lines
        for (let i = 0; i < H_LINES; i++) {
            const t = ((i / H_LINES) + gridOffset) % 1;
            const y = hy + gh * (t * t);
            const a = t * 0.22;
            ctx.strokeStyle = `rgba(0, 255, 245, ${a})`;
            ctx.lineWidth = t > 0.7 ? 1 : 0.5;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }

        // Vertical grid lines
        const half = V_LINES / 2;
        for (let i = -half; i <= half; i++) {
            const ratio = i / half;
            const spread = ratio * W * 1.15;
            const a = 0.1 * (1 - Math.abs(ratio) * 0.65);
            ctx.strokeStyle = `rgba(0, 255, 245, ${a})`;
            ctx.lineWidth = 0.4;
            ctx.beginPath();
            ctx.moveTo(cx, hy);
            ctx.lineTo(cx + spread, H);
            ctx.stroke();
        }

        // Horizon line
        ctx.strokeStyle = 'rgba(252, 227, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.shadowColor = 'rgba(252, 227, 0, 0.4)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(0, hy);
        ctx.lineTo(W, hy);
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    function drawRain() {
        for (const d of drops) {
            ctx.strokeStyle = `rgba(0, 255, 245, ${d.alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(d.x, d.y);
            ctx.lineTo(d.x, d.y + d.len);
            ctx.stroke();

            d.y += d.speed;
            if (d.y > H + d.len) {
                d.y = -d.len - Math.random() * 300;
                d.x = Math.random() * W;
            }
        }
    }

    function drawSparks() {
        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i];
            const lr = 1 - s.age / s.life;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * lr, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.globalAlpha = s.alpha * lr;
            ctx.fill();
            ctx.globalAlpha = 1;

            s.x += s.vx;
            s.y += s.vy;
            s.age++;

            if (s.age >= s.life || s.y < -10) {
                sparks[i] = makeSpark();
            }
        }
    }

    // Occasional flash
    let flash = 0;
    function maybeFlash() {
        if (Math.random() < 0.0008) flash = 0.025;
        if (flash > 0) {
            ctx.fillStyle = `rgba(252, 227, 0, ${flash})`;
            ctx.fillRect(0, 0, W, H);
            flash *= 0.9;
            if (flash < 0.002) flash = 0;
        }
    }

    function frame() {
        if (!isVisible) {
            rafId = null;
            return;
        }
        ctx.clearRect(0, 0, W, H);
        drawGrid();
        drawRain();
        drawSparks();
        maybeFlash();
        gridOffset += GRID_SPEED;
        rafId = requestAnimationFrame(frame);
    }

    function startLoop() {
        if (!rafId) rafId = requestAnimationFrame(frame);
    }

    // Pause canvas when hero scrolls out of view
    const visObs = new IntersectionObserver(
        (entries) => {
            isVisible = entries[0].isIntersecting;
            if (isVisible) startLoop();
        },
        { threshold: 0 }
    );
    visObs.observe(canvas);

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resize();
            initParticles();
        }, 200);
    });

    resize();
    initParticles();
    startLoop();
})();


// ============================================
// TYPING EFFECT — waits for boot to finish
// ============================================
(function () {
    const phrases = [
        'real-time data pipelines',
        'AI-powered trading systems',
        'cloud-native infrastructure',
        'Web3 analytics tools',
        'deep learning models',
        'distributed microservices',
    ];

    const el = document.querySelector('.typed-text');
    if (!el) return;

    let pi = 0, ci = 0, del = false;

    function tick() {
        const word = phrases[pi];
        if (del) {
            ci--;
        } else {
            ci++;
        }
        el.textContent = word.substring(0, ci);

        let d = del ? 28 : 60;

        if (!del && ci === word.length) {
            d = 2500;
            del = true;
        } else if (del && ci === 0) {
            del = false;
            pi = (pi + 1) % phrases.length;
            d = 500;
        }

        setTimeout(tick, d);
    }

    // Start typing only after boot completes
    document.addEventListener('bootcomplete', () => {
        setTimeout(tick, 400);
    });
})();


// ============================================
// SCROLL REVEAL — Intersection Observer
// ============================================
(function () {
    const obs = new IntersectionObserver(
        (entries) => entries.forEach((e) => {
            if (e.isIntersecting) e.target.classList.add('visible');
        }),
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
})();


// ============================================
// NAV — scroll background + active link tracking
// ============================================
(function () {
    const nav = document.getElementById('nav');
    const sections = document.querySelectorAll('section[id]');
    const links = document.querySelectorAll('.nav-links a[href^="#"]');
    if (!nav) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(() => {
                nav.classList.toggle('scrolled', window.scrollY > 50);
                ticking = false;
            });
            ticking = true;
        }
    });

    const sObs = new IntersectionObserver(
        (entries) => entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === `#${id}`));
            }
        }),
        { threshold: 0.25, rootMargin: '-80px 0px -50% 0px' }
    );

    sections.forEach((s) => sObs.observe(s));
})();


// ============================================
// MOBILE NAV TOGGLE
// ============================================
(function () {
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        toggle.classList.toggle('active');
        links.classList.toggle('open');
    });

    links.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => {
            toggle.classList.remove('active');
            links.classList.remove('open');
        });
    });
})();


// ============================================
// SMOOTH SCROLL for anchor links
// ============================================
(function () {
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            e.preventDefault();
            const t = document.querySelector(href);
            if (t) t.scrollIntoView({ behavior: 'smooth' });
        });
    });
})();
