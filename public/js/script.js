window.onload = async () => {
    const photoRes = await fetch('/api/photos');
    const photos = await photoRes.json();
    const gallery = document.getElementById('photoGallery');
    photos.forEach(photo => {
        const img = document.createElement('img');
        img.src = `/images/${photo.filename}`;
        gallery.appendChild(img);
    });

    const postRes = await fetch('/api/posts');
    const posts = await postRes.json();
    const postList = document.getElementById('postList');
    const newsList = document.getElementById('newsList');
    posts.forEach(post => {
        const html = `<h3>${post.title}</h3><div>${post.content}</div><small>${formatDate(post.date)}</small>`;
        if (post.category === 'blog') postList.innerHTML += html;
        else if (post.category === 'news') newsList.innerHTML += html;
    });

    const commentRes = await fetch('/api/comments');
    const comments = await commentRes.json();
    document.getElementById('commentList').innerHTML = comments.length > 0 
        ? comments.map(c => `<p>${c.content} <small>${formatDate(c.date)}</small></p>`).join('')
        : '<p>No approved comments yet.</p>';
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
            alert('Comment submitted for approval!');
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

document.getElementById('contactForm').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);
    const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    if (res.ok) {
        document.getElementById('contactMessage').textContent = 'Message sent! Thank you!';
        e.target.reset();
    } else {
        document.getElementById('contactMessage').textContent = 'Failed to send message.';
    }
};

function formatDate(isoString) {
    const date = new Date(isoString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}