const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs'); // Added for directory creation
const app = express();

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Ensure database directory exists (for Render persistent disk)
const dbDir = '/opt/render/project/src/database';
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('Created database directory:', dbDir);
}

// Database setup
const dbPath = path.join(dbDir, 'database.sqlite');
console.log('Database path:', dbPath); // Debug
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

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
        date TEXT,
        approved INTEGER DEFAULT 0
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT,
        message TEXT,
        date TEXT
    )`);
    db.run(`ALTER TABLE comments ADD COLUMN approved INTEGER DEFAULT 0`, (err) => {
        if (err && err.message.includes('duplicate column')) console.log('Approved column exists');
    });
});

// File upload setup
const storage = multer.diskStorage({
    destination: './public/images/',
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Admin password
const adminPassword = 'admin123';

// Email setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendEmail(subject, text) {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_TO,
        subject: subject,
        text: text
    };
    try {
        await transporter.sendMail(mailOptions);
        console.log('Email sent:', subject);
    } catch (error) {
        console.error('Email error:', error);
    }
}

// Middleware to check admin access
function checkAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    console.log('Checking auth - Header:', authHeader);
    if (authHeader === adminPassword) {
        console.log('Auth successful');
        next();
    } else {
        console.error('Auth failed - Header:', authHeader);
        res.status(401).send('Unauthorized');
    }
}

// Public Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'views', 'admin.html')));

app.get('/api/posts', (req, res) => {
    db.all('SELECT * FROM posts ORDER BY date DESC', (err, rows) => {
        if (err) return res.status(500).send('Database error');
        res.json(rows);
    });
});

app.get('/api/photos', (req, res) => {
    db.all('SELECT * FROM photos', (err, rows) => {
        if (err) return res.status(500).send('Database error');
        res.json(rows);
    });
});

app.get('/api/comments', (req, res) => {
    db.all('SELECT * FROM comments WHERE approved = 1 ORDER BY date DESC', (err, rows) => {
        if (err) return res.status(500).send('Database error');
        res.json(rows);
    });
});

app.post('/api/comments', (req, res) => {
    const { content } = req.body;
    const date = new Date().toISOString();
    db.run('INSERT INTO comments (content, date) VALUES (?, ?)', [content, date], (err) => {
        if (err) return res.status(500).send('Database error');
        sendEmail('New Comment', `Content: ${content}\nDate: ${date}`);
        res.json({ success: true });
    });
});

app.post('/api/subscribe', (req, res) => {
    const { email } = req.body;
    db.run('INSERT OR IGNORE INTO subscriptions (email) VALUES (?)', [email], (err) => {
        if (err) return res.status(500).send('Database error');
        res.json({ success: true });
    });
});

app.post('/api/contact', (req, res) => {
    const { name, email, message } = req.body;
    const date = new Date().toISOString();
    db.run('INSERT INTO contacts (name, email, message, date) VALUES (?, ?, ?, ?)', 
        [name, email, message, date], (err) => {
        if (err) return res.status(500).send('Database error');
        sendEmail('New Contact', `Name: ${name}\nEmail: ${email}\nMessage: ${message}\nDate: ${date}`);
        res.json({ success: true });
    });
});

// Admin Routes
app.post('/api/posts', checkAdmin, (req, res) => {
    const { title, content, category } = req.body;
    const date = new Date().toISOString();
    db.run('INSERT INTO posts (title, content, category, date) VALUES (?, ?, ?, ?)', 
        [title, content, category, date], (err) => {
        if (err) return res.status(500).send('Database error');
        res.json({ success: true });
    });
});

app.delete('/api/posts/:id', checkAdmin, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM posts WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).send('Database error');
        res.json({ success: true });
    });
});

app.post('/api/photos', checkAdmin, upload.array('photos', 10), (req, res) => {
    const files = req.files;
    files.forEach(file => {
        db.run('INSERT INTO photos (filename) VALUES (?)', [file.filename]);
    });
    res.json({ success: true });
});

app.delete('/api/photos/:id', checkAdmin, (req, res) => {
    const { id } = req.params;
    db.get('SELECT filename FROM photos WHERE id = ?', [id], (err, row) => {
        if (err || !row) return res.status(500).send('Database error');
        fs.unlink(path.join(__dirname, 'public', 'images', row.filename), (err) => {
            if (err) console.error('Error deleting photo file:', err.message);
            db.run('DELETE FROM photos WHERE id = ?', [id], (err) => {
                if (err) return res.status(500).send('Database error');
                res.json({ success: true });
            });
        });
    });
});

app.get('/api/comments/pending', checkAdmin, (req, res) => {
    db.all('SELECT * FROM comments WHERE approved = 0 ORDER BY date DESC', (err, rows) => {
        if (err) return res.status(500).send('Database error');
        res.json(rows);
    });
});

app.post('/api/comments/approve/:id', checkAdmin, (req, res) => {
    const { id } = req.params;
    db.run('UPDATE comments SET approved = 1 WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).send('Database error');
        res.json({ success: true });
    });
});

app.delete('/api/comments/:id', checkAdmin, (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM comments WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).send('Database error');
        res.json({ success: true });
    });
});

app.get('/api/contacts', checkAdmin, (req, res) => {
    db.all('SELECT * FROM contacts ORDER BY date DESC', (err, rows) => {
        if (err) return res.status(500).send('Database error');
        res.json(rows);
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});