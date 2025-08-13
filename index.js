const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');

const app = express();
app.use(cors());

// Helper: get a single direct file URL from yt-dlp (progressive if possible)
function getDirectUrl(videoUrl) {
  return new Promise((resolve, reject) => {
    const format = 'bv*+ba/best[ext=mp4][protocol^=http]/best[protocol^=http]';
    const args = ['-g', '--no-playlist', '-f', format, videoUrl];

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
      const lines = out.split('\n').map(s => s.trim()).filter(Boolean);
      if (lines.length === 0) {
        return reject(new Error('No direct URL found.'));
      }
      resolve(lines[0]);
    });
  });
}

// Root route — instantly redirect to real video file
app.get('/', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) {
      return res.status(400).send('No URL provided. Use /?url=<video_link>');
    }

    const direct = await getDirectUrl(videoUrl);
    res.redirect(302, direct); // Browser downloads it directly
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to get download link');
  }
});

// Keep your /direct route
app.get('/direct', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send('No URL provided');

    const direct = await getDirectUrl(videoUrl);
    res.redirect(302, direct);
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to resolve direct media URL');
  }
});

// Keep your /download HTML auto-start page
app.get('/download', async (req, res) => {
  try {
    const videoUrl = req.query.url;
    if (!videoUrl) return res.status(400).send('No URL provided');

    const direct = await getDirectUrl(videoUrl);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Starting download…</title>
  <script>
    window.location.href = ${JSON.stringify(direct)};
  </script>
</head>
<body>
  <p>Starting download… <a href="${direct}">Click here if it doesn’t start</a>.</p>
</body>
</html>`);
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to generate download page');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port ' + PORT));