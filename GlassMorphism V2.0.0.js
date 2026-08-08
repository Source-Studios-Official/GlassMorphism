// Name: GlassMorphism
// Creator: Source Studios
// Version: 2.0.0

(function (Scratch) {
  'use strict';

  // ============================================================================
  // [ SECURITY CHECK ]
  // Scratch extensions can be run in a "sandboxed" iframe for security.
  // We throw an error if sandboxed because we NEED direct access to the main 
  // DOM to inject our HTML/CSS over the Scratch canvas.
  // ============================================================================
  if (!Scratch.extensions.unsandboxed) {
    throw new Error('Glassmorphism must be run unsandboxed!');
  }

  // ============================================================================
  // [ CSS INJECTION & KEYFRAMES ]
  // We inject custom CSS into the document <head>. This handles hardware 
  // acceleration classes and the fluid animation for the Holographic theme.
  // ============================================================================
  if (!document.getElementById('glassmorphism-styles')) {
    const styleEl = document.createElement('style');
    styleEl.id = 'glassmorphism-styles';
    styleEl.textContent = `
      /* Holographic Liquid Warp: Moves the 4-point gradient mesh and shifts colors */
      @keyframes siriWarp {
        0% { background-position: 0% 0%; filter: hue-rotate(0deg); }
        33% { background-position: 100% 100%; filter: hue-rotate(45deg); }
        66% { background-position: 0% 100%; filter: hue-rotate(-45deg); }
        100% { background-position: 0% 0%; filter: hue-rotate(0deg); }
      }
      
      /* GPU Acceleration Hint: Tells the browser to process these properties on the graphics card */
      .glassmorphism-gpu-accelerate {
        will-change: transform, opacity;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // ============================================================================
  // [ DOM SETUP ]
  // We locate the Scratch canvas and create a transparent master container 
  // strictly layered *over* the canvas to hold our 3D DOM elements.
  // ============================================================================
  const canvas = Scratch.vm.runtime.renderer.canvas;
  const stageWrapper = canvas.parentElement;

  let glassContainer = document.getElementById('glassmorphism-container');
  if (!glassContainer) {
    glassContainer = document.createElement('div');
    glassContainer.id = 'glassmorphism-container';
    
    // Stretch to fit the wrapper exactly
    glassContainer.style.position = 'absolute';
    glassContainer.style.inset = '0';
    
    // Let mouse clicks pass through the container itself to the Scratch canvas below
    glassContainer.style.pointerEvents = 'none'; 
    glassContainer.style.overflow = 'visible'; 
    glassContainer.style.zIndex = '999';
    
    // Set up 3D space: 1200px perspective creates a realistic 3D camera lens distortion
    glassContainer.style.perspective = '1200px'; 
    glassContainer.style.transformStyle = 'preserve-3d';
    
    stageWrapper.appendChild(glassContainer);
  }

  // Dictionary to store references to all active glass panels
  const panels = {};

  // ============================================================================
  // [ RESIZE OBSERVER ]
  // Automatically scales the panels when the user enters/exits fullscreen 
  // or resizes the browser window.
  // ============================================================================
  const resizeObserver = new ResizeObserver(() => {
    for (const id in panels) {
      rebuildVolume(panels[id]); 
      updatePanelTransform(panels[id]); 
    }
  });
  resizeObserver.observe(canvas);

  // ============================================================================
  // [ ENGINE: OPTIMIZED RENDERER ]
  // This function draws the actual glass panel. It is called whenever 
  // styles, blur, dimensions, or themes change.
  // ============================================================================
  function rebuildVolume(el) {
    const state = el._glassState;
    
    // Calculate aspect ratio scale based on standard Scratch 480x360 dimensions
    const scale = canvas.clientWidth / 480;
    
    // Convert Scratch Coordinates/Sizes to real DOM Pixels
    const pxW = (parseFloat(state.w) / 480) * canvas.clientWidth;
    const pxH = (parseFloat(state.h) / 360) * canvas.clientHeight;
    const scaledRadius = state.radius * scale;
    
    // Set the container footprint
    el.style.width = `${pxW}px`;
    el.style.height = `${pxH}px`;
    el.innerHTML = ''; // Wipe existing faces for a clean rebuild

    // Create the physical glass visual element
    const face = document.createElement('div');
    face.className = 'glass-face glassmorphism-gpu-accelerate';
    face.style.position = 'absolute';
    face.style.inset = '0'; // Snaps to all 4 edges of parent
    face.style.borderRadius = `${scaledRadius}px`;
    face.style.boxSizing = 'border-box';
    face.style.transform = 'translateZ(0)'; // Lock element into its own GPU composite layer
    
    // --- Depth-Scaled Blur Logic ---
    // If floating depth is high (closer to camera), increase the blur dynamically
    const dynamicBlur = state.blur > 0 ? state.blur + (state.depth * 15) : 0;
    
    if (dynamicBlur > 0) {
      // saturate(180%) makes the colors behind the glass pop to compensate for the frosty blur
      const filterStr = `blur(${dynamicBlur}px) saturate(180%)`;
      face.style.backdropFilter = filterStr;
      face.style.webkitBackdropFilter = filterStr; // Fallback for Safari
    }

    // Drop shadow scales dynamically with the screen size
    face.style.boxShadow = `0 ${8 * scale}px ${32 * scale}px rgba(0,0,0,0.15)`;

    // --- Theming Engine ---
    let bgColor, borderColor;

    if (state.themeRaw === 'Dark') {
      bgColor = `rgba(30, 30, 35, 0.75)`;
      borderColor = `rgba(255, 255, 255, 0.15)`;
    } else if (state.themeRaw === 'Clear Refraction') {
      bgColor = `rgba(255, 255, 255, 0.15)`;
      borderColor = `rgba(255, 255, 255, 0.35)`;
    } else if (state.themeRaw === 'Holographic') {
      // V19 Holographic: 4-Point Floating Radial Mesh
      bgColor = `
        radial-gradient(circle at 0% 0%, rgba(255, 0, 128, 0.5), transparent 60%),
        radial-gradient(circle at 100% 0%, rgba(0, 240, 255, 0.5), transparent 60%),
        radial-gradient(circle at 100% 100%, rgba(150, 0, 255, 0.5), transparent 60%),
        radial-gradient(circle at 0% 100%, rgba(255, 200, 0, 0.5), transparent 60%)
      `;
      borderColor = `rgba(255, 255, 255, 0.5)`;
      // Oversize the background so we can animate panning it around
      face.style.backgroundSize = '300% 300%';
      face.style.animation = 'siriWarp 12s ease-in-out infinite';
    } else { 
      // Default (Light)
      bgColor = `linear-gradient(135deg, rgba(255, 255, 255, 0.6) 0%, rgba(255, 255, 255, 0.2) 100%)`;
      borderColor = `rgba(255, 255, 255, 0.5)`;
    }

    face.style.background = bgColor;
    face.style.border = `1px solid ${borderColor}`;

    // --- Advanced Refraction (Mac OS Edge Lighting) ---
    // Creates a physical edge bevel utilizing inset box-shadows
    let shadowString = `inset 0 1.5px 1px rgba(255, 255, 255, 0.4), inset 0 -1px 1px rgba(0, 0, 0, 0.05)`;
    if (state.advShine > 0 || state.advOpacity > 0) {
      const s = state.advShine;
      const o = state.advOpacity;
      
      // Inject a directional lighting gradient
      face.style.backgroundImage += (state.themeRaw === 'Holographic' ? ',' : '') + 
        `linear-gradient(135deg, rgba(255,255,255, ${s * 0.5}) 0%, rgba(255,255,255,0) 40%, rgba(0,0,0, ${o * 0.3}) 100%)`;
      
      // Append deep edge shadowing
      shadowString += `, inset 0 2px 4px rgba(255, 255, 255, ${s}), inset 0 -2px 4px rgba(0, 0, 0, ${o})`;
    }
    
    // Combine base drop shadow with internal edge lighting
    face.style.boxShadow = face.style.boxShadow + (shadowString ? `, ${shadowString}` : '');

    // --- Costume Masking ---
    // Applies an alpha mask to cut the glass into custom shapes
    if (state.maskURI) {
      face.style.webkitMaskImage = state.maskURI;
      face.style.maskImage = state.maskURI;
      face.style.webkitMaskSize = 'contain';
      face.style.maskSize = 'contain';
      face.style.webkitMaskRepeat = 'no-repeat';
      face.style.webkitMaskPosition = 'center';
    }

    // Finally, inject the finished face into the panel container
    el.appendChild(face);
  }

  // ============================================================================
  // [ ENGINE: TRANSFORM & INTERACTIONS ]
  // Applies X/Y positions, 3D rotations, and calculates hover effects dynamically.
  // ============================================================================
  function updatePanelTransform(el) {
    const state = el._glassState;
    
    // Convert Scratch coordinates (Center 0,0) to standard DOM Top-Left coordinates
    const pxX = ((parseFloat(state.x) + 240) / 480) * canvas.clientWidth;
    const pxY = ((-parseFloat(state.y) + 180) / 360) * canvas.clientHeight;

    el.style.left = `${pxX}px`;
    el.style.top = `${pxY}px`;

    // Start with base scale, apply hover effects if currently hovered
    let finalScale = state.depthScale;
    let liftYOffset = -50; // -50% centers the element properly on X and Y

    if (state.isHovering && Object.keys(state.interactions).length > 0) {
      for (const [effect, intensityRaw] of Object.entries(state.interactions)) {
        const intensity = Math.max(0, parseFloat(intensityRaw) || 100) / 100;
        
        if (effect === 'Scale') {
            finalScale += (0.05 * intensity); // Expand by 5% based on intensity
        } 
        else if (effect === 'Lift') {
            liftYOffset -= (5 * intensity); // Physically move upwards by 5% based on intensity
        }
      }
    }

    // Apply the master CSS transform
    el.style.transform = `
      translate(-50%, ${liftYOffset}%) 
      translateZ(${state.zOffset}px)
      rotateX(${state.rotX}deg) 
      rotateY(${state.rotY}deg) 
      rotateZ(${state.rotZ}deg) 
      scale(${finalScale})
    `;
  }

  // ============================================================================
  // [ FACTORY / STATE MANAGER ]
  // Creates a panel if it doesn't exist, sets up event listeners, and default data.
  // ============================================================================
  function createPanelIfNotExists(id) {
    if (panels[id]) return panels[id]; // Return existing if already spawned
    
    const el = document.createElement('div');
    el.id = `glass-panel-${id}`;
    el.style.position = 'absolute';
    el.style.pointerEvents = 'auto'; // Allows this element to be clicked/hovered
    el.style.transformOrigin = 'center center'; 
    el.style.transformStyle = 'preserve-3d'; 
    
    // Smooth Apple-style bezier curve for all transform animations
    el.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
    
    // Initialize the state object bound directly to the HTML Element
    el._glassState = {
      x: 0, y: 0, w: 150, h: 100, 
      rotX: 0, rotY: 0, rotZ: 0, 
      zOffset: 0, depth: 0,
      radius: 24, blur: 2, depthScale: 1, // Default blur is 2
      advShine: 0, advOpacity: 0,
      themeRaw: 'Light', maskURI: null,
      interactions: {}, isHovering: false,
      wasClicked: false // For the GUI clicked boolean block
    };

    // --- Event Listeners for GUI ---
    el.addEventListener('mouseenter', () => { 
        el._glassState.isHovering = true; 
        updatePanelTransform(el); 
    });
    
    el.addEventListener('mouseleave', () => { 
        el._glassState.isHovering = false; 
        updatePanelTransform(el); 
    });
    
    el.addEventListener('click', (e) => { 
        e.stopPropagation(); // Prevent clicks from bleeding to elements beneath
        el._glassState.wasClicked = true; 
    });
    
    panels[id] = el;
    glassContainer.appendChild(el);
    return el;
  }

  // =======================================================
  // CATEGORY 1: CORE GLASSMORPHISM (Scratch Block Definitions)
  // =======================================================
  class GlassmorphismCore {
    getInfo() {
      return {
        id: 'glassmorphismCore',
        name: 'Glassmorphism',
        color1: '#007AFF', 
        color2: '#005bb5',
        blocks: [
          { opcode: 'createGlassPanel', blockType: Scratch.BlockType.COMMAND, text: 'create glass [ID] at x: [X] y: [Y] width: [W] height: [H]', arguments: { ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' }, X: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, Y: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 }, W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 150 }, H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 } } },
          { opcode: 'popInGlassPanel', blockType: Scratch.BlockType.COMMAND, text: 'pop in glass [ID] over [SECS]s width: [W] height: [H]', arguments: { ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' }, SECS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0.5 }, W: { type: Scratch.ArgumentType.NUMBER, defaultValue: 150 }, H: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 } } },
          { opcode: 'isGlassClicked', blockType: Scratch.BlockType.BOOLEAN, text: 'glass [ID] clicked?', arguments: { ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' } } },
          { opcode: 'removeGlassPanel', blockType: Scratch.BlockType.COMMAND, text: 'remove glass [ID]', arguments: { ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' } } },
          "---",
          { opcode: 'styleGlassPanel', blockType: Scratch.BlockType.COMMAND, text: 'style glass [ID] theme: [THEME] blur: [BLUR] border radius: [RADIUS]', arguments: { ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' }, THEME: { type: Scratch.ArgumentType.STRING, menu: 'THEMES', defaultValue: 'Light' }, BLUR: { type: Scratch.ArgumentType.NUMBER, defaultValue: 2 }, RADIUS: { type: Scratch.ArgumentType.NUMBER, defaultValue: 24 } } },
          { opcode: 'setGlassDepth', blockType: Scratch.BlockType.COMMAND, text: 'set glass [ID] floating depth to [DIST]% (0-100)', arguments: { ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' }, DIST: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 } } },
          { opcode: 'maskWithCostume', blockType: Scratch.BlockType.COMMAND, text: 'shape glass [ID] using costume [NAME]', arguments: { ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' }, NAME: { type: Scratch.ArgumentType.STRING, defaultValue: 'costume1' } } },
          "---",
          { opcode: 'addGlassInteraction', blockType: Scratch.BlockType.COMMAND, text: 'add hover effect [EFFECT] to glass [ID] at [INTENSITY]%', arguments: { EFFECT: { type: Scratch.ArgumentType.STRING, menu: 'INTERACTIONS', defaultValue: 'Scale' }, ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' }, INTENSITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 100 } } },
          { opcode: 'clearGlassInteractions', blockType: Scratch.BlockType.COMMAND, text: 'clear hover effects from glass [ID]', arguments: { ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' } } }
        ],
        menus: { THEMES: { items: ['Light', 'Dark', 'Clear Refraction', 'Holographic'] }, INTERACTIONS: { items: ['Scale', 'Lift'] } }
      };
    }

    createGlassPanel(args) {
      const el = createPanelIfNotExists(args.ID);
      el._glassState.x = args.X; el._glassState.y = args.Y; el._glassState.w = args.W; el._glassState.h = args.H;
      rebuildVolume(el); 
      updatePanelTransform(el);
    }

    popInGlassPanel(args) {
      const el = createPanelIfNotExists(args.ID);
      el._glassState.w = args.W; el._glassState.h = args.H;
      
      // Build volume immediately at full blur (CSS animations bug out on blur)
      rebuildVolume(el);
      
      const originalTransition = el.style.transition;
      
      // Temporarily disable transitions to snap to 0 opacity and 40% scale
      el.style.transition = 'none'; 
      el.style.opacity = '0';
      el._glassState.depthScale = 0.4;
      updatePanelTransform(el);
      
      // Trigger a DOM reflow so the browser registers the starting frame
      void el.offsetWidth; 
      
      // Re-enable transitions with the user's requested duration
      el.style.transition = `transform ${args.SECS}s cubic-bezier(0.16, 1, 0.3, 1), opacity ${args.SECS}s ease-out`;
      el.style.opacity = '1';
      el._glassState.depthScale = 1;
      updatePanelTransform(el);

      // Clean up transitions back to default hover timings after pop-in finishes
      setTimeout(() => { 
        if (panels[args.ID]) el.style.transition = originalTransition; 
      }, args.SECS * 1000);
    }

    isGlassClicked(args) {
      const el = panels[args.ID];
      if (!el) return false;
      
      // If clicked, we return true and immediately reset the flag so it only triggers once
      if (el._glassState.wasClicked) {
        el._glassState.wasClicked = false; 
        return true;
      }
      return false;
    }

    removeGlassPanel(args) {
      if (panels[args.ID]) { 
          panels[args.ID].remove(); // Deletes from DOM
          delete panels[args.ID];   // Deletes from memory dictionary
      }
    }

    styleGlassPanel(args) {
      const el = panels[args.ID]; if (!el) return;
      el._glassState.themeRaw = args.THEME; 
      el._glassState.blur = args.BLUR; 
      el._glassState.radius = args.RADIUS;
      rebuildVolume(el); // Re-render visual changes
    }

    setGlassDepth(args) {
        const el = panels[args.ID]; if (!el) return;
        // Clamp depth between 0 and 100%
        const depthRatio = Math.max(0, Math.min(100, args.DIST)) / 100;
        
        el._glassState.depth = depthRatio;
        el._glassState.zOffset = depthRatio * 150; // Push out in Z space by up to 150px
        
        rebuildVolume(el); // Re-render to scale the blur appropriately
        updatePanelTransform(el); // Apply new Z coordinates
    }

    maskWithCostume(args, util) {
      const el = panels[args.ID]; if (!el) return;
      // Search the sprite's costumes for the matching name
      const costume = util.target.sprite.costumes.find(c => c.name === args.NAME);
      if (costume && costume.asset) {
        // Convert costume to a Data URI and apply it via CSS webkit-mask
        el._glassState.maskURI = `url(${costume.asset.encodeDataURI()})`;
        rebuildVolume(el); 
      }
    }

    addGlassInteraction(args) {
      const el = panels[args.ID]; if (!el) return;
      el._glassState.interactions[args.EFFECT] = args.INTENSITY;
    }

    clearGlassInteractions(args) {
      const el = panels[args.ID]; if (!el) return;
      el._glassState.interactions = {};
      el._glassState.isHovering = false; // Reset hovering flags
      updatePanelTransform(el); // Snap back to regular transform without hovers
    }
  }

  // =======================================================
  // CATEGORY 2: 3D VOLUMETRICS & ADVANCED EFFECTS
  // =======================================================
  class Glassmorphism3D {
    getInfo() {
      return {
        id: 'glassmorphism3D',
        name: 'Glassmorphism 3D',
        color1: '#5856D6', 
        color2: '#4140a6',
        blocks: [
          { opcode: 'rotateGlassPanel', blockType: Scratch.BlockType.COMMAND, text: 'rotate 3D glass [ID] pitch (X): [RX] yaw (Y): [RY] roll (Z): [RZ]', arguments: { ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' }, RX: { type: Scratch.ArgumentType.NUMBER, defaultValue: 45 }, RY: { type: Scratch.ArgumentType.NUMBER, defaultValue: -30 }, RZ: { type: Scratch.ArgumentType.NUMBER, defaultValue: 0 } } },
          { opcode: 'setAdvancedRefraction', blockType: Scratch.BlockType.COMMAND, text: 'add 3D lighting to glass [ID] edge shine: [SHINE]% darkness: [OPACITY]%', arguments: { ID: { type: Scratch.ArgumentType.STRING, defaultValue: 'panel1' }, SHINE: { type: Scratch.ArgumentType.NUMBER, defaultValue: 50 }, OPACITY: { type: Scratch.ArgumentType.NUMBER, defaultValue: 20 } } }
        ]
      };
    }

    rotateGlassPanel(args) {
      const el = panels[args.ID]; if (!el) return;
      el._glassState.rotX = args.RX; 
      el._glassState.rotY = args.RY; 
      el._glassState.rotZ = args.RZ;
      updatePanelTransform(el); 
    }

    setAdvancedRefraction(args) {
      const el = panels[args.ID]; if (!el) return;
      // Convert 0-100% to decimal format for CSS opacity injection
      el._glassState.advShine = Math.max(0, Math.min(100, args.SHINE)) / 100;
      el._glassState.advOpacity = Math.max(0, Math.min(100, args.OPACITY)) / 100;
      rebuildVolume(el); 
    }
  }

  // Register extensions into the main Scratch Virtual Machine
  Scratch.extensions.register(new GlassmorphismCore());
  Scratch.extensions.register(new Glassmorphism3D());

})(Scratch);