# Collab X launch film

The film is a 16:9, caption-led product origin story designed for silent autoplay on X.

`index-v2.html` is the more immersive desktop cut. It uses the same widget,
desktop-assistant, Focus Room, and AI-report language as the landing page and
moves directly from a cluttered multi-tab problem to the Collab workflow.

## Preview

Serve this directory and open `index.html?play=1` in a browser.

## Runtime

- Duration: 43 seconds
- Canvas: 1600 × 900
- Export: H.264 MP4, 30 fps
- Audio: subtle original ambient bed and transition cues; captions remain complete when muted
- Narrative: pain loop → insight → in-room AI → decision report → automatic recap → brand close

The deterministic `window.setVideoTime(seconds)` API is used by the render process so every exported frame is repeatable.
