const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static('public'));
app.use('/uploads', express.static('/uploads'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Set up Multer for file uploads
const uploadDir = '/uploads';
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed!'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// SQLite Database Setup with Fallback
const dbDir = '/db';
const dbPath = path.join(dbDir, 'database.sqlite');
let db;

// Promisify SQLite methods for better control
const dbRun = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbGet = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Initialize the database with proper sequencing
const initializeDatabase = async () => {
  // Step 1: Set up the database connection
  try {
    await fs.access(dbDir, fs.constants.W_OK);
    console.log(`Directory ${dbDir} is writable`);
    
    db = await new Promise((resolve, reject) => {
      const database = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('Error connecting to SQLite at', dbPath, ':', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database at:', dbPath);
          resolve(database);
        }
      });
    });
  } catch (err) {
    console.error('Cannot access or write to', dbDir, ':', err);
    console.warn('Falling back to in-memory SQLite database (data will not persist)');
    db = await new Promise((resolve, reject) => {
      const database = new sqlite3.Database(':memory:', (err) => {
        if (err) {
          console.error('Error creating in-memory SQLite database:', err);
          reject(err);
        } else {
          console.log('Connected to in-memory SQLite database');
          resolve(database);
        }
      });
    });
  }

  // Step 2: Create or migrate the posts table
  const tableExists = await dbGet(db, "SELECT name FROM sqlite_master WHERE type='table' AND name='posts'");
  if (!tableExists) {
    console.log('Creating posts table...');
    await dbRun(db, `
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
    `);
    console.log('Created posts table');
  } else {
    console.log('Posts table exists, checking schema...');
    const columns = await dbAll(db, "PRAGMA table_info(posts)");
    const hasImageColumn = columns.some(col => col.name === 'image');
    const hasTypeColumn = columns.some(col => col.name === 'type');

    if (!hasImageColumn || !hasTypeColumn) {
      console.log('Migrating posts table to add missing columns (image and/or type)...');
      await dbRun(db, `
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
      `);

      const existingColumns = columns.map(col => col.name);
      const targetColumns = ['id', 'title', 'content', 'type', 'categories', 'tags', 'createdAt', 'author', 'likes', 'comments'];
      const selectColumns = targetColumns.map(col => {
        if (existingColumns.includes(col)) {
          return col;
        } else if (col === 'type') {
          return "'Blog' AS type";
        } else if (col === 'image') {
          return "NULL AS image";
        } else {
          return `'' AS ${col}`;
        }
      });

      const insertQuery = `
        INSERT INTO posts_new (${targetColumns.join(', ')})
        SELECT ${selectColumns.join(', ')}
        FROM posts
      `;
      await dbRun(db, insertQuery);
      await dbRun(db, `DROP TABLE posts`);
      await dbRun(db, `ALTER TABLE posts_new RENAME TO posts`);
      console.log('Successfully migrated posts table with missing columns');
    } else {
      console.log('All required columns (image, type) already exist in posts table');
    }
  }

  // Step 3: Seed initial data if the database is empty
  const { count } = await dbGet(db, 'SELECT COUNT(*) as count FROM posts') || { count: 0 };
  if (count === 0) {
    console.log('Seeding initial posts...');
    const initialPosts = [
      {
        title: 'Welcome to My Blog',
        content: 'This is my first blog post! I’m excited to share my thoughts and community updates with you.',
        image: null,
        type: 'Blog',
        categories: JSON.stringify(['Welcome']),
        tags: JSON.stringify(['intro']),
        author: 'Jane Doe'
      },
      {
        title: 'Community Festival Announced',
        content: 'Join us for the annual community festival on May 15th! There will be food, music, and fun activities for all ages.',
        image: null,
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
    for (const post of initialPosts) {
      await dbRun(db, query, [
        post.title,
        post.content,
        post.image,
        post.type,
        post.categories,
        post.tags,
        post.author
      ]);
    }
    console.log('Seeded initial posts');
  } else {
    console.log('Database already contains posts, skipping seeding');
  }
};

// Start the server only after the database is initialized
initializeDatabase()
  .then(() => {
    console.log('Database initialization complete');

    // Serve frontend files
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
    app.get('/index.html', (req, res) => res.redirect('/'));
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
    app.get('/api/posts', async (req, res) => {
      try {
        const { type } = req.query;
        const query = type ? 'SELECT * FROM posts WHERE type = ?' : 'SELECT * FROM posts';
        const params = type ? [type] : [];
        const rows = await dbAll(db, query, params);
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
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get('/api/posts/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const row = await dbGet(db, 'SELECT * FROM posts WHERE id = ?', [id]);
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
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/posts', upload.single('image'), async (req, res) => {
      try {
        const { title, content, type, categories, tags, author } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;

        const categoriesArray = typeof categories === 'string' ? categories.split(',').map(item => item.trim()) : (Array.isArray(categories) ? categories : []);
        const tagsArray = typeof tags === 'string' ? tags.split(',').map(item => item.trim()) : (Array.isArray(tags) ? tags : []);

        const query = `
          INSERT INTO posts (title, content, image, type, categories, tags, author)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
          title,
          content,
          image,
          type,
          JSON.stringify(categoriesArray),
          JSON.stringify(tagsArray),
          author || 'Jane Doe'
        ];
        const result = await dbRun(db, query, params);
        res.status(201).json({ id: result.lastID, title, content, image, type, categories: categoriesArray, tags: tagsArray, author, createdAt: new Date().toISOString() });
      } catch (err) {
        console.error('Error uploading file:', err);
        res.status(500).json({ error: 'Failed to upload image. Please try again.' });
      }
    });

    app.put('/api/posts/:id', upload.single('image'), async (req, res) => {
      try {
        const { id } = req.params;
        const { title, content, type, categories, tags, author } = req.body;
        
        const row = await dbGet(db, 'SELECT image FROM posts WHERE id = ?', [id]);
        if (!row) {
          res.status(404).json({ error: 'Post not found' });
          return;
        }

        const oldImage = row.image;
        const image = req.file ? `/uploads/${req.file.filename}` : oldImage;

        if (req.file && oldImage && oldImage.startsWith('/uploads/')) {
          const oldImagePath = path.join('/uploads', path.basename(oldImage));
          try {
            await fs.unlink(oldImagePath);
          } catch (err) {
            console.error('Error deleting old image:', err);
          }
        }

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
        const result = await dbRun(db, query, params);
        if (result.changes === 0) {
          res.status(404).json({ error: 'Post not found' });
          return;
        }
        res.json({ id, title, content, image, type, categories: categoriesArray, tags: tagsArray, author });
      } catch (err) {
        console.error('Error uploading file:', err);
        res.status(500).json({ error: 'Failed to upload image. Please try again.' });
      }
    });

    app.delete('/api/posts/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const row = await dbGet(db, 'SELECT image FROM posts WHERE id = ?', [id]);
        if (!row) {
          res.status(404).json({ error: 'Post not found' });
          return;
        }

        const image = row.image;
        if (image && image.startsWith('/uploads/')) {
          const imagePath = path.join('/uploads', path.basename(image));
          try {
            await fs.unlink(imagePath);
          } catch (err) {
            console.error('Error deleting image:', err);
          }
        }

        const result = await dbRun(db, 'DELETE FROM posts WHERE id = ?', [id]);
        if (result.changes === 0) {
          res.status(404).json({ error: 'Post not found' });
          return;
        }
        res.json({ message: 'Post deleted' });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/posts/:id/like', async (req, res) => {
      try {
        const { id } = req.params;
        const row = await dbGet(db, 'SELECT likes FROM posts WHERE id = ?', [id]);
        if (!row) {
          res.status(404).json({ error: 'Post not found' });
          return;
        }
        const newLikes = (row.likes || 0) + 1;
        await dbRun(db, 'UPDATE posts SET likes = ? WHERE id = ?', [newLikes, id]);
        res.json({ id, likes: newLikes });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/posts/:id/unlike', async (req, res) => {
      try {
        const { id } = req.params;
        const row = await dbGet(db, 'SELECT likes FROM posts WHERE id = ?', [id]);
        if (!row) {
          res.status(404).json({ error: 'Post not found' });
          return;
        }
        const newLikes = Math.max((row.likes || 0) - 1, 0);
        await dbRun(db, 'UPDATE posts SET likes = ? WHERE id = ?', [newLikes, id]);
        res.json({ id, likes: newLikes });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.post('/api/posts/:id/comment', async (req, res) => {
      try {
        const { id } = req.params;
        const { content, author } = req.body;
        const row = await dbGet(db, 'SELECT comments FROM posts WHERE id = ?', [id]);
        if (!row) {
          res.status(404).json({ error: 'Post not found' });
          return;
        }
        const comments = row.comments ? JSON.parse(row.comments) : [];
        comments.push({ content, author, createdAt: new Date().toISOString() });
        await dbRun(db, 'UPDATE posts SET comments = ? WHERE id = ?', [JSON.stringify(comments), id]);
        res.json({ id, comments });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    app.get('/download-db', (req, res) => {
      res.download('/db/database.sqlite', 'database.sqlite', (err) => {
        if (err) {
          console.error('Error downloading database:', err);
          res.status(500).send('Error downloading database');
        }
      });
    });

    app.get('*', (req, res) => {
      console.log(`Requested path: ${req.path}`);
      res.status(404).send(`Cannot GET ${req.path}`);
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
