const fs = require('fs');
let code = fs.readFileSync('worldMap.js', 'utf8');

// Replace drawHex to handle NPC_BASE and CAPTURED
code = code.replace(
  /if \(hexState === 'ACTIVE'\) \{/,
  `if (hexState === 'NPC_BASE') {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#e53e3e';
      ctx.fillStyle = 'rgba(229, 62, 62, 0.5)';
      ctx.fill();
    } else if (hexState === 'CAPTURED') {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#4299e1';
      ctx.fillStyle = 'rgba(66, 153, 225, 0.5)';
      ctx.fill();
    } else if (hexState === 'ACTIVE') {`
);

// We need to fetch captured_tiles and deployments
const fetchCode = `
  async fetchGameData() {
    if (!window.supabaseClient || !window.currentUser) return;

    // Fetch other players (existing logic)
    const { data: players } = await window.supabaseClient
      .from('players')
      .select('*')
      .neq('id', window.currentUser.id);

    if (players) {
      this.otherPlayers = players;
    }

    // Fetch captured tiles
    const { data: capturedTiles } = await window.supabaseClient
      .from('captured_tiles')
      .select('*')
      .eq('player_id', window.currentUser.id);

    if (capturedTiles) {
      this.capturedTiles = capturedTiles;
      for (const ct of capturedTiles) {
        const hex = this.hexes.find(h => h.q === ct.hex_q && h.r === ct.hex_r);
        if (hex) {
          hex.state = 'CAPTURED';
          hex.conscript_count = ct.conscript_count;
          hex.last_conscript_update = ct.last_conscript_update;
          hex.garrison_troops = ct.garrison_troops;
        }
      }
      this.calculateNetworkMultiplier();
    }

    // Fetch active deployments
    const { data: deployments } = await window.supabaseClient
      .from('deployments')
      .select('*')
      .eq('player_id', window.currentUser.id);

    if (deployments) {
      this.activeDeployments = deployments;
    } else {
      this.activeDeployments = [];
    }
  }
`;

code = code.replace(/async fetchOtherPlayers\(\) \{[\s\S]*?\n  \}/, fetchCode);

fs.writeFileSync('worldMap.js', code);
