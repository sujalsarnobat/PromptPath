# PromptPath - LLM Navigator

A Chrome extension that provides structured prompt history for multiple LLM platforms.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- 📋 **Prompt History Tracking** — Automatically captures and lists all your prompts
- 🔄 **Multi-Platform Support** — Works across ChatGPT, Claude, Gemini, DeepSeek, and Perplexity
- 💾 **Persistent Storage** — Prompts are saved per conversation and persist across sessions
- 🎯 **Quick Navigation** — Click any prompt to scroll directly to that message
- 📤 **Export Functionality** — Export your prompt history as JSON
- 🌙 **Dark Mode** — Clean dark interface that matches LLM platforms
- ⚙️ **Customizable** — Adjust sidebar position, width, and platform toggles

## Supported Platforms

| Platform | Status |
|----------|--------|
| ChatGPT (chat.openai.com, chatgpt.com) | ✅ Full Support |
| Claude (claude.ai) | ✅ Full Support |
| Gemini (gemini.google.com) | ✅ Supported |
| DeepSeek (chat.deepseek.com, deepseek.com) | ✅ Supported |
| Perplexity (perplexity.ai) | ✅ Supported |

## Installation

### From Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/sujalsarnobat/PromptPath.git
   ```

2. Open Chrome and navigate to `chrome://extensions`

3. Enable **Developer Mode** (toggle in top-right corner)

4. Click **Load unpacked**

5. Select the cloned `PromptPath` folder

6. The extension is now installed! Visit any supported LLM platform to see the sidebar.

### From Chrome Web Store

*Coming soon*

## Usage

1. Navigate to any supported LLM platform (ChatGPT, Claude, etc.)
2. A sidebar will appear on the right side of the page
3. Start chatting — your prompts will automatically appear in the sidebar
4. Click any prompt to navigate directly to that message
5. Use **Clear** to reset the list or **Export** to download as JSON

## Configuration

Click the extension icon to access settings:

- **Platform Toggles** — Enable/disable tracking for specific platforms
- **Sidebar Position** — Left or right side of the screen
- **Sidebar Width** — Adjust the sidebar width (200-400px)
- **Preview Length** — How much of each prompt to display
- **Auto Collapse** — Start with sidebar collapsed

## Project Structure

```
PromptPath/
├── manifest.json        # Extension manifest (MV3)
├── background.js        # Service worker
├── content.js           # Main content script
├── sidebar.html         # Sidebar HTML template
├── sidebar.css          # Sidebar styles
├── options/
│   ├── options.html     # Settings page
│   └── options.js       # Settings logic
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Privacy

This extension:
- ✅ Stores data locally using `chrome.storage`
- ✅ Does NOT send any data to external servers
- ✅ Does NOT track user behavior
- ✅ Only accesses the specific LLM domains listed in the manifest

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by the need for better prompt organization across LLM platforms
- Built with vanilla JavaScript for minimal footprint

---

**Made with ❤️ for the AI community**
