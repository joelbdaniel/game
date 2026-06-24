# Singleplayer Browser Shooter Game

A fast-paced, completely offline 2D browser shooter game built with HTML5 Canvas and Vanilla JavaScript. 
Battle against 14 intelligent AI bots in a chaotic Free-For-All with dynamic weapons, abilities, and no latency!

## Features

- **No Servers, No Latency:** Runs entirely in your browser with vanilla JavaScript.
- **AI Bots:** 14 AI bots that roam the map, hide behind cover (on Medium and Hard difficulties), and fight each other. Bots automatically respawn 5 seconds after death.
- **Weapon System:**
  - **Assault:** Standard fire rate and medium view.
  - **Shotgun:** Close-quarters spread shot with a small view.
  - **Sniper:** High damage, high speed, and a massive zoomed-out camera view.
- **Special Abilities:**
  - **Dash (E):** Get a massive speed boost for 10 seconds.
  - **Teleport (Q):** Instantly blink a short distance in the direction you are aiming to escape danger or jump past obstacles.
- **Dynamic Map:** Trees and boxes are scattered randomly and evenly every match to provide cover.

## How to Play

Since this game is built entirely with client-side web technologies, you don't need to install Node.js, NPM, or any backend dependencies to run it!

1. Clone or download this repository.
2. Open the `index.html` file directly in any modern web browser (e.g., Chrome, Firefox, Edge).
   - Alternatively, you can host it using GitHub Pages, or use a simple local server like Live Server in VS Code, or Python (`python -m http.server 8000`).
3. Select your desired bot difficulty from the main menu and click **Start Game**.

## Controls

- **WASD:** Move around the map.
- **Mouse:** Aim your weapon.
- **Left Click:** Shoot.
- **Right Click (Hold):** Scope (shifts the camera further in the direction you are aiming).
- **Mouse Scroll Wheel:** Cycle through your 3 weapons.
- **E:** Dash (10-second speed boost).
- **Q:** Teleport (Blink a short distance).

## Technologies Used

- **HTML5 Canvas:** For all rendering and graphics.
- **Vanilla JavaScript (ES6):** For game loop, physics, collision, and AI logic.
- **Vanilla CSS:** For the sleek, modern UI styling.
