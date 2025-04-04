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

// Check if the posts table exists and migrate if necessary
db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'", (err, row) => {
  if (err) {
    console.error('Error checking for posts table:', err);
    return;
  }

  if (row) {
    // Check if the image column exists
    db.all("PRAGMA table_info(posts)", (err, columns) => {
      if (err) {
        console.error('Error checking table schema:', err);
        return;
      }

      const hasImageColumn = Array.isArray(columns) && columns.some(col => col.name === 'image');
      if (!hasImageColumn) {
        console.log('Migrating posts table to add image column...');
        // Step 1: Create a new table with the image column
        db.run(`
          CREATE TABLE posts_new (
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
        `, (err) => {
          if (err) {
            console.error('Error creating posts_new table:', err);
            return;
          }

          // Step 2: Copy data from the old table to the new table (image will be NULL for existing rows)
          db.run(`
            INSERT INTO posts_new (id, title, content, type, categories, tags, createdAt, author, likes, comments)
            SELECT id, title, content, type, categories, tags, createdAt, author, likes, comments
            FROM posts
          `, (err) => {
            if (err) {
              console.error('Error copying data to posts_new:', err);
              return;
            }

            // Step 3: Drop the old table
            db.run(`DROP TABLE posts`, (err) => {
              if (err) {
                console.error('Error dropping old posts table:', err);
                return;
              }

              // Step 4: Rename the new table to posts
              db.run(`ALTER TABLE posts_new RENAME TO posts`, (err) => {
                if (err) {
                  console.error('Error renaming posts_new to posts:', err);
                  return;
                }
                console.log('Successfully migrated posts table with image column');
              });
            });
          });
        });
      } else {
        console.log('Image column already exists in posts table');
      }
    });
  } else {
    // If the posts table doesn't exist, create it with the correct schema
    db.run(`
      CREATE TABLE posts (
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
    `, (err) => {
      if (err) {
        console.error('Error creating posts table:', err);
        return;
      }
      console.log('Created posts table');
    });
  }
});

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
app.get('/news.html', (req, res) => res.redirect('/news'));
app.get('/post', (req, res) => res.sendFile(path.join(__dirname, 'post.html')));
app.get('/post.html', (req, res) => res.redirect('/post'));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'about.html')));
app.get('/about.html', (req, res) => res.redirect('/about'));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'contact.html')));
app.get('/contact.html', (req, res) => res.redirect('/contact'));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin.html', (req, res) => res.redirect('/admin'));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/login.html', (req, res) => res.redirect('/login'));

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
      try {
        row.categories = row.categories ? JSON.parse(row.categories) : [];
      } catch (e) {
        row.categories = row.categories ? [row.categories] : [];
      }
      try {
        row.tags = row.tags ? JSON.parse(row.tags) : [];
      } catch (e) {
        row.tags = row.tags ? [row.tags] : [];
      }
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
    try {
      row.categories = row.categories ? JSON.parse(row.categories) : [];
    } catch (e) {
      row.categories = row.categories ? [row.categories] : [];
    }
    try {
      row.tags = row.tags ? JSON.parse(row.tags) : [];
    } catch (e) {
      row.tags = row.tags ? [row.tags] : [];
    }
    row.comments = row.comments ? JSON.parse(row.comments) : [];
    res.json(row);
  });
});

// Create a post
app.post('/api/posts', (req, res) => {
  const { title, content, image, type, categories, tags, author } = req.body;

  // Convert categories and tags to arrays if they’re strings
  const categoriesArray = typeof categories === 'string' ? categories.split(',').map(item => item.trim()) : (Array.isArray(categories) ? categories : []);
  const tagsArray = typeof tags === 'string' ? tags.split(',').map(item => item.trim()) : (Array.isArray(tags) ? tags : []);

  const query = `
    INSERT INTO posts (title, content, image, type, categories, tags, author)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    title,
    content,
    image || null,
    type,
    JSON.stringify(categoriesArray),
    JSON.stringify(tagsArray),
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

  // Convert categories and tags to arrays if they’re strings
  const categoriesArray = typeof categories === 'string' ? categories.split(',').map(item => item.trim()) : (Array.isArray(categories) ? categories : []);
  const tagsArray = typeof tags === 'string' ? tags.split(',').map(item => item.trim()) : (Array.isArray(tags) ? tags : []);

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
    JSON.stringify(categoriesArray),
    JSON.stringify(tagsArray),
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
    res.json({ id, title, content, image, type, categories: categoriesArray, tags: tagsArray, author });
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