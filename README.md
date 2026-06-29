# ScanQR - Premium QR Code Generator & Scanner

ScanQR is a beautiful, highly interactive client-side web application designed to generate branded QR codes and scan QR codes instantly using a camera or file upload.

## 🚀 Features

- **Custom QR Generator**:
  - Customize foreground (QR modules) and background colors.
  - Choose output sizes (256px up to 1024px).
  - Select Error Correction Levels (L, M, Q, H). Highly recommended to use **High (H)** when overlaying logos.
  - **Logo Overlay**: Upload a custom PNG/JPG image to be dynamically embedded in the center of the QR code.
  - Instant live generation preview as you edit settings.
  - High-quality download as PNG.

- **Dual-Mode Scanner**:
  - **Live Camera Scanner**: Select webcam devices, start/stop feed, and read QR codes with custom overlay laser sweep guides.
  - **Drag-and-Drop File Scanner**: Decode QR codes directly by uploading or dragging an image file (PNG, JPG, WEBP) into the dropzone.
  - **Synth Audio Cue**: Emits a premium synth beep sound on successful decodes.
  - **Smart Actions**: Copies decoded text to clipboard, opens valid URLs in a new tab, or searches text directly on Google.

- **History Logs Tracker**:
  - Automatically saves your scanned and generated QR entries in `localStorage`.
  - Copy text, delete logs, open links, or reload generated texts back into the QR Generator.

- **Modern Design**:
  - Glassmorphic card layouts with neon borders and glowing elements.
  - Clean light/dark mode switch.
  - Fully responsive layout for desktop, tablet, and mobile browsers.

## 🛠️ Built With

- **HTML5 & CSS3** (Custom styling with responsive grid controls)
- **Bootstrap 5** (Responsive layout scaffolding & UI elements)
- **jQuery 3.7.1** (DOM control, actions, & state events)
- **html5-qrcode** (Webcam reader and file decoder)
- **qrcode (soldair)** (Customizable canvas generator)

## 📦 How to Run

Since the application utilizes camera access APIs, modern web browsers require it to run on a secure origin (`https://`) or `localhost`. 

1. **Start a local server**:
   If you have Node.js installed, you can start a simple server from the project directory:
   ```bash
   npx http-server
   ```
2. **Open in browser**:
   Navigate to `http://localhost:8080` (or the port specified by the server).
