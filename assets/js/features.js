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
 * Wires up the tech scroller efficiently using compositor-optimized CSS animations
 */
function wireTechScroller() {
  function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const scroller = document.querySelector('.scroller-content');
  if (!scroller) return;

  // 1. Shuffle all configuration words
  const shuffled = shuffleArray(CONFIG.TECH_SCROLLER_WORDS);

  // 2. PERFORMANCE BOOST: Slice the array to only 12 words!
  // This keeps the DOM element lightweight and well within GPU layout limits.
  const optimizedSubset = shuffled.slice(0, 12);

  // 3. Build HTML sequence with star separators
  const buildSequence = seq => seq.map(w => `<span class="star"></span> ${w} `).join('');
  scroller.innerHTML = buildSequence(optimizedSubset) + buildSequence(optimizedSubset);

  // 4. Set animation configurations
  scroller.style.animation = 'scroll-left 25s linear infinite'; // Shorter text moves faster, so 25s keeps the speed perfect
  scroller.style.willChange = 'transform';
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
    function updateProgress(message) {
      output.textContent += message + '\n';
      terminal.scrollTop = terminal.scrollHeight;
      console.log(message);
    }

    updateProgress('Starting asset caching process...');
    const registration = await navigator.serviceWorker.ready;
    registration.active.postMessage({ type: 'CACHE_ALL_ASSETS' });
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
          if (!paletteVisible) {
            showPalette();
          }
          cacheAllAssets();
          return 'Starting asset caching...';
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

    window.terminalUpdateProgress = function(message) {
    output.textContent += message + '\n';
    terminal.scrollTop = terminal.scrollHeight;
};
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