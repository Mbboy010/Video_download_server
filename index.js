import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).send('No URL provided');
  }

  const videosDir = path.resolve('./videos');

  // Create videos directory if it doesn't exist
  if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir);
  }

  const filename = `video-${Date.now()}.mp4`;
  const output = path.join(videosDir, filename);

  exec(`yt-dlp -o "${output}" "${videoUrl}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${stderr}`);
      return res.status(500).send('Download failed');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Use sendFile to send the downloaded video file to client
    res.sendFile(output, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        res.status(500).end();
      } else {
        // Optionally delete the file after sending
        fs.unlink(output, (unlinkErr) => {
          if (unlinkErr) console.error('Failed to delete video:', unlinkErr);
        });
      }
    });
  });
}