const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());

// Path to local yt-dlp binary
const YTDLP_PATH = path.join(__dirname, 'yt-dlp');

// Helper: get a single direct file URL from yt-dlp (progressive if possible)
function getDirectUrl(videoUrl) {
  return new Promise((resolve, reject) => {
    const format = 'bv*+ba/best[ext=mp4][protocol^=http]/best[protocol^=http]';
    const args = ['-g', '--no-playlist', '-f', format, videoUrl];

    const child = spawn(YTDLP_PATH, args);

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));