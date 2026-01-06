# Prompt Modifier

A powerful node-based visual editor for constructing, refining, and executing complex Generative AI workflows using the Google Gemini API.

## 🌟 Features

*   **Visual Flow Editor**: Intuitive drag-and-drop interface to create complex logic chains using nodes.
*   **Multi-Modal Support**: Seamlessly handle Text, Images, Video, and Audio within the same workspace.
*   **Deep Gemini Integration**:
    *   **Text**: Chat, Translation, Prompt Enhancement, and Sanitization.
    *   **Images**: Generation (Imagen 3/4), Analysis, and AI-powered Editing (Inpainting/Outpainting).
    *   **Video**: Generation using Veo models and Video Prompt processing.
*   **Specialized Workflow Tools**:
    *   **Sequence Generator**: Create consistent image sequences for animation or storytelling.
    *   **Script Generator**: Turn ideas into structured screenplays with scenes and characters.
    *   **Character Consistency**: Tools to generate, store, and reuse character definitions.
*   **Media Tools**: Built-in Media Viewer with waveform display, markers, and playback controls.
*   **Multilingual**: Fully localized interface supporting 11 languages (EN, RU, ES, DE, FR, IT, PT, UZ, ZH, JA, KO).
*   **Local & Secure**: Projects are saved locally as JSON files. API keys are stored in your browser's local storage.

## 🚀 Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or higher)
*   npm or yarn
*   A Google Gemini API Key (Get it from [Google AI Studio](https://aistudio.google.com/app/apikey))

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/prompt-modifier.git
    cd prompt-modifier
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```

4.  **Open the app:**
    Navigate to `http://localhost:5173` in your browser.

### Configuration

To start using AI features, you need to configure your API Key. You can do this in two ways:

1.  **In the App:** Click the **Settings** (gear icon) in the top-left toolbar and enter your key.
2.  **Environment Variable:** Create a `.env` file in the root directory (for local dev):
    ```env
    API_KEY=your_actual_api_key_here
    ```

## 🎮 Usage Guide

*   **Adding Nodes**: 
    *   Press `F` to open the search menu.
    *   Double-click on the background to open the Quick Add menu.
    *   Use the bottom toolbar.
*   **Navigation**:
    *   **Pan**: Hold `Space` or Middle Mouse Button and drag.
    *   **Zoom**: Scroll wheel (or hold `Z` and drag).
*   **Connecting**: Drag from an output handle (right side of a node) to an input handle (left side of another node).
*   **Hotkeys**: Click the **Home** icon in the toolbar and open the "Help & Hotkeys" panel for a full list.

## 📄 License

This project is licensed under the GNU General Public License v3.0 - see the [LICENSE](LICENSE) file for details.

## ✍️ Author

Created by **MeowMaster**.
Email: MeowMasterArt@gmail.com
