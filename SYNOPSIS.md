# Game Vision & Rebuild Synopsis

## 1. Core Vision & Gameplay Loop
The game is an asynchronous, browser-based Real-Time Strategy (RTS) game.
The core gameplay loop involves:
1.  **Resource Generation:** Passively generating resources (Steel for basic construction, Oil for advanced structures/units) using specific buildings (Steel Mines, Oil Pumps).
2.  **Base Building:** Expanding the base by constructing and upgrading buildings (Headquarters, Worker Huts, Barracks, Medic Stations, Heavy Factories, Defense Turrets, Gunship Pads, Transport Bays).
    -   Construction requires "Builders", determined by HQ level and Worker Huts.
    -   Base area of effect (AoE) scales with HQ level.
3.  **Unit Training:** Training various troop types (Soldiers, Medics, Juggernauts) inside military buildings.
4.  **Vehicle & Fleet Management:** Assigning trained troops into Gunships (for attacking) and Transports (for reinforcing).
5.  **Overworld Conquest (Asynchronous Multiplayer):**
    -   Deploying loaded Gunships onto an axial hex grid map to attack hostile NPC bases or global objectives.
    -   Capturing hexes allows passive generation of "Conscripts".
    -   Players can permanently assign troops (via Transports) as garrisons to defend captured tiles.

## 2. Issues with the Current Build
The current iteration suffers from state management inconsistencies (saving issues/data loss).
The root cause is a "hybrid" architecture that relies too heavily on client-side state calculation. The client calculates resource gains, troop training completion, and combat resolution, then attempts to periodically save this state back to the Supabase database. Because there is no authoritative game server, this leads to race conditions, easily manipulated data, and out-of-sync game states (especially during offline progression).

## 3. The New Architecture: Server-Side Authority
To fix the saving issues without introducing a heavy, dedicated game server (e.g., Node.js with WebSockets), the new build will strictly enforce **Server-Side Authority** using Supabase features (PostgreSQL functions, triggers, and Supabase Edge Functions).

*   **Client as a Viewer/Requester:** The client will purely render the current state and send requests for actions (e.g., `rpc('build_structure', { type: 'barracks' })`).
*   **Database as the Engine:** Game logic will live in the database.
    *   *Resources:* Instead of the client adding +10 steel every second and saving, the database will store `last_collection_time` and `generation_rate`. The client calculates the visual representation, but the *actual* amount is only calculated server-side at the exact moment a purchase is requested.
    *   *Timers:* Troop training and building construction will rely entirely on `started_at` and `duration` timestamps in Postgres. Edge functions or triggers will handle the completion logic.
    *   *Combat:* Deployments will be logged to the database with an `arrival_time`. When the time is reached, a Supabase Edge Function (or Cron job) will resolve the combat server-side and update the territorial control state, completely removing the client from the calculation.

## 4. UI and Visuals Transition
The current build uses raw HTML5 `<canvas>` rendering coupled with heavy DOM UI overlays.
For the rebuild, the visual engine will transition to a lightweight rendering library (like **Phaser 3** or **PixiJS**). This provides:
*   Built-in support for spritesheets, animations, and proper asset management, paving the way for future art injection (replacing programmer art).
*   Better performance and easier camera/scene management compared to raw canvas manipulation.
*   The DOM UI can still be used for complex menus, but the core game world will be robustly handled by the library.

## 5. Execution Plan for the New Repository
1.  **Initialize Project:** Setup the new repo with the chosen lightweight rendering library (e.g., Phaser 3) and Supabase JS client.
2.  **Database First:** Design and deploy the robust Postgres schema, RLS policies, and SQL functions to handle resource calculation, construction timers, and unit training *before* writing client logic.
3.  **Authentication & State Sync:** Implement Supabase Auth and a robust state-syncing mechanism where the client subscribes to database changes (Supabase Realtime) rather than pushing its own state.
4.  **Rebuild Core Loop:** Re-implement the base building, resource gathering, and unit training UI.
5.  **Rebuild Overworld:** Re-implement the hex map, deployments, and asynchronous combat resolution using Supabase Edge functions or authoritative triggers.