import kaboom from "kaplay";

/** @type {import("./types.js").MiniGameDefinition} */
export default {
  id: "flappy",
  title: "Stress Flappy",
  description: "One key. Infinite pipes. Your face controls the scroll speed.",
  actionLabel: "flap",
  width: 400,
  height: 600,
  run(ctx) {
    const k = kaboom({
      width: ctx.width,
      height: ctx.height,
      canvas: ctx.canvas,
      global: false,
      background: [125, 211, 252],
      stretch: true,
      letterbox: true,
      touchToMouse: true,
      crisp: true,
    });

    const { add, rect, circle, pos, area, anchor, onUpdate, fixed, text, z, rgb, vec2, rand, dt, width, height } =
      k;

    let score = 0;
    let alive = true;
    const PIPE_GAP = 150;
    const BASE_SPEED = 140;
    const PIPE_SPACING = 300;
    let spawnProgress = 0;

    const bird = add([
      circle(16),
      pos(90, height() / 2),
      area(),
      anchor("center"),
      "bird",
      { vy: 0 },
    ]);

    bird.onUpdate(() => {
      if (!alive) {
        return;
      }

      const boost = ctx.getSpeedBoost();
      bird.vy += 980 * dt();
      bird.pos.y += bird.vy * dt();
      bird.color = boost > 1.2 ? rgb(255, 0, 110) : rgb(255, 190, 11);

      if (bird.pos.y < 16 || bird.pos.y > height() - 16) {
        die();
      }
    });

    bird.onCollide("pipe", die);

    function spawnPipe() {
      const gapY = rand(120, height() - 120);
      const pipeW = 56;
      const topH = gapY - PIPE_GAP / 2;

      const top = add([rect(pipeW, topH), pos(width(), 0), area(), "pipe", { scored: false }]);
      const bottom = add([rect(pipeW, height()), pos(width(), gapY + PIPE_GAP / 2), area(), "pipe"]);

      for (const pipe of [top, bottom]) {
        pipe.onUpdate(() => {
          if (!alive) {
            return;
          }
          pipe.pos.x -= BASE_SPEED * ctx.getSpeedBoost() * dt();
          if (pipe.pos.x < -80) {
            pipe.destroy();
          }
        });
      }

      top.onUpdate(() => {
        if (!top.scored && top.pos.x + pipeW < bird.pos.x) {
          top.scored = true;
          score += 1;
          ctx.onScore(score);
        }
      });
    }

    spawnPipe();

    const scoreLabel = add([text("0", { size: 28 }), pos(16, 16), fixed(), z(100)]);

    onUpdate(() => {
      scoreLabel.text = String(score);
      if (!alive) {
        return;
      }

      spawnProgress += BASE_SPEED * ctx.getSpeedBoost() * dt();
      if (spawnProgress >= PIPE_SPACING) {
        spawnProgress = 0;
        spawnPipe();
      }
    });

    function die() {
      if (!alive) {
        return;
      }
      alive = false;
      ctx.onGameOver?.();
      add([
        text("SPLAT\nPress SPACE", { size: 22, align: "center", width: width() - 40 }),
        pos(width() / 2, height() / 2),
        anchor("center"),
        fixed(),
        z(100),
        "gameover",
      ]);
    }

    function reset() {
      score = 0;
      alive = true;
      bird.pos = vec2(90, height() / 2);
      bird.vy = 0;
      spawnProgress = 0;
      ctx.onScore(0);
      k.get("pipe").forEach((pipe) => pipe.destroy());
      k.get("gameover").forEach((node) => node.destroy());
    }

    return {
      destroy: () => k.quit(),
      action() {
        if (!alive) {
          reset();
          return;
        }
        bird.vy = -280;
      },
    };
  },
};
