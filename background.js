// ==============================================
// PromptPath Background Service Worker
// ==============================================

console.log('PromptPath background service worker initialized');

// Default settings for new installations
const DEFAULT_SETTINGS = {
  platforms: {
    chatgpt: true,
    claude: true,
    gemini: true,
    deepseek: false,
    perplexity: false
  },
  display: {
    sidebarPosition: 'right',
    sidebarWidth: '280',
    previewLength: '200',
    showTimestamps: true,
    autoCollapse: false,
    darkMode: false,
    highlightColor: '#10a37f',
    animationSpeed: 'normal' // 'fast', 'normal', 'slow'
  }
};

// ==============================================
// Installation & Setup
// ==============================================

chrome.runtime.onInstalled.addListener((details) => {
  console.log(`PromptPath ${details.reason}`);
  
  if (details.reason === 'install') {
    // First-time installation
    chrome.storage.sync.set({ promptPathSettings: DEFAULT_SETTINGS }, () => {
      console.log('Default settings saved');
    });
  }
});

// ==============================================
// Message Handling
// ==============================================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Received message:', message.action);
  
  switch (message.action) {
    case 'getSettings':
      chrome.storage.sync.get(['promptPathSettings'], (result) => {
        const settings = result.promptPathSettings || DEFAULT_SETTINGS;
        console.log('Retrieved settings');
        sendResponse(settings);
      });
      return true; // Keep message channel open for async response
      
    case 'saveSettings':
      chrome.storage.sync.set({ promptPathSettings: message.settings }, () => {
        console.log('Settings saved');
        sendResponse({ success: true, timestamp: Date.now() });
      });
      return true;
      
    case 'ping':
      // Simple health check
      sendResponse({ status: 'alive', timestamp: Date.now() });
      break;
      
    default:
      console.log('Unknown message action:', message.action);
      sendResponse({ error: 'Unknown action' });
  }
});

// ==============================================
// Initialization
// ==============================================

console.log('PromptPath background service worker ready');