const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());

const videosDir = path.join(__dirname, 'videos');

// Ensure the 'videos' folder exists
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir);
}

app.get('/download', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).send('No URL provided');
  }

  // Create a unique filename: video-<timestamp>.mp4
  const filename = `video-${Date.now()}.mp4`;
  const output = path.join(videosDir, filename);

  // Run yt-dlp with output path to the videos folder
  exec(`yt-dlp -o "${output}" "${videoUrl}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${stderr}`);
      return res.status(500).send('Download failed');
    }

    console.log(`Downloaded video saved to: ${output}`);

    // Send the file to client to download
    res.download(output, filename, (err) => {
      if (err) {
        console.error('Error sending file:', err);
      } else {
        console.log('Download finished and sent to client');
      }
    });
  });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});