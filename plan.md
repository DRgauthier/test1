1. **Fix visual NPC spawning on initial load**:
   - Edit `index.html` where we load NPCs (`Spawn NPCs for the loaded counts`).
   - Calculate `baseTroops` equal to `totalTroops - deployedTroops`.
   - Iterate through `activeDeployments` to find `deployedGunshipIds`.
   - Iterate through vehicles, and if a vehicle is in `deployedGunshipIds`, add its `assigned_troops` to `deployedTroops`.
   - The visual count of NPCs to spawn around the base is `window.vehicleManager.totalTroops[type] - deployedTroops[type]`.
   - Remove the `window.npcManager.counts[type] = ...` line since we already set it at line 635 to `totalTroops`.
   - Spawning logic loop will use `baseTroops[type]` count.

2. **Ensure save logic doesn't drop troops on unload**:
   - In `index.html` at `window.addEventListener('beforeunload')`, add `if (window.npcManager) { window.npcManager.syncTroopsToDb(); }` so any un-synced troop counts get saved.

3. **Complete pre-commit steps**.
4. **Submit**.
