import React, { useEffect, useRef, useState } from 'react';
import './Manual.css';

interface ManualProps {
  onBack: () => void;
}

interface Chapter {
  id: string;
  title: string;
  content: React.ReactNode;
}

const chapters: Chapter[] = [
  {
    id: 'getting-started',
    title: '1. Getting Started',
    content: (
      <>
        <p>
          Carousel Studio is a free, browser-based tool for creating Instagram
          carousel posts with seamless, professional layouts. Everything runs
          locally in your browser — your images are never uploaded to any server.
        </p>
        <h3>How It Works</h3>
        <ol>
          <li><strong>Pick a layout</strong> — choose from 10 preset layouts or build your own custom layout.</li>
          <li><strong>Choose an aspect ratio</strong> — Square (1:1), Portrait (4:5), Story (9:16), or Landscape (1.91:1).</li>
          <li><strong>Set a background</strong> — pick from presets or create a custom solid/gradient.</li>
          <li><strong>Add your images</strong> — click slots to upload, or use batch upload.</li>
          <li><strong>Customize</strong> — add text overlays, shapes, filters, and adjust positioning.</li>
          <li><strong>Export</strong> — download all slides as a ZIP file ready for Instagram.</li>
        </ol>
        <h3>System Requirements</h3>
        <p>
          Carousel Studio works in any modern browser (Chrome, Firefox, Safari, Edge).
          No installation needed. Works on desktop, tablet, and mobile devices.
        </p>
      </>
    ),
  },
  {
    id: 'layouts',
    title: '2. Preset Layouts',
    content: (
      <>
        <p>
          Carousel Studio includes 10 preset layouts, each designed for a specific
          visual style. Layouts define how many photos you need and how they're
          arranged across slides.
        </p>
        <h3>Available Layouts</h3>
        <table className="manual__table">
          <thead>
            <tr><th>Layout</th><th>Photos</th><th>Slides</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td>Triptych</td><td>3</td><td>2</td><td>Classic three-panel split across two slides</td></tr>
            <tr><td>Horizon</td><td>3</td><td>2</td><td>Horizontal panoramic split</td></tr>
            <tr><td>Mosaic</td><td>4</td><td>2</td><td>Mixed-size tiles for visual variety</td></tr>
            <tr><td>Cascade</td><td>5</td><td>3</td><td>Cascading panels with overlapping edges</td></tr>
            <tr><td>Grid Flow</td><td>5</td><td>3</td><td>Structured grid arrangement</td></tr>
            <tr><td>Panorama</td><td>2</td><td>2</td><td>Wide panoramic split for landscape photos</td></tr>
            <tr><td>Staircase</td><td>3</td><td>3</td><td>Stepped diagonal layout</td></tr>
            <tr><td>Spotlight</td><td>4</td><td>3</td><td>One large hero image with supporting panels</td></tr>
            <tr><td>Weave</td><td>4</td><td>3</td><td>Interlocking panels for dynamic flow</td></tr>
            <tr><td>Gallery</td><td>6</td><td>4</td><td>Multi-image gallery spread</td></tr>
          </tbody>
        </table>
        <h3>How to Use</h3>
        <p>
          Click any layout card in the picker at the top of the app. The card shows
          a miniature preview of how images will be arranged. Once selected, the
          editor below will show the corresponding empty slots for you to fill.
        </p>
      </>
    ),
  },
  {
    id: 'custom-layout',
    title: '3. Custom Layout Builder',
    content: (
      <>
        <p>
          For complete creative control, use the Custom Layout Builder. It lets you
          draw slots on a grid and arrange them freely across multiple slides.
        </p>
        <h3>Opening the Builder</h3>
        <p>
          Click the <strong>"Custom"</strong> card in the layout picker. This opens
          the builder in a dedicated full-screen view.
        </p>
        <h3>Drawing Slots</h3>
        <ol>
          <li>Enter <strong>Draw Mode</strong> by clicking the draw button (pencil icon).</li>
          <li>Click and drag on the grid to draw a rectangular slot.</li>
          <li>Release to place the slot. Each slot is color-coded for easy identification.</li>
          <li>Press <strong>Escape</strong> to exit draw mode.</li>
        </ol>
        <h3>Editing Slots</h3>
        <ul>
          <li><strong>Move</strong> — click and drag a slot to reposition it.</li>
          <li><strong>Resize</strong> — drag any of the 8 handles (corners + edges) to resize.</li>
          <li><strong>Delete</strong> — select a slot and press <strong>Delete</strong> or <strong>Backspace</strong>.</li>
        </ul>
        <h3>Slide Count</h3>
        <p>
          Use the slide count stepper (1-20) to set how many slides your carousel
          has. The grid updates to show all slides side by side.
        </p>
        <h3>Clear All</h3>
        <p>
          Click "Clear All" to remove every slot and start fresh.
        </p>
        <h3>Finishing</h3>
        <p>
          Click <strong>"Done"</strong> to apply the layout to the main editor, or
          <strong>"Cancel"</strong> to discard changes and return.
        </p>
      </>
    ),
  },
  {
    id: 'layers',
    title: '4. Layers',
    content: (
      <>
        <p>
          Layers allow you to stack multiple sets of image slots on top of each
          other within a single custom layout. This enables overlapping photo
          collages and foreground/background compositions.
        </p>
        <h3>Key Concepts</h3>
        <ul>
          <li><strong>Layer 1 (Background)</strong> — always exists, cannot be deleted. Gets the global background color/gradient.</li>
          <li><strong>Upper layers</strong> — transparent where no images are placed, allowing lower layers to show through.</li>
          <li><strong>Per-layer overlays</strong> — each layer has its own text and shape overlays rendered at that layer's depth.</li>
          <li><strong>Maximum 5 layers</strong> per custom layout.</li>
        </ul>
        <h3>Layers in the Builder</h3>
        <p>
          The Custom Layout Builder includes a full layer panel where you can:
        </p>
        <ul>
          <li><strong>Add</strong> new layers (up to 5)</li>
          <li><strong>Remove</strong> layers (except Layer 1)</li>
          <li><strong>Rename</strong> layers (double-click the name)</li>
          <li><strong>Select</strong> a layer to edit its slots</li>
        </ul>
        <p>
          The active layer's slots are fully interactive; other layers appear
          dimmed at reduced opacity.
        </p>
        <h3>Layers in the Main Editor</h3>
        <p>
          On <strong>desktop</strong>, a vertical sidebar appears to the right of
          the canvas showing all layers. You can select the active layer, toggle
          visibility, and rename — but you cannot add or remove layers here (go
          back to the builder for that).
        </p>
        <p>
          On <strong>mobile</strong>, a floating pill button (e.g. "Layer 2/3")
          appears above the canvas. Tap it to open a popover with the layer list.
        </p>
        <h3>How Layers Export</h3>
        <p>
          During export, layers are composited in order: background first, then
          Layer 1 (images + overlays), then Layer 2, and so on. The final result
          is a flat image per slide with all layers merged.
        </p>
      </>
    ),
  },
  {
    id: 'aspect-ratios',
    title: '5. Aspect Ratios',
    content: (
      <>
        <p>
          Carousel Studio supports four aspect ratios optimized for Instagram:
        </p>
        <table className="manual__table">
          <thead>
            <tr><th>Ratio</th><th>Label</th><th>Resolution</th><th>Best For</th></tr>
          </thead>
          <tbody>
            <tr><td>1:1</td><td>Square</td><td>1080 x 1080</td><td>Standard carousel posts</td></tr>
            <tr><td>4:5</td><td>Portrait</td><td>1080 x 1350</td><td>Maximum feed visibility</td></tr>
            <tr><td>9:16</td><td>Story</td><td>1080 x 1920</td><td>Stories and Reels</td></tr>
            <tr><td>1.91:1</td><td>Landscape</td><td>1080 x 566</td><td>Wide/cinematic shots</td></tr>
          </tbody>
        </table>
        <p>
          Change the aspect ratio at any time using the selector below the layout
          picker. Your images and overlays will be preserved — only the canvas
          proportions change.
        </p>
      </>
    ),
  },
  {
    id: 'backgrounds',
    title: '6. Backgrounds',
    content: (
      <>
        <p>
          The background fills any visible area behind your image slots. In
          layered layouts, only the bottom layer (Layer 1) shows the background.
        </p>
        <h3>Preset Backgrounds</h3>
        <p>Click any swatch to apply it instantly:</p>
        <ul>
          <li><strong>White</strong> — clean, minimal</li>
          <li><strong>Light Gray</strong> — subtle, professional</li>
          <li><strong>Dark</strong> — dramatic contrast</li>
          <li><strong>Black</strong> — bold, cinematic</li>
          <li><strong>Warm</strong> — soft peach tone</li>
          <li><strong>Purple Gradient</strong> — vibrant gradient</li>
          <li><strong>Sunset</strong> — warm orange-to-pink gradient</li>
          <li><strong>Ocean</strong> — cool blue-to-teal gradient</li>
        </ul>
        <h3>Custom Backgrounds</h3>
        <p>
          Click the custom swatch (gear icon) to open the custom background panel.
          Choose between:
        </p>
        <ul>
          <li><strong>Solid color</strong> — pick any color using the color picker.</li>
          <li><strong>Gradient</strong> — choose two colors and an angle (0-360 degrees) for a linear gradient.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'images',
    title: '7. Working with Images',
    content: (
      <>
        <h3>Adding Images</h3>
        <ul>
          <li><strong>Click a slot</strong> — opens a file picker to select one image.</li>
          <li><strong>Drag and drop</strong> — drag an image file from your desktop onto any slot.</li>
          <li><strong>Batch upload</strong> — click the batch upload icon in the action bar to select multiple images at once. They fill empty slots in order.</li>
        </ul>
        <h3>Repositioning Images</h3>
        <p>
          Once an image is placed, <strong>click and drag</strong> within the slot
          to pan the image. This adjusts the visible portion without cropping —
          think of it like moving a photo behind a frame.
        </p>
        <h3>Replacing and Removing</h3>
        <ul>
          <li><strong>Replace</strong> — hover over a filled slot and click the replace button to swap the image.</li>
          <li><strong>Remove</strong> — hover and click the remove (X) button to clear the slot.</li>
        </ul>
        <h3>Image Limits</h3>
        <ul>
          <li>Maximum file size: <strong>50 MB</strong> per image</li>
          <li>SVG files are not supported</li>
          <li>Large images are automatically compressed to a max dimension of 3240px</li>
        </ul>
      </>
    ),
  },
  {
    id: 'filters',
    title: '8. Image Filters',
    content: (
      <>
        <p>
          Each image has its own set of filters. Select a filled image slot to
          reveal the filter toolbar.
        </p>
        <h3>Filter Presets</h3>
        <ul>
          <li><strong>None</strong> — original image (default)</li>
          <li><strong>Grayscale</strong> — black and white</li>
          <li><strong>Sepia</strong> — warm vintage tone</li>
          <li><strong>Invert</strong> — color inversion</li>
        </ul>
        <h3>Manual Adjustments</h3>
        <p>Fine-tune each image with these sliders:</p>
        <table className="manual__table">
          <thead>
            <tr><th>Filter</th><th>Range</th><th>Default</th></tr>
          </thead>
          <tbody>
            <tr><td>Blur</td><td>0 - 20 px</td><td>0</td></tr>
            <tr><td>Brightness</td><td>0 - 200%</td><td>100%</td></tr>
            <tr><td>Contrast</td><td>0 - 200%</td><td>100%</td></tr>
            <tr><td>Saturation</td><td>0 - 200%</td><td>100%</td></tr>
            <tr><td>Opacity</td><td>0 - 100%</td><td>100%</td></tr>
          </tbody>
        </table>
        <p>
          Filters are applied non-destructively and are preserved during export.
          The blur effect is properly scaled to the export resolution.
        </p>
      </>
    ),
  },
  {
    id: 'text-overlays',
    title: '9. Text Overlays',
    content: (
      <>
        <p>
          Add text on top of your carousel slides for captions, titles, watermarks,
          or any other messaging.
        </p>
        <h3>Adding Text</h3>
        <p>
          Click the <strong>T</strong> icon in the action bar. A new text overlay
          appears on the current slide with the default text "Text".
        </p>
        <h3>Editing Text</h3>
        <ul>
          <li><strong>Double-click</strong> the text to enter editing mode and type your content.</li>
          <li>Press <strong>Escape</strong> or click outside to finish editing.</li>
        </ul>
        <h3>Positioning</h3>
        <p>
          Drag the text overlay to move it anywhere on the slide. <strong>Snap
          guides</strong> appear automatically when the overlay aligns with
          the center or edges of the slide (2% threshold).
        </p>
        <h3>Styling Options</h3>
        <ul>
          <li><strong>Font family</strong> — 44 fonts across 5 categories: Sans-serif, Serif, Display, Script, and Monospace. Fonts are loaded from Google Fonts on demand.</li>
          <li><strong>Font size</strong> — 12 preset sizes from 16px to 120px (at native 1080px width).</li>
          <li><strong>Bold / Italic / Underline</strong> — standard text formatting.</li>
          <li><strong>Color</strong> — any color via the color picker.</li>
          <li><strong>Alignment</strong> — left, center, or right.</li>
          <li><strong>Background color</strong> — optional colored background behind the text.</li>
          <li><strong>Opacity</strong> — 0% to 100%.</li>
        </ul>
        <h3>Z-Order</h3>
        <p>
          Use the <strong>Bring Forward</strong> and <strong>Send Backward</strong>
          buttons in the overlay toolbar to change the stacking order of overlays.
        </p>
      </>
    ),
  },
  {
    id: 'shape-overlays',
    title: '10. Shape Overlays',
    content: (
      <>
        <p>
          Add geometric shapes to your slides for decorative elements, frames,
          highlights, or design accents.
        </p>
        <h3>Adding Shapes</h3>
        <p>
          Click the <strong>shape icon</strong> (square) in the action bar to open
          the shape dropdown. Choose from:
        </p>
        <ul>
          <li><strong>Rectangle</strong></li>
          <li><strong>Square</strong> (constrained aspect ratio)</li>
          <li><strong>Circle</strong> (constrained aspect ratio)</li>
          <li><strong>Ellipse</strong></li>
          <li><strong>Triangle</strong></li>
        </ul>
        <h3>Positioning and Resizing</h3>
        <ul>
          <li><strong>Drag</strong> the shape to move it on the slide.</li>
          <li><strong>Resize</strong> using the 8 handles (corners + edges).</li>
          <li>Snap guides help align shapes to the slide center and edges.</li>
        </ul>
        <h3>Styling Options</h3>
        <ul>
          <li><strong>Fill type</strong> — Transparent, Solid color, or Gradient.</li>
          <li><strong>Fill color</strong> — any color via the color picker (for solid fills).</li>
          <li><strong>Gradient</strong> — start color, end color, and angle.</li>
          <li><strong>Border</strong> — color and width (0 = no border).</li>
          <li><strong>Opacity</strong> — 0% to 100%.</li>
        </ul>
        <h3>Z-Order</h3>
        <p>
          Like text overlays, shapes can be brought forward or sent backward in
          the stacking order.
        </p>
      </>
    ),
  },
  {
    id: 'export',
    title: '11. Exporting',
    content: (
      <>
        <p>
          Once all image slots are filled, you can export your carousel as a ZIP
          file containing one PNG per slide.
        </p>
        <h3>Export Quality</h3>
        <p>Choose from three quality levels:</p>
        <table className="manual__table">
          <thead>
            <tr><th>Label</th><th>Scale</th><th>Width</th><th>Best For</th></tr>
          </thead>
          <tbody>
            <tr><td>Low</td><td>1x</td><td>1080px</td><td>Quick previews, smaller files</td></tr>
            <tr><td>Medium</td><td>2x</td><td>2160px</td><td>High-quality Instagram posts</td></tr>
            <tr><td>High</td><td>3x</td><td>3240px</td><td>Maximum resolution, print-ready</td></tr>
          </tbody>
        </table>
        <h3>How to Export</h3>
        <ol>
          <li>Fill all image slots in your layout.</li>
          <li>Select your desired quality from the dropdown.</li>
          <li>Click <strong>"Export"</strong>.</li>
          <li>A progress bar shows the rendering progress.</li>
          <li>The ZIP file downloads automatically.</li>
        </ol>
        <h3>Large Canvas Warning</h3>
        <p>
          If the combination of slide count and quality exceeds the browser's
          canvas limits (268 megapixels), a "Large canvas" warning appears.
          Lower the quality or reduce slides to avoid issues.
        </p>
        <h3>Multi-Layer Export</h3>
        <p>
          When using layers, the export composites all visible layers in order:
          background, then Layer 1 (images + overlays), Layer 2, etc.
        </p>
      </>
    ),
  },
  {
    id: 'share-copy',
    title: '12. Share & Copy',
    content: (
      <>
        <p>
          Share or copy individual slides without exporting the entire carousel.
        </p>
        <h3>Desktop</h3>
        <p>
          Click the <strong>"Copy"</strong> button to copy the current slide to your
          clipboard as a PNG image. You can then paste it directly into other apps
          (social media, messaging, design tools).
        </p>
        <h3>Mobile</h3>
        <p>
          Click the <strong>"Share"</strong> button to open your device's native
          share sheet. You can send the slide directly to Instagram, WhatsApp,
          email, or any other app.
        </p>
        <h3>Fallback</h3>
        <p>
          If clipboard or sharing isn't supported, the slide is downloaded as a
          PNG file instead.
        </p>
      </>
    ),
  },
  {
    id: 'save-load',
    title: '13. Save & Load Projects',
    content: (
      <>
        <p>
          Save your entire project to a <code>.carousel</code> file and reload it
          later to continue editing.
        </p>
        <h3>Saving</h3>
        <ol>
          <li>Click <strong>"Save"</strong> in the action bar.</li>
          <li>A <code>.carousel</code> file (ZIP format) is downloaded containing all your images, layout configuration, overlays, and layer data.</li>
        </ol>
        <h3>Loading</h3>
        <ol>
          <li>Click <strong>"Load"</strong> in the action bar.</li>
          <li>Select a <code>.carousel</code> file from your device.</li>
          <li>Your entire project is restored — images, layout, overlays, layers, and all settings.</li>
        </ol>
        <h3>Autosave</h3>
        <p>
          Carousel Studio automatically saves your work to your browser's
          localStorage every second. If you close the tab and return later, your
          layout, overlays, and settings are restored automatically. Note:
          <strong> images cannot be saved to localStorage</strong>, so only the
          layout structure is preserved.
        </p>
        <h3>Project File Format</h3>
        <p>
          The <code>.carousel</code> file uses version 5 of the project format,
          which includes full layer support. Older files are automatically
          upgraded when loaded.
        </p>
      </>
    ),
  },
  {
    id: 'undo-redo',
    title: '14. Undo & Redo',
    content: (
      <>
        <p>
          Carousel Studio tracks up to 50 steps of undo/redo history, so you can
          freely experiment without fear of losing work.
        </p>
        <h3>Keyboard Shortcuts</h3>
        <ul>
          <li><strong>Ctrl+Z</strong> (Cmd+Z on Mac) — Undo</li>
          <li><strong>Ctrl+Shift+Z</strong> (Cmd+Shift+Z on Mac) — Redo</li>
        </ul>
        <h3>Toolbar Buttons</h3>
        <p>
          The undo and redo buttons are in the action bar. They are grayed out
          when there's nothing to undo or redo.
        </p>
        <h3>What's Tracked</h3>
        <p>
          Most operations are tracked: image placement/removal, overlay
          add/edit/delete, background changes, layout changes, and layer
          operations. Drag operations (like moving overlays or panning images)
          are coalesced so that a single drag counts as one undo step.
        </p>
      </>
    ),
  },
  {
    id: 'dark-mode',
    title: '15. Dark Mode',
    content: (
      <>
        <p>
          Toggle between light and dark themes using the sun/moon button in the
          top-right corner of the header.
        </p>
        <h3>Automatic Detection</h3>
        <p>
          On first visit, Carousel Studio matches your system preference. If your
          OS is set to dark mode, the app starts in dark mode automatically.
        </p>
        <h3>Manual Toggle</h3>
        <p>
          Click the theme toggle button to switch manually. Your preference is
          saved and persists across sessions.
        </p>
      </>
    ),
  },
  {
    id: 'keyboard-shortcuts',
    title: '16. Keyboard Shortcuts',
    content: (
      <>
        <table className="manual__table">
          <thead>
            <tr><th>Shortcut</th><th>Action</th><th>Context</th></tr>
          </thead>
          <tbody>
            <tr><td>Ctrl+Z / Cmd+Z</td><td>Undo</td><td>Anywhere (except text input)</td></tr>
            <tr><td>Ctrl+Shift+Z / Cmd+Shift+Z</td><td>Redo</td><td>Anywhere (except text input)</td></tr>
            <tr><td>Delete / Backspace</td><td>Delete selected slot</td><td>Custom Layout Builder</td></tr>
            <tr><td>Escape</td><td>Exit draw mode</td><td>Custom Layout Builder</td></tr>
            <tr><td>Escape</td><td>Deselect overlay</td><td>Main editor</td></tr>
            <tr><td>Escape</td><td>Cancel text editing</td><td>Text overlay editing</td></tr>
            <tr><td>Escape</td><td>Close modal/dropdown</td><td>Any modal or dropdown</td></tr>
            <tr><td>Enter</td><td>Commit rename</td><td>Layer rename</td></tr>
          </tbody>
        </table>
      </>
    ),
  },
  {
    id: 'mobile',
    title: '17. Mobile Usage',
    content: (
      <>
        <p>
          Carousel Studio is fully responsive and works on mobile devices with
          touch support.
        </p>
        <h3>Collapsible Controls</h3>
        <p>
          On mobile, when a layout is selected, the controls (layout picker,
          aspect ratio, background, action bar) are hidden behind a
          <strong> "Controls"</strong> toggle button to maximize canvas space.
          Tap the button to show/hide controls.
        </p>
        <h3>Touch Interactions</h3>
        <ul>
          <li><strong>Tap</strong> a slot to upload an image.</li>
          <li><strong>Drag</strong> on an image to pan/reposition.</li>
          <li><strong>Drag</strong> overlays to move them.</li>
          <li><strong>Pinch</strong> is not supported — use the resize handles on shapes instead.</li>
        </ul>
        <h3>Layer Panel on Mobile</h3>
        <p>
          Instead of a sidebar, layers appear as a floating pill button above the
          canvas. Tap it to open a popover with the full layer list.
        </p>
        <h3>Sharing on Mobile</h3>
        <p>
          The "Share" button uses the native Web Share API, opening your device's
          share sheet so you can send slides directly to Instagram, WhatsApp,
          or any other app.
        </p>
      </>
    ),
  },
  {
    id: 'onboarding',
    title: '18. Onboarding Tour',
    content: (
      <>
        <p>
          On your first visit, Carousel Studio shows a 5-step guided tour that
          highlights the key areas of the app:
        </p>
        <ol>
          <li>Layout selection</li>
          <li>Aspect ratio picker</li>
          <li>Background picker</li>
          <li>Action bar tools</li>
          <li>Export workflow</li>
        </ol>
        <p>
          The tour only appears once. After completing or dismissing it, it won't
          show again (tracked via localStorage).
        </p>
      </>
    ),
  },
  {
    id: 'tips',
    title: '19. Tips & Best Practices',
    content: (
      <>
        <h3>For Instagram Carousels</h3>
        <ul>
          <li>Use <strong>4:5 Portrait</strong> ratio for maximum feed visibility — it takes up the most screen space.</li>
          <li>Use <strong>1:1 Square</strong> if your content works better in a balanced format.</li>
          <li>Export at <strong>Medium (2160px)</strong> quality for the best balance of quality and file size.</li>
          <li>Keep text large enough to read on mobile screens.</li>
        </ul>
        <h3>For Stories & Reels</h3>
        <ul>
          <li>Use <strong>9:16 Story</strong> ratio for full-screen vertical content.</li>
          <li>Leave some space at the top and bottom for Instagram's UI elements.</li>
        </ul>
        <h3>Working with Layers</h3>
        <ul>
          <li>Use Layer 1 as your <strong>background layer</strong> for full-bleed base images.</li>
          <li>Add cutout or framed images on upper layers for creative compositions.</li>
          <li>Use shapes on upper layers to create frames, borders, or decorative elements.</li>
          <li>Toggle layer visibility to check your composition at each level.</li>
        </ul>
        <h3>Performance Tips</h3>
        <ul>
          <li>Images are auto-compressed, but starting with reasonably sized files helps.</li>
          <li>If export is slow, try <strong>Low</strong> quality first, then increase.</li>
          <li>Avoid using all 5 layers with maximum slides — it increases export time significantly.</li>
          <li>Save your project frequently using the Save button.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'troubleshooting',
    title: '20. Troubleshooting',
    content: (
      <>
        <h3>Images Not Showing</h3>
        <ul>
          <li>Make sure the file is a supported image format (JPEG, PNG, WebP, GIF). SVG is not supported.</li>
          <li>Check that the file is under 50 MB.</li>
          <li>Try a different browser if issues persist.</li>
        </ul>
        <h3>Export Fails</h3>
        <ul>
          <li>Reduce the export quality (try Low instead of High).</li>
          <li>Reduce the number of slides in your layout.</li>
          <li>If you see "Large canvas" warning, the combined pixel count is too high for your browser.</li>
          <li>Close other browser tabs to free memory.</li>
        </ul>
        <h3>Autosave Lost</h3>
        <ul>
          <li>Autosave cannot store images in localStorage — only layout, overlay, and layer metadata is saved.</li>
          <li>For full project persistence, use the <strong>Save</strong> button to download a <code>.carousel</code> file.</li>
          <li>Clearing browser data or localStorage will erase autosave.</li>
        </ul>
        <h3>Fonts Not Loading</h3>
        <ul>
          <li>Fonts are loaded from Google Fonts on demand. You need an internet connection.</li>
          <li>If a font doesn't load, the browser will fall back to a system font.</li>
          <li>When loading a project, fonts are automatically re-fetched.</li>
        </ul>
        <h3>Layout Looks Different on Mobile</h3>
        <ul>
          <li>The canvas scales to fit your screen — the exported images will be at full resolution regardless.</li>
          <li>Some controls are hidden behind the "Controls" toggle on mobile.</li>
        </ul>
      </>
    ),
  },
];

export const Manual: React.FC<ManualProps> = ({ onBack }) => {
  const [activeChapterId, setActiveChapterId] = useState(chapters[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const chapterRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Track active chapter on scroll via IntersectionObserver
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the topmost visible chapter
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          const id = visible[0].target.getAttribute('data-chapter-id');
          if (id) setActiveChapterId(id);
        }
      },
      {
        root: null,
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    );

    chapterRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToChapter = (id: string) => {
    const el = chapterRefs.current.get(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveChapterId(id);
      setSidebarOpen(false);
    }
  };

  return (
    <div className="manual">
      {/* Mobile sidebar toggle */}
      <button
        className={`manual__sidebar-toggle ${sidebarOpen ? 'manual__sidebar-toggle--open' : ''}`}
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Toggle table of contents"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M3 5H15M3 9H15M3 13H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        Contents
      </button>

      {/* Sidebar */}
      <aside className={`manual__sidebar ${sidebarOpen ? 'manual__sidebar--open' : ''}`}>
        <div className="manual__sidebar-header">
          <button className="manual__back" onClick={onBack}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to App
          </button>
          <h2 className="manual__sidebar-title">User Manual</h2>
        </div>

        <nav className="manual__nav">
          {chapters.map((ch) => (
            <button
              key={ch.id}
              className={`manual__nav-item ${activeChapterId === ch.id ? 'manual__nav-item--active' : ''}`}
              onClick={() => scrollToChapter(ch.id)}
            >
              {ch.title}
            </button>
          ))}
        </nav>
      </aside>

      {/* Sidebar backdrop (mobile) */}
      {sidebarOpen && (
        <div
          className="manual__sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Content area */}
      <main className="manual__content" ref={contentRef}>
        <div className="manual__content-inner">
          {/* Desktop back button (visible when sidebar scrolled) */}
          <button className="manual__back manual__back--mobile" onClick={onBack}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to App
          </button>

          <h1 className="manual__title">Carousel Studio Manual</h1>
          <p className="manual__intro">
            Everything you need to know about creating stunning Instagram
            carousels with Carousel Studio.
          </p>

          {chapters.map((ch) => (
            <section
              key={ch.id}
              data-chapter-id={ch.id}
              className="manual__chapter"
              ref={(el) => {
                if (el) chapterRefs.current.set(ch.id, el);
              }}
            >
              <h2 className="manual__chapter-title">{ch.title}</h2>
              {ch.content}
            </section>
          ))}
        </div>
      </main>
    </div>
  );
};
