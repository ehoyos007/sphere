# CONTEXT.md

> Background knowledge for the Sphere project.

## Project Overview
**Name:** Sphere
**Description:** A high-fidelity, futuristic "Session Manager" sphere with a hexagonal territory map aesthetic.
**Tech Stack:** Three.js, GLSL, HTML/CSS.

## Terminology

| Term | Definition |
|------|------------|
| Hex SDF | Signed Distance Function for a hexagon, used for tiling the sphere surface. |
| Territory Logic | Logic to group hexes into distinct colored regions (e.g., Cyan vs. Magenta). |
| Neon Styling | A visual style characterized by thick, glowing borders and high emissive intensity. |
| Breathing Effect | A slow pulse animation affecting the scale or intensity of the sphere. |

## Conventions & Patterns

### File Structure
- `index.html`: Main entry point and HUD.
- `script.js`: Three.js scene setup, shaders, and animation logic.
- `style.css`: UI styling for HUD and GUI.

## Environment Variables
> None currently used.
