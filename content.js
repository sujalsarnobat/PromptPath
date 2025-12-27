class PromptPathExtension {
  constructor() {
    this.llmConfigs = {
      'chat.openai.com': {
        name: 'ChatGPT',
        key: 'chatgpt',
        selectors: {
          messageContainer: 'div[data-testid^="conversation-turn"]',
          userMessage: 'div[data-message-author-role="user"]',
          messageText: 'div[data-message-author-role="user"] [data-message-content]',
          scrollContainer: 'div.overflow-hidden.w-full.h-full',
          themeDetector: 'dark' // ChatGPT has class 'dark' on body
        },
        color: '#10a37f'
      },
      'chatgpt.com': {
        name: 'ChatGPT',
        key: 'chatgpt',
        selectors: {
          messageContainer: 'div[data-testid^="conversation-turn"]',
          userMessage: 'div[data-message-author-role="user"]',
          messageText: 'div[data-message-author-role="user"] [data-message-content]',
          scrollContainer: 'div.overflow-hidden.w-full.h-full',
          themeDetector: 'dark'
        },
        color: '#10a37f'
      },
      'claude.ai': {
        name: 'Claude',
        key: 'claude',
        selectors: {
          messageContainer: '.contents .flex.flex-col',
          userMessage: '.contents .flex.flex-col:has(.font-semibold.select-none)',
          messageText: '.contents .flex.flex-col .whitespace-pre-wrap',
          scrollContainer: 'main .flex-1.overflow-hidden',
          themeDetector: 'dark:bg-[#171717]'
        },
        color: '#d4a574'
      },
      'gemini.google.com': {
        name: 'Gemini',
        key: 'gemini',
        selectors: {
          // Disable scraping; rely on input capture
          messageContainer: 'main',
          userMessage: '',
          messageText: '',
          scrollContainer: 'main',
          themeDetector: 'dark' // Gemini uses dark theme
        },
        color: '#8ab4f8'
      },
      'chat.deepseek.com': {
        name: 'DeepSeek',
        key: 'deepseek',
        selectors: {
          messageContainer: '.message',
          userMessage: '.message:has(.message-role-user)',
          messageText: '.message-content .prose',
          scrollContainer: '.chat-container',
          themeDetector: 'dark'
        },
        color: '#6e40c9'
      },
      'deepseek.com': {
        name: 'DeepSeek',
        key: 'deepseek',
        selectors: {
          messageContainer: 'main',
          userMessage: '',
          messageText: '',
          scrollContainer: 'main',
          themeDetector: 'dark'
        },
        color: '#6e40c9'
      },
      'perplexity.ai': {
        name: 'Perplexity',
        key: 'perplexity',
        selectors: {
          // Observe the main content area; prefer input/URL capture for prompts
          messageContainer: 'main',
          // Disable DOM scraping to avoid capturing model responses
          userMessage: '',
          messageText: '',
          scrollContainer: 'main',
          themeDetector: 'dark'
        },
        color: '#10b981'
      }
    };
    
    this.currentLLM = null;
    this.prompts = [];
    this.sidebar = null;
    this.observer = null;
    this.isInitialized = false;
    this.settings = null;
    this.previewLength = 200;
    this.sidebarPosition = 'right';
    this.sidebarWidth = 280;
    this.inputEl = null;
    this.lastTypedText = '';
  }

  async init() {
    await this.loadSettings();
    this.detectLLM();
    if (!this.currentLLM) return;

    // Gate by platform toggle
    if (this.settings && this.settings.platforms) {
      const enabled = this.settings.platforms[this.currentLLM.key] !== false;
      if (!enabled) {
        console.log(`PromptPath: ${this.currentLLM.name} disabled in settings`);
        return;
      }
    }

    // Apply display preferences
    if (this.settings && this.settings.display) {
      const d = this.settings.display;
      this.previewLength = parseInt(d.previewLength || '200', 10);
      this.sidebarPosition = (d.sidebarPosition === 'left') ? 'left' : 'right';
      this.sidebarWidth = parseInt(d.sidebarWidth || '280', 10);
    }

    this.createSidebar();
    this.applyDisplaySettings();
    await this.loadHistory();
    this.renderPromptList();
    this.setupEventListeners();
    // Avoid altering ChatGPT flow: only hook input capture for non-ChatGPT
    if (this.currentLLM.key !== 'chatgpt') {
      this.hookInputCapture();
    }
    this.startObserving();
    this.updateTheme();
    // Attempt to attach response for Perplexity if already present
    if (this.currentLLM.key === 'perplexity') {
      setTimeout(() => this.attachPerplexityResponseToLastPrompt(), 1200);
    }
    // Capture response + attach anchors for DeepSeek and Gemini
    if (this.currentLLM.key === 'deepseek' || this.currentLLM.key === 'gemini') {
      setTimeout(() => this.attachPlatformResponseAndAnchor(), 1200);
    }
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['promptPathSettings']);
      this.settings = result.promptPathSettings || null;
    } catch (e) {
      this.settings = null;
    }
  }

  detectLLM() {
    const hostname = window.location.hostname;
    for (const [domain, config] of Object.entries(this.llmConfigs)) {
      if (hostname.includes(domain)) {
        this.currentLLM = { ...config, domain };
        console.log(`PromptPath: Detected ${config.name}`);
        return;
      }
    }
    console.log('PromptPath: Unsupported LLM platform');
  }

  createSidebar() {
    // Remove existing sidebar if present
    const existingSidebar = document.getElementById('promptpathSidebar');
    if (existingSidebar) existingSidebar.remove();
    const existingToggle = document.getElementById('toggleSidebar');
    if (existingToggle) existingToggle.remove();
    
    // Create sidebar container
    // Insert both toggle and sidebar into the DOM
    document.body.insertAdjacentHTML('beforeend', this.getSidebarHTML());
    
    this.sidebar = document.getElementById('promptpathSidebar');
    this.updateLLMBadge();
    this.isInitialized = true;
  }

  getSidebarHTML() {
    return `
      <div class="toggle-btn" id="toggleSidebar">◀</div>
      <div class="promptpath-sidebar" id="promptpathSidebar">
        <div class="sidebar-header">
          <div class="sidebar-title">
            📋 PromptPath
            <span class="llm-badge" id="llmBadge">${this.currentLLM.name}</span>
          </div>
          <div style="color: var(--text-secondary); font-size: 12px;">
            <span id="promptCount">0</span> prompts
          </div>
        </div>
        
        <div class="prompt-list" id="promptList">
          <div class="empty-state">
            <div class="empty-state-icon">💬</div>
            <div>No prompts yet</div>
            <div style="font-size: 11px; margin-top: 8px;">Start chatting to see your prompt history</div>
          </div>
        </div>
        
        <div class="sidebar-controls">
          <button class="control-btn" id="clearBtn">Clear</button>
          <button class="control-btn" id="exportBtn">Export</button>
        </div>
      </div>
    `;
  }

  applyDisplaySettings() {
    const sidebar = document.getElementById('promptpathSidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    if (!sidebar || !toggleBtn) return;

    // Width
    sidebar.style.width = `${this.sidebarWidth}px`;
    document.documentElement.style.setProperty('--sidebar-width', `${this.sidebarWidth}px`);

    // Position classes
    sidebar.classList.remove('left', 'right');
    toggleBtn.classList.remove('left', 'right');
    if (this.sidebarPosition === 'left') {
      sidebar.classList.add('left');
      toggleBtn.classList.add('left');
    } else {
      sidebar.classList.add('right');
      toggleBtn.classList.add('right');
    }

    // Auto-collapse
    if (this.settings && this.settings.display && this.settings.display.autoCollapse) {
      sidebar.classList.add('hidden');
      toggleBtn.classList.add('collapsed');
    }
  }

  setupEventListeners() {
    // Event delegation to avoid null listeners on dynamic DOM
    document.addEventListener('click', (e) => {
      // Toggle sidebar
      if (e.target.closest('#toggleSidebar')) {
        const sb = document.getElementById('promptpathSidebar');
        const toggleBtn = document.getElementById('toggleSidebar');
        if (sb) {
          sb.classList.toggle('hidden');
          if (toggleBtn) toggleBtn.classList.toggle('collapsed');
        } else {
          this.createSidebar();
          this.applyDisplaySettings();
        }
        return;
      }
      // Clear prompts
      if (e.target.closest('#clearBtn')) {
        this.prompts = [];
        this.renderPromptList();
        this.saveHistory();
        return;
      }
      // Export prompts
      if (e.target.closest('#exportBtn')) {
        this.exportPrompts();
        return;
      }
      // Theme toggle removed: always dark mode
      // Navigate to prompt item
      const item = e.target.closest('.prompt-item');
      if (item && item.dataset.index) {
        const index = parseInt(item.dataset.index, 10);
        this.navigateToPrompt(index);
      }
    });

    // Global key capture: record prompts on Enter even with shadow DOM
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        // Do not modify ChatGPT behavior
        if (this.currentLLM && this.currentLLM.key === 'chatgpt') return;
        const txt = this.getActiveTextFallback();
        // slight delay to let site submit
        setTimeout(() => this.addPrompt(txt), 50);
      }
    }, { passive: true });
  }

  startObserving() {
    const config = this.currentLLM.selectors;
    
    this.observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check if new messages were added
          const addedNodes = Array.from(mutation.addedNodes);
          for (const node of addedNodes) {
            if (node.nodeType === 1) { // Element node
              const userSel = config.userMessage;
              if (userSel && (node.matches?.(userSel) || node.querySelector?.(userSel))) {
                shouldUpdate = true;
                break;
              }
            }
          }
        }
      }
      
      if (shouldUpdate) {
        setTimeout(() => this.scrapePrompts(), 500);
        // On Perplexity, try to attach the latest response snippet
        if (this.currentLLM?.key === 'perplexity') {
          setTimeout(() => this.attachPerplexityResponseToLastPrompt(), 700);
        }
        // On DeepSeek/Gemini, capture response and tag latest answer for navigation
        if (this.currentLLM?.key === 'deepseek' || this.currentLLM?.key === 'gemini') {
          setTimeout(() => this.attachPlatformResponseAndAnchor(), 800);
        }
      }
    });
    
    // Start observing the main conversation container
    const containerSel = config.messageContainer;
    const firstMessageContainer = containerSel ? document.querySelector(containerSel) : null;
    const observeTarget = firstMessageContainer?.parentElement || document.body;
    this.observer.observe(observeTarget, {
      childList: true,
      subtree: true
    });
    
    // Initial scrape
    setTimeout(() => this.scrapePrompts(), 1000);
    // Attempt to re-hook input capture after initial render
    setTimeout(() => this.hookInputCapture(), 800);
    // Seed Perplexity prompt from URL if present
    if (this.currentLLM?.key === 'perplexity') {
      this.seedPromptFromUrlForPerplexity();
      setTimeout(() => this.attachPerplexityResponseToLastPrompt(), 1400);
    }
    if (this.currentLLM?.key === 'deepseek' || this.currentLLM?.key === 'gemini') {
      setTimeout(() => this.attachPlatformResponseAndAnchor(), 1400);
    }
  }

  scrapePrompts() {
    // On Perplexity, rely on input capture and URL seeding to avoid scraping responses
    if (this.currentLLM?.key === 'perplexity') {
      this.seedPromptFromUrlForPerplexity();
      this.renderPromptList();
      return;
    }
    const config = this.currentLLM.selectors;
    if (!config.userMessage) {
      this.renderPromptList();
      return;
    }
    const userMessages = document.querySelectorAll(config.userMessage);
    
    const seen = new Set();
    this.prompts = Array.from(userMessages)
      .map((msg, index) => {
        const textElement = msg.querySelector(config.messageText) || msg;
        let text = textElement.textContent || textElement.innerText || '';
        
        // Clean up text
        text = text.trim().substring(0, this.previewLength);
        
        return {
          index: index + 1,
          text: text,
          element: msg,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
      })
      .filter(prompt => {
        if (!prompt.text || prompt.text.length === 0) return false;
        if (seen.has(prompt.text)) return false;
        seen.add(prompt.text);
        return true;
      });
    
    this.renderPromptList();
    this.saveHistory();
  }

  renderPromptList() {
    const promptList = document.getElementById('promptList');
    const promptCount = document.getElementById('promptCount');

    if (promptCount) promptCount.textContent = this.prompts.length.toString();

    if (!promptList) {
      // Sidebar missing; try to recreate
      this.createSidebar();
      this.applyDisplaySettings();
      return;
    }

    if (this.prompts.length === 0) {
      promptList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <div>No prompts yet</div>
          <div style="font-size: 11px; margin-top: 8px;">Start chatting to see your prompt history</div>
        </div>
      `;
      return;
    }

    promptList.innerHTML = this.prompts.map(prompt => `
      <div class="prompt-item" data-index="${prompt.index}">
        <div class="prompt-text" title="${prompt.text.replace(/"/g, '&quot;')}">
          ${this.escapeHtml(prompt.text)}
        </div>
        ${prompt.responsePreview ? `
        <div class="response-preview" title="${this.escapeHtml(prompt.responsePreview)}">
          ↳ ${this.escapeHtml(prompt.responsePreview)}
        </div>` : ''}
        <div class="prompt-meta">
          <span class="prompt-number">#${prompt.index}</span>
          <span>${prompt.timestamp}</span>
        </div>
      </div>
    `).join('');
  }

  navigateToPrompt(index) {
    const prompt = this.prompts.find(p => p.index === index);
    if (!prompt) return;
    if (!prompt.element) {
      // Prefer direct anchor if we tagged a response
      const anchor = document.querySelector(`[data-promptpath-anchor="${index}"]`);
      if (anchor) {
        prompt.element = anchor;
      }
      // Prefer navigating to the assistant's response when available (e.g., Perplexity)
      if (!prompt.element) {
        if (this.currentLLM?.key === 'perplexity' && prompt.responsePreview) {
          prompt.element = this.findPerplexityAnswerElement(prompt.responsePreview) || this.findElementForPromptText(prompt.responsePreview) || this.findElementForPromptText(prompt.text);
        } else if (this.currentLLM?.key === 'deepseek') {
          prompt.element = this.findDeepseekAnswerElement(prompt.responsePreview || prompt.text) || this.findElementForPromptText(prompt.text);
        } else if (this.currentLLM?.key === 'gemini') {
          prompt.element = this.findGeminiAnswerElement(prompt.responsePreview || prompt.text) || this.findElementForPromptText(prompt.text);
        } else {
          prompt.element = this.findElementForPromptText(prompt.text);
        }
      }
    }

    // Remove active class from all prompts
    document.querySelectorAll('.prompt-item').forEach(item => {
      item.classList.remove('active');
    });
    const clickedItem = document.querySelector(`.prompt-item[data-index="${index}"]`);
    if (clickedItem) clickedItem.classList.add('active');

    if (prompt.element) {
      // Tag on-demand for future fast navigation (Perplexity)
      if (this.currentLLM?.key === 'perplexity' || this.currentLLM?.key === 'deepseek' || this.currentLLM?.key === 'gemini') {
        try { prompt.element.setAttribute('data-promptpath-anchor', String(index)); } catch(_) {}
      }
      this.scrollElementIntoView(prompt.element);
    }
  }

  exportPrompts() {
    const exportData = {
      llm: this.currentLLM.name,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      prompts: this.prompts.map(p => ({
        index: p.index,
        text: p.text,
        timestamp: p.timestamp
      }))
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promptpath-${this.currentLLM.name.toLowerCase()}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Show notification
    this.showNotification('Prompts exported successfully!');
  }

  seedPromptFromUrlForPerplexity() {
    try {
      const path = window.location.pathname || '';
      // Examples: /search/your-query-slug, /q/...
      const m = path.match(/^\/(search|q)\/([^\/]+)/);
      if (m && m[2]) {
        const slug = m[2];
        const decoded = decodeURIComponent(slug).replace(/-/g, ' ').trim();
        if (decoded) this.addPrompt(decoded);
      }
    } catch (_) {
      // Ignore URL parsing errors
    }
  }

  findElementForPromptText(text) {
    try {
      const snippet = (text || '').trim();
      if (!snippet) return null;
      const cfg = this.currentLLM?.selectors || {};

      if (this.currentLLM?.key === 'chatgpt') {
        const nodes = document.querySelectorAll('div[data-message-author-role="user"] [data-message-content]');
        for (const el of nodes) {
          const t = (el.textContent || '').trim();
          if (!t) continue;
          if (t.includes(snippet) || snippet.includes(t.slice(0, Math.min(t.length, 50)))) return el;
        }
      } else if (this.currentLLM?.key === 'claude') {
        const nodes = document.querySelectorAll('.contents .flex.flex-col .whitespace-pre-wrap');
        for (const el of nodes) {
          const t = (el.textContent || '').trim();
          if (!t) continue;
          if (t.includes(snippet) || snippet.includes(t.slice(0, Math.min(t.length, 50)))) return el;
        }
      } else {
        const container = document.querySelector(cfg.messageContainer || 'main') || document.body;
        const candidates = container.querySelectorAll('p, div, article, span, .prose, [class*="message"], [class*="content"]');
        let best = null; let bestScore = 0;
        for (const el of candidates) {
          const t = (el.textContent || '').trim();
          if (!t) continue;
          const score = this._overlapScore(snippet, t);
          if (score > bestScore) { bestScore = score; best = el; }
          if (score >= snippet.length * 0.8) return el;
        }
        return best;
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  _overlapScore(a, b) {
    const s1 = (a || '').toLowerCase();
    const s2 = (b || '').toLowerCase();
    if (!s1 || !s2) return 0;
    if (s2.includes(s1)) return s1.length;
    const prefix = s1.slice(0, Math.min(60, s1.length));
    if (s2.includes(prefix)) return prefix.length;
    const t1 = new Set(s1.split(/\s+/).filter(Boolean));
    const t2 = new Set(s2.split(/\s+/).filter(Boolean));
    let count = 0; t1.forEach(w => { if (t2.has(w)) count += w.length; });
    return count;
  }

  // Smart scroll that respects site-specific scroll containers
  scrollElementIntoView(el) {
    try {
      if (!el) return;
      const cfg = this.currentLLM?.selectors || {};
      const containerSel = cfg.scrollContainer;
      const sc = containerSel ? document.querySelector(containerSel) : null;
      const headerOffset = this.getHeaderOffset();

      // First attempt: native scrollIntoView to choose nearest scrollable ancestor
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }); } catch (_) {}

      const highlight = (target) => {
        if (!target || !target.style) return;
        const originalBg = target.style.backgroundColor;
        target.style.backgroundColor = 'rgba(16, 163, 127, 0.2)';
        setTimeout(() => { target.style.backgroundColor = originalBg; }, 1000);
      };

      const isScrollable = (node) => {
        if (!node) return false;
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight;
        return canScroll;
      };

      if (sc && sc.contains(el) && isScrollable(sc)) {
        const elRect = el.getBoundingClientRect();
        const scRect = sc.getBoundingClientRect();
        const offsetTop = elRect.top - scRect.top + sc.scrollTop;
        const targetTop = Math.max(0, offsetTop - Math.max(0, sc.clientHeight / 2 - elRect.height / 2) - headerOffset);
        sc.scrollTo({ top: targetTop, behavior: 'smooth' });
        highlight(el);
        this._verifyScrolledIntoView(el, sc);
        return;
      }

      // Try the nearest scrollable ancestor of the element
      let ancestor = el.parentElement;
      let guard = 0;
      while (ancestor && guard < 10) {
        if (isScrollable(ancestor)) break;
        ancestor = ancestor.parentElement;
        guard++;
      }
      if (ancestor && isScrollable(ancestor)) {
        const elRect = el.getBoundingClientRect();
        const scRect = ancestor.getBoundingClientRect();
        const offsetTop = elRect.top - scRect.top + ancestor.scrollTop;
        const targetTop = Math.max(0, offsetTop - Math.max(0, ancestor.clientHeight / 2 - elRect.height / 2) - headerOffset);
        ancestor.scrollTo({ top: targetTop, behavior: 'smooth' });
        highlight(el);
        this._verifyScrolledIntoView(el, ancestor);
        return;
      }

      // Fallback to window scroll if container not found or element outside
      const pageTop = el.getBoundingClientRect().top + window.scrollY - Math.max(0, window.innerHeight / 2 - el.getBoundingClientRect().height / 2) - headerOffset;
      window.scrollTo({ top: Math.max(0, pageTop), behavior: 'smooth' });
      highlight(el);
      this._verifyScrolledIntoView(el, window);
    } catch (_) {
      // Last resort
      try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
    }
  }

  getHeaderOffset() {
    try {
      const dynamic = this._computeHeaderOffset();
      if (dynamic > 0) return dynamic;
      switch (this.currentLLM?.key) {
        case 'perplexity': return 72;
        case 'deepseek': return 64;
        case 'gemini': return 80;
        default: return 0;
      }
    } catch (_) {
      return 0;
    }
  }

  // Detect fixed/sticky header height dynamically for more accurate centering
  _computeHeaderOffset() {
    try {
      const selectors = [
        'header', 'nav', '[role="banner"]',
        '[class*="header"]', '[class*="top"]', '[class*="navbar"]',
        '.sticky', '.fixed'
      ];
      let candidates = [];
      selectors.forEach(sel => { candidates = candidates.concat(Array.from(document.querySelectorAll(sel))); });
      if (!candidates.length) return 0;
      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity || '1') > 0.05;
      };
      let maxH = 0;
      for (const el of candidates) {
        if (!isVisible(el)) continue;
        const style = window.getComputedStyle(el);
        const pos = style.position;
        if (pos !== 'fixed' && pos !== 'sticky') continue;
        const rect = el.getBoundingClientRect();
        // Within top area
        if (rect.top > 20) continue;
        const h = Math.round(rect.height || 0);
        if (h >= 40 && h <= 140) {
          if (h > maxH) maxH = h;
        }
      }
      return maxH;
    } catch (_) {
      return 0;
    }
  }

  _verifyScrolledIntoView(el, sc) {
    try {
      const isInViewport = () => {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight || document.documentElement.clientHeight;
        const vw = window.innerWidth || document.documentElement.clientWidth;
        return r.top >= 0 && r.left >= 0 && r.bottom <= vh && r.right <= vw;
      };
      let attempts = 0;
      const tryAgain = () => {
        attempts++;
        if (attempts > 3) return;
        // If still not centered/visible, try native scrollIntoView as a backup
        if (!isInViewport()) {
          try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
        }
        if (!isInViewport() && attempts < 3) {
          setTimeout(tryAgain, 120);
        }
      };
      setTimeout(tryAgain, 160);
    } catch (_) {
      // ignore verification errors
    }
  }

  addPrompt(text) {
    const t = (text || '').trim();
    if (!t) return;
    if (this.prompts.some(p => p.text === t)) return;
    const nextIndex = (this.prompts[this.prompts.length - 1]?.index || 0) + 1;
    this.prompts.push({
      index: nextIndex,
      text: t.substring(0, this.previewLength),
      element: null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      responsePreview: undefined
    });
    this.renderPromptList();
    this.saveHistory();
    // After submit renders, attach response/anchors per platform
    if (this.currentLLM?.key === 'perplexity') {
      setTimeout(() => this.attachPerplexityResponseToLastPrompt(), 1200);
    } else if (this.currentLLM?.key === 'deepseek' || this.currentLLM?.key === 'gemini') {
      setTimeout(() => this.attachPlatformResponseAndAnchor(), 1200);
    }
  }

  hookInputCapture() {
    // Try to find a user input field across LLMs
    const candidates = [
      'main textarea',
      'textarea',
      'div[contenteditable="true"]',
      '[role="textbox"]',
      'input[type="text"]',
      'textarea[name*="prompt" i]',
      'div[data-slate-editor="true"]'
    ];
    let input = null;
    for (const sel of candidates) {
      input = document.querySelector(sel);
      if (input) break;
    }
    if (!input) return;
    // Avoid registering twice
    if (this.inputEl === input) return;
    this.inputEl = input;

    const getText = () => {
      if (!this.inputEl) return '';
      if (this.inputEl.tagName === 'TEXTAREA' || this.inputEl.value !== undefined) {
        return this.inputEl.value;
      }
      return this.inputEl.textContent || '';
    };

    // Track last typed text to avoid duplicates
    this.inputEl.addEventListener('input', () => {
      this.lastTypedText = getText();
    }, { passive: true });

    // Keydown Enter to submit
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        const txt = getText();
        // Delay to let site handle submit
        setTimeout(() => this.addPrompt(txt), 50);
      }
    }, { passive: true });

    // Nearby send button click (support shadow roots)
    const root = this.inputEl.getRootNode ? this.inputEl.getRootNode() : document;
    const sendBtn = (root && root.querySelector) ?
      root.querySelector('button[type="submit"], button[aria-label*="Send"], button[aria-label*="send"]') :
      this.inputEl.closest('form, div')?.querySelector('button[type="submit"], button[aria-label*="Send"], button[aria-label*="send"]');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        const txt = getText();
        setTimeout(() => this.addPrompt(txt), 50);
      }, { passive: true });
    }
  }

  getActiveTextFallback() {
    const ae = document.activeElement;
    if (!ae) return this.lastTypedText || '';
    if (ae.tagName === 'TEXTAREA' || (ae.value !== undefined && typeof ae.value === 'string')) {
      return ae.value || this.lastTypedText || '';
    }
    if (ae.getAttribute && ae.getAttribute('contenteditable') === 'true') {
      return (ae.textContent || '').trim() || this.lastTypedText || '';
    }
    // Inspect shadow root for inner textbox elements
    if (ae.shadowRoot && ae.shadowRoot.querySelector) {
      const inner = ae.shadowRoot.querySelector('textarea, [contenteditable="true"], [role="textbox"], input[type="text"]');
      if (inner) {
        if (inner.tagName === 'TEXTAREA' || (inner.value !== undefined && typeof inner.value === 'string')) {
          return inner.value || this.lastTypedText || '';
        }
        return (inner.textContent || '').trim() || this.lastTypedText || '';
      }
    }
    // Look for nearby textbox
    const nearby = ae.closest('form, div')?.querySelector('textarea, [contenteditable="true"], [role="textbox"]');
    if (nearby) {
      if (nearby.tagName === 'TEXTAREA' || (nearby.value !== undefined && typeof nearby.value === 'string')) {
        return nearby.value || this.lastTypedText || '';
      }
      return (nearby.textContent || '').trim() || this.lastTypedText || '';
    }
    return this.lastTypedText || '';
  }

  updateLLMBadge() {
    const badge = document.getElementById('llmBadge');
    if (badge) {
      badge.textContent = this.currentLLM.name;
      badge.style.backgroundColor = this.currentLLM.color;
    }
  }

  getConversationId() {
    try {
      const path = window.location.pathname || '';
      switch (this.currentLLM?.key) {
        case 'chatgpt': {
          const m = path.match(/\/c\/([a-z0-9-]+)/i);
          return m ? m[1] : path || 'root';
        }
        case 'claude': {
          const m = path.match(/\/chat\/?([a-z0-9-]*)/i);
          return (m && m[1]) ? m[1] : path || 'root';
        }
        case 'gemini': {
          // ID appears after /app/ and before query/hash
          const m = path.match(/\/app\/([^\/?#]+)/i);
          return m ? m[1] : path || 'root';
        }
        case 'deepseek': {
          // Support multiple possible paths
          const m = path.match(/\/(chat|c)\/([^\/?#]+)/i);
          return m ? m[2] : path || 'root';
        }
        case 'perplexity': {
          const m = path.match(/^\/(search|q)\/([^\/]+)/i);
          return m ? m[2] : path || 'root';
        }
        default:
          return path || 'root';
      }
    } catch (_) {
      return 'root';
    }
  }

  getStorageKey() {
    const convId = this.getConversationId();
    const siteKey = this.currentLLM?.key || 'unknown';
    return `promptpath:history:${siteKey}:${convId}`;
  }

  async loadHistory() {
    try {
      const key = this.getStorageKey();
      const result = await chrome.storage.local.get([key]);
      const saved = result[key];
      if (Array.isArray(saved) && saved.length) {
        this.prompts = saved.map((p, idx) => ({
          index: p.index ?? (idx + 1),
          text: p.text ?? '',
          element: null,
          timestamp: p.timestamp ?? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          responsePreview: p.responsePreview
        }));
        return;
      }
      // Fallback: try any stored history for this site when chat-specific key is missing
      const siteKey = this.currentLLM?.key || 'unknown';
      const all = await chrome.storage.local.get(null);
      const prefix = `promptpath:history:${siteKey}:`;
      let bestList = null;
      for (const [k, v] of Object.entries(all)) {
        if (k.startsWith(prefix) && Array.isArray(v) && v.length) {
          if (!bestList || v.length > bestList.length) bestList = v;
        }
      }
      if (bestList) {
        this.prompts = bestList.map((p, idx) => ({
          index: p.index ?? (idx + 1),
          text: p.text ?? '',
          element: null,
          timestamp: p.timestamp ?? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          responsePreview: p.responsePreview
        }));
        // Persist under the current key for future fast loads
        await chrome.storage.local.set({ [key]: bestList });
      }
    } catch (_) {
      // ignore load errors
    }
  }

  async migrateHistoryKeys() {
    try {
      const siteKey = this.currentLLM?.key || 'unknown';
      const convId = this.getConversationId();
      const currentKey = `promptpath:history:${siteKey}:${convId}`;
      const all = await chrome.storage.local.get(null);
      const current = all[currentKey];
      if (Array.isArray(current) && current.length) return; // already present

      const prefix = `promptpath:history:${siteKey}:`;
      let bestKey = null; let bestList = null;
      for (const [k, v] of Object.entries(all)) {
        if (k.startsWith(prefix) && Array.isArray(v) && v.length) {
          if (!bestList || v.length > bestList.length) { bestList = v; bestKey = k; }
        }
      }
      if (bestList) {
        await chrome.storage.local.set({ [currentKey]: bestList });
        this.prompts = bestList.map((p, idx) => ({
          index: p.index ?? (idx + 1),
          text: p.text ?? '',
          element: null,
          timestamp: p.timestamp ?? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          responsePreview: p.responsePreview
        }));
        this.renderPromptList();
      }
    } catch (_) {
      // ignore migration errors
    }
  }

  async saveHistory() {
    try {
      const key = this.getStorageKey();
      const payload = this.prompts.map(p => ({ index: p.index, text: p.text, timestamp: p.timestamp, responsePreview: p.responsePreview }));
      await chrome.storage.local.set({ [key]: payload });
    } catch (_) {
      // ignore save errors
    }
  }

  updateTheme() {
    const sidebar = document.getElementById('promptpathSidebar');
    if (sidebar) {
      sidebar.classList.add('dark-mode');
    }
  }

  toggleTheme() {
    const sidebar = document.getElementById('promptpathSidebar');
    const themeBtn = document.getElementById('themeToggle');
    
    if (!sidebar) return;
    if (sidebar.classList.contains('dark-mode')) {
      sidebar.classList.remove('dark-mode');
      if (themeBtn) themeBtn.textContent = '🌙';
      localStorage.setItem('promptpath-theme', 'light');
    } else {
      sidebar.classList.add('dark-mode');
      if (themeBtn) themeBtn.textContent = '☀️';
      localStorage.setItem('promptpath-theme', 'dark');
    }
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: var(--accent-color);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 1000000;
      font-size: 14px;
      animation: fadeInOut 2s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.5s ease forwards';
      setTimeout(() => notification.remove(), 500);
    }, 1500);
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Perplexity-specific: scrape an answer snippet and attach to last prompt
  attachPerplexityResponseToLastPrompt() {
    try {
      if (this.currentLLM?.key !== 'perplexity') return;
      if (!this.prompts.length) return;
      const last = this.prompts[this.prompts.length - 1];
      if (last.responsePreview && last.responsePreview.length) return;

      const snippet = this.scrapePerplexityAnswerSnippet();
      if (snippet) {
        last.responsePreview = snippet.substring(0, this.previewLength);
        // Try to tag the matched element for reliable navigation
        const el = this.findPerplexityAnswerElement(snippet) || this.findPerplexityAnswerElement(last.responsePreview);
        if (el) {
          try { el.setAttribute('data-promptpath-anchor', String(last.index)); } catch(_) {}
        }
        this.renderPromptList();
        this.saveHistory();
      }
    } catch (_) {
      // ignore scrape errors
    }
  }

  scrapePerplexityAnswerSnippet() {
    try {
      const container = document.querySelector('main') || document.body;
      if (!container) return '';
      // Prefer obvious rich text areas first
      const selectors = [
        'article',
        '[data-testid*="answer" i]',
        '[data-testid*="response" i]',
        '.prose',
        '[class*="prose"]',
        '[class*="markdown"]',
        '[data-message-author-role="assistant"]',
        'section'
      ];
      let nodes = [];
      for (const sel of selectors) {
        const found = Array.from(container.querySelectorAll(sel));
        nodes = nodes.concat(found);
      }
      // Fallback: any sizable text blocks
      if (!nodes.length) nodes = Array.from(container.querySelectorAll('p, div'));

      let bestText = '';
      for (const el of nodes) {
        const t = (el.textContent || '').trim();
        if (!t) continue;
        // Heuristic: skip very short or button-like nodes
        if (t.length < 60) continue;
        bestText = t;
        break;
      }
      return bestText;
    } catch (_) {
      return '';
    }
  }

  // Attempt to find the Perplexity answer element by snippet
  findPerplexityAnswerElement(text) {
    try {
      const container = document.querySelector('main') || document.body;
      const snippet = (text || '').trim();
      if (!snippet) return null;
      const selectors = [
        '[data-testid*="answer" i]',
        '[data-testid*="response" i]',
        'article',
        '.prose', '[class*="prose"]', '[class*="markdown"]',
        'section'
      ];
      let candidates = [];
      selectors.forEach(sel => { candidates = candidates.concat(Array.from(container.querySelectorAll(sel))); });
      if (!candidates.length) return null;

      const short = snippet.slice(0, Math.min(180, snippet.length));
      let best = null; let bestTop = -1; let bestScore = -1;
      for (const el of candidates) {
        const t = (el.textContent || '').trim();
        if (!t) continue;
        const os = this._overlapScore(short, t);
        if (os < Math.min(60, Math.floor(short.length * 0.35))) continue;
        // Prefer elements lower on the page (latest answers)
        const top = (el.getBoundingClientRect().top || 0) + window.scrollY;
        // Primary tie-breaker: higher overlap score; secondary: lower (later) position
        if (os > bestScore || (os === bestScore && top > bestTop)) {
          bestScore = os; bestTop = top; best = el;
        }
      }
      return best;
    } catch (_) {
      return null;
    }
  }

  // DeepSeek: locate assistant answer element heuristically
  findDeepseekAnswerElement(text) {
    try {
      const container = document.querySelector('.chat-container') || document.querySelector('main') || document.body;
      const snippet = (text || '').trim();
      const short = snippet.slice(0, Math.min(160, snippet.length));
      const messages = Array.from(container.querySelectorAll('.message, [class*="message"]'));
      if (!messages.length) return null;
      let best = null; let bestScore = -1; let bestTop = -1;
      for (const el of messages) {
        const roleEl = el.querySelector('[class*="message-role-"], [data-role], [data-author], [data-message-author-role]');
        const roleClass = roleEl ? (roleEl.className || '') : (el.className || '');
        const authorAttr = (roleEl?.getAttribute?.('data-message-author-role') || roleEl?.getAttribute?.('data-author') || roleEl?.getAttribute?.('data-role') || '').toLowerCase();
        const isAssistant = /assistant|model|bot/i.test(authorAttr) || /assistant/i.test(roleClass) || (!/user/i.test(roleClass));
        if (!isAssistant) continue;
        const content = el.querySelector('.message-content, .prose, [class*="content"], article, [data-testid*="response" i]') || el;
        const textContent = (content.textContent || '').trim();
        if (!textContent || textContent.length < 60) continue;
        const os = this._overlapScore(short, textContent);
        const top = (el.getBoundingClientRect().top || 0) + window.scrollY;
        if (os > bestScore || (os === bestScore && top > bestTop)) {
          bestScore = os; bestTop = top; best = el;
        }
      }
      return best;
    } catch (_) {
      return null;
    }
  }

  // DeepSeek: scrape latest assistant answer snippet
  scrapeDeepseekAnswerSnippet() {
    try {
      const container = document.querySelector('.chat-container') || document.querySelector('main') || document.body;
      const messages = Array.from(container.querySelectorAll('.message'));
      for (let i = messages.length - 1; i >= 0; i--) {
        const el = messages[i];
        const roleEl = el.querySelector('[class*="message-role-"]');
        const roleClass = roleEl ? (roleEl.className || '') : (el.className || '');
        const isAssistant = /assistant/i.test(roleClass) || (!/user/i.test(roleClass));
        if (!isAssistant) continue;
        const content = el.querySelector('.message-content, .prose, [class*="content"], article') || el;
        const t = (content.textContent || '').trim();
        if (t && t.length >= 60) return t;
      }
      return '';
    } catch (_) {
      return '';
    }
  }

  // Gemini: locate assistant answer element heuristically
  findGeminiAnswerElement(text) {
    try {
      const container = document.querySelector('main') || document.body;
      const snippet = (text || '').trim();
      const short = snippet.slice(0, Math.min(160, snippet.length));
      const selectors = [
        '[data-message-author-role="assistant"]',
        'article', '[class*="markdown"]', '[class*="prose"]',
        '.whitespace-pre-wrap', '.response', 'section',
        '[aria-live="polite"]', '[role="article"]', '[data-md]'
      ];
      let candidates = [];
      selectors.forEach(sel => { candidates = candidates.concat(Array.from(container.querySelectorAll(sel))); });
      if (!candidates.length) candidates = Array.from(container.querySelectorAll('p, div'));
      let best = null; let bestScore = -1; let bestTop = -1;
      for (const el of candidates) {
        const t = (el.textContent || '').trim();
        if (!t || t.length < 60) continue;
        const os = this._overlapScore(short, t);
        const top = (el.getBoundingClientRect().top || 0) + window.scrollY;
        if (os > bestScore || (os === bestScore && top > bestTop)) {
          bestScore = os; bestTop = top; best = el;
        }
      }
      return best;
    } catch (_) {
      return null;
    }
  }

  // Gemini: scrape latest assistant answer snippet
  scrapeGeminiAnswerSnippet() {
    try {
      const container = document.querySelector('main') || document.body;
      const selectors = [
        '[data-message-author-role="assistant"]',
        'article', '[class*="markdown"]', '[class*="prose"]',
        '.whitespace-pre-wrap', '.response', 'section'
      ];
      let candidates = [];
      selectors.forEach(sel => { candidates = candidates.concat(Array.from(container.querySelectorAll(sel))); });
      if (!candidates.length) candidates = Array.from(container.querySelectorAll('p, div'));
      for (let i = candidates.length - 1; i >= 0; i--) {
        const el = candidates[i];
        const t = (el.textContent || '').trim();
        if (t && t.length >= 60) return t;
      }
      return '';
    } catch (_) {
      return '';
    }
  }

  // Attach platform-specific answer: capture response preview and anchor element
  attachPlatformResponseAndAnchor() {
    try {
      if (!this.currentLLM) return;
      if (this.currentLLM.key !== 'deepseek' && this.currentLLM.key !== 'gemini') return;
      if (!this.prompts.length) return;
      const last = this.prompts[this.prompts.length - 1];
      // Capture response snippet
      let snippet = last.responsePreview;
      if (!snippet || !snippet.length) {
        snippet = this.currentLLM.key === 'deepseek' ? this.scrapeDeepseekAnswerSnippet() : this.scrapeGeminiAnswerSnippet();
        if (snippet && snippet.length) {
          last.responsePreview = snippet.substring(0, this.previewLength);
          this.renderPromptList();
          this.saveHistory();
        }
      }
      // Anchor element
      const finder = this.currentLLM.key === 'deepseek' ? this.findDeepseekAnswerElement.bind(this) : this.findGeminiAnswerElement.bind(this);
      const el = finder(last.responsePreview || last.text);
      if (el) {
        try { el.setAttribute('data-promptpath-anchor', String(last.index)); } catch(_) {}
      }
    } catch (_) { /* ignore */ }
  }
}

// Initialize the extension
let promptPath;

// Wait for page to load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    promptPath = new PromptPathExtension();
    promptPath.init();
  });
} else {
  promptPath = new PromptPathExtension();
  promptPath.init();
}

// Handle dynamic page changes (SPAs)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    if (promptPath) {
      promptPath.detectLLM();
      if (promptPath.currentLLM) {
        promptPath.createSidebar();
        promptPath.applyDisplaySettings();
        promptPath.loadHistory().then(() => {
          promptPath.renderPromptList();
        });
        promptPath.setupEventListeners();
        promptPath.updateTheme();
        promptPath.scrapePrompts();
      }
    }
  }
}).observe(document, { subtree: true, childList: true });

// Listen for settings updates from options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'settingsUpdated' && promptPath) {
    promptPath.settings = message.settings;
    promptPath.previewLength = parseInt(message.settings?.display?.previewLength || '200', 10);
    promptPath.sidebarPosition = (message.settings?.display?.sidebarPosition === 'left') ? 'left' : 'right';
    promptPath.sidebarWidth = parseInt(message.settings?.display?.sidebarWidth || '280', 10);
    promptPath.applyDisplaySettings();
    promptPath.updateTheme();
    sendResponse({ ok: true });
    return true;
  }
});