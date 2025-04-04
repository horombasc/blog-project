async function fetchPosts() {
  try {
    const response = await fetch('/api/posts');
    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.statusText}`);
    }
    const posts = await response.json();
    displayPosts(posts);
  } catch (err) {
    console.error('Error fetching posts:', err);
    document.getElementById('posts-container').innerHTML = '<p>Error loading posts. Please try again later.</p>';
  }
}

function displayPosts(posts) {
  const container = document.getElementById('posts-container');
  if (!container) {
    console.error('Posts container not found');
    return;
  }
  if (!posts || posts.length === 0) {
    container.innerHTML = '<p>No posts available.</p>';
    return;
  }
  container.innerHTML = posts.map(post => `
    <div class="post">
      <h2>${post.title}</h2>
      <p>${post.content}</p>
      <p><em>Posted by ${post.author} on ${new Date(post.createdAt).toLocaleDateString()}</em></p>
    </div>
  `).join('');
}

// Fetch posts when the page loads
document.addEventListener('DOMContentLoaded', fetchPosts);