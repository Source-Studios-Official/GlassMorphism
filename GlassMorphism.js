// Name: GlassMorphism
// Description: Highly-Optimized Glass Panels with High Customizability
// Version: 15.2.3
// Public Version: 1.0.0

(function (Scratch) {
  'use strict';

  if (!Scratch.extensions.unsandboxed) {
    throw new Error('Glassmorphism extension must be run unsandboxed!');
  }

  const canvas = Scratch.vm.runtime.renderer.canvas;
  const stageWrapper = canvas.parentElement;

  let glassContainer = document.getElementById('glassmorphism-container');
  if (!glassContainer) {
    glassContainer = document.createElement('div');
    glassContainer.id = 'glassmorphism-container';
    glassContainer.style.position = 'absolute';
    glassContainer.style.top = '0';
    glassContainer.style.left = '0';
    glassContainer.style.width = '100%';
    glassContainer.style.height = '100%';
    glassContainer.style.pointerEvents = 'none';
    glassContainer.style.overflow = 'hidden';
    glassContainer.style.zIndex = '999';
    stageWrapper.appendChild(glassContainer);
  }

  const panels = {};
  const cache = {}; // The State Cache for optimization

  // Responsive: Recalculate only when needed
  const resizeObserver = new ResizeObserver(() => {
    for (const id in panels) {
      applyGeometry(id, panels[id], panels[id].dataset.rawX, panels[id].dataset.rawY, panels[id].dataset.rawW, panels[id].dataset.rawH);
    }
  });
  resizeObserver.observe(canvas);

  function applyStyle(id, element, prop, value) {
    if (!cache[id]) cache[id] = {};
    if (cache[id][prop] !== value) {
      element.style[prop] = value;
      cache[id][prop] = value;
    }
  }

  function applyGeometry(id, el, x, y, w, h) {
    el.dataset.rawX = x; el.dataset.rawY = y; el.dataset.rawW = w; el.dataset.rawH = h;
    const pxX = ((parseFloat(x) + 240) / 480) * canvas.clientWidth;
    const pxY = ((-parseFloat(y) + 180) / 360) * canvas.clientHeight;
    const pxW = (parseFloat(w) / 480) * canvas.clientWidth;
    const pxH = (parseFloat(h) / 360) * canvas.clientHeight;

    applyStyle(id, el, 'left', pxX + 'px');
    applyStyle(id, el, 'top', pxY + 'px');
    applyStyle(id, el, 'width', pxW + 'px');
    applyStyle(id, el, 'height', pxH + 'px');
  }

  class Glassmorphism {
    getInfo() {
      return {
        id: 'glassmorphism',
        name: 'Glassmorphism',
        color1: '#007AFF',
        color2: '#005bb5',
        blocks: [
          {
            opcode: 'setGlassPanel',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set glass [ID] to x: [X] y: [Y] width: [W] height: [H]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' },
              X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 },
              W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 150 },
              H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 }
            }
          },
          {
            opcode: 'styleGlassPanel',
            blockType: Scratch.BlockType.COMMAND,
            text: 'style glass [ID] theme: [THEME] blur: [BLUR] radius: [RADIUS]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' },
              THEME: { type: Scratch.ArgumentType.STRING, menu: 'THEMES', defaultValue: 'Light' },
              BLUR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 15 },
              RADIUS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 24 }
            }
          },
          {
            opcode: 'setAdvancedRefraction',
            blockType: Scratch.BlockType.COMMAND,
            text: 'add 3D bezel to glass [ID] edge shine: [SHINE] opacity: [OPACITY]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' },
              SHINE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 },
              OPACITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 }
            }
          },
          {
            opcode: 'maskWithCostume',
            blockType: Scratch.BlockType.COMMAND,
            text: 'shape glass [ID] to costume [NAME]',
            arguments: {
              ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' },
              NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'costume1' }
            }
          },
          {
            opcode: 'removeGlassPanel',
            blockType: Scratch.BlockType.COMMAND,
            text: 'remove glass [ID]',
            arguments: { ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' } }
          }
        ],
        menus: {
          THEMES: { items: ['Light', 'Dark', 'Clear Refraction'] }
        }
      };
    }

    setGlassPanel(args) {
      let el = panels[args.ID];
      if (!el) {
        el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.pointerEvents = 'none';
        el.style.transform = 'translate(-50%, -50%)';
        panels[args.ID] = el;
        glassContainer.appendChild(el);
      }
      applyGeometry(args.ID, el, args.X, args.Y, args.W, args.H);
    }

    styleGlassPanel(args) {
      const el = panels[args.ID];
      if (!el) return;
      applyStyle(args.ID, el, 'backdropFilter', `blur(${args.BLUR}px) saturate(150%)`);
      applyStyle(args.ID, el, 'webkitBackdropFilter', `blur(${args.BLUR}px) saturate(150%)`);
      applyStyle(args.ID, el, 'borderRadius', `${args.RADIUS}px`);

      if (args.THEME === 'Dark') {
        applyStyle(args.ID, el, 'background', 'rgba(0, 0, 0, 0.3)');
        applyStyle(args.ID, el, 'border', '1px solid rgba(255, 255, 255, 0.1)');
      } else if (args.THEME === 'Clear Refraction') {
        applyStyle(args.ID, el, 'background', 'transparent');
        applyStyle(args.ID, el, 'border', 'none');
      } else {
        applyStyle(args.ID, el, 'background', 'rgba(255, 255, 255, 0.2)');
        applyStyle(args.ID, el, 'border', '1px solid rgba(255, 255, 255, 0.4)');
      }
    }

    setAdvancedRefraction(args) {
      const el = panels[args.ID];
      if (!el) return;
      const s = Math.max(0, Math.min(100, args.SHINE)) / 100;
      const o = Math.max(0, Math.min(100, args.OPACITY)) / 100;

      // The V4.0.0 aesthetic signature
      const gradient = `linear-gradient(135deg, rgba(255,255,255, ${s * 0.8}) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0, ${o * 0.5}) 100%)`;
      const shadow = `inset 0 1.5px 1px rgba(255, 255, 255, ${s}), inset 0 0 8px rgba(255, 255, 255, ${s * 0.5}), inset 0 -1.5px 1px rgba(0, 0, 0, ${o}), 0 12px 40px rgba(0, 0, 0, ${o * 1.5})`;
      
      applyStyle(args.ID, el, 'backgroundImage', gradient);
      applyStyle(args.ID, el, 'boxShadow', shadow);
      applyStyle(args.ID, el, 'border', 'none');
    }

    maskWithCostume(args, util) {
      const el = panels[args.ID];
      if (!el) return;
      const costume = util.target.sprite.costumes.find(c => c.name === args.NAME);
      if (costume && costume.asset) {
        const mask = `url(${costume.asset.encodeDataURI()})`;
        applyStyle(args.ID, el, 'webkitMaskImage', mask);
        applyStyle(args.ID, el, 'maskImage', mask);
        applyStyle(args.ID, el, 'webkitMaskSize', 'contain');
        applyStyle(args.ID, el, 'maskSize', 'contain');
      }
    }

    removeGlassPanel(args) {
      if (panels[args.ID]) {
        panels[args.ID].remove();
        delete panels[args.ID];
        delete cache[args.ID];
      }
    }
  }

  Scratch.extensions.register(new Glassmorphism());
})(Scratch);
