const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

app.get('/download', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).send('No URL provided');
  }

  const videosDir = path.resolve('./videos');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir, { recursive: true });
  }

  const filename = `video-${Date.now()}.mp4`;
  const output = path.join(videosDir, filename);

  console.log(`Starting download for: ${videoUrl}`);
  console.log(`Output path: ${output}`);

  // Run yt-dlp via python3 because yt-dlp is a Python script
  const ytdlpPath = 'python3';
  const ytdlpArgs = ['./yt-dlp', '-o', output, videoUrl];

  const ytdlp = spawn(ytdlpPath, ytdlpArgs);

  ytdlp.stdout.on('data', (data) => {
    console.log(`yt-dlp stdout: ${data.toString()}`);
  });

  ytdlp.stderr.on('data', (data) => {
    console.error(`yt-dlp stderr: ${data.toString()}`);
  });

  ytdlp.on('error', (err) => {
    console.error('yt-dlp spawn error:', err);
    return res.status(500).send('Download failed');
  });

  ytdlp.on('close', (code) => {
    console.log(`yt-dlp process exited with code ${code}`);

    if (code !== 0) {
      if (fs.existsSync(output)) {
        fs.unlink(output, () => {});
      }
      return res.status(500).send('Download failed');
    }

    res.download(output, filename, (err) => {
      if (err) {
        console.error('Send file error:', err);
        res.status(500).end();
      } else {
        fs.unlink(output, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Error deleting file:', unlinkErr);
          }
        });
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});