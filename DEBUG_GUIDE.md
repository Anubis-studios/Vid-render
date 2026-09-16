# Video Generation Debugging Guide

## Overview
This guide explains how to use the comprehensive console logging system to identify and fix video generation issues.

## Console Log Symbols

The system uses emoji symbols to make logs easy to scan:

- 🎬 Starting video generation
- 📐 Canvas size information
- ✅ Success/confirmation
- ❌ Error/failure
- 🎨 Creating renderer
- ⏱️ Recording duration info
- 📹 MediaRecorder info
- 🔴 Recording started
- 📦 Data chunk received
- 🛑 Recording stopped
- 📊 Final blob statistics
- 🎞️ Frame rendered
- ⏹️ Stopping recording
- ⏳ Waiting for finalization
- 🔗 Video URL created
- 🔄 Fallback generation
- 🎉 Complete

## How to Debug

### Step 1: Open Browser Console
1. Open your browser's Developer Tools (F12 or Ctrl+Shift+I)
2. Go to the "Console" tab
3. Clear any existing logs

### Step 2: Initiate Render
1. Click "Initiate Render" button
2. Watch the console logs appear in real-time

### Step 3: Identify the Failure Point

Look for the last ✅ symbol before a ❌ symbol. This tells you where the process failed.

#### Common Failure Points:

**1. Canvas Initialization Failed**
```
❌ Canvas element not found
```
**Solution:** The canvas element isn't in the DOM. Check that the canvas ref is properly attached.

**2. Canvas Context Failed**
```
❌ Canvas 2D context failed to initialize
```
**Solution:** Browser doesn't support Canvas 2D. Try a different browser.

**3. Renderer Test Failed**
```
❌ Test frame failed: [error message]
```
**Solution:** The selected style's renderer has a bug. Check the error message for details.

**4. Canvas Stream Capture Failed**
```
❌ Failed to capture canvas stream: [error message]
```
**Solution:** Browser doesn't support `canvas.captureStream()`. This is required for video recording.

**5. MediaRecorder Creation Failed**
```
❌ MediaRecorder creation failed: [error message]
```
**Solution:** Browser doesn't support MediaRecorder or the requested codec.

**6. Recording Failed**
```
🛑 Recording stopped. Total chunks: 0
📊 Final blob size: 0 bytes
❌ Video blob is empty - no data was recorded
```
**Solution:** MediaRecorder didn't capture any frames. This could mean:
- Canvas wasn't being drawn to
- Stream wasn't properly connected
- Browser security blocked recording

**7. Video URL Creation Failed**
```
❌ Failed to create video URL
```
**Solution:** Browser doesn't support `URL.createObjectURL()`.

## Fallback System

If the main video generation fails, the system automatically attempts to generate a fallback video:

1. Creates a simple 3-second animated gradient
2. Displays "VIDEO READY" text with the selected style name
3. Uses basic MediaRecorder to ensure a video is generated

If the fallback also fails, you'll see:
```
❌ Fallback also failed: [error message]
```

## Expected Log Sequence (Success)

```
🎬 Starting video generation...
📐 Canvas size: 640x360
✅ Canvas context initialized
🎨 Creating CARTOON renderer...
✅ Test frame rendered successfully
⏱️ Recording for 6s at 30 FPS
✅ Canvas stream captured
⚠️ VP9 not supported, trying VP8...
📹 Using mimeType: video/webm;codecs=vp8
✅ MediaRecorder created
🔴 Recording started
🎞️ Frame 30 rendered
🎞️ Frame 60 rendered
🎞️ Frame 90 rendered
🎞️ Frame 120 rendered
🎞️ Frame 150 rendered
🎞️ Frame 180 rendered
✅ Render duration complete: 6.02s
⏹️ Stopping recording...
📦 Data chunk available: 12345 bytes
📦 Data chunk available: 23456 bytes
...
✅ Recording stopped, tracks closed
⏳ Waiting for recording to finalize...
🛑 Recording stopped. Total chunks: 60
📊 Final blob size: 1234567 bytes (1.18 MB)
✅ Video blob ready: 1234567 bytes
🔗 Video URL created: blob:http://localhost...
📦 Setting output data...
✅ Showing output...
🎉 Video generation complete!
```

## Browser Compatibility

### Required Features:
- Canvas API (2D context)
- `canvas.captureStream()` - Chrome 51+, Firefox 43+, Safari 11+
- MediaRecorder API - Chrome 49+, Firefox 29+, Safari 14.1+
- `URL.createObjectURL()` - All modern browsers

### Recommended Browsers:
1. **Chrome/Edge** (Best support)
2. **Firefox** (Good support)
3. **Safari 14.1+** (Limited codec support)

### Known Issues:
- **Safari**: May not support VP9 codec, falls back to VP8
- **Mobile browsers**: May have limited MediaRecorder support
- **Old browsers**: May not support `captureStream()`

## Troubleshooting Checklist

### Video Not Playing:
- [ ] Check console for errors
- [ ] Verify video URL is not empty
- [ ] Check video blob size > 0
- [ ] Try clicking the play button manually
- [ ] Check browser console for autoplay errors

### Video is Black/Empty:
- [ ] Check if renderer is actually drawing (look for frame logs)
- [ ] Verify canvas size is set correctly
- [ ] Check if MediaRecorder is receiving data chunks
- [ ] Try a different style/renderer

### Recording Stops Early:
- [ ] Check if render loop is completing
- [ ] Verify duration setting is correct
- [ ] Check for JavaScript errors stopping execution

### Fallback Video Generated:
- [ ] Main renderer failed - check console for specific error
- [ ] Browser may not support advanced features
- [ ] Try a simpler style (Cartoon, Minimalist)

## Performance Tips

### For Better Performance:
1. Use 480p resolution for faster rendering
2. Use 24 or 30 FPS instead of 60 FPS
3. Use shorter durations (3-6 seconds)
4. Close other browser tabs
5. Use Chrome/Edge for best performance

### For Better Quality:
1. Use 720p or 1080p resolution
2. Use "WebM HQ" format (5 Mbps bitrate)
3. Use 60 FPS for smoother motion
4. Use longer durations (15-30 seconds)

## Reporting Issues

When reporting a bug, include:
1. Browser name and version
2. Operating system
3. Complete console log output
4. Selected style and settings
5. Screenshot of the error (if any)

## Code Locations

### Main Video Generation:
- File: `src/App.tsx`
- Function: `startPipeline()`
- Lines: ~1833-2049

### Renderers:
- File: `src/renderers.ts`
- Each style has its own renderer class

### Fallback System:
- File: `src/App.tsx`
- Location: Inside the catch block of Stage 5 & 6
- Generates simple animated gradient video

## Next Steps

If videos still aren't generating after checking all the above:

1. **Check Browser Console**: Look for the exact error message
2. **Try Different Browser**: Chrome is most reliable
3. **Try Different Style**: Some styles may have bugs
4. **Check Fallback**: If fallback works, main renderer has an issue
5. **Report Bug**: Include console logs and browser info

---

**Last Updated**: 2024
**Version**: 3.0 with Debugging
