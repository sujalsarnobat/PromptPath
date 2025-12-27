class OptionsManager {
    constructor() {
        this.defaultSettings = {
            platforms: {
                chatgpt: true,
                claude: true,
                gemini: true,
                deepseek: true,
                perplexity: true
            },
            display: {
                sidebarPosition: 'right',
                sidebarWidth: '280',
                previewLength: '200',
                showTimestamps: true,
                autoCollapse: false,
                darkMode: false
            }
        };
        
        this.currentSettings = null;
        this.init();
    }
    
    async init() {
        try {
            await this.loadSettings();
            this.bindEvents();
            this.updateUI();
        } catch (error) {
            console.error('Error initializing options:', error);
        }
    }
    
    async loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['promptPathSettings'], (result) => {
                if (result.promptPathSettings) {
                    // Use a simpler merge approach
                    this.currentSettings = {
                        platforms: {
                            ...this.defaultSettings.platforms,
                            ...(result.promptPathSettings.platforms || {})
                        },
                        display: {
                            ...this.defaultSettings.display,
                            ...(result.promptPathSettings.display || {})
                        }
                    };
                } else {
                    this.currentSettings = JSON.parse(JSON.stringify(this.defaultSettings));
                }
                console.log('Loaded settings:', this.currentSettings);
                resolve();
            });
        });
    }
    
    updateUI() {
        if (!this.currentSettings) {
            console.error('Settings not loaded yet');
            return;
        }
        
        // Platform toggles - check each platform individually
        const platforms = this.currentSettings.platforms || {};
        
        // Check each platform toggle individually
        if (platforms.chatgpt !== undefined) {
            const toggle = document.getElementById('toggleChatGPT');
            if (toggle) {
                toggle.checked = platforms.chatgpt;
                this.updateCardState('chatgpt', platforms.chatgpt);
            }
        }
        
        if (platforms.claude !== undefined) {
            const toggle = document.getElementById('toggleClaude');
            if (toggle) {
                toggle.checked = platforms.claude;
                this.updateCardState('claude', platforms.claude);
            }
        }
        
        if (platforms.gemini !== undefined) {
            const toggle = document.getElementById('toggleGemini');
            if (toggle) {
                toggle.checked = platforms.gemini;
                this.updateCardState('gemini', platforms.gemini);
            }
        }
        
        if (platforms.deepseek !== undefined) {
            const toggle = document.getElementById('toggleDeepSeek');
            if (toggle) {
                toggle.checked = platforms.deepseek;
                this.updateCardState('deepseek', platforms.deepseek);
            }
        }
        
        if (platforms.perplexity !== undefined) {
            const toggle = document.getElementById('togglePerplexity');
            if (toggle) {
                toggle.checked = platforms.perplexity;
                this.updateCardState('perplexity', platforms.perplexity);
            }
        }
        
        // Display settings
        const display = this.currentSettings.display || {};
        
        const sidebarPosition = document.getElementById('sidebarPosition');
        if (sidebarPosition) sidebarPosition.value = display.sidebarPosition || 'right';
        
        const sidebarWidth = document.getElementById('sidebarWidth');
        if (sidebarWidth) sidebarWidth.value = display.sidebarWidth || '280';
        
        const previewLength = document.getElementById('previewLength');
        if (previewLength) previewLength.value = display.previewLength || '200';
        
        const showTimestamps = document.getElementById('showTimestamps');
        if (showTimestamps) showTimestamps.checked = display.showTimestamps !== false;
        
        const autoCollapse = document.getElementById('autoCollapse');
        if (autoCollapse) autoCollapse.checked = !!display.autoCollapse;
        
        const darkMode = document.getElementById('darkMode');
        if (darkMode) darkMode.checked = !!display.darkMode;
    }
    
    updateCardState(platform, isActive) {
        const card = document.querySelector(`.platform-card[data-platform="${platform}"]`);
        if (card) {
            card.classList.toggle('active', isActive);
        }
    }
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    
    bindEvents() {
        // Platform toggle clicks - bind each one individually
        document.querySelectorAll('.platform-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.type === 'checkbox') return;
                
                const toggle = card.querySelector('input[type="checkbox"]');
                if (toggle && this.currentSettings && this.currentSettings.platforms) {
                    toggle.checked = !toggle.checked;
                    const platform = card.dataset.platform;
                    card.classList.toggle('active', toggle.checked);
                    
                    if (platform) {
                        this.currentSettings.platforms[platform] = toggle.checked;
                    }
                }
            });
        });
        
        // Individual toggle switch changes
        const toggleIds = ['toggleChatGPT', 'toggleClaude', 'toggleGemini', 'toggleDeepSeek', 'togglePerplexity'];
        toggleIds.forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    const platform = id.replace('toggle', '').toLowerCase();
                    if (this.currentSettings && this.currentSettings.platforms) {
                        this.currentSettings.platforms[platform] = e.target.checked;
                        this.updateCardState(platform, e.target.checked);
                    }
                });
            }
        });
        
        // Display toggles
        const displayToggles = ['showTimestamps', 'autoCollapse', 'darkMode'];
        displayToggles.forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.addEventListener('change', (e) => {
                    if (this.currentSettings && this.currentSettings.display) {
                        this.currentSettings.display[id] = e.target.checked;
                    }
                });
            }
        });
        
        // Select dropdowns
        const selects = ['sidebarPosition', 'sidebarWidth', 'previewLength'];
        selects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.addEventListener('change', (e) => {
                    if (this.currentSettings && this.currentSettings.display) {
                        this.currentSettings.display[id] = e.target.value;
                    }
                });
            }
        });
        
        // Save button
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveSettings());
        }
        
        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('Reset all settings to defaults?')) {
                    this.resetToDefaults();
                }
            });
        }
        
        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveSettings();
            }
        });
    }
    
    async saveSettings() {
        if (!this.currentSettings) {
            this.showStatus('Settings not loaded', 'error');
            return;
        }
        
        try {
            await new Promise((resolve) => {
                chrome.storage.sync.set({
                    promptPathSettings: this.currentSettings
                }, resolve);
            });
            
            this.showStatus('Settings saved!', 'success');
            
            // Notify content scripts
            this.notifyContentScripts();
            
            // Close after delay only when opened as the action popup
            try {
                const isPopup = !!(chrome.extension && chrome.extension.getViews &&
                    chrome.extension.getViews({ type: 'popup' }).some(view => view === window));
                if (isPopup) {
                    setTimeout(() => window.close(), 1500);
                }
            } catch (e) {
                // Ignore close errors in tab context
            }
            
        } catch (error) {
            console.error('Save error:', error);
            this.showStatus('Save failed', 'error');
        }
    }
    
    async notifyContentScripts() {
        try {
            const tabs = await chrome.tabs.query({
                url: [
                    'https://chat.openai.com/*',
                    'https://chatgpt.com/*',
                    'https://claude.ai/*',
                    'https://gemini.google.com/*',
                    'https://chat.deepseek.com/*',
                    'https://deepseek.com/*',
                    'https://www.deepseek.com/*',
                    'https://www.perplexity.ai/*',
                    'https://perplexity.ai/*'
                ]
            });
            
            for (const tab of tabs) {
                try {
                    await chrome.tabs.sendMessage(tab.id, {
                        action: 'settingsUpdated',
                        settings: this.currentSettings
                    });
                } catch (error) {
                    // Tab might not have content script
                }
            }
        } catch (error) {
            console.log('Notification error:', error);
        }
    }
    
    async resetToDefaults() {
        this.currentSettings = JSON.parse(JSON.stringify(this.defaultSettings));
        
        try {
            await new Promise((resolve) => {
                chrome.storage.sync.set({
                    promptPathSettings: this.currentSettings
                }, resolve);
            });
            
            this.updateUI();
            this.showStatus('Reset to defaults!', 'success');
            this.notifyContentScripts();
            
        } catch (error) {
            console.error('Reset error:', error);
            this.showStatus('Reset failed', 'error');
        }
    }
    
    showStatus(message, type = 'success') {
        // Create or get status element
        let statusEl = document.getElementById('statusMessage');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'statusMessage';
            statusEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 8px;
                z-index: 10000;
                font-family: Arial;
                font-size: 14px;
                background-color: ${type === 'success' ? '#d4edda' : '#f8d7da'};
                color: ${type === 'success' ? '#155724' : '#721c24'};
                border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
                display: block;
                animation: fadeIn 0.3s ease;
            `;
            document.body.appendChild(statusEl);
        }
        
        statusEl.textContent = message;
        statusEl.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
        statusEl.style.color = type === 'success' ? '#155724' : '#721c24';
        statusEl.style.borderColor = type === 'success' ? '#c3e6cb' : '#f5c6cb';
        statusEl.style.display = 'block';
        
        setTimeout(() => {
            statusEl.style.display = 'none';
        }, 3000);
    }
    
    async getSettings() {
        await this.loadSettings();
        return this.currentSettings;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const optionsManager = new OptionsManager();
    window.optionsManager = optionsManager;
    
    // Handle messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'getSettings') {
            optionsManager.getSettings().then(settings => {
                sendResponse(settings);
            });
            return true;
        }
    });
});