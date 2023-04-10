## What's this?

An app where hopefully in the future you'll be able to see satellites and their trajectories in the sky, and maybe also calculate things. Name taken from desktop app called Heavensat, since it's Windows only I want to make something similar and useful cross-platform.

- [x] Stars, constellations, basic controls
- [x] Geographically and time wise correct sky
- [x] Satellites
- [ ] Sun, moon
- [ ] Planets
- [ ] Not simply dark but correctly colored sky gradient
- [ ] Local storage for satellite databases, and persistent settings

## What did ChatGPT do for this app? In roughly chronological order
- Suggested to draw stars as a sphere in 3D space
- Suggested to use Hipparcos star catalog
- Suggested to draw stars as points
- Provided code that sets up perspective rendering
- Provided most of code for shaders, although on older GLSL version
- Provided code to convert equatorial coordinates to Cartesian
- Provided code to convert star color index (B-V) of Hipparcos catalog to RGB color
- Provided correct calls of WebGL API at times where I was unsure or something didn't work
- Explained and provided code to tilt the sky so that it corresponds to that in reality, for a given location and time
- Identified a couple issues with my matrices code and fixed them
- Suggested changes to star shaders to make stars round instead of squares
- Suggested a way to draw ground
