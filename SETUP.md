# 🚀 CodeMate AI Assistant - Setup Guide

## 📦 Repository Pushed Successfully! ✅

**GitHub URL:** https://github.com/zedxlive09-design/codemate-ai-assistant

---

## 📋 Prerequisites (Requirements)

### 1. System Requirements
- **OS**: Windows 10/11, macOS (Intel/M1+), or Linux (Ubuntu 20.04+, Fedora, etc.)
- **RAM**: Minimum 8GB (16GB recommended for smooth operation)
- **Storage**: ~10GB free space (for app + model files)
- **CPU**: Any modern multi-core processor (i5/Ryzen 5 or better recommended)

### 2. Required Software

#### For All Platforms:
| Software | Version | Purpose |
|----------|---------|---------|
| [Node.js](https://nodejs.org/) | 18+ LTS | Frontend build system |
| [Rust](https://www.rust-lang.org/tools/install) | Stable (latest) | Tauri backend |
| [Git](https://git-scm.com/) | Latest | Version control |

#### Platform-Specific:

**Windows:**
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
- Or install Visual Studio 2022 with "C++ development" workload

**macOS:**
- Xcode Command Line Tools: `xcode-select --install`

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf openssl libssl-dev pkg-config cmake
```

**Linux (Fedora):**
```bash
sudo dnf install -y webkit2gtk4.1-devel openssl-devel librsvg2-devel patchelf cmake gcc
```

---

## 🔧 Installation Steps

### Step 1: Clone the Repository
```bash
git clone https://github.com/zedxlive09-design/codemate-ai-assistant.git
cd codemate-ai-assistant
```

### Step 2: Install Frontend Dependencies
```bash
npm install
```
*This will install React, TypeScript, Tailwind CSS, and all UI libraries*

### Step 3: Verify Installation
```bash
# Check Node version (should be 18+)
node --version

# Check npm version
npm --version

# Check Rust version (should be latest stable)
rustc --version
```

---

## 🏃 Running the Application

### Development Mode (For Testing)
```bash
npm run tauri dev
```
This will:
1. Start Vite dev server on port 1420
2. Launch Tauri window with hot-reload
3. Open DevTools automatically (in debug mode)

### Production Build
```bash
npm run tauri build
```
Output will be in `src-target/release/bundle/`:
- **Windows**: `.msi` installer + `.exe` portable
- **Mac**: `.dmg` disk image + `.app`
- **Linux**: `.deb`, `.AppImage`, `.rpm`

---

## 🤖 Downloading AI Model (Required for Chat)

The app needs a GGUF model file to work. Here's how to get one:

### Recommended Models (CPU Optimized):

| Model | Size | RAM Needed | Best For |
|-------|------|------------|----------|
| **Qwen2.5-Coder-7B-Instruct-Q4_K_M** | 4.7 GB | ~6 GB | Coding tasks ⭐ |
| **DeepSeek-Coder-6.7B-Q4_K_M** | 4.0 GB | ~5 GB | Code generation |
| **Mistral-7B-Instruct-v0.3-Q4_K_M** | 4.4 GB | ~6 GB | General purpose |

### Download Sources:

#### Option A: HuggingFace (Recommended)
1. Go to: https://huggingface.co/models?search=gguf
2. Search for model name (e.g., "Qwen2.5-Coder")
3. Click "Files and versions" tab
4. Download the `Q4_K_M.gguf` file (~4-5GB)

#### Option B: HuggingFace Mirror (Faster in some regions)
1. Go to: https://hf-mirror.com
2. Search same as above

#### Option C: ModelScope (China-friendly)
1. Go to: https://modelscope.cn
2. Search for model name

### Where to Put Model File:
After downloading:
1. Open CodeMate app
2. Click **Model Manager** icon (🖥️) or press `Ctrl+M`
3. Click **Select GGUF File**
4. Choose your downloaded `.gguf` file
5. Click **Load**

Or manually place it in:
- **Windows**: `%APPDATA%/codemate/models/`
- **macOS**: `~/.codemate/models/`
- **Linux**: `~/.codemate/models/`

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `⌘K` | Open Command Palette |
| `Ctrl+N` / `⌘N` | New Chat |
| `Ctrl+B` / `⌘B` | Toggle Sidebar |
| `Ctrl+E` / `⌘E` | Toggle File Explorer |
| `Ctrl+M` / `⌘M` | Open Model Manager |
| `Ctrl+,` / `⌘,` | Open Settings |
| `Ctrl+/` / `⌘/` | Show Shortcuts Help |
| `Enter` | Send message |
| `Shift+Enter` | New line in input |
| `Escape` | Close modal/dialog |

---

## 🎨 Features Overview

### Core Features:
- ✅ **Fully Offline** - No internet needed after setup
- ✅ **Local AI Inference** - Runs 7-8B models on CPU
- ✅ **Bilingual UI** - English + Urdu support
- ✅ **Chat Interface** - Markdown rendering, code highlighting
- ✅ **File Explorer** - Browse & analyze projects
- ✅ **Model Manager** - Load/unload GGUF models
- ✅ **Conversation Export/Import** - JSON, MD, TXT, CSV formats

### Advanced Features:
- ✨ **Command Palette** (Ctrl+K) - Quick access to all features
- ✨ **Toast Notifications** - Success/error feedback
- ✨ **Keyboard Shortcuts Modal** - Full reference
- ✨ **Premium Glassmorphism UI** - Modern design
- ✨ **Project Analysis** - Language stats, line counts
- ✨ **Settings Panel** - Temperature, top-k, threads config

---

## 🐛 Troubleshooting

### Issue: "Rust not found"
**Solution:** Install Rust from https://rustup.rs/
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Issue: "webkit2gtk not found" (Linux)
**Solution:** Install dependencies:
```bash
sudo apt install libwebkit2gtk-4.1-dev librsvg2-dev
```

### Issue: "Model not loading"
**Solution:** 
1. Ensure you have a valid `.gguf` file
2. File should be Q4_K_M quantization (recommended)
3. Check you have enough RAM (model size + 2GB overhead)

### Issue: "Slow response generation"
**Solution:**
1. Close other memory-intensive apps
2. Set threads to physical core count in Settings
3. Use Q4_K_M quantization (best speed/quality balance)

### Issue: "Build fails on Windows"
**Solution:**
1. Install Visual Studio Build Tools
2. Run from Developer Command Prompt
3. Try: `npm run tauri build -- --target x86_64-pc-windows-msvc`

---

## 📁 Project Structure
```
codemate-ai-assistant/
├── src-tauri/              # Rust backend (Tauri)
│   ├── src/
│   │   ├── commands/       # API commands
│   │   ├── main.rs         # Entry point
│   │   └── lib.rs          # App setup
│   └── Cargo.toml
│
├── src/                    # React frontend
│   ├── components/        # UI components
│   ├── store/             # State management
│   ├── lib/               # Utilities
│   ├── types/             # TypeScript types
│   └── App.tsx            # Main component
│
├── public/                # Static assets
├── package.json           # Node dependencies
├── vite.config.ts         # Vite configuration
└── tailwind.config.js     # Tailwind CSS config
```

---

## 🛠️ Development Tips

### Adding New Commands (Tauri Backend):
Edit `src-tauri/src/commands/*.rs` and register in `lib.rs`

### Adding New Components (Frontend):
Create in `src/components/` and import in `App.tsx`

### Modifying Styles:
Edit `src/index.css` - uses Tailwind + custom CSS

### Changing Prompt Template:
Edit `src/lib/masterPrompt.ts` - Master Prompt Architecture

---

## 📄 License

MIT License - Free to use, modify, distribute

---

## 💬 Support & Community

- 📧 Issues: https://github.com/zedxlive09-design/codemate-ai-assistant/issues
- 💬 Discussions: https://github.com/zedxlive09-design/codemate-ai-assistant/discussions
- ⭐ Star the repo if you find it helpful!

---

## 🙏 Acknowledgments

- [Tauri](https://tauri.app/) - Amazing desktop framework
- [llama.cpp](https://github.com/ggerganov/llama.cpp) - LLM inference engine
- [React](https://reactjs.org/) - UI library
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Zustand](https://zustand-demo.pmnd.rs/) - State management

---

<div align="center">

**Made with ❤️ for developers who value privacy**

⭐ If this helped you, please star the repo!

</div>
