(function () {
  'use strict';

  const ASSET_ROOT = 'https://cdn.jsdelivr.net/gh/Diegodsha/Flappy-owl@main/src/assets/';
  const asset = (path) => ASSET_ROOT + path;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function mount(options) {
    return new Promise((resolve, reject) => {
      if (!window.Phaser) {
        reject(new Error('Phaser 3 chưa được tải.'));
        return;
      }

      const parent = options && options.parent;
      if (!parent) {
        reject(new Error('Không tìm thấy vùng hiển thị Flappy Bird.'));
        return;
      }

      let settled = false;
      let sceneRef = null;

      class KatLearnFlappyScene extends Phaser.Scene {
        constructor() {
          super({ key: 'KatLearnFlappyScene' });
          this.gates = [];
          this.gateCount = 0;
        }

        preload() {
          this.load.image('flappy-bg-day', asset('backgrounds/background-day.png'));
          this.load.image('flappy-bg-night', asset('backgrounds/background-night.png'));
          this.load.spritesheet('flappy-ground', asset('platforms/ground-sprite.png'), {
            frameWidth: 800,
            frameHeight: 112
          });
          this.load.spritesheet('flappy-bird-blue', asset('hero/bird-blue-sprite.png'), {
            frameWidth: 34,
            frameHeight: 24
          });
          this.load.spritesheet('flappy-bird-red', asset('hero/bird-red-sprite.png'), {
            frameWidth: 34,
            frameHeight: 24
          });
          this.load.spritesheet('flappy-bird-yellow', asset('hero/bird-yellow-sprite.png'), {
            frameWidth: 34,
            frameHeight: 24
          });
          this.load.image('flappy-pipe-green-top', asset('platforms/pipe-green-top.png'));
          this.load.image('flappy-pipe-green-bottom', asset('platforms/pipe-green-bottom.png'));
          this.load.image('flappy-pipe-red-top', asset('platforms/pipe-red-top.png'));
          this.load.image('flappy-pipe-red-bottom', asset('platforms/pipe-red-bottom.png'));

          this.load.once('loaderror', (file) => {
            if (!settled) {
              settled = true;
              reject(new Error('Không tải được tài nguyên Flappy Owl: ' + (file && file.key || 'asset')));
            }
          });
        }

        create() {
          this.bgDay = this.add.image(450, 200, 'flappy-bg-day').setDisplaySize(900, 400).setDepth(-10);
          this.bgNight = this.add.image(450, 200, 'flappy-bg-night').setDisplaySize(900, 400).setDepth(-9).setVisible(false);

          this.ground = this.add.sprite(450, 372, 'flappy-ground', 0).setDisplaySize(900, 56).setDepth(5);
          this.physics.add.existing(this.ground, true);
          this.ground.body.setSize(900, 42, true);

          this.pipeGroup = this.physics.add.group({
            allowGravity: false,
            immovable: true
          });

          this.anims.create({
            key: 'flappy-ground-moving',
            frames: this.anims.generateFrameNumbers('flappy-ground', { start: 0, end: 2 }),
            frameRate: 15,
            repeat: -1
          });
          ['blue', 'red', 'yellow'].forEach((color) => {
            this.anims.create({
              key: 'flappy-bird-' + color + '-fly',
              frames: this.anims.generateFrameNumbers('flappy-bird-' + color, { start: 0, end: 2 }),
              frameRate: 10,
              repeat: -1
            });
          });

          this.bird = this.physics.add.sprite(170, 190, 'flappy-bird-blue').setScale(1.8).setDepth(4);
          this.bird.setCircle(9);
          this.bird.setCollideWorldBounds(true);
          this.bird.body.onWorldBounds = true;
          this.bird.body.setBounce(0);
          this.physics.world.setBounds(0, 0, 900, 400);

          this.physics.add.collider(this.bird, this.ground, () => this.handleBoundary());
          this.physics.add.collider(this.bird, this.pipeGroup, (bird, pipe) => this.handlePipeCollision(pipe));
          this.physics.world.on('worldbounds', (body, hitUp, hitDown) => {
            if (body === this.bird.body && (hitUp || hitDown)) this.handleBoundary();
          });

          this.input.on('pointerdown', () => this.jump());
          this.ground.anims.play('flappy-ground-moving', true);
          this.resetBirdAppearance();

          sceneRef = this;
          this.ready = true;
          if (!settled) {
            settled = true;
            resolve(api);
          }
        }

        resetBirdAppearance() {
          const colors = ['blue', 'red', 'yellow'];
          const color = colors[Phaser.Math.Between(0, colors.length - 1)];
          this.bird.setTexture('flappy-bird-' + color);
          this.bird.play('flappy-bird-' + color + '-fly', true);
        }

        resetSession() {
          this.gates.forEach((gate) => {
            gate.top.destroy();
            gate.bottom.destroy();
          });
          this.gates = [];
          this.pipeGroup.clear(true, true);
          this.gateCount = 0;
          this.bgDay.setVisible(true);
          this.bgNight.setVisible(false);
          this.bird.setPosition(170, 190);
          this.bird.setVelocity(0, 0);
          this.bird.setAngle(0);
          this.resetBirdAppearance();
          this.ground.anims.play('flappy-ground-moving', true);
        }

        addGate(config) {
          if (!this.ready || !config) return;

          const gap = clamp(Number(config.gap) || 148, 132, 168);
          const gapY = clamp(Number(config.gapY) || 190, 120, 260);
          const topEdge = gapY - gap / 2;
          const bottomEdge = gapY + gap / 2;
          const groundTop = 344;
          const speed = clamp(Number(config.speed) || 170, 120, 260);
          const isRed = Math.floor(this.gateCount / 5) % 2 === 1;
          const color = isRed ? 'red' : 'green';
          this.gateCount += 1;
          this.bgDay.setVisible(!isRed);
          this.bgNight.setVisible(isRed);

          const top = this.physics.add.image(980, topEdge, 'flappy-pipe-' + color + '-top');
          top.setOrigin(0.5, 1).setDisplaySize(76, Math.max(44, topEdge + 18));
          top.body.allowGravity = false;
          top.setImmovable(true);
          top.setVelocityX(-speed);
          top.setDepth(2);
          top.setData('gateId', String(config.id));
          this.pipeGroup.add(top);

          const bottom = this.physics.add.image(980, bottomEdge, 'flappy-pipe-' + color + '-bottom');
          bottom.setOrigin(0.5, 0).setDisplaySize(76, Math.max(44, groundTop - bottomEdge + 18));
          bottom.body.allowGravity = false;
          bottom.setImmovable(true);
          bottom.setVelocityX(-speed);
          bottom.setDepth(2);
          bottom.setData('gateId', String(config.id));
          this.pipeGroup.add(bottom);

          this.gates.push({
            id: String(config.id),
            top: top,
            bottom: bottom,
            passed: false,
            hit: false,
            exited: false
          });
        }

        handlePipeCollision(pipe) {
          const id = pipe && pipe.getData('gateId');
          const gate = this.gates.find((item) => item.id === String(id));
          if (!gate || gate.hit || gate.exited) return;
          gate.hit = true;
          this.bird.setVelocityY(-110);
          if (typeof options.onHit === 'function') options.onHit(gate.id, 'pipe');
        }

        handleBoundary() {
          const gate = this.gates.find((item) => !item.hit && !item.exited);
          if (!gate) return;
          gate.hit = true;
          if (typeof options.onHit === 'function') options.onHit(gate.id, 'bounds');
        }

        recoverBird() {
          if (!this.bird) return;
          this.bird.setPosition(170, 190);
          this.bird.setVelocity(0, -110);
          this.bird.setAngle(-8);
        }

        jump() {
          if (!this.bird || !this.sys.isActive()) return;
          this.bird.setVelocityY(-350);
          this.bird.setAngle(-15);
        }

        update() {
          if (!this.bird) return;
          this.bird.angle = clamp(this.bird.body.velocity.y / 34, -18, 55);
          this.gates.forEach((gate) => {
            if (!gate.passed && gate.top.x + 38 < this.bird.x - 18) {
              gate.passed = true;
              if (typeof options.onGatePass === 'function') options.onGatePass(gate.id);
            }
            if (!gate.exited && gate.top.x < -120) {
              gate.exited = true;
              gate.top.destroy();
              gate.bottom.destroy();
              if (typeof options.onGateExit === 'function') options.onGateExit(gate.id);
            }
          });
          this.gates = this.gates.filter((gate) => !gate.exited);
        }
      }

      const api = {
        setGate(config) {
          if (sceneRef && sceneRef.ready) sceneRef.addGate(config);
        },
        jump() {
          if (sceneRef && sceneRef.ready) sceneRef.jump();
        },
        recover() {
          if (sceneRef && sceneRef.ready) sceneRef.recoverBird();
        },
        reset() {
          if (sceneRef && sceneRef.ready) {
            sceneRef.scene.resume();
            sceneRef.resetSession();
          }
        },
        pause() {
          if (sceneRef && sceneRef.ready) sceneRef.scene.pause();
        },
        resume() {
          if (sceneRef && sceneRef.ready) sceneRef.scene.resume();
        },
        destroy() {
          game.destroy(true);
          sceneRef = null;
        }
      };

      let game;
      try {
        game = new Phaser.Game({
          type: Phaser.AUTO,
          parent: parent,
          width: 900,
          height: 400,
          backgroundColor: '#86c9e8',
          scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH
          },
          physics: {
            default: 'arcade',
            arcade: {
              gravity: { y: 1000 },
              debug: false
            }
          },
          scene: [KatLearnFlappyScene]
        });
      } catch (error) {
        if (!settled) {
          settled = true;
          reject(error);
        }
      }
    });
  }

  window.KatLearnFlappyEngine = { mount: mount };
})();