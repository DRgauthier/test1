function initCamera(canvas) {
  const ctx = canvas.getContext('2d');

  const structureManager = new StructureManager();
  window.structureManager = structureManager;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }

  window.addEventListener('resize', resize);
  resize();

  const sceneManager = window.sceneManager || new SceneManager();
  window.sceneManager = sceneManager;

  const worldMap = window.worldMap || new WorldMap();
  window.worldMap = worldMap;

  const cameras = {
    BASE: { x: 0, y: 0, zoom: 1 },
    WORLD: { x: 0, y: 0, zoom: 0.5 }
  };

  let isDragging = false;
  let hasDragged = false; 
  let lastMouseX = 0;
  let lastMouseY = 0;

  function getCurrentCamera() {
    return cameras[sceneManager.currentScene];
  }

  canvas.style.cursor = 'grab';

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    hasDragged = false; 
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    
    if (sceneManager.currentScene === 'BASE') {
      if (!structureManager.isBuilding && !structureManager.isDeconstructing) {
        canvas.style.cursor = 'grabbing';
      }
    } else {
      canvas.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mousemove', (e) => {
    const cam = getCurrentCamera();

    if (sceneManager.currentScene === 'BASE') {
      structureManager.updateMousePosition(
        e.clientX, e.clientY,
        cam.x, cam.y, cam.zoom,
        window.innerWidth, window.innerHeight
      );

      // --- Hover Tooltip Logic ---
      const worldX = (e.clientX - window.innerWidth / 2) / cam.zoom + cam.x;
      const worldY = (e.clientY - window.innerHeight / 2) / cam.zoom + cam.y;
      let hoveredName = null;

      // Check Buildings
      for (let i = structureManager.buildings.length - 1; i >= 0; i--) {
        const b = structureManager.buildings[i];
        if (worldX >= b.x && worldX <= b.x + b.type.width && worldY >= b.y && worldY <= b.y + b.type.height) {
          hoveredName = b.type.name;
          break;
        }
      }

      // Check NPCs if no building is hovered
      if (!hoveredName && window.npcManager) {
        for (let i = window.npcManager.npcs.length - 1; i >= 0; i--) {
          const npc = window.npcManager.npcs[i];
          if (Math.hypot(npc.x - worldX, npc.y - worldY) < npc.type.size * 1.5) {
            hoveredName = npc.type.name;
            break;
          }
        }
      }

      // Update the DOM tooltip
      const tooltip = document.getElementById('canvas-tooltip');
      if (tooltip) {
        if (hoveredName) {
          tooltip.innerText = hoveredName;
          tooltip.style.display = 'block';
          tooltip.style.left = (e.clientX + 15) + 'px';
          tooltip.style.top = (e.clientY + 15) + 'px';
        } else {
          tooltip.style.display = 'none';
        }
      }
      // ---------------------------
    } else {
      // Hide tooltip in world map view
      const tooltip = document.getElementById('canvas-tooltip');
      if (tooltip) tooltip.style.display = 'none';
    }

    if (!isDragging) return;
    
    hasDragged = true; 
    
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    
    cam.x -= dx / cam.zoom;
    cam.y -= dy / cam.zoom;
    
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  window.addEventListener('mouseup', (e) => {
    isDragging = false;
    
    if (sceneManager.currentScene === 'BASE') {
      if (!structureManager.isBuilding && !structureManager.isDeconstructing) {
        canvas.style.cursor = 'grab';
      } else {
        canvas.style.cursor = 'crosshair';
      }
    } else {
      canvas.style.cursor = 'grab';
    }

    if (!hasDragged) {
      const cam = getCurrentCamera();
      const rect = canvas.getBoundingClientRect();
      const worldX = ((e.clientX - rect.left) - window.innerWidth / 2) / cam.zoom + cam.x;
      const worldY = ((e.clientY - rect.top) - window.innerHeight / 2) / cam.zoom + cam.y;

      if (sceneManager.currentScene === 'BASE') {
        if (structureManager.isBuilding) {
          structureManager.placeBuilding();
        } else if (structureManager.isDeconstructing) {
          structureManager.deconstructBuilding();
        } else {
          // --- Click Interaction Logic ---
          for (let i = structureManager.buildings.length - 1; i >= 0; i--) {
            const b = structureManager.buildings[i];
            if (worldX >= b.x && worldX <= b.x + b.type.width && worldY >= b.y && worldY <= b.y + b.type.height) {
              // Check if the user clicked the Gunship to open the menu
              if (b.type.id === 'GUNSHIP' && window.missionManager) {
                window.missionManager.openMenu();
              }
              break;
            }
          }
        }
      } else {
        worldMap.handleClick(worldX, worldY);
      }
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    const cam = getCurrentCamera();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - window.innerWidth / 2) / cam.zoom + cam.x;
    const worldY = (mouseY - window.innerHeight / 2) / cam.zoom + cam.y;

    const zoomSensitivity = 0.1;
    const zoomFactor = e.deltaY < 0 ? (1 + zoomSensitivity) : (1 - zoomSensitivity);
    cam.zoom *= zoomFactor;

    cam.zoom = Math.max(0.05, Math.min(cam.zoom, 10));

    cam.x = worldX - (mouseX - window.innerWidth / 2) / cam.zoom;
    cam.y = worldY - (mouseY - window.innerHeight / 2) / cam.zoom;
    
    if (sceneManager.currentScene === 'BASE') {
      structureManager.updateMousePosition(
        e.clientX, e.clientY,
        cam.x, cam.y, cam.zoom,
        window.innerWidth, window.innerHeight
      );
    }
  }, { passive: false });

  function render() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    const cam = getCurrentCamera();
    ctx.translate(window.innerWidth / 2, window.innerHeight / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    if (sceneManager.currentScene === 'BASE') {
      ctx.strokeStyle = '#3182ce';
      ctx.lineWidth = 1;

      ctx.beginPath();
      for (let i = -5000; i <= 5000; i += 50) {
        ctx.moveTo(i, -5000);
        ctx.lineTo(i, 5000);
        ctx.moveTo(-5000, i);
        ctx.lineTo(5000, i);
      }
      ctx.stroke();

      ctx.strokeStyle = '#63b3ed';
      ctx.lineWidth = 2;
      ctx.strokeRect(-5000, -5000, 10000, 10000);

      // Call update loops
      const currentNPCCount = window.npcManager ? window.npcManager.npcs.length : 0;
      structureManager.update(currentNPCCount); // Triggers time and consumption
      structureManager.draw(ctx);

      if (window.npcManager) {
        window.npcManager.update([]);
        window.npcManager.draw(ctx);
      }
    } else if (sceneManager.currentScene === 'WORLD') {
      // Just update game logic in background if needed
      const currentNPCCount = window.npcManager ? window.npcManager.npcs.length : 0;
      structureManager.update(currentNPCCount);
      if (window.npcManager) window.npcManager.update([]);

      worldMap.draw(ctx);
    }

    if (window.missionManager) window.missionManager.update();

    ctx.restore();

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}