const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// SQLite Database Setup
const db = new sqlite3.Database('database.sqlite', (err) => {
  if (err) {
    console.error('Error connecting to SQLite:', err);
    return;
  }
  console.log('Connected to SQLite database');
});

// Create posts table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    type TEXT NOT NULL,
    categories TEXT,
    tags TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    author TEXT DEFAULT 'Jane Doe',
    likes INTEGER DEFAULT 0,
    comments TEXT DEFAULT '[]'
  )
`);

// Seed initial data if the database is empty
db.get('SELECT COUNT(*) as count FROM posts', (err, row) => {
  if (err) {
    console.error('Error checking posts:', err);
    return;
  }
  if (row.count === 0) {
    const initialPosts = [
      {
        title: 'Welcome to My Blog',
        content: 'This is my first blog post! I’m excited to share my thoughts and community updates with you.',
        image: 'https://via.placeholder.com/300x200',
        type: 'Blog',
        categories: JSON.stringify(['Welcome']),
        tags: JSON.stringify(['intro']),
        author: 'Jane Doe'
      },
      {
        title: 'Community Festival Announced',
        content: 'Join us for the annual community festival on May 15th! There will be food, music, and fun activities for all ages.',
        image: 'https://via.placeholder.com/300x150',
        type: 'News',
        categories: JSON.stringify(['Events']),
        tags: JSON.stringify(['festival']),
        author: 'Jane Doe'
      }
    ];
    const query = `
      INSERT INTO posts (title, content, image, type, categories, tags, author)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    initialPosts.forEach(post => {
      db.run(query, [
        post.title,
        post.content,
        post.image,
        post.type,
        post.categories,
        post.tags,
        post.author
      ], (err) => {
        if (err) console.error('Error seeding post:', err);
      });
    });
    console.log('Seeded initial posts');
  }
});

// Serve frontend files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/news', (req, res) => res.sendFile(path.join(__dirname, 'news.html')));
app.get('/news.html', (req, res) => res.redirect('/news')); // Added redirect
app.get('/post', (req, res) => res.sendFile(path.join(__dirname, 'post.html')));
app.get('/post.html', (req, res) => res.redirect('/post')); // Added redirect
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/about.html', (req, res) => res.redirect('/about')); // Added redirect
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'contact.html')));
app.get('/contact.html', (req, res) => res.redirect('/contact')); // Added redirect
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin.html', (req, res) => res.redirect('/admin')); // Added redirect
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/login.html', (req, res) => res.redirect('/login')); // Added redirect

// API Routes
// Get all posts
app.get('/api/posts', (req, res) => {
  const { type } = req.query;
  const query = type ? 'SELECT * FROM posts WHERE type = ?' : 'SELECT * FROM posts';
  const params = type ? [type] : [];
  db.all(query, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    rows.forEach(row => {
      row.categories = row.categories ? JSON.parse(row.categories) : [];
      row.tags = row.tags ? JSON.parse(row.tags) : [];
      row.comments = row.comments ? JSON.parse(row.comments) : [];
    });
    res.json(rows);
  });
});

// Get a single post by ID
app.get('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM posts WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    row.categories = row.categories ? JSON.parse(row.categories) : [];
    row.tags = row.tags ? JSON.parse(row.tags) : [];
    row.comments = row.comments ? JSON.parse(row.comments) : [];
    res.json(row);
  });
});

// Create a post
app.post('/api/posts', (req, res) => {
  const { title, content, image, type, categories, tags, author } = req.body;
  const query = `
    INSERT INTO posts (title, content, image, type, categories, tags, author)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    title,
    content,
    image || null,
    type,
    JSON.stringify(categories ? JSON.parse(categories) : []),
    JSON.stringify(tags ? JSON.parse(tags) : []),
    author || 'Jane Doe'
  ];
  db.run(query, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json({ id: this.lastID, ...req.body, image, createdAt: new Date().toISOString() });
  });
});

// Update a post
app.put('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const { title, content, image, type, categories, tags, author } = req.body;
  const query = `
    UPDATE posts
    SET title = ?, content = ?, image = ?, type = ?, categories = ?, tags = ?, author = ?
    WHERE id = ?
  `;
  const params = [
    title,
    content,
    image,
    type,
    JSON.stringify(categories ? JSON.parse(categories) : []),
    JSON.stringify(tags ? JSON.parse(tags) : []),
    author || 'Jane Doe',
    id
  ];
  db.run(query, params, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json({ id, title, content, image, type, categories, tags, author });
  });
});

// Delete a post
app.delete('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM posts WHERE id = ?', [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json({ message: 'Post deleted' });
  });
});

// Like a post
app.post('/api/posts/:id/like', (req, res) => {
  const { id } = req.params;
  db.get('SELECT likes FROM posts WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    const newLikes = (row.likes || 0) + 1;
    db.run('UPDATE posts SET likes = ? WHERE id = ?', [newLikes, id], function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, likes: newLikes });
    });
  });
});

// Unlike a post
app.post('/api/posts/:id/unlike', (req, res) => {
  const { id } = req.params;
  db.get('SELECT likes FROM posts WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    const newLikes = Math.max((row.likes || 0) - 1, 0);
    db.run('UPDATE posts SET likes = ? WHERE id = ?', [newLikes, id], function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, likes: newLikes });
    });
  });
});

// Add a comment
app.post('/api/posts/:id/comment', (req, res) => {
  const { id } = req.params;
  const { content, author } = req.body;
  db.get('SELECT comments FROM posts WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    const comments = row.comments ? JSON.parse(row.comments) : [];
    comments.push({ content, author, createdAt: new Date().toISOString() });
    db.run('UPDATE posts SET comments = ? WHERE id = ?', [JSON.stringify(comments), id], function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id, comments });
    });
  });
});

// Catch-all route for debugging
app.get('*', (req, res) => {
  console.log(`Requested path: ${req.path}`);
  res.status(404).send(`Cannot GET ${req.path}`);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});