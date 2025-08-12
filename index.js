import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

const app = express();
app.use(cors());

app.get('/download', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).send('No URL provided');
  }

  const videosDir = path.resolve('./videos');
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir);
  }

  const filename = `video-${Date.now()}.mp4`;
  const output = path.join(videosDir, filename);

  // Use local yt-dlp binary in current folder
  exec(`./yt-dlp -o "${output}" "${videoUrl}"`, (error, stdout, stderr) => {
    if (error) {
      console.error('Download error:', stderr);
      return res.status(500).send('Download failed');
    }

    res.download(output, filename, (err) => {
      if (err) {
        console.error('Send file error:', err);
        res.status(500).end();
      } else {
        // Delete file after sending
        fs.unlink(output, () => {});
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});