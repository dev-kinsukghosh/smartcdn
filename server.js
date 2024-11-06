const express = require('express');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const Greenlock = require('greenlock-express');

const app = express();
const PORT = 80;
const SSL_PORT = 443;

// Define the folders where images are stored
const imageFolders = ['img/banner', 'img/icons', 'img/img'];

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Route to handle image requests
app.get('/', async (req, res) => {
    const { image, size, width, height } = req.query;

    if (!image) {
        return res.status(404).send('404 Not Found');
    }

    // Normalize the image path to prevent path traversal
    const normalizedImage = path.normalize(image).replace(/^(\.\.(\/|\\|$))+/, '');

    // Find the image in the specified folders
    let imagePath;
    for (const folder of imageFolders) {
        const potentialPath = path.join(__dirname, folder, normalizedImage);
        if (fs.existsSync(potentialPath)) {
            imagePath = potentialPath;
            break;
        }
    }

    if (!imagePath) {
        return res.status(404).send('Image not found');
    }

    try {
        let img = sharp(imagePath);

        // Resize the image if size, width, or height is specified
        if (size) {
            img = img.resize(parseInt(size));
        } else if (width || height) {
            img = img.resize(parseInt(width), parseInt(height));
        }

        // Get the image format from the file extension
        const format = path.extname(imagePath).substring(1);

        // Set the appropriate content type
        res.type(`image/${format}`);

        // Send the processed image
        img.toBuffer((err, buffer) => {
            if (err) {
                return res.status(500).send('Error processing image');
            }
            res.send(buffer);
        });
    } catch (error) {
        res.status(500).send('Error processing image');
    }
});

// Catch-all route to handle undefined routes and return a 404 status code
app.use((req, res) => {
    res.status(404).send('404 Not Found');
});

// Start the HTTP server
http.createServer(app).listen(PORT, () => {
    console.log(`HTTP server is running on http://localhost:${PORT}`);
});

// Start the HTTPS server with Greenlock for automatic certificate management
Greenlock.init({
    packageRoot: __dirname,
    configDir: './greenlock.d',
    maintainerEmail: 'youremail@example.com',
    cluster: false
}).serve(app);