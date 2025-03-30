window.onload = async () => {
    // Load photos
    const photoRes = await fetch('/api/photos');
    const photos = await photoRes.json();
    const gallery = document.getElementById('photoGallery');
    photos.forEach(photo => {
        const img = document.createElement('img');
        img.src = `/images/${photo.filename}`;
        gallery.appendChild(img);
    });

    // Load posts
    const postRes = await fetch('/api/posts');
    const posts = await postRes.json();
    const postList = document.getElementById('postList');
    const newsList = document.getElementById('newsList');
    posts.forEach(post => {
        const html = `<h3>${post.title}</h3><p>${post.content}</p><small>${post.date}</small>`;
        if (post.category === 'blog') postList.innerHTML += html;
        else if (post.category === 'news') newsList.innerHTML += html;
    });

    // Load comments
    const commentRes = await fetch('/api/comments');
    const comments = await commentRes.json();
    const commentList = document.getElementById('commentList');
    commentList.innerHTML = comments.map(c => `<p>${c.content} <small>${c.date}</small></p>`).join('');
};

async function addComment() {
    const content = document.getElementById('commentInput').value;
    if (content) {
        const res = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        if (res.ok) {
            document.getElementById('commentInput').value = '';
            window.location.reload(); // Refresh to show new comment
        }
    }
}

async function subscribe() {
    const email = document.getElementById('emailInput').value;
    if (email) {
        const res = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (res.ok) {
            document.getElementById('subscriptionMessage').textContent = `Thank you, ${email}, for subscribing!`;
            document.getElementById('emailInput').value = '';
        }
    }
}