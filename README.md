## What's this?

An app to answer the questions:
1. **What satellite did I just see?**
2. **How do I see that satellite again? How do I see it in similar conditions, so if it flared it would flare again?**
3. **What interesting stuff is flying over me today?**

For details on development, see Roadmap: https://github.com/1valdis/heavensat-web/issues/1

## Credits
- Hipparcos catalog: [gmiller123456/hip2000](https://github.com/gmiller123456/hip2000) magnitude 8 file, with small corrections to be valid JSON
- Satellite TLE parsing and propagation: [shashwatak/satellite-js](https://github.com/shashwatak/satellite-js)
- Constellation lines - from Stellarium

## What did ChatGPT do for this app? In roughly chronological order
- Suggested to draw stars as a sphere in 3D space
- Suggested to use Hipparcos star catalog
- Suggested to draw stars as points
- Provided code that sets up perspective rendering
- Provided code to convert star color index (B-V) of Hipparcos catalog to RGB color
- Provided correct calls of WebGL API at times where I was unsure or something didn't work
- Explained how to tilt the sky so that it corresponds to that in reality, for a given location and time
- Identified a couple issues with my matrices code and fixed them
- Suggested changes to star shaders to make stars round instead of squares
- Suggested a way to draw ground
