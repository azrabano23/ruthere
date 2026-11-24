// Scroll animations for the landing page (anime.js) and the 3D car (three.js).
// Both libraries load on demand, so pages behind sign-in don't pay for them.
// Returns a cleanup function for React's useEffect.
//
//   stage  is pinned while you scroll through it. The headline lifts away, the car turns
//          to a side view, the background goes from black to paper, and the car comes
//          apart into a line drawing as the caption arrives.
//   route  draws the campus route line as it scrolls into view and drops in each stop.
export function startLandingMotion({ root, stage, canvas, route }) {
  if (!root || typeof window.matchMedia !== 'function' || import.meta.env.MODE === 'test') return undefined;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let cancelled = false;
  let car;
  let scope;

  Promise.all([import('animejs'), import('../components/landingCar.js')]).then(([anime, { createCar }]) => {
    if (cancelled) return;
    const { animate, createTimeline, createScope, onScroll, splitText, stagger, svg } = anime;

    try { car = createCar(canvas); } catch { canvas.hidden = true; } // no WebGL: the page still works
    root.classList.add('is-animated');
    if (reduceMotion) { root.classList.add('is-static'); return; }

    scope = createScope({ root }).add(() => {
      // Headline: each letter rises out of its own clipped line on load.
      const { chars } = splitText(stage.querySelector('h1'), { chars: { wrap: 'clip' } });
      animate(chars, { y: ['110%', '0%'], duration: 900, delay: stagger(22, { start: 150 }), ease: 'out(4)' });
      animate(stage.querySelectorAll('.eyebrow, .hero-description, .hero-actions'), { opacity: [0, 1], y: [16, 0], duration: 800, delay: stagger(120, { start: 500 }), ease: 'out(3)' });

      const wide = window.innerWidth > 900;
      // Pinned stage, scrubbed by scroll. Timeline units are just proportions of the scroll distance.
      const tl = createTimeline({
        defaults: { ease: 'linear' },
        autoplay: onScroll({ target: stage, enter: 'top top', leave: 'bottom bottom', sync: 0.2 }),
      });
      tl.add(stage.querySelector('.stage-copy'), { opacity: [1, 0], y: [0, -80], duration: 220 }, 0)
        .add(stage, { backgroundColor: ['#0b0b0d', '#f3f0ea'], color: ['#f3f0ea', '#0b0b0d'], duration: 200 }, 430)
        .add(canvas, { x: wide ? ['16%', '0%'] : 0, duration: 420, ease: 'inOut(2)' }, 0)
        .add(stage.querySelector('.stage-caption'), { opacity: [0, 1], y: [40, 0], duration: 180 }, 720)
        .add({ hold: 0 }, { hold: 1, duration: 1 }, 1000); // hold the finished drawing for the last stretch
      if (car) {
        tl.add(car.state, { spin: [0, 1], duration: 520, ease: 'inOut(2)' }, 0)
          .add(car.state, { lines: [0, 1], duration: 260 }, 430)
          .add(car.state, { explode: [0, 1], duration: 420, ease: 'inOut(3)' }, 480);
      }

      // Campus route: the line draws itself across the section, then each stop drops in.
      const [line] = svg.createDrawable(route.querySelector('.route-line'));
      createTimeline({ defaults: { ease: 'linear' }, autoplay: onScroll({ target: route, enter: 'bottom top', leave: 'center center', sync: 0.25 }) })
        .add(line, { draw: ['0 0', '0 1'], duration: 1000 }, 0)
        .add(route.querySelectorAll('circle'), { scale: [0, 1], duration: 120, delay: stagger(150) }, 100)
        .add(route.querySelectorAll('.stop'), { opacity: [0, 1], y: [12, 0], duration: 140, delay: stagger(150) }, 140);

      // Sign-in card slides up as it arrives.
      animate(root.querySelector('.auth-card'), {
        y: [80, 0], opacity: [0, 1], ease: 'out(3)', duration: 900,
        autoplay: onScroll({ target: root.querySelector('.signin-section'), enter: 'bottom top' }),
      });
    });
  });

  return () => {
    cancelled = true;
    scope?.revert();
    car?.dispose();
  };
}
