document.addEventListener('DOMContentLoaded', () => {
  const searchForm = document.getElementById('search-form');
  const subredditInput = document.getElementById('subreddit-input');
  const resultsContainer = document.getElementById('results');
  const loadingElement = document.getElementById('loading');
  const errorElement = document.getElementById('error');
  const categoriesContainer = document.getElementById('categories');
  const activeFeedElement = document.getElementById('active-feed');

  // Available data sources
  const dataSources = {
    corsProxy: {
      name: 'CORS Proxy',
      fetchUrl: (subreddit) => `https://corsproxy.io/?https://www.reddit.com/r/${subreddit}.json`
    },
    teddit: {
      name: 'Teddit',
      fetchUrl: (subreddit) => `https://teddit.net/r/${subreddit}.json`
    },
    libreddit: {
      name: 'Libreddit',
      fetchUrl: (subreddit) => `https://libredd.it/r/${subreddit}.json`
    }
  };

  // Current data source - get from localStorage or default to corsProxy
  let currentDataSource = localStorage.getItem('redditDataSource') || 'corsProxy';
  
  // Current active category
  let activeCategory = null;

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
      const currentSubreddit = subredditInput.value.trim() || 'popular';
      loadSubreddit(currentSubreddit);
    });
  }

  // Call the function to set up the selector
  setupDataSourceSelector();

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
      categoryElement.dataset.index = index;
      
      categoryElement.addEventListener('click', () => loadCategory(index));
      
      categoriesContainer.appendChild(categoryElement);
    });
  }

  setupCategories();

  // Load a category by index
  function loadCategory(index) {
    const category = CATEGORIES[index];
    if (!category) return;
    
    // Update active category
    activeCategory = index;
    
    // Update UI
    const allCategoryElements = document.querySelectorAll('.category');
    allCategoryElements.forEach(el => el.classList.remove('active'));
    document.querySelector(`.category[data-index="${index}"]`).classList.add('active');
    
    // Show the active feed info
    activeFeedElement.innerHTML = `
      <h3>Browsing: ${category.theme}</h3>
      <p>Subreddits: ${category.subreddits.join(', ')}</p>
      <button id="clear-category" class="clear-button">Clear Category</button>
    `;
    activeFeedElement.classList.remove('hidden');
    
    // Add event listener to the clear button
    document.getElementById('clear-category').addEventListener('click', clearCategory);
    
    // Load posts from the category's subreddits
    loadMultipleSubreddits(category.subreddits);
  }
  
  // Clear the active category
  function clearCategory() {
    activeCategory = null;
    
    // Update UI
    const allCategoryElements = document.querySelectorAll('.category');
    allCategoryElements.forEach(el => el.classList.remove('active'));
    
    activeFeedElement.classList.add('hidden');
    activeFeedElement.innerHTML = '';
    
    // Load default subreddit
    loadSubreddit('popular');
  }

  // Load posts from multiple subreddits
  function loadMultipleSubreddits(subreddits) {
    // Show loading indicator, hide results and error
    loadingElement.classList.remove('hidden');
    resultsContainer.innerHTML = '';
    errorElement.classList.add('hidden');
    errorElement.textContent = '';
    
    // Clean up subreddit names by removing 'r/' prefix if present
    const cleanSubreddits = subreddits.map(sub => sub.replace(/^r\//, ''));
    
    // Keep track of completed requests and their posts
    let completedRequests = 0;
    const allPosts = [];
    let hasErrors = false;
    
    // Function to check if all requests are complete
    const checkAllComplete = () => {
      if (completedRequests === cleanSubreddits.length) {
        loadingElement.classList.add('hidden');
        
        if (allPosts.length === 0 && hasErrors) {
          errorElement.textContent = 'Error loading one or more subreddits in this category. Try another data source.';
          errorElement.classList.remove('hidden');
          return;
        }
        
        if (allPosts.length === 0) {
          resultsContainer.innerHTML = '<p>No posts found in these subreddits.</p>';
          return;
        }
        
        // Sort posts by date (newest first)
        allPosts.sort((a, b) => b.data.created_utc - a.data.created_utc);
        
        // Display the combined posts
        displayPosts(allPosts);
      }
    };
    
    // Fetch each subreddit
    cleanSubreddits.forEach(subreddit => {
      const fetchUrl = dataSources[currentDataSource].fetchUrl(subreddit);
      
      fetch(fetchUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Failed to fetch r/${subreddit}: ${response.statusText}`);
          }
          return response.json();
        })
        .then(data => {
          if (data.data && data.data.children) {
            allPosts.push(...data.data.children);
          }
          completedRequests++;
          checkAllComplete();
        })
        .catch(error => {
          console.error(`Error fetching r/${subreddit}:`, error);
          hasErrors = true;
          completedRequests++;
          checkAllComplete();
        });
    });
  }

  // Default subreddit to load initially
  loadSubreddit('popular');
  
  // Set up event listener for form submission
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const subreddit = subredditInput.value.trim();
    if (subreddit) {
      // Clear active category when searching
      if (activeCategory !== null) {
        clearCategory();
      }
      loadSubreddit(subreddit);
    }
  });

  function loadSubreddit(subreddit) {
    // Show loading indicator, hide results and error
    loadingElement.classList.remove('hidden');
    resultsContainer.innerHTML = '';
    errorElement.classList.add('hidden');
    errorElement.textContent = '';

    // Get the fetch URL based on current data source
    const fetchUrl = dataSources[currentDataSource].fetchUrl(subreddit);
    
    // Update the URL in the input field for reference
    if (currentDataSource === 'corsProxy') {
      subredditInput.placeholder = `Using ${dataSources[currentDataSource].name} for r/${subreddit}`;
    } else {
      subredditInput.placeholder = `Using ${dataSources[currentDataSource].name} (${new URL(fetchUrl).hostname})`;
    }

    // Fetch the subreddit data
    fetch(fetchUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to fetch subreddit: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        loadingElement.classList.add('hidden');
        displayPosts(data.data.children, subreddit);
      })
      .catch(error => {
        loadingElement.classList.add('hidden');
        errorElement.textContent = `Error: ${error.message || 'Could not load the subreddit. Try another data source or check the subreddit name.'}`;
        errorElement.classList.remove('hidden');
      });
  }

  function displayPosts(posts, subreddit) {
    if (!posts || posts.length === 0) {
      resultsContainer.innerHTML = '<p>No posts found in this subreddit.</p>';
      return;
    }

    posts.forEach(post => {
      const postData = post.data;
      const postElement = document.createElement('div');
      postElement.className = 'post';
      
      // Format date
      const postDate = new Date(postData.created_utc * 1000);
      const formattedDate = postDate.toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      // Create thumbnail HTML if available
      let thumbnailHtml = '';
      if (postData.thumbnail && postData.thumbnail.startsWith('http')) {
        thumbnailHtml = `<img class="post-thumbnail" src="${postData.thumbnail}" alt="Post thumbnail">`;
      }

      // Create text content HTML, handling selftext
      let contentHtml = '';
      if (postData.selftext) {
        // Limit text length to avoid overly long posts
        const maxLength = 1000;
        // const text = postData.selftext.length > maxLength 
        //   ? postData.selftext.substring(0, maxLength) + '...' 
        //   : postData.selftext;
        const text = postData.selftext;
        contentHtml = `<div class="post-content">${text.replace(/\n/g, '<br>')}</div>`;
      }

      // Create URL to the post detail page with necessary parameters
      const postDetailUrl = `post.html?permalink=${encodeURIComponent(postData.permalink)}&subreddit=${encodeURIComponent(postData.subreddit)}&id=${encodeURIComponent(postData.id)}`;

      // Put everything together
      postElement.innerHTML = `
        <h2 class="post-title">
          <a href="${postDetailUrl}">${postData.title}</a>
        </h2>
        <div class="post-details">
          Posted by u/${postData.author} on ${formattedDate} in r/${postData.subreddit}
        </div>
        ${thumbnailHtml}
        ${contentHtml}
        <div class="post-actions">
          <a href="${postDetailUrl}">
            <span>💬 ${postData.num_comments} comments</span>
          </a>
          <span>👍 ${postData.ups} upvotes</span>
        </div>
      `;

      resultsContainer.appendChild(postElement);
    });
  }
});
