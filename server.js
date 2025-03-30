const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const app = express();

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Database setup
const db = new sqlite3.Database('database.sqlite');
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        category TEXT,
        date TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content TEXT,
        date TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE
    )`);
});

// File upload setup
const storage = multer.diskStorage({
    destination: './public/images/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Admin password (hashed for security)
const adminPasswordHash = bcrypt.hashSync('admin123', 10); // Change 'admin123' to your password

// Middleware to check admin access
function checkAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (authHeader && bcrypt.compareSync(authHeader, adminPasswordHash)) {
        next();
    } else {
        res.status(401).send('Unauthorized');
    }
}

// Routes
// Public blog page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

// Get all posts (public)
app.get('/api/posts', (req, res) => {
    db.all('SELECT * FROM posts ORDER BY date DESC', (err, rows) => {
        if (err) return res.status(500).send('Database error');
        res.json(rows);
    });
});

// Get all photos (public)
app.get('/api/photos', (req, res) => {
    db.all('SELECT * FROM photos', (err, rows) => {
        if (err) return res.status(500).send('Database error');
        res.json(rows);
    });
});

// Get all comments (public)
app.get('/api/comments', (req, res) => {
    db.all('SELECT * FROM comments ORDER BY date DESC', (err, rows) => {
        if (err) return res.status(500).send('Database error');
        res.json(rows);
    });
});

// Add a comment (public)
app.post('/api/comments', (req, res) => {
    const { content } = req.body;
    const date = new Date().toISOString();
    db.run('INSERT INTO comments (content, date) VALUES (?, ?)', [content, date], (err) => {
        if (err) return res.status(500).send('Database error');
        res.json({ success: true });
    });
});

// Subscribe (public)
app.post('/api/subscribe', (req, res) => {
    const { email } = req.body;
    db.run('INSERT OR IGNORE INTO subscriptions (email) VALUES (?)', [email], (err) => {
        if (err) return res.status(500).send('Database error');
        res.json({ success: true });
    });
});

// Admin: Add a post
app.post('/api/posts', checkAdmin, (req, res) => {
    const { title, content, category } = req.body;
    const date = new Date().toISOString();
    db.run('INSERT INTO posts (title, content, category, date) VALUES (?, ?, ?, ?)', 
        [title, content, category, date], (err) => {
        if (err) return res.status(500).send('Database error');
        res.json({ success: true });
    });
});

// Admin: Upload photos
app.post('/api/photos', checkAdmin, upload.array('photos', 10), (req, res) => {
    const files = req.files;
    files.forEach(file => {
        db.run('INSERT INTO photos (filename) VALUES (?)', [file.filename], (err) => {
            if (err) console.error(err);
        });
    });
    res.json({ success: true });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
