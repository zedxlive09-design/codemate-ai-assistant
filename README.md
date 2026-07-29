# CodeMate - Offline AI Coding Assistant

<div align="center">
  <img src="public/vite.svg" alt="CodeMate Logo" width="120" height="120">
  
  **Your Fully Offline AI Coding Assistant**
  
  [![Tauri](https://img.shields.io/badge/Tauri-2.0-blue)](https://tauri.app/)
  [![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
  [![Rust](https://img.shields.io/badge/Rust-Latest-orange)](https://www.rust-lang.org/)
</div>

---

## 🌟 Features

### Core Functionality
- ✅ **Fully Offline** - No internet connection required after setup
- ✅ **Local LLM Inference** - Run 7-8B models on CPU without GPU
- ✅ **Bilingual UI** - English + Urdu support
- ✅ **Lightweight** - Built with Tauri for minimal resource usage

### AI Capabilities
- 🤖 **Code Generation** - Write code in any programming language
- 🐛 **Debugging** - Find and fix bugs with detailed explanations
- 📝 **Documentation** - Generate comprehensive docs
- 🔍 **Code Analysis** - Understand and refactor existing code
- 💬 **Natural Chat** - Conversational interface for all tasks

### File Operations
- 📁 **File Explorer** - Browse project structure
- 📄 **Read/Write Files** - Direct file manipulation
- 🔎 **Search Codebase** - Regex-based code search
- 📊 **Project Analysis** - Language stats, line counts, structure

### Model Management
- ⚙️ **Model Manager** - Load/unload GGUF models
- 🎚️ **Inference Settings** - Temperature, top-k, top-p, etc.
- 📥 **Recommended Models** - Pre-configured optimal models

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CODEMATE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐    ┌─────────────┐    ┌──────────────┐   │
│   │   Frontend  │    │   Backend   │    │   Inference  │   │
│   │ (React/TS)  │◀──▶│   (Rust)    │◀──▶│  (llama.cpp) │   │
│   └─────────────┘    └─────────────┘    └──────────────┘   │
│         │                   │                   │           │
│         ▼                   ▼                   ▼           │
│   ┌─────────────┐    ┌─────────────┐    ┌──────────────┐   │
│   │   Tauri     │    │   File      │    │   GGUF       │   │
│   │   WebView   │    │   System    │    │   Models     │   │
│   └─────────────┘    └─────────────┘    └──────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
tauri-ai-assistant/
├── src-tauri/                 # Rust backend (Tauri)
│   ├── src/
│   │   ├── main.rs            # Entry point
│   │   ├── lib.rs             # App initialization
│   │   ├── model.rs           # Model management types
│   │   ├── project.rs         # Project module
│   │   ├── commands/          # Tauri commands
│   │   │   ├── mod.rs
│   │   │   ├── model.rs       # Model operations
│   │   │   ├── project.rs     # File/project ops
│   │   │   └── system.rs      # System info
│   │   └── project/           # Project utilities
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── src/                       # React frontend
│   ├── components/
│   │   ├── App.tsx            # Main app layout
│   │   ├── Sidebar.tsx        # Conversation list
│   │   ├── ChatArea.tsx       # Chat interface
│   │   ├── ChatInput.tsx      # Message input
│   │   ├── MessageBubble.tsx  # Message display
│   │   ├── FileExplorer.tsx   # File browser
│   │   ├── SettingsPanel.tsx  # Settings modal
│   │   └── ModelManager.tsx   # Model management
│   ├── store/
│   │   └── useStore.ts        # Zustand state store
│   ├── lib/
│   │   ├── masterPrompt.ts    # Master prompt architecture
│   │   └── tauri.ts           # Tauri command bridge
│   ├── types/
│   │   └── index.ts           # TypeScript types
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── public/                    # Static assets
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 🚀 Getting Started

### Prerequisites

1. **Rust Toolchain** (for Tauri backend)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Node.js 18+** (for frontend)
   ```bash
   # Using nvm
   nvm install 18
   nvm use 18
   ```

3. **System Dependencies**
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
   ```
   
   **macOS:**
   ```bash
   xcode-select --install
   ```
   
   **Windows:**
   ```powershell
   winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
   ```

### Installation

```bash
# Clone or navigate to project
cd tauri-ai-assistant

# Install frontend dependencies
npm install

# Start development mode
npm run tauri dev
```

### Building for Production

```bash
# Create production build
npm run tauri build
```

Output will be in `src-target/release/bundle/`.

---

## 🤖 Recommended Models

For CPU-only machines, these models provide the best balance of quality and performance:

| Model | Size | RAM Needed | Speed (CPU) | Best For |
|-------|------|------------|-------------|----------|
| **Qwen2.5-Coder-7B-Instruct-Q4_K_M** | ~4.7GB | ~6GB | 8-15 t/s | Coding |
| **DeepSeek-Coder-6.7B-Q4_K_M** | ~4.0GB | ~5GB | 10-18 t/s | Code |
| **Mistral-7B-Instruct-v0.3-Q4_K_M** | ~4.4GB | ~6GB | 8-14 t/s | General |
| **CodeGemma-7B-IT-Q4_K_M** | ~4.8GB | ~6GB | 8-12 t/s | Completion |

### Download Sources

1. **Hugging Face**: https://huggingface.co/models?search=gguf
2. **ModelScope**: https://modelscope.cn
3. **HuggingFace Mirror**: https://hf-mirror.com

### Setup Instructions

1. Download a Q4_K_M quantized GGUF file
2. Open CodeMate → Click "Model Manager" icon
3. Select "Select GGUF File"
4. Choose your downloaded model
5. Click "Load" - you're ready to chat!

---

## 🧠 Master Prompt Architecture

The system uses a sophisticated prompt architecture:

### Layers:
1. **Identity Layer** - Who is the AI?
2. **Capability Definition** - What can/can't it do?
3. **Output Format Rules** - How should responses look?
4. **Tool Usage Protocol** - When & how to use tools
5. **Context Management** - Handling limited context window
6. **Chain-of-Thinking** - Step-by-step reasoning
7. **Safety Boundaries** - Security constraints
8. **Performance Guidelines** - CPU optimization tips
9. **Bilingual Support** - English + Urdu handling

See `src/lib/masterPrompt.ts` for full implementation.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | New line |
| `Ctrl/Cmd + N` | New chat |

---

## 🌐 Bilingual Support

The UI supports both English and Urdu:

- **English**: Full professional interface
- **Urdu**: RTL support with Noto Nastaliq font
- **Mixed**: Technical terms remain in English

Toggle language in Settings panel.

---

## 🔧 Configuration

### Inference Settings

| Setting | Default | Range | Description |
|---------|---------|-------|-------------|
| Temperature | 0.7 | 0-2 | Creativity level |
| Top P | 0.9 | 0-1 | Nucleus sampling |
| Top K | 40 | 1-100 | Vocabulary limit |
| Max Tokens | 4096 | 256-8192 | Response length |
| Repeat Penalty | 1.1 | 1-2 | Repetition control |
| Threads | -1 | -1 to 32 | CPU threads (-1 = auto) |
| GPU Layers | 0 | 0+ | GPU offloading (0 = CPU only) |

---

## 🛡️ Security & Privacy

- ✅ **Fully Local** - No data leaves your machine
- ✅ **No Telemetry** - No analytics or tracking
- ✅ **No Accounts** - Works offline, no login needed
- ✅ **Open Source** - Transparent and auditable code
- ✅ **Sandboxed** - File access limited to project directory

---

## 📊 Performance Expectations

### By Hardware:

| Hardware | Expected Speed |
|----------|---------------|
| i5 12th gen (6 cores) | 8-12 tokens/sec |
| i7 13th gen (12 cores) | 15-25 tokens/sec |
| Ryzen 7 7800X3D | 20-30 tokens/sec |
| M2 MacBook (8 cores) | 18-28 tokens/sec |

### Optimization Tips:
1. Use Q4_K_M quantization (best quality/size ratio)
2. Set threads to physical core count
3. Close memory-intensive apps during use
4. Use SSD for model storage

---

## 🤝 Contributing

Contributions are welcome! Please read our guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Amazing Rust-based app framework
- [llama.cpp](https://github.com/ggerganov/llama.cpp) - LLM inference engine
- [React](https://reactjs.org/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Zustand](https://zustand-demo.pmnd.rs/) - State management

---

<div align="center">
  
**Made with ❤️ for developers who value privacy**

⭐ Star this repo if you find it helpful!

</div>
