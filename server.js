const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory
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

// In-memory array of posts (replacing the database)
let posts = [
  {
    id: 1,
    title: 'Welcome to My Blog',
    content: 'This is my first blog post! I’m excited to share my thoughts and community updates with you.',
    image: null,
    type: 'Blog',
    categories: ['Welcome'],
    tags: ['intro'],
    createdAt: new Date().toISOString(),
    author: 'Jane Doe',
    likes: 0,
    comments: []
  },
  {
    id: 2,
    title: 'Community Festival Announced',
    content: 'Join us for the annual community festival on May 15th! There will be food, music, and fun activities for all ages.',
    image: null,
    type: 'News',
    categories: ['Events'],
    tags: ['festival'],
    createdAt: new Date().toISOString(),
    author: 'Jane Doe',
    likes: 0,
    comments: []
  }
];

// Serve frontend files from the root directory
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
app.get('/api/posts', (req, res) => {
  const { type } = req.query;
  let filteredPosts = posts;
  if (type) {
    filteredPosts = posts.filter(post => post.type === type);
  }
  console.log('Fetched posts:', filteredPosts);
  res.json(filteredPosts);
});

app.get('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  const post = posts.find(p => p.id === parseInt(id));
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  res.json(post);
});

app.post('/api/posts', upload.single('image'), (req, res) => {
  try {
    const { title, content, type, categories, tags, author } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    const categoriesArray = typeof categories === 'string' ? categories.split(',').map(item => item.trim()) : (Array.isArray(categories) ? categories : []);
    const tagsArray = typeof tags === 'string' ? tags.split(',').map(item => item.trim()) : (Array.isArray(tags) ? tags : []);

    const newPost = {
      id: posts.length ? Math.max(...posts.map(p => p.id)) + 1 : 1,
      title,
      content,
      image,
      type,
      categories: categoriesArray,
      tags: tagsArray,
      createdAt: new Date().toISOString(),
      author: author || 'Jane Doe',
      likes: 0,
      comments: []
    };
    posts.push(newPost);
    res.status(201).json(newPost);
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: 'Failed to upload image. Please try again.' });
  }
});

app.put('/api/posts/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, type, categories, tags, author } = req.body;
    
    const postIndex = posts.findIndex(p => p.id === parseInt(id));
    if (postIndex === -1) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const oldImage = posts[postIndex].image;
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

    posts[postIndex] = {
      ...posts[postIndex],
      title,
      content,
      image,
      type,
      categories: categoriesArray,
      tags: tagsArray,
      author: author || 'Jane Doe'
    };
    res.json(posts[postIndex]);
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: 'Failed to upload image. Please try again.' });
  }
});

app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const postIndex = posts.findIndex(p => p.id === parseInt(id));
    if (postIndex === -1) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const image = posts[postIndex].image;
    if (image && image.startsWith('/uploads/')) {
      const imagePath = path.join('/uploads', path.basename(image));
      try {
        await fs.unlink(imagePath);
      } catch (err) {
        console.error('Error deleting image:', err);
      }
    }

    posts.splice(postIndex, 1);
    res.json({ message: 'Post deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/posts/:id/like', (req, res) => {
  const { id } = req.params;
  const post = posts.find(p => p.id === parseInt(id));
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  post.likes = (post.likes || 0) + 1;
  res.json({ id, likes: post.likes });
});

app.post('/api/posts/:id/unlike', (req, res) => {
  const { id } = req.params;
  const post = posts.find(p => p.id === parseInt(id));
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  post.likes = Math.max((post.likes || 0) - 1, 0);
  res.json({ id, likes: post.likes });
});

app.post('/api/posts/:id/comment', (req, res) => {
  const { id } = req.params;
  const { content, author } = req.body;
  const post = posts.find(p => p.id === parseInt(id));
  if (!post) {
    res.status(404).json({ error: 'Post not found' });
    return;
  }
  post.comments.push({ content, author, createdAt: new Date().toISOString() });
  res.json({ id, comments: post.comments });
});

app.get('*', (req, res) => {
  console.log(`Requested path: ${req.path}`);
  res.status(404).send(`Cannot GET ${req.path}`);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
