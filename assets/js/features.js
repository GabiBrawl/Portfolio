/* features.js - Complex features */

/**
 * Wires up email copy functionality
 */
function wireEmailCopy() {
  const emailLink = document.getElementById('email-link');
  if (!emailLink) return;

  emailLink.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = 'gabiya219@gmail.com';
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

    const words = [
      'LINUX BTW', 'WINDOWS', 'C++', 'C', 'AI', 'PCB', '$BTC', 'MEMES', 'VS CODE', 'GIT',
      'COOL SHIT', 'OMARCHY', 'EMBEDDED DEV', 'ML', '.AF', 'THINKPAD', 'PROTON', 'ZEN',
      'NBHD', 'SOFTCORE', 'xD', 'NOTHING', 'ART', 'CYBERSIGILISM', 'VALORANT', 'BRAVE BROWSER',
      'UBUNTU', 'HTML', 'AFFINITY', 'FIGMA', 'YAPPER', 'TESLA', 'ESPRESSIF',
      'MIATAAA', 'CHOC CHIP COOKIES', 'OPEN SOURCE', 'RETRO FTW', 'CASH IS KING'
    ];

    // Merge and shuffle
    const randomizedWords = shuffleArray(words);

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
    const durationSeconds = 30; // original approximate duration for one loop

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
    const len = message.length;
    const top = ' ' + '_'.repeat(len + 2);
    const middle = '< ' + message + ' >';
    const bottom = ' ' + '-'.repeat(len + 2);
    const cow = `        \\   ^__^
         \\  (oo)\\_______
            (__)\\       )\\/\\
                ||----w |
                ||     ||`;
    return top + '\n' + middle + '\n' + bottom + '\n' + cow;
  }

  function toggleTheme() {
    isDark = !isDark;
    if (isDark) {
      document.documentElement.style.setProperty('--black', '#070707');
      document.documentElement.style.setProperty('--white', '#DED8CB');
      document.documentElement.style.setProperty('--accent', '#FFAB07');
    } else {
      document.documentElement.style.setProperty('--black', '#f0f0f0');
      document.documentElement.style.setProperty('--white', '#000000');
      document.documentElement.style.setProperty('--accent', '#007bff');
    }
  }

  // Quote of the day — a small curated list of arcane/epic quotes
  const _qotdQuotes = [
    "'When people look up to you, you don't get to be selfish.' - Vander",
    "'Imprisonment. What a curious principle. We confine the physical body, yet the mind is still free.' — Heimerdinger",
    "'Surely, we, the pioneers of science, can use it for good. We're the champions of discovery. Why fear it when we can master it?' — Jayce",
    "'There's a monster inside all of us.' — Silco",
    "'You see, power, real power doesn't come to those who were born strongest or fastest or smartest. No. It comes to those who will do anything to achieve it.' — Silco",
    "'When you're going to change the world, don't ask for permission.' — Viktor",
    "'Loneliness is often the byproduct of a gifted mind.' — Singed",
    "'It's a sad truth that those who shine brightest often burn fastest.' - Heimerdinger",
    "'There is always a choice.' - Viktor",
    "'He fancies himself a fox among the wolves. But mark me, child, if you want to last in this world, you must learn to be both the fox and the wolf.' - Ambessa Medarda",
    "'Why is peace always the justification for violence?' - Caitlyn",
    "'Why does anyone commit acts other deem unspeakable? For love.' - Singed",
    "'Knowledge is a paradox. The more one understands, the more one realizes the vastness of his ignorance.' - Viktor",
    "'Greatest thing we can do in life is find the power to forgive.' - Silco",
    "'I think the cycle only ends when we find the will to walk away.' - Silco",
    "'There is no prize to perfection. Only an end to pursuit.' - Viktor",
    "'In the pursuit of great, we failed to do good' - Viktor"
  ];

  function qotd() {
    return _qotdQuotes[Math.floor(Math.random() * _qotdQuotes.length)];
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    display: none;
    z-index: 1000;
    justify-content: center;
    align-items: center;
  `;

  const terminal = document.createElement('div');
  terminal.style.cssText = `
    background: var(--black);
    color: var(--white);
    font-family: monospace;
    padding: 20px;
    width: 80%;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    border: 2px solid var(--white);
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
  prompt.textContent = '$ ';
  prompt.style.cssText = `color: var(--white); font-family: monospace; font-size: 14px;`;

  const input = document.createElement('input');
  input.style.cssText = `
    background: transparent;
    color: var(--white);
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
      output.textContent = 'Welcome to Gabi\'s Command Palette!\nType "help" for available commands.\n\n';
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
    let response = '';
    let lowerCmd = cmd.toLowerCase();
    if (lowerCmd.startsWith('sudo')) {
      response = 'User not in the sudoers file. This incident will be reported.\n';
    } else {
      if (lowerCmd.startsWith('cowsay ')) {
        const message = cmd.slice(7).trim();
        response = cowsay(message) + '\n';
      } else {
        switch(lowerCmd) {
          case 'projects':
            document.querySelector('.projects').scrollIntoView({behavior: 'smooth'});
            response = 'Scrolling to projects...\n';
            break;
          case 'github':
            window.open('https://github.com/GabiBrawl', '_blank');
            response = 'Opening GitHub...\n';
            break;
          case 'contact':
            window.location.href = 'mailto:gabiya219@gmail.com';
            response = 'Opening email client...\n';
            break;
          case 'help':
            response = 'Available commands:\n  projects - Scroll to projects\n  github - Open GitHub\n  contact - Open email\n  whoami - Display user info\n  sudo - Attempt sudo (will show error)\n  age - Display age\n  qotd - Quote of the day\n  cowsay [message] - Cow says message\n  theme - Toggle theme\n  help - Show this help\n  clear - Clear terminal\n  exit - Close palette\n\n';
            break;
          case 'whoami':
            response = 'GabiBrawl // Full-stack developer and electronics enthusiast\n';
            break;
          case 'age':
            response = '18y... for now\n';
            break;
          case 'qotd':
            response = qotd() + '\n';
            break;
          case 'theme':
            toggleTheme();
            response = 'Theme toggled!\n';
            break;
          case 'cowsay':
            response = 'Usage: cowsay [message]\n';
            break;
          case 'clear':
            output.textContent = '';
            input.value = '';
            return;
          case 'exit':
            hidePalette();
            return;
          default:
            response = `Unknown command: ${cmd}\nType "help" for available commands.\n\n`;
        }
      }
    }
    output.textContent += `$ ${originalCmd}\n${response}`;
    input.value = '';
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
}