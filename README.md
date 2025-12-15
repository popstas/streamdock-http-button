# StreamDock HTTP Button Plugin

A clean StreamDock plugin that displays content from a markdown file as button images and sends HTTP requests on button click.

## Features

- **Configurable MD File**: Set the path to a markdown file (relative to `public/` directory) that contains button content
- **HTTP Request on Click**: Configure a URL to send HTTP POST requests when buttons are pressed
- **SVG Button Images**: Automatically generates SVG images from markdown file content
- **Multi-line Text Support**: Each line in the MD file becomes a separate button with multi-line text display

## Project Structure

```
streamdock-http-button/
├── public/
│   ├── images/          # Plugin icons
│   ├── text.md          # Default markdown file with button content
│   └── interval.js      # Timer worker
├── src/
│   ├── hooks/           # Core hooks (plugin, property, i18n)
│   ├── plugin/          # Plugin logic and action handlers
│   ├── pages/           # Property inspector pages
│   ├── types/           # TypeScript definitions
│   └── manifest.cjs     # Plugin manifest
└── script/              # Build scripts
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the plugin:
```bash
npm run build
```

The plugin will be automatically copied to your StreamDock plugins directory.

## Development

Run the development server:
```bash
npm run dev
```

This will:
- Start Vite dev server on `http://localhost:5173`
- Watch for file changes
- Automatically copy files to StreamDock plugins directory

## Configuration

### Action Settings

Configure the plugin action in StreamDock's property inspector:

1. **MD File Path** (default: `text.md`)
   - Path to the markdown file relative to `public/` directory
   - Example: `text.md`, `content/buttons.md`

2. **HTTP URL** (required)
   - Full URL to send HTTP POST requests
   - Example: `https://example.com/api/button`

### Markdown File Format

Create a markdown file (e.g., `public/text.md`) with one line per button:

```
Button 1
Button 2
Button 3
Button 4
Button 5
```

Each line will be displayed as a separate button. Lines starting with "button content:" are ignored.

## HTTP Request Format

When a button is clicked, the plugin sends a POST request to the configured URL with the following body:

```json
{
  "path": "<line content from MD file>",
  "value": "<line content from MD file>"
}
```

For example, if the MD file contains:
```
lights/on
lights/off
```

Clicking the first button will send:
```json
{
  "path": "lights/on",
  "value": "lights/on"
}
```

## Plugin UUID

- Plugin UUID: `pro.popstas.httpbutton`
- Action UUID: `pro.popstas.httpbutton.httpButton`

## Building

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm start
```

## Running in Production

In production, StreamDock automatically launches the plugin with command-line arguments that provide the WebSocket connection details. The plugin checks for these arguments at runtime (see `src/hooks/plugin.ts:52`) to determine if it should connect to StreamDock:

- **Production mode**: When `window.argv` contains valid connection parameters, the plugin connects to StreamDock via WebSocket
- **Development mode**: When `window.argv` is missing or invalid, the plugin runs in development mode (no WebSocket connection)

### Production Setup

1. **Build the plugin**:
   ```bash
   npm run build
   ```

2. **Plugin location**: The build script automatically copies the plugin to:
   - Windows: `%APPDATA%\HotSpot\StreamDock\plugins\pro.popstas.httpbutton.sdPlugin`
   - The plugin files are copied automatically after build

3. **StreamDock launches the plugin**: When you add or use the plugin in StreamDock, it automatically:
   - Launches the HTML file (created by Vite build as `index.html`) from the plugin directory
   - Passes WebSocket connection parameters via `window.connectSDSocket()` function
   - These parameters populate `window.argv` with:
     - `argv[0]`: WebSocket port (string)
     - `argv[1]`: Plugin context UUID (string)
     - `argv[2]`: Registration event name (string, e.g., 'registerPlugin')
     - `argv[3]`: Plugin and application metadata (object)
     - `argv[4]`: Action payload (object, null for plugin, present for Property Inspector)

The plugin detects these parameters and automatically establishes a WebSocket connection to StreamDock for bidirectional communication. No manual setup is required - simply build the plugin and use it in StreamDock.

## License

This project is part of the StreamDock Plugin SDK.

