# System Tray Icon

Place your tray icon file here named `tray-icon.png`.

## Requirements

- **Size**: 16x16px (Windows), 22x22px (macOS), 32x32px (Linux)
- **Format**: PNG with transparency
- **Color**: Use a light color that contrasts with dark backgrounds
- **Style**: Simple, clean design

## Quick Start

For development, you can use any PNG icon. Recommended sizes:

- Windows: 16x16px
- macOS: 22x22px (supports template images)
- Linux: 32x32px

## Using Electron Icon Builder

You can generate tray icons from an SVG using electron-icon-builder:

```bash
electron-icon-builder --input=icon.svg --output=./resources --flatten
```

## Design Tips

- Keep it simple - small icons should be recognizable
- Use your brand colors
- Ensure good contrast on both light and dark backgrounds
- Consider creating a separate inverted version for dark mode
