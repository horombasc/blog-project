// Load and display blog posts on index.html
async function loadBlogPosts() {
    const blogPosts = document.getElementById('blog-posts');
    if (!blogPosts) return;
  
    try {
      const response = await fetch('/api/posts?type=Blog');
      const posts = await response.json();
      blogPosts.innerHTML = `
        <h2>My Thoughts</h2>
        ${posts.map(post => `
          <article class="post">
            <img src="${post.image || 'https://via.placeholder.com/300x200'}" alt="${post.title}" class="featured-image">
            <h2>${post.title}</h2>
            <div class="post-meta">
              <p>By ${post.author} | ${new Date(post.createdAt).toLocaleDateString()}</p>
              <div class="categories">${post.categories.map(cat => `<a href="#" class="category">${cat}</a>`).join('')}</div>
            </div>
            <p>${post.content.substring(0, 100)}...</p>
            <div class="post-actions">
              <a href="/post?id=${post.id}" class="read-more">Read More</a>
              <div class="interaction-buttons">
                <button class="like-btn" data-id="${post.id}"><i class="fas fa-heart"></i> <span class="like-count">${post.likes || 0}</span></button>
                <button class="comment-btn" data-id="${post.id}"><i class="fas fa-comment"></i> <span class="comment-count">${post.comments ? post.comments.length : 0}</span></button>
                <button class="share-btn"><i class="fas fa-share"></i></button>
              </div>
            </div>
          </article>
        `).join('') || '<p>No blog posts yet.</p>'}
      `;
    } catch (err) {
      console.error('Error fetching blog posts:', err);
      blogPosts.innerHTML = '<p>Error loading posts.</p>';
    }
  }
  
  // Load and display latest news cards on index.html
  async function loadLatestNews() {
    const newsCards = document.getElementById('latest-news-cards');
    if (!newsCards) return;
  
    try {
      const response = await fetch('/api/posts?type=News');
      const posts = await response.json();
      const newsPosts = posts.slice(0, 3);
      newsCards.innerHTML = newsPosts.map(post => `
        <a href="/post?id=${post.id}" class="news-card">
          <img src="${post.image || 'https://via.placeholder.com/300x150'}" alt="${post.title}">
          <h3>${post.title}</h3>
          <p>${post.content.substring(0, 50)}...</p>
        </a>
      `).join('') || '<p>No news posts yet.</p>';
    } catch (err) {
      console.error('Error fetching news posts:', err);
      newsCards.innerHTML = '<p>Error loading news.</p>';
    }
  }
  
  // Load and display news posts on news.html
  async function loadNewsPosts() {
    const newsGrid = document.getElementById('news-grid');
    if (!newsGrid) return;
  
    try {
      const response = await fetch('/api/posts?type=News');
      const posts = await response.json();
      newsGrid.innerHTML = posts.map(post => `
        <article class="news-item">
          <img src="${post.image || 'https://via.placeholder.com/300x150'}" alt="${post.title}" class="featured-image">
          <h3>${post.title}</h3>
          <p class="date">Published: ${new Date(post.createdAt).toLocaleDateString()} | By ${post.author}</p>
          <p>${post.content.substring(0, 150)}...</p>
          <div class="tags">${post.categories.map(cat => `<span class="tag">${cat}</span>`).join('')}</div>
          <div class="news-actions">
            <a href="/post?id=${post.id}" class="read-more">Read More</a>
            <button class="like-btn" data-id="${post.id}"><i class="fas fa-heart"></i> <span class="like-count">${post.likes || 0}</span></button>
            <button class="comment-btn" data-id="${post.id}"><i class="fas fa-comment"></i> <span class="comment-count">${post.comments ? post.comments.length : 0}</span></button>
            <button class="share-btn"><i class="fas fa-share"></i></button>
          </div>
        </article>
      `).join('') || '<p>No community news yet.</p>';
    } catch (err) {
      console.error('Error fetching news posts:', err);
      newsGrid.innerHTML = '<p>Error loading news.</p>';
    }
  }
  
  // Load full post on post.html
  async function loadFullPost() {
    const fullPost = document.getElementById('full-post');
    if (!fullPost) return;
  
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
  
    try {
      const response = await fetch(`/api/posts/${postId}`);
      const post = await response.json();
      if (response.ok) {
        fullPost.innerHTML = `
          <h1>${post.title}</h1>
          <div class="post-meta">
            <p>By ${post.author} | ${new Date(post.createdAt).toLocaleDateString()}</p>
            <div class="categories">${post.categories.map(cat => `<a href="#" class="category">${cat}</a>`).join('')}</div>
          </div>
          <img src="${post.image || 'https://via.placeholder.com/600x400'}" alt="${post.title}">
          <p class="full-content">${post.content}</p>
          <div class="interaction-buttons">
            <button class="like-btn" data-id="${post.id}"><i class="fas fa-heart"></i> <span class="like-count">${post.likes || 0}</span></button>
            <button class="comment-btn" data-id="${post.id}"><i class="fas fa-comment"></i> <span class="comment-count">${post.comments ? post.comments.length : 0}</span></button>
            <button class="share-btn"><i class="fas fa-share"></i></button>
          </div>
          <div class="comments-section">
            <h3>Comments</h3>
            <ul>
              ${post.comments ? post.comments.map(comment => `
                <li>
                  <p>"${comment.content}" - ${comment.author} (${new Date(comment.createdAt).toLocaleDateString()})</p>
                </li>
              `).join('') : '<p>No comments yet.</p>'}
            </ul>
          </div>
        `;
      } else {
        fullPost.innerHTML = '<p>Post not found.</p>';
      }
    } catch (err) {
      console.error('Error fetching post:', err);
      fullPost.innerHTML = '<p>Error loading post.</p>';
    }
  }
  
  // Admin Post Form
  document.getElementById('post-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const postData = {
      title: document.getElementById('post-title').value,
      content: document.getElementById('post-content').value,
      image: document.getElementById('post-image').value,
      type: document.getElementById('post-type').value,
      categories: [document.getElementById('post-type').value, ...document.getElementById('post-categories').value.split(',').map(cat => cat.trim()).filter(Boolean)],
      tags: document.getElementById('post-tags').value.split(',').map(tag => tag.trim()).filter(Boolean),
      author: 'Jane Doe'
    };
  
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });
      const post = await response.json();
      if (response.ok) {
        alert(`Post "${post.title}" saved as ${post.type}!`);
        e.target.reset();
      } else {
        alert('Error saving post: ' + post.error);
      }
    } catch (err) {
      console.error('Error saving post:', err);
      alert('Error saving post.');
    }
  });
  
  // Admin Sidebar Navigation
  document.querySelectorAll('.admin-sidebar a')?.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
      });
      document.getElementById(targetId).classList.add('active');
      document.querySelectorAll('.admin-sidebar a').forEach(a => {
        a.classList.remove('active');
      });
      link.classList.add('active');
    });
  });
  
  // Page Management (Simulated)
  document.getElementById('add-page-btn')?.addEventListener('click', () => {
    const title = prompt('Enter new page title:');
    if (title) {
      const li = document.createElement('li');
      li.innerHTML = `${title} <button class="edit-btn">Edit</button> <button class="delete-btn">Delete</button>`;
      document.getElementById('page-list').appendChild(li);
    }
  });
  
  // Category Management (Simulated)
  document.getElementById('category-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const category = document.getElementById('new-category').value;
    if (category) {
      const li = document.createElement('li');
      li.innerHTML = `${category} <button class="delete-btn">Delete</button>`;
      document.getElementById('category-list').appendChild(li);
      e.target.reset();
    }
  });
  
  // Comment Management (Simulated)
  document.querySelectorAll('.approve-btn')?.forEach(btn => {
    btn.addEventListener('click', () => {
      alert('Comment approved! Feature coming soon.');
    });
  });
  
  // Media URL Management (Simulated)
  document.getElementById('add-media-btn')?.addEventListener('click', () => {
    const url = document.getElementById('media-url').value;
    if (url) {
      const li = document.createElement('li');
      li.innerHTML = `${url} <button class="delete-btn">Delete</button>`;
      document.getElementById('media-list').appendChild(li);
      document.getElementById('media-url').value = '';
    }
  });
  
  // User Management (Simulated)
  document.getElementById('add-user-btn')?.addEventListener('click', () => {
    const username = prompt('Enter new username:');
    if (username) {
      const li = document.createElement('li');
      li.innerHTML = `${username} (Author) <button class="edit-role-btn">Edit Role</button>`;
      document.getElementById('user-list').appendChild(li);
    }
  });
  
  // Theme Management (Simulated)
  document.getElementById('apply-theme-btn')?.addEventListener('click', () => {
    const theme = document.getElementById('theme-select').value;
    alert(`Theme "${theme}" applied! Feature coming soon.`);
  });
  
  // Plugin Management (Simulated)
  document.getElementById('add-plugin-btn')?.addEventListener('click', () => {
    const plugin = prompt('Enter plugin name:');
    if (plugin) {
      const li = document.createElement('li');
      li.innerHTML = `${plugin} <button class="toggle-plugin-btn">Deactivate</button>`;
      document.getElementById('plugin-list').appendChild(li);
    }
  });
  
  // Settings Form (Simulated)
  document.getElementById('settings-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('blog-title').value;
    alert(`Settings saved! Blog title: ${title}. Feature coming soon.`);
  });
  
  // Logout (Simulated)
  document.getElementById('logout-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    alert('Logged out! Feature coming soon.');
    window.location.href = '/';
  });
  
  // Login Form (Simulated)
  document.getElementById('login-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    if (username === 'admin' && password === 'password123') {
      window.location.href = '/admin';
    } else {
      alert('Invalid username or password.');
    }
  });
  
  // Toggle 2FA (Simulated)
  document.getElementById('toggle-2fa')?.addEventListener('click', (e) => {
    e.preventDefault();
    const twoFactorSection = document.getElementById('two-factor-section');
    if (twoFactorSection.style.display === 'none') {
      twoFactorSection.style.display = 'block';
      e.target.textContent = 'Disable Two-Factor Authentication';
    } else {
      twoFactorSection.style.display = 'none';
      e.target.textContent = 'Enable Two-Factor Authentication';
    }
  });
  
  // Like Button
  document.addEventListener('click', async (e) => {
    if (e.target.closest('.like-btn')) {
      const button = e.target.closest('.like-btn');
      const postId = button.dataset.id;
      const countSpan = button.querySelector('.like-count');
      let count = parseInt(countSpan.textContent);
  
      try {
        const endpoint = button.classList.contains('liked') ? `/api/posts/${postId}/unlike` : `/api/posts/${postId}/like`;
        const response = await fetch(endpoint, { method: 'POST' });
        const post = await response.json();
        if (response.ok) {
          count = post.likes;
          countSpan.textContent = count;
          button.classList.toggle('liked');
        } else {
          alert('Error updating likes: ' + post.error);
        }
      } catch (err) {
        console.error('Error updating likes:', err);
        alert('Error updating likes.');
      }
    }
  });
  
  // Comment Button
  document.addEventListener('click', async (e) => {
    if (e.target.closest('.comment-btn')) {
      const button = e.target.closest('.comment-btn');
      const postId = button.dataset.id;
      const countSpan = button.querySelector('.comment-count');
      const comment = prompt('Enter your comment:');
      if (comment) {
        try {
          const response = await fetch(`/api/posts/${postId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: comment, author: 'User' })
          });
          const post = await response.json();
          if (response.ok) {
            countSpan.textContent = post.comments.length;
            if (window.location.pathname === '/post') loadFullPost();
          } else {
            alert('Error adding comment: ' + post.error);
          }
        } catch (err) {
          console.error('Error adding comment:', err);
          alert('Error adding comment.');
        }
      }
    }
  });
  
  // Share Button
  document.addEventListener('click', (e) => {
    if (e.target.closest('.share-btn')) {
      const button = e.target.closest('.share-btn');
      const title = button.closest('.post, .news-item, .full-post')?.querySelector('h1, h2, h3')?.textContent;
      if (navigator.share) {
        navigator.share({
          title: title,
          url: window.location.href
        }).catch(err => console.log('Share failed:', err));
      } else {
        alert(`Share "${title}" feature coming soon! URL: ${window.location.href}`);
      }
    }
  });
  
  // Search Bar (Blog Posts Only)
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const resetBtn = document.getElementById('reset-btn');
  const postsContainer = document.getElementById('blog-posts');
  
  async function performSearch() {
    const query = searchInput?.value.toLowerCase().trim();
    if (!postsContainer) return;
  
    try {
      const response = await fetch('/api/posts?type=Blog');
      const posts = await response.json();
      const blogPostsFiltered = posts.filter(post => post.title.toLowerCase().includes(query) || post.content.toLowerCase().includes(query));
      postsContainer.innerHTML = `
        <h2>My Thoughts</h2>
        ${blogPostsFiltered.map(post => `
          <article class="post">
            <img src="${post.image}" alt="${post.title}" class="featured-image">
            <h2>${post.title}</h2>
            <div class="post-meta">
              <p>By ${post.author} | ${new Date(post.createdAt).toLocaleDateString()}</p>
              <div class="categories">${post.categories.map(cat => `<a href="#" class="category">${cat}</a>`).join('')}</div>
            </div>
            <p>${post.content.substring(0, 100)}...</p>
            <div class="post-actions">
              <a href="/post?id=${post.id}" class="read-more">Read More</a>
              <div class="interaction-buttons">
                <button class="like-btn" data-id="${post.id}"><i class="fas fa-heart"></i> <span class="like-count">${post.likes || 0}</span></button>
                <button class="comment-btn" data-id="${post.id}"><i class="fas fa-comment"></i> <span class="comment-count">${post.comments ? post.comments.length : 0}</span></button>
                <button class="share-btn"><i class="fas fa-share"></i></button>
              </div>
            </div>
          </article>
        `).join('') || '<p>No blog posts found.</p>'}
      `;
    } catch (err) {
      console.error('Error searching posts:', err);
      postsContainer.innerHTML = '<p>Error searching posts.</p>';
    }
  }
  
  searchBtn?.addEventListener('click', performSearch);
  searchInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });
  resetBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    loadBlogPosts();
  });
  
  // Email Subscription (Simulated)
  document.getElementById('email-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[type="email"]').value;
    alert(`Subscribed with ${email}! Feature coming soon.`);
    e.target.reset();
  });
  
  // Contact Form (Simulated)
  document.getElementById('contact-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = e.target.querySelector('#name').value;
    const email = e.target.querySelector('#email').value;
    const message = e.target.querySelector('#message').value;
    alert(`Message from ${name} (${email}): ${message}\nFeature coming soon!`);
    e.target.reset();
  });
  
  // Load content on page load
  window.addEventListener('load', () => {
    loadBlogPosts();
    loadLatestNews();
    loadNewsPosts();
    loadFullPost();
  });