document.addEventListener('DOMContentLoaded', () => {
  const themeToggleContainer = document.getElementById('theme-toggle-container');
  
  // Create theme toggle elements
  function setupThemeToggle() {
    const toggleButton = document.createElement('div');
    toggleButton.className = 'theme-toggle-button';
    toggleButton.id = 'theme-toggle-button';
    
    const toggleSlider = document.createElement('div');
    toggleSlider.className = 'theme-toggle-slider';
    toggleSlider.innerHTML = '☀️';
    
    toggleButton.appendChild(toggleSlider);
    
    const toggleLabel = document.createElement('label');
    toggleLabel.htmlFor = 'theme-toggle-button';
    toggleLabel.textContent = 'Light';
    
    themeToggleContainer.appendChild(toggleLabel);
    themeToggleContainer.appendChild(toggleButton);
    
    // Add event listener for theme toggle
    toggleButton.addEventListener('click', toggleTheme);
  }
  
  // Toggle between light and dark theme
  function toggleTheme() {
    const toggleButton = document.getElementById('theme-toggle-button');
    const toggleLabel = toggleButton.previousElementSibling;
    const toggleSlider = toggleButton.querySelector('.theme-toggle-slider');
    
    // Toggle dark mode class on body
    document.body.classList.toggle('dark-mode');
    
    // Update toggle button appearance
    const isDarkMode = document.body.classList.contains('dark-mode');
    toggleButton.classList.toggle('dark', isDarkMode);
    
    // Update emoji and label
    toggleSlider.innerHTML = isDarkMode ? '🌙' : '☀️';
    toggleLabel.textContent = isDarkMode ? 'Dark' : 'Light';
    
    // Save preference to localStorage
    localStorage.setItem('redditDarkMode', isDarkMode ? 'true' : 'false');
  }
  
  // Apply saved theme preference or system preference
  function applyTheme() {
    const savedTheme = localStorage.getItem('redditDarkMode');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Determine if dark mode should be applied
    const shouldApplyDark = savedTheme === 'true' || (savedTheme === null && systemPrefersDark);
    
    if (shouldApplyDark) {
      document.body.classList.add('dark-mode');
      
      const toggleButton = document.getElementById('theme-toggle-button');
      if (toggleButton) {
        toggleButton.classList.add('dark');
        const toggleSlider = toggleButton.querySelector('.theme-toggle-slider');
        toggleSlider.innerHTML = '🌙';
        
        const toggleLabel = toggleButton.previousElementSibling;
        if (toggleLabel) toggleLabel.textContent = 'Dark';
      }
    }
  }
  
  // Initialize theme toggle
  setupThemeToggle();
  
  // Apply saved or system theme preference
  applyTheme();
  
  // Listen for system theme changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (localStorage.getItem('redditDarkMode') === null) {
        if (e.matches) {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
      }
    });
  }
});
