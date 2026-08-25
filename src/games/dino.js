import kaboom from "kaplay";

/** @type {import("./types.js").MiniGameDefinition} */
export default {
  id: "dino",
  title: "Calm Dino Run",
  description: "Jump the desert. Show the wrong expression and the run gets ruthless.",
  actionLabel: "jump",
  width: 800,
  height: 220,
  run(ctx) {
    const k = kaboom({
      width: ctx.width,
      height: ctx.height,
      canvas: ctx.canvas,
      global: false,
      background: [247, 247, 247],
      stretch: true,
      letterbox: true,
      touchToMouse: true,
      crisp: true,
    });

    const { add, rect, pos, area, anchor, onUpdate, fixed, text, z, rgb, vec2, rand, dt, width, height } = k;

    const GROUND_Y = 170;
    const BASE_SPEED = 260;
    let alive = true;
    let distance = 0;
    let spawnProgress = 0;
    let nextSpawnDistance = rand(260, 390);

    add([rect(width(), 2), pos(0, GROUND_Y + 4), rgb(212, 212, 212), fixed(), z(-1)]);

    const dino = add([
      rect(34, 36),
      pos(56, GROUND_Y - 36),
      area(),
      anchor("topleft"),
      "dino",
      { vy: 0, grounded: true },
    ]);

    dino.onUpdate(() => {
      if (!alive) {
        return;
      }

      const boost = ctx.getSpeedBoost();
      dino.vy += 1600 * dt();
      dino.pos.y += dino.vy * dt();
      dino.color = boost > 1.2 ? rgb(255, 0, 110) : rgb(83, 83, 83);

      if (dino.pos.y >= GROUND_Y - 36) {
        dino.pos.y = GROUND_Y - 36;
        dino.vy = 0;
        dino.grounded = true;
      } else {
        dino.grounded = false;
      }
    });

    dino.onCollide("obstacle", die);

    function spawnObstacle() {
      const isCactus = rand() < 0.75;
      const obstacleH = isCactus ? rand(38, 56) : 18;
      const obstacleW = isCactus ? 22 : 34;
      const obstacleY = isCactus ? GROUND_Y - obstacleH + 4 : GROUND_Y - 58;

      const obstacle = add([
        rect(obstacleW, obstacleH),
        pos(width() + 20, obstacleY),
        area(),
        "obstacle",
        rgb(isCactus ? 83 : 119, isCactus ? 83 : 119, isCactus ? 83 : 119),
      ]);

      obstacle.onUpdate(() => {
        if (!alive) {
          return;
        }
        obstacle.pos.x -= BASE_SPEED * ctx.getSpeedBoost() * dt();
        if (obstacle.pos.x < -40) {
          obstacle.destroy();
        }
      });
    }

    const scoreLabel = add([text("0", { size: 18 }), pos(width() - 70, 12), fixed(), z(100)]);

    onUpdate(() => {
      if (!alive) {
        return;
      }
      const step = BASE_SPEED * ctx.getSpeedBoost() * dt();
      distance += step;
      spawnProgress += step;
      if (spawnProgress >= nextSpawnDistance) {
        spawnProgress = 0;
        nextSpawnDistance = rand(260, 390);
        spawnObstacle();
      }
      const score = Math.floor(distance / 8);
      scoreLabel.text = String(score);
      ctx.onScore(score);
    });

    function die() {
      if (!alive) {
        return;
      }
      alive = false;
      ctx.onGameOver?.();
      add([
        text("TRIPPED\nPress SPACE", { size: 20, align: "center", width: width() - 40 }),
        pos(width() / 2, height() / 2),
        anchor("center"),
        fixed(),
        z(100),
        "gameover",
      ]);
    }

    function reset() {
      alive = true;
      distance = 0;
      spawnProgress = 0;
      nextSpawnDistance = rand(260, 390);
      dino.pos = vec2(56, GROUND_Y - 36);
      dino.vy = 0;
      dino.grounded = true;
      ctx.onScore(0);
      k.get("obstacle").forEach((node) => node.destroy());
      k.get("gameover").forEach((node) => node.destroy());
    }

    return {
      destroy: () => k.quit(),
      action() {
        if (!alive) {
          reset();
          return;
        }
        if (dino.grounded) {
          dino.vy = -560;
          dino.grounded = false;
        }
      },
    };
  },
};
