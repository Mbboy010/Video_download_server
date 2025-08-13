const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
app.use(cors());

// Helper: get a single direct file URL from yt-dlp (progressive if possible)
function getDirectUrl(videoUrl) {
  return new Promise((resolve, reject) => {
    // -g prints the direct URL(s)
    // The format tries for a single-file progressive MP4 first, then any HTTP(S) single stream.
    const format = 'bv*+ba/best[ext=mp4][protocol^=http]/best[protocol^=http]';
    const args = ['-g', '--no-playlist', '-f', format, videoUrl];

    // Use the yt-dlp binary if installed; set YTDLP env var to override
    const cmd = process.env.YTDLP || 'yt-dlp';
    const child = spawn(cmd, args);

    let out = '';
    let err = '';

    child.stdout.on('data', (d) => (out += d.toString()));
    child.stderr.on('data', (d) => (err += d.toString()));

    child.on('error', reject);

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(err || `yt-dlp exited with code ${code}`));
      }
      // yt-dlp -g can print multiple lines (video+audio). We want a single progressive URL.
      const lines = out.split('\n').map(s => s.trim()).filter(Boolean);
      if (lines.length === 0) {
        return reject(new Error('No direct URL found.'));
      }
      // Prefer the first one (should be a single progressive stream with our format)
      resolve(lines[0]);
    });
  });
}

// Option A: pure redirect — lets the browser download directly from the source
app.get('/direct', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send('No URL provided');

    const direct = await getDirectUrl(videoUrl);

    // 302 to the media file; browser handles it like a normal download from origin
    // (You cannot set Content-Disposition for cross-origin, but redirect works great.)
    res.redirect(302, direct);
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to resolve direct media URL');
  }
});

// Option B: tiny HTML that auto-navigates to the media URL (for “generate html” request)
app.get('/download', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send('No URL provided');

    const direct = await getDirectUrl(videoUrl);

    // HTML that immediately navigates to the direct file URL
    // (download attribute only works same-origin; redirect via JS is the reliable path)
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Starting download…</title>
  <noscript>
    <meta http-equiv="refresh" content="0; url=${direct.replace(/"/g, '&quot;')}" />
  </noscript>
  <script>
    // Navigate immediately; browser will start a normal download to the device
    window.location.href = ${JSON.stringify(direct)};
  </script>
  <style>
    body { font-family: system-ui, sans-serif; margin: 2rem; }
    a { word-break: break-all; }
  </style>
</head>
<body>
  <p>Starting your download… If nothing happens, <a href="${direct}">tap here to download</a>.</p>
</body>
</html>`);
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to generate download page');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));