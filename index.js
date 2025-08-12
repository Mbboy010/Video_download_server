const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');

const app = express();
app.use(cors());

app.get('/download', (req, res) => {
    const videoUrl = req.query.url;
    if (!videoUrl) {
        return res.status(400).send('No URL provided');
    }

    const output = path.join(__dirname, 'video.mp4');
    exec(`yt-dlp -o "${output}" "${videoUrl}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${stderr}`);
            return res.status(500).send('Download failed');
        }
        res.download(output, 'video.mp4', () => {
            console.log('Download finished and sent');
        });
    });
});

app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});