import re

with open('worldMap.js', 'r') as f:
    content = f.read()

# Add a function to update conscripts based on timestamp and call it in fetchGameData
conscript_logic = """
  async updateConscripts(forceDBUpdate = false) {
    if (!this.capturedTiles || !window.supabaseClient) return;

    const now = new Date();
    const currentHourMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours());
    const currentHour = new Date(currentHourMs);

    let needsDbSync = false;

    for (const ct of this.capturedTiles) {
      const hex = this.hexes.find(h => h.q === ct.hex_q && h.r === ct.hex_r);
      if (!hex || hex.state !== 'CAPTURED') continue;

      const lastUpdate = new Date(ct.last_conscript_update || now);
      // Floor the last update to the start of its hour for consistent ticking
      const lastUpdateHourMs = Date.UTC(lastUpdate.getUTCFullYear(), lastUpdate.getUTCMonth(), lastUpdate.getUTCDate(), lastUpdate.getUTCHours());

      const hoursPassed = Math.floor((currentHourMs - lastUpdateHourMs) / (1000 * 60 * 60));

      if (hoursPassed > 0) {
        const diff = hex.difficulty || 1;
        const baseCap = diff * 50;
        const capMultiplier = hex.inNetwork ? 2 : 1;
        const maxCap = baseCap * capMultiplier;

        const baseRate = diff * 10;
        const rateMultiplier = hex.inNetwork ? 1.5 : 1;
        const hourlyRate = Math.floor(baseRate * rateMultiplier);

        const newConscripts = Math.min(ct.conscript_count + (hourlyRate * hoursPassed), maxCap);

        if (newConscripts !== ct.conscript_count) {
          ct.conscript_count = newConscripts;
          hex.conscript_count = newConscripts;
          ct.last_conscript_update = currentHour.toISOString();
          hex.last_conscript_update = ct.last_conscript_update;

          needsDbSync = true;

          // Fire and forget update
          window.supabaseClient
            .from('captured_tiles')
            .update({
              conscript_count: newConscripts,
              last_conscript_update: ct.last_conscript_update
            })
            .eq('id', ct.id)
            .then(() => {});
        }
      }
    }

    // Periodically re-render if the panel is open to a captured hex
    if (this.selectedHex && this.selectedHex.state === 'CAPTURED') {
        const hex = this.selectedHex;
        const diff = hex.difficulty || 1;
        const baseCap = diff * 50;
        const capMultiplier = hex.inNetwork ? 2 : 1;
        const maxCap = baseCap * capMultiplier;
        const el = document.getElementById('captured-conscripts');
        if (el) el.innerText = hex.conscript_count;
        const capEl = document.getElementById('captured-conscript-cap');
        if (capEl) capEl.innerText = maxCap;
    }
  }

  update() {
"""

pattern = re.compile(r'  update\(\) \{', re.DOTALL)
new_content = pattern.sub(conscript_logic, content)

with open('worldMap.js', 'w') as f:
    f.write(new_content)

print("Conscript generation logic added")
