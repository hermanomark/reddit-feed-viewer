document.addEventListener('DOMContentLoaded', () => {
  const postContainer = document.getElementById('post-container');
  const commentsContainer = document.getElementById('comments');
  const loadingElement = document.getElementById('loading');
  const errorElement = document.getElementById('error');
  const categoriesContainer = document.getElementById('categories');
  
  // Available data sources
  const dataSources = {
    corsProxy: {
      name: 'CORS Proxy',
      fetchUrl: (permalink) => `https://corsproxy.io/?https://www.reddit.com${permalink}.json`
    },
    teddit: {
      name: 'Teddit',
      fetchUrl: (permalink) => `https://teddit.net${permalink}.json`
    },
    libreddit: {
      name: 'Libreddit',
      fetchUrl: (permalink) => `https://libredd.it${permalink}.json`
    }
  };
  
  // Get the data source from localStorage or default to corsProxy
  let currentDataSource = localStorage.getItem('redditDataSource') || 'corsProxy';
  
  // Add data source selector to the page
  function setupDataSourceSelector() {
    const dataSourceContainer = document.getElementById('data-source-container');
    const selectorDiv = document.createElement('div');
    selectorDiv.className = 'data-source-selector';
    selectorDiv.innerHTML = `
      <label for="data-source">Data Source:</label>
      <select id="data-source">
        ${Object.entries(dataSources).map(([key, source]) => 
          `<option value="${key}"${key === currentDataSource ? ' selected' : ''}>${source.name}</option>`
        ).join('')}
      </select>
    `;
    
    dataSourceContainer.appendChild(selectorDiv);
    
    // Add event listener for source selection
    document.getElementById('data-source').addEventListener('change', (e) => {
      currentDataSource = e.target.value;
      localStorage.setItem('redditDataSource', currentDataSource);
      loadPostDetails();
    });
  }
  
  // Set up categories
  function setupCategories() {
    if (!CATEGORIES || !Array.isArray(CATEGORIES)) {
      console.error('Categories data not found or invalid');
      return;
    }

    CATEGORIES.forEach((category, index) => {
      const categoryElement = document.createElement('div');
      categoryElement.className = 'category';
      categoryElement.textContent = category.theme;
      
      categoryElement.addEventListener('click', () => {
        // Redirect to index page with category parameter
        window.location.href = `index.html?category=${index}`;
      });
      
      categoriesContainer.appendChild(categoryElement);
    });
  }
  
  // Set up the data source selector and categories
  // setupDataSourceSelector();
  // setupCategories();
  
  // Parse URL parameters to get post details
  function getPostDetailsFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const permalink = urlParams.get('permalink');
    const subreddit = urlParams.get('subreddit');
    const postId = urlParams.get('id');
    
    return { permalink, subreddit, postId };
  }
  
  function loadPostDetails() {
    // Show loading indicator, hide containers and error
    loadingElement.classList.remove('hidden');
    postContainer.innerHTML = '';
    commentsContainer.innerHTML = '';
    errorElement.classList.add('hidden');
    errorElement.textContent = '';
    
    const { permalink } = getPostDetailsFromUrl();
    
    if (!permalink) {
      loadingElement.classList.add('hidden');
      errorElement.textContent = 'Error: No post selected. Please go back to the feed.';
      errorElement.classList.remove('hidden');
      return;
    }
    
    // Get the fetch URL based on current data source
    const fetchUrl = dataSources[currentDataSource].fetchUrl(permalink);
    
    fetch(fetchUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch post: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        loadingElement.classList.add('hidden');
        displayPost(data[0].data.children[0].data);
        displayComments(data[1].data.children);
      })
      .catch(error => {
        loadingElement.classList.add('hidden');
        errorElement.textContent = `Error: ${error.message || 'Could not load the post. Try another data source.'}`;
        errorElement.classList.remove('hidden');
      });
  }
  
  function displayPost(postData) {
    document.title = `${postData.title} | Reddit Feed Viewer`;
    
    // Format date
    const postDate = new Date(postData.created_utc * 1000);
    const formattedDate = postDate.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Handle post media content
    let mediaContent = '';
    
    // Handle images
    if (postData.post_hint === 'image' && postData.url) {
      mediaContent = `<img class="post-image" src="${postData.url}" alt="Post image">`;
    }
    // Handle videos
    else if (postData.is_video && postData.media && postData.media.reddit_video) {
      mediaContent = `
        <video controls class="post-video">
          <source src="${postData.media.reddit_video.fallback_url}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      `;
    }
    // Handle embedded links (e.g. YouTube)
    else if (postData.media_embed && postData.media_embed.content) {
      mediaContent = `<div class="post-embed">${postData.media_embed.content}</div>`;
    }
    // Handle link posts
    else if (postData.url && !postData.url.includes('reddit.com')) {
      mediaContent = `<div class="post-link"><a href="${postData.url}" target="_blank">${postData.url}</a></div>`;
    }
    
    // Handle post text content
    let textContent = '';
    if (postData.selftext) {
      textContent = `<div class="post-content">${postData.selftext.replace(/\n/g, '<br>')}</div>`;
    }
    
    // Create the post HTML
    postContainer.innerHTML = `
      <h1 class="post-title">${postData.title}</h1>
      <div class="post-details">
        Posted by u/${postData.author} on ${formattedDate} in r/${postData.subreddit}
      </div>
      ${mediaContent}
      ${textContent}
      <div class="post-stats">
        <span class="votes">👍 ${postData.ups} upvotes (${postData.upvote_ratio * 100}% upvoted)</span>
        <span class="comments">💬 ${postData.num_comments} comments</span>
      </div>
    `;
  }
  
  function displayComments(comments) {
    if (!comments || comments.length === 0) {
      commentsContainer.innerHTML = '<p>No comments on this post.</p>';
      return;
    }
    
    // Filter out the stickied AutoModerator comments that are often at the top
    const filteredComments = comments.filter(comment => 
      comment.kind === 't1' && !comment.data.stickied
    );
    
    if (filteredComments.length === 0) {
      commentsContainer.innerHTML = '<p>No comments on this post.</p>';
      return;
    }
    
    const commentsHtml = document.createElement('div');
    commentsHtml.className = 'comments-list';
    
    // Render comments
    filteredComments.forEach(comment => {
      if (comment.kind !== 't1') return; // Skip non-comment items
      
      const commentData = comment.data;
      const commentElement = renderComment(commentData);
      commentsHtml.appendChild(commentElement);
    });
    
    commentsContainer.appendChild(commentsHtml);
  }
  
  function renderComment(commentData, depth = 0) {
    const commentElement = document.createElement('div');
    commentElement.className = `comment depth-${depth}`;
    
    // Format date
    const commentDate = new Date(commentData.created_utc * 1000);
    const formattedDate = commentDate.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
    // Create the comment HTML
    const commentHeader = document.createElement('div');
    commentHeader.className = 'comment-header';
    commentHeader.innerHTML = `
      <span class="comment-author">${commentData.author}</span>
      <span class="comment-date">${formattedDate}</span>
      <span class="comment-score">👍 ${commentData.score}</span>
    `;
    
    const commentBody = document.createElement('div');
    commentBody.className = 'comment-body';
    commentBody.innerHTML = commentData.body ? commentData.body.replace(/\n/g, '<br>') : '[deleted]';
    
    commentElement.appendChild(commentHeader);
    commentElement.appendChild(commentBody);
    
    // Recursively render replies if they exist
    if (commentData.replies && commentData.replies.data && commentData.replies.data.children) {
      const repliesElement = document.createElement('div');
      repliesElement.className = 'comment-replies';
      
      commentData.replies.data.children.forEach(reply => {
        if (reply.kind === 't1') {
          const replyElement = renderComment(reply.data, depth + 1);
          repliesElement.appendChild(replyElement);
        }
      });
      
      if (repliesElement.children.length > 0) {
        commentElement.appendChild(repliesElement);
      }
    }
    
    return commentElement;
  }
  
  // Load the post details when the page loads
  loadPostDetails();
});
