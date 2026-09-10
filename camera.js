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

  let cameraX = 0;
  let cameraY = 0;
  let zoom = 1;

  let isDragging = false;
  let hasDragged = false; 
  let lastMouseX = 0;
  let lastMouseY = 0;

  canvas.style.cursor = 'grab';

  canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    hasDragged = false; 
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    
    if (!structureManager.isBuilding && !structureManager.isDeconstructing) {
      canvas.style.cursor = 'grabbing';
    }
  });

  window.addEventListener('mousemove', (e) => {
    structureManager.updateMousePosition(
      e.clientX, e.clientY, 
      cameraX, cameraY, zoom, 
      window.innerWidth, window.innerHeight
    );

    // --- Hover Tooltip Logic ---
    const worldX = (e.clientX - window.innerWidth / 2) / zoom + cameraX;
    const worldY = (e.clientY - window.innerHeight / 2) / zoom + cameraY;
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

    if (!isDragging) return;
    
    hasDragged = true; 
    
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    
    cameraX -= dx / zoom;
    cameraY -= dy / zoom;
    
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  window.addEventListener('mouseup', (e) => {
    isDragging = false;
    
    if (!structureManager.isBuilding && !structureManager.isDeconstructing) {
      canvas.style.cursor = 'grab';
    } else {
      canvas.style.cursor = 'crosshair';
    }

    if (!hasDragged) {
      if (structureManager.isBuilding) {
        structureManager.placeBuilding();
      } else if (structureManager.isDeconstructing) {
        structureManager.deconstructBuilding();
      } else {
        // --- Click Interaction Logic ---
        const rect = canvas.getBoundingClientRect();
        const worldX = ((e.clientX - rect.left) - window.innerWidth / 2) / zoom + cameraX;
        const worldY = ((e.clientY - rect.top) - window.innerHeight / 2) / zoom + cameraY;

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
    }
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - window.innerWidth / 2) / zoom + cameraX;
    const worldY = (mouseY - window.innerHeight / 2) / zoom + cameraY;

    const zoomSensitivity = 0.1;
    const zoomFactor = e.deltaY < 0 ? (1 + zoomSensitivity) : (1 - zoomSensitivity);
    zoom *= zoomFactor;

    zoom = Math.max(0.05, Math.min(zoom, 10));

    cameraX = worldX - (mouseX - window.innerWidth / 2) / zoom;
    cameraY = worldY - (mouseY - window.innerHeight / 2) / zoom;
    
    structureManager.updateMousePosition(
      e.clientX, e.clientY, 
      cameraX, cameraY, zoom, 
      window.innerWidth, window.innerHeight
    );
  }, { passive: false });

  function render() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    ctx.translate(window.innerWidth / 2, window.innerHeight / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-cameraX, -cameraY);

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

    if (window.missionManager) window.missionManager.update();

    ctx.restore();

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}