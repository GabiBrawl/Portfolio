/* features.js - Complex features */

/**
 * Wires up email copy functionality
 */
function wireEmailCopy() {
  const emailLink = document.getElementById('email-link');
  if (!emailLink) return;

  emailLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = CONFIG.EMAIL;
    try {
      await navigator.clipboard.writeText(email);
      const originalText = emailLink.textContent;
      emailLink.textContent = 'Copied!';
      emailLink.classList.add('copied');
      setTimeout(() => {
        emailLink.textContent = originalText;
        emailLink.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy email: ', err);
      // Fallback: open mailto
      window.location.href = `mailto:${email}`;
    }
  });
}

/**
 * Wires up the tech scroller
 */
function wireTechScroller() {
  /**
   * Fisher-Yates shuffle algorithm
   * @param {Array} arr - Array to shuffle
   * @returns {Array} Shuffled array
   */
  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /**
   * Builds the scroller content
   */
  function buildScroller() {
    const scroller = document.querySelector('.scroller-content');
    if (!scroller) return;

    // Merge and shuffle
    const randomizedWords = shuffleArray(CONFIG.TECH_SCROLLER_WORDS);

    // Build HTML with star separators; duplicate sequence for seamless infinite loop
    const buildSequence = seq => seq.map(w => `<span class="star"></span> ${w} `).join('');
    // Duplicate sequence for seamless looping
    const html = buildSequence(randomizedWords) + buildSequence(randomizedWords);
    scroller.innerHTML = html;
  }

  /**
   * Starts the smooth scroller animation
   */
  let _rafId = null;
  function startScrollerAnimation() {
    const scroller = document.querySelector('.scroller-content');
    if (!scroller) return;

    // disable any CSS animation on the element
    scroller.style.animation = 'none';
    scroller.style.willChange = 'transform';

    let last = performance.now();
    let offset = 0; // negative px (we'll subtract)
    let sequenceWidth = scroller.scrollWidth / 2 || 0; // half since we duplicated sequence
    const durationSeconds = 69; // original approximate duration for one loop

    function update(now) {
      const dt = (now - last) / 1000; // seconds
      last = now;
      // recalc if sequenceWidth is 0 or on resize (lazy: check each frame occasionally)
      if (!sequenceWidth || scroller._lastWidth !== scroller.scrollWidth) {
        sequenceWidth = scroller.scrollWidth / 2 || 0;
        scroller._lastWidth = scroller.scrollWidth;
      }

      // compute speed based on current sequence width so resizing keeps a consistent period
      const speed = sequenceWidth > 0 ? sequenceWidth / durationSeconds : 0;
      offset -= speed * dt;

      // wrap smoothly
      if (sequenceWidth > 0 && -offset >= sequenceWidth) {
        offset += sequenceWidth;
      }

      scroller.style.transform = `translateX(${offset}px)`;
      _rafId = requestAnimationFrame(update);
    }

    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = requestAnimationFrame(update);
  }

  function stopScrollerAnimation() {
    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = null;
  }

  buildScroller();
  startScrollerAnimation();
}

/**
 * Wires up the command palette easter egg
 */
function wireCommandPalette() {
  let paletteVisible = false;
  let isDark = true;
  let commandHistory = [];
  let historyIndex = -1;

  function cowsay(message) {
    // Handle multi-line input by splitting on newlines first
    const inputLines = message.split('\n');
    const maxWidth = 40;
    const lines = [];
      const cow = `        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||`;

    for (const inputLine of inputLines) {
      if (inputLine.trim() === '') {
        lines.push('');
        continue;
      }

      const words = inputLine.split(' ');
      let currentLine = '';

      for (const word of words) {
        if (currentLine.length + word.length + 1 <= maxWidth) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    // Remove empty lines at the end
    while (lines.length > 0 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    if (lines.length === 1 && lines[0].length <= maxWidth) {
      // Single line - use original format
      const len = lines[0].length;
      const top = ' ' + '_'.repeat(len + 2);
      const middle = '< ' + lines[0] + ' >';
      const bottom = ' ' + '-'.repeat(len + 2);
      return top + '\n' + middle + '\n' + bottom + '\n' + cow;
    } else {
      // Multi-line - create proper multi-line bubble
      const maxLineLength = Math.max(...lines.filter(line => line.length > 0).map(line => line.length));
      let result = ' ' + '_'.repeat(maxLineLength + 2) + '\n';
      
      // First line
      const firstLine = lines[0] || '';
      result += '/ ' + firstLine + ' '.repeat(maxLineLength - firstLine.length) + ' \\\n';
      
      // Middle lines
      for (let i = 1; i < lines.length - 1; i++) {
        const line = lines[i] || '';
        result += '| ' + line + ' '.repeat(maxLineLength - line.length) + ' |\n';
      }
      
      // Last line
      const lastLine = lines[lines.length - 1] || '';
      result += '\\ ' + lastLine + ' '.repeat(maxLineLength - lastLine.length) + ' /\n';
      result += ' ' + '-'.repeat(maxLineLength + 2) + '\n';
      
      
      return result + cow;
    }
  }

  function toggleTheme() {
    isDark = !isDark;
    if (isDark) {
      document.documentElement.style.setProperty('--background', '#070707');
      document.documentElement.style.setProperty('--primary', '#DED8CB');
      document.documentElement.style.setProperty('--accent', '#FFAB07');
      document.documentElement.style.setProperty('--star-image', 'url("../star.svg")');
    } else {
      document.documentElement.style.setProperty('--background', '#f0f0f0');
      document.documentElement.style.setProperty('--primary', '#000000');
      document.documentElement.style.setProperty('--accent', '#9983FF');
      document.documentElement.style.setProperty('--star-image', 'url("../starW.svg")');
    }
  }

  // Quote of the day — a small curated list of arcane/epic quotes
  const _qotdQuotes = CONFIG.QOTD_QUOTES;

  function qotd() {
    return _qotdQuotes[Math.floor(Math.random() * _qotdQuotes.length)];
  }

  // Cache all website assets for offline use
  async function cacheAllAssets() {
    console.log('Starting asset caching process...');

    function updateProgress(message) {
      output.textContent += message + '\n';
      terminal.scrollTop = terminal.scrollHeight;
      console.log(message);
    }

    try {
      updateProgress('Starting asset caching process...');

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      const cache = await caches.open('portfolio-v2');

      // List of all assets to cache
      const assetsToCache = [
        // Project JSON files
        ...Array.from({length: 6}, (_, i) => `/posts/post${i}.json`),
        // Images
        '/assets/images/embed.png',
        '/assets/images/pc.jpeg',
        '/assets/images/pfp400x400.jpg',
        // Additional assets
        '/favicon.png',
        '/assets/star.svg',
        '/assets/starW.svg',
        '/assets/button88x31.png',
        '/assets/flag-orpheus-top.svg'
      ];

      updateProgress(`Caching ${assetsToCache.length} assets...`);

      // Cache all assets with progress
      let completed = 0;
      const total = assetsToCache.length;

      for (const url of assetsToCache) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
            completed++;
            updateProgress(`[${completed}/${total}] ✓ Cached: ${url}`);
          } else {
            completed++;
            updateProgress(`[${completed}/${total}] ✗ Failed: ${url} (${response.status})`);
          }
        } catch (error) {
          completed++;
          updateProgress(`[${completed}/${total}] ✗ Error: ${url} - ${error.message}`);
        }
      }

      updateProgress('Asset caching complete!');

      // Cache project images from gallery
      updateProgress('Caching project images...');
      let imageCount = 0;
      let imageCompleted = 0;

      // First pass: count total images
      for (let i = 0; i < 6; i++) {
        try {
          const response = await fetch(`/posts/post${i}.json`);
          const project = await response.json();

          // Count gallery images
          if (project.gallery && Array.isArray(project.gallery)) {
            imageCount += project.gallery.length;
          }

          // Count card images
          if (project.cardImage) imageCount++;
          if (project.cardLogo) imageCount++;
        } catch (error) {
          // Ignore errors in counting
        }
      }

      updateProgress(`Found ${imageCount} project images to cache...`);

      // Second pass: cache images
      for (let i = 0; i < 6; i++) {
        try {
          const response = await fetch(`/posts/post${i}.json`);
          const project = await response.json();

          // Cache gallery images
          if (project.gallery && Array.isArray(project.gallery)) {
            for (const image of project.gallery) {
              if (image.src) {
                try {
                  const imgResponse = await fetch(image.src);
                  if (imgResponse.ok) {
                    await cache.put(image.src, imgResponse);
                    imageCompleted++;
                    updateProgress(`[${imageCompleted}/${imageCount}] ✓ Cached gallery image: ${image.src}`);
                  } else {
                    imageCompleted++;
                    updateProgress(`[${imageCompleted}/${imageCount}] ✗ Failed gallery image: ${image.src}`);
                  }
                } catch (error) {
                  imageCompleted++;
                  updateProgress(`[${imageCompleted}/${imageCount}] ✗ Error gallery image: ${image.src}`);
                }
              }
            }
          }

          // Cache card images
          if (project.cardImage) {
            try {
              const imgResponse = await fetch(project.cardImage);
              if (imgResponse.ok) {
                await cache.put(project.cardImage, imgResponse);
                imageCompleted++;
                updateProgress(`[${imageCompleted}/${imageCount}] ✓ Cached card image: ${project.cardImage}`);
              } else {
                imageCompleted++;
                updateProgress(`[${imageCompleted}/${imageCount}] ✗ Failed card image: ${project.cardImage}`);
              }
            } catch (error) {
              imageCompleted++;
              updateProgress(`[${imageCompleted}/${imageCount}] ✗ Error card image: ${project.cardImage}`);
            }
          }

          if (project.cardLogo) {
            try {
              const imgResponse = await fetch(project.cardLogo);
              if (imgResponse.ok) {
                await cache.put(project.cardLogo, imgResponse);
                imageCompleted++;
                updateProgress(`[${imageCompleted}/${imageCount}] ✓ Cached logo: ${project.cardLogo}`);
              } else {
                imageCompleted++;
                updateProgress(`[${imageCompleted}/${imageCount}] ✗ Failed logo: ${project.cardLogo}`);
              }
            } catch (error) {
              imageCompleted++;
              updateProgress(`[${imageCompleted}/${imageCount}] ✗ Error logo: ${project.cardLogo}`);
            }
          }

        } catch (error) {
          updateProgress(`Error processing project ${i}: ${error.message}`);
        }
      }

      updateProgress('All assets cached successfully! Site is now fully available offline.');

    } catch (error) {
      updateProgress(`Error during asset caching: ${error.message}`);
    }
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    backdrop-filter: blur(8px);
    display: none;
    z-index: 1000;
    justify-content: center;
    align-items: center;
  `;

  const terminal = document.createElement('div');
  terminal.style.cssText = `
    background: var(--background);
    color: var(--primary);
    font-family: monospace;
    padding: 20px;
    width: 80%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    border: 2px solid var(--primary);
  `;

  const output = document.createElement('div');
  output.style.cssText = `
    margin-bottom: 10px;
    white-space: pre-wrap;
    font-size: 14px;
  `;

  const inputContainer = document.createElement('div');
  inputContainer.style.cssText = `display: flex; align-items: center;`;

  const prompt = document.createElement('span');
  prompt.textContent = '$';
  prompt.style.cssText = `color: var(--primary); font-family: monospace; font-size: 14px; margin-right: 8px;`;

  const input = document.createElement('input');
  input.style.cssText = `
    background: transparent;
    color: var(--primary);
    border: none;
    font-family: monospace;
    width: 100%;
    outline: none;
    font-size: 14px;
    padding: 0;
    margin: 0;
  `;

  inputContainer.appendChild(prompt);
  inputContainer.appendChild(input);
  terminal.appendChild(output);
  terminal.appendChild(inputContainer);
  overlay.appendChild(terminal);
  document.body.appendChild(overlay);

  function showPalette() {
    paletteVisible = true;
    overlay.style.display = 'flex';
    input.focus();
    if (output.textContent === '') {
      output.textContent = 'Welcome to the Terminal!\nIn case of doubt, type "help".\n\n';
    }
  }

  function hidePalette() {
    paletteVisible = false;
    overlay.style.display = 'none';
    input.value = '';
  }

  function executeCommand(cmd) {
    const originalCmd = cmd;
    cmd = cmd.trim();
    if (!cmd) {
      output.textContent += '\n';
      input.value = '';
      return;
    }
    commandHistory.push(originalCmd);
    historyIndex = commandHistory.length;

    // Handle special commands that don't produce output
    if (cmd.toLowerCase() === 'clear') {
      output.textContent = '';
      input.value = '';
      return;
    }
    if (cmd.toLowerCase() === 'exit') {
      hidePalette();
      return;
    }

    // Parse command pipeline
    const pipeline = cmd.split('|').map(c => c.trim());
    let currentOutput = '';

    for (let i = 0; i < pipeline.length; i++) {
      const command = pipeline[i];
      let response = '';

      if (command.toLowerCase().startsWith('cowsay')) {
        // If cowsay has args, use them; otherwise use the piped input
        const cowsayArgs = command.slice(6).trim();
        const message = cowsayArgs || currentOutput;
        response = cowsay(message);
      } else {
        // Execute the command normally
        response = executeSingleCommand(command);
      }

      currentOutput = response;
    }

    output.textContent += `$ ${originalCmd}\n${currentOutput}\n`;
    input.value = '';
    
    // Auto-scroll to bottom to show latest output
    terminal.scrollTop = terminal.scrollHeight;
  }

  function executeSingleCommand(cmd) {
    let response = '';
    let lowerCmd = cmd.toLowerCase();
    if (lowerCmd.startsWith('sudo')) {
      response = 'User not in the sudoers file. This incident will be reported.';
    } else {
      switch(lowerCmd) {
        case 'contact':
          response = `Email: ${CONFIG.EMAIL}\nCopied to clipboard!`;
          navigator.clipboard.writeText(CONFIG.EMAIL).catch(err => console.error('Failed to copy email:', err));
          break;
        case 'help':
          response = 'Available commands:\n\n\
Info:\n\
  whoami - Displays the user info\n\
  contact - Copies email to clipboard\n\
  age - Displays age\n\
  qotd - Prints a random quote\n\n\
Fun:\n\
  cowsay [message] - Cow says a message\n\
  sudo - Run a command as other user\n\
  theme - Toggle the secret theme\n\
  cache - Download and cache all assets for offline functionality\n\n\
This terminal:\n\
  help - Shows this screen\n\
  clear - Clears the terminal screen\n\
  exit - Closes the terminal\n\n\
Piping support: command | cowsay';
          break;
        case 'whoami':
          response = 'GabiBrawl // Full-stack developer and electronics enthusiast';
          break;
        case 'age':
          response = `${getAge()}y... for now`;
          break;
        case 'qotd':
          response = qotd();
          break;
        case 'theme':
          toggleTheme();
          response = 'Enjoy! ^^';
          break;
        case 'cache':
          // Show terminal if not visible
          if (!paletteVisible) {
            showPalette();
          }
          // Clear output and start caching
          output.textContent = '$ cache\nStarting asset caching...\n';
          terminal.scrollTop = terminal.scrollHeight;
          cacheAllAssets();
          return; // Don't add to output since cacheAllAssets handles it
        case 'cowsay':
          response = 'Usage: cowsay [message] or command | cowsay';
          break;
        default:
          response = `Unknown command: ${cmd}\nType "help" for available commands.`;
      }
    }
    return response;
  }

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input.value = commandHistory[historyIndex];
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        input.value = commandHistory[historyIndex];
      } else {
        historyIndex = commandHistory.length;
        input.value = '';
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Tab completion
      const currentValue = input.value.trim();
      const commands = ['contact', 'whoami', 'sudo', 'age', 'qotd', 'cowsay', 'theme', 'help', 'clear', 'exit', 'cache'];
      
      if (currentValue === '') {
        // Show all commands
        output.textContent += '\nAvailable commands: ' + commands.join(', ') + '\n';
        terminal.scrollTop = terminal.scrollHeight;
      } else {
        const matches = commands.filter(cmd => cmd.startsWith(currentValue));
        if (matches.length === 1) {
          // Complete the command
          input.value = matches[0];
        } else if (matches.length > 1) {
          // Show possible completions
          output.textContent += '\n' + matches.join('  ') + '\n';
          terminal.scrollTop = terminal.scrollHeight;
          // Find common prefix
          const commonPrefix = matches.reduce((prefix, cmd) => {
            let i = 0;
            while (i < prefix.length && i < cmd.length && prefix[i] === cmd[i]) {
              i++;
            }
            return prefix.slice(0, i);
          });
          if (commonPrefix.length > currentValue.length) {
            input.value = commonPrefix;
          }
        }
      }
    } else if (e.key === 'Enter') {
      executeCommand(input.value);
    } else if (e.key === 'Escape') {
      hidePalette();
    }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      hidePalette();
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (paletteVisible) {
        hidePalette();
      } else {
        showPalette();
      }
    }
  });

  // Auto-focus input when typing in palette
  document.addEventListener('keydown', (e) => {
    if (paletteVisible && document.activeElement !== input && !e.ctrlKey && !e.metaKey && !e.altKey && e.key !== 'Escape' && e.key !== 'Enter' && e.key !== 'Tab' && !e.key.startsWith('Arrow') && !e.key.startsWith('F') && e.key.length === 1) {
      input.focus();
    }
  });
}