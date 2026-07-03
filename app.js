/**
 * ScanQR - Main Application Logic
 * Powered by jQuery, html5-qrcode, and soldair qrcode.
 */

$(document).ready(function() {
  // App Variables
  let logoImgData = null; // Store base64 data of the uploaded logo
  let html5QrCode = null; // Camera scanner instance
  let fileHtml5QrCode = null; // File scanner instance
  let isScanning = false; // Camera scanner state
  let debounceTimer = null; // Typing debouncer

  /* ==========================================================================
     Theme Settings
     ========================================================================== */
  function initTheme() {
    const savedTheme = localStorage.getItem('scanqr_theme') || 'dark';
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('scanqr_theme', theme);
    
    const $btn = $('#theme-toggle-btn');
    if (theme === 'light') {
      $btn.html('<i class="fa-solid fa-sun text-warning fs-5"></i>');
    } else {
      $btn.html('<i class="fa-solid fa-moon text-warning fs-5"></i>');
    }
  }

  $('#theme-toggle-btn').on('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });

  /* ==========================================================================
     Toast Notifications Helper
     ========================================================================== */
  function showToast(message, type = 'success') {
    const $toast = $('#toast-notify');
    const $icon = $toast.find('.toast-icon');
    const $msg = $toast.find('.toast-msg');
    
    // Reset toast classes
    $toast.removeClass('bg-success bg-danger bg-warning bg-info text-white text-dark');
    $icon.removeClass('fa-circle-check fa-circle-xmark fa-triangle-exclamation fa-circle-info text-white text-dark');
    
    if (type === 'success') {
      $toast.addClass('bg-success text-white');
      $icon.addClass('fa-circle-check text-white');
    } else if (type === 'danger') {
      $toast.addClass('bg-danger text-white');
      $icon.addClass('fa-circle-xmark text-white');
    } else if (type === 'warning') {
      $toast.addClass('bg-warning text-dark');
      $icon.addClass('fa-triangle-exclamation text-dark');
    } else {
      $toast.addClass('bg-info text-white');
      $icon.addClass('fa-circle-info text-white');
    }
    
    $msg.text(message);
    
    const bsToast = new bootstrap.Toast($toast[0]);
    bsToast.show();
  }

  /* ==========================================================================
     Web Audio API Beep (Scan Success Audio Cue)
     ========================================================================== */
  function playBeep() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
      console.warn("Audio Context playback failed (browser interaction requirements not met).");
    }
  }

  /* ==========================================================================
     Helper Functions
     ========================================================================== */
  function isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (_) {
      return false;
    }
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
      showToast("Text copied to clipboard!");
    }).catch(err => {
      // Fallback method
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) showToast("Text copied to clipboard!");
        else showToast("Failed to copy text", "danger");
      } catch (err2) {
        showToast("Failed to copy text", "danger");
      }
      document.body.removeChild(textArea);
    });
  }

  /* ==========================================================================
     QR Code Generator Settings & Logic
     ========================================================================== */
  function generateQr(saveHistory = false) {
    const text = $('#qr-input-text').val().trim();
    const size = parseInt($('#qr-size').val());
    const errorLevel = $('#qr-error-level').val();
    const fgColor = $('#qr-fg-color').val();
    const bgColor = $('#qr-bg-color').val();
    
    if (!text) {
      // Revert to placeholder element if content is blank
      $('#qr-canvas-holder').html(`
        <div class="qr-placeholder text-center text-muted py-5" id="qr-placeholder-element">
          <i class="fa-solid fa-qrcode fs-1 text-muted mb-3 opacity-50"></i>
          <p class="mb-0">Your generated QR code will appear here</p>
        </div>
      `);
      $('#btn-download-qr').attr('disabled', true);
      return;
    }

    // Set up canvas container
    const canvas = document.createElement('canvas');
    
    // soldair qrcode library generation
    QRCode.toCanvas(canvas, text, {
      width: size,
      margin: 2,
      errorCorrectionLevel: errorLevel,
      color: {
        dark: fgColor,
        light: bgColor
      }
    }, function(error) {
      if (error) {
        console.error("QR Code Error:", error);
        showToast("Failed to generate QR Code. Try higher error correction or check colors.", "danger");
        return;
      }
      
      // Draw Central Logo Overlay if loaded
      if (logoImgData) {
        const ctx = canvas.getContext('2d');
        const logoImg = new Image();
        logoImg.onload = function() {
          // Logo size: 18% of total QR size
          const logoSize = Math.floor(size * 0.18);
          const x = (size - logoSize) / 2;
          const y = (size - logoSize) / 2;
          
          // Clear underlying QR pixels with background color backing
          ctx.fillStyle = bgColor;
          ctx.fillRect(x - 4, y - 4, logoSize + 8, logoSize + 8);
          
          // Draw logo image
          ctx.drawImage(logoImg, x, y, logoSize, logoSize);
          
          // Render final canvas
          $('#qr-canvas-holder').empty().append(canvas);
          $('#btn-download-qr').removeAttr('disabled');
          
          if (saveHistory) {
            saveToHistory('generate', text);
            showToast("QR Code generated successfully!");
          }
        };
        logoImg.onerror = function() {
          console.error("Error loading logo image.");
          showToast("Error processing logo image overlay.", "danger");
          // Fallback to normal QR canvas
          $('#qr-canvas-holder').empty().append(canvas);
          $('#btn-download-qr').removeAttr('disabled');
        };
        logoImg.src = logoImgData;
      } else {
        // Render completed canvas directly
        $('#qr-canvas-holder').empty().append(canvas);
        $('#btn-download-qr').removeAttr('disabled');
        
        if (saveHistory) {
          saveToHistory('generate', text);
          showToast("QR Code generated successfully!");
        }
      }
    });
  }

  function debouncedGenerate() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function() {
      generateQr(false); // Live updates shouldn't clutter logs history
    }, 450);
  }

  // Trigger inputs
  $('#qr-input-text').on('input', debouncedGenerate);
  $('#qr-size, #qr-error-level').on('change', debouncedGenerate);

  // Colors inputs pairing (Pickers & HEX Fields)
  $('#qr-fg-color').on('input', function() {
    $('#qr-fg-hex').val($(this).val().toUpperCase());
    debouncedGenerate();
  });

  $('#qr-bg-color').on('input', function() {
    $('#qr-bg-hex').val($(this).val().toUpperCase());
    debouncedGenerate();
  });

  $('#qr-fg-hex').on('change', function() {
    let val = $(this).val().trim();
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      $('#qr-fg-color').val(val);
      debouncedGenerate();
    } else {
      $(this).val($('#qr-fg-color').val().toUpperCase());
    }
  });

  $('#qr-bg-hex').on('change', function() {
    let val = $(this).val().trim();
    if (/^#[0-9A-F]{6}$/i.test(val)) {
      $('#qr-bg-color').val(val);
      debouncedGenerate();
    } else {
      $(this).val($('#qr-bg-color').val().toUpperCase());
    }
  });

  // Logo uploader handlers
  $('#qr-logo-trigger').on('click', function(e) {
    if (e.target.id !== 'btn-remove-logo' && !$(e.target).closest('#btn-remove-logo').length) {
      $('#qr-logo-upload').click();
    }
  });

  $('#qr-logo-upload').on('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      showToast("Please upload an image file.", "danger");
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(evt) {
      logoImgData = evt.target.result;
      
      $('#logo-preview-img').attr('src', logoImgData);
      $('#logo-preview-name').text(file.name);
      
      $('#qr-logo-trigger').addClass('d-none');
      $('#logo-preview-container').removeClass('d-none').addClass('d-flex');
      
      showToast("Logo file uploaded!");
      generateQr(false); // update view
    };
    reader.readAsDataURL(file);
  });

  $('#btn-remove-logo').on('click', function(e) {
    e.stopPropagation();
    logoImgData = null;
    $('#qr-logo-upload').val('');
    $('#logo-preview-container').addClass('d-none').removeClass('d-flex');
    $('#qr-logo-trigger').removeClass('d-none');
    showToast("Logo removed.");
    generateQr(false); // update view
  });

  // Generate Button Click (Saves to History)
  $('#btn-generate-qr').on('click', function() {
    const text = $('#qr-input-text').val().trim();
    if (!text) {
      showToast("Please enter text or URL content first.", "warning");
      return;
    }
    generateQr(true);
  });

  // Download QR Code Canvas
  $('#btn-download-qr').on('click', function() {
    const canvas = $('#qr-canvas-holder canvas')[0];
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = 'scanqr-' + Date.now() + '.png';
    link.href = dataURL;
    link.click();
    showToast("QR Code image downloaded!");
  });


  /* ==========================================================================
     QR Code Camera Scanner Logic
     ========================================================================== */
  // Load Cameras List
  function loadCameras() {
    Html5Qrcode.getCameras().then(devices => {
      if (devices && devices.length) {
        const $select = $('#camera-select');
        $select.empty().removeAttr('disabled');
        devices.forEach(device => {
          const label = device.label || `Camera ${$select.children().length + 1}`;
          $select.append(`<option value="${device.id}">${label}</option>`);
        });
        $('#btn-camera-control').removeAttr('disabled');
      } else {
        $('#camera-select').html('<option value="">No cameras detected</option>');
      }
    }).catch(err => {
      console.error("Camera detection error:", err);
      $('#camera-select').html('<option value="request">Camera access blocked (Tap Start)</option>');
      $('#camera-select').removeAttr('disabled');
    });
  }

  function startScanning() {
    let cameraId = $('#camera-select').val();
    let cameraConfig = cameraId;

    // If no camera selected or it's in 'request' state, use facingMode to force native permission prompt
    if (!cameraId || cameraId === 'request') {
      cameraConfig = { facingMode: "environment" };
    }
    
    // Create camera reader instance
    html5QrCode = new Html5Qrcode("camera-reader-viewport");
    
    // Toggle UI display
    $('#scanner-idle-message').addClass('d-none');
    $('#camera-laser-overlay').removeClass('d-none');
    
    html5QrCode.start(
      cameraConfig, 
      {
        fps: 10,
        qrbox: { width: 220, height: 220 }
      },
      (decodedText, decodedResult) => {
        onScanSuccess(decodedText);
      },
      (errorMessage) => {
        // Silent error callback (camera checks frame-by-frame)
      }
    ).then(() => {
      isScanning = true;
      $('#btn-camera-control').html('<i class="fa-solid fa-stop me-1"></i>Stop Camera').addClass('btn-danger').removeClass('btn-outline-primary');
      $('#camera-select').attr('disabled', true);
      showToast("Camera started scanning.");
      
      // If we used the fallback config, the permission is now granted, so let's reload the camera list in the background
      if (typeof cameraConfig === 'object') {
        Html5Qrcode.getCameras().then(devices => {
          if (devices && devices.length) {
            const $select = $('#camera-select');
            $select.empty().removeAttr('disabled');
            devices.forEach(device => {
              const label = device.label || `Camera ${$select.children().length + 1}`;
              $select.append(`<option value="${device.id}">${label}</option>`);
            });
            $('#camera-select').attr('disabled', true); // keep disabled while scanning
          }
        }).catch(e => console.error(e));
      }
    }).catch(err => {
      console.error("Camera startup error:", err);
      var permissionModal = new bootstrap.Modal(document.getElementById('cameraPermissionModal'));
      permissionModal.show();
      stopScanning();
    });
  }

  function stopScanning() {
    if (html5QrCode) {
      html5QrCode.stop().then(() => {
        cleanupScannerUI();
      }).catch(err => {
        console.error("Error stopping scanner instance:", err);
        cleanupScannerUI();
      });
    } else {
      cleanupScannerUI();
    }
  }

  function cleanupScannerUI() {
    isScanning = false;
    $('#btn-camera-control').html('<i class="fa-solid fa-play me-1"></i>Start Camera').removeClass('btn-danger').addClass('btn-outline-primary');
    $('#camera-select').removeAttr('disabled');
    $('#scanner-idle-message').removeClass('d-none');
    $('#camera-laser-overlay').addClass('d-none');
    html5QrCode = null;
  }

  $('#btn-camera-control').on('click', function() {
    if (isScanning) {
      stopScanning();
    } else {
      startScanning();
    }
  });

  function onScanSuccess(decodedText) {
    playBeep();
    
    // Set UI outputs
    $('#decoded-result-text').val(decodedText);
    $('#result-status-badge').removeClass('d-none');
    $('#btn-copy-result').removeAttr('disabled');
    $('#btn-search-result').removeAttr('disabled');
    
    if (isValidUrl(decodedText)) {
      $('#btn-open-result-link').attr('href', decodedText).removeClass('d-none');
    } else {
      $('#btn-open-result-link').addClass('d-none');
    }
    
    // Log scanner action
    saveToHistory('scan', decodedText);
    showToast("QR code scanned!");
    
    // Stop scanner automatically
    stopScanning();
  }

  /* ==========================================================================
     QR Code File Upload Scanner Logic
     ========================================================================== */
  function getFileScannerInstance() {
    if (!fileHtml5QrCode) {
      fileHtml5QrCode = new Html5Qrcode("camera-reader-viewport"); // Reuse DOM container (hidden during file scan tab anyway)
    }
    return fileHtml5QrCode;
  }

  function scanFileImage(file) {
    if (!file) return;
    
    // Display preview image
    const reader = new FileReader();
    reader.onload = function(e) {
      $('#file-scanned-preview-img').attr('src', e.target.result);
      $('#file-scanned-name').text(file.name);
      $('.dropzone-info').addClass('d-none');
      $('#dropzone-preview-container').removeClass('d-none');
    };
    reader.readAsDataURL(file);

    const scanner = getFileScannerInstance();
    scanner.scanFile(file, true)
      .then(decodedText => {
        playBeep();
        
        // Update results
        $('#decoded-result-text').val(decodedText);
        $('#result-status-badge').removeClass('d-none');
        $('#btn-copy-result').removeAttr('disabled');
        $('#btn-search-result').removeAttr('disabled');
        
        if (isValidUrl(decodedText)) {
          $('#btn-open-result-link').attr('href', decodedText).removeClass('d-none');
        } else {
          $('#btn-open-result-link').addClass('d-none');
        }
        
        saveToHistory('scan', decodedText);
        showToast("QR Code read successfully from file!");
      })
      .catch(err => {
        console.warn("Scan file error:", err);
        showToast("No QR code detected in image file.", "danger");
        
        $('#decoded-result-text').val("Error: Failed to decode QR code. Please upload a clear QR code image.");
        $('#result-status-badge').addClass('d-none');
        $('#btn-copy-result').attr('disabled', true);
        $('#btn-search-result').attr('disabled', true);
        $('#btn-open-result-link').addClass('d-none');
      });
  }

  const $dropzone = $('#dropzone-file-scanner');
  const $fileInput = $('#file-scanner-input');

  $dropzone.on('click', function(e) {
    if (e.target.id !== 'btn-clear-file-scan' && !$(e.target).closest('#btn-clear-file-scan').length) {
      $fileInput.click();
    }
  });

  $fileInput.on('change', function(e) {
    const file = e.target.files[0];
    if (file) scanFileImage(file);
  });

  // Drag and Drop Effects
  $dropzone.on('dragover dragenter', function(e) {
    e.preventDefault();
    e.stopPropagation();
    $dropzone.addClass('dragover');
  });

  $dropzone.on('dragleave drop', function(e) {
    e.preventDefault();
    e.stopPropagation();
    $dropzone.removeClass('dragover');
  });

  $dropzone.on('drop', function(e) {
    const file = e.originalEvent.dataTransfer.files[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        scanFileImage(file);
      } else {
        showToast("Please upload a valid image file.", "danger");
      }
    }
  });

  $('#btn-clear-file-scan').on('click', function(e) {
    e.stopPropagation();
    $fileInput.val('');
    $('#dropzone-preview-container').addClass('d-none');
    $('.dropzone-info').removeClass('d-none');
    $('#decoded-result-text').val('');
    $('#result-status-badge').addClass('d-none');
    $('#btn-copy-result').attr('disabled', true);
    $('#btn-search-result').attr('disabled', true);
    $('#btn-open-result-link').addClass('d-none');
    showToast("File selection cleared.");
  });

  /* ==========================================================================
     Tab Switch Logic
     ========================================================================== */
  $('input[name="scan-mode"]').on('change', function() {
    const mode = $(this).attr('id');
    if (mode === 'mode-camera') {
      $('#pane-camera').removeClass('d-none');
      $('#pane-file').addClass('d-none');
    } else {
      if (isScanning) {
        stopScanning();
      }
      $('#pane-camera').addClass('d-none');
      $('#pane-file').removeClass('d-none');
    }
  });

  /* ==========================================================================
     Decoded Result Card Action Buttons
     ========================================================================== */
  $('#btn-copy-result').on('click', function() {
    const text = $('#decoded-result-text').val().trim();
    if (text) copyToClipboard(text);
  });

  $('#btn-search-result').on('click', function() {
    const text = $('#decoded-result-text').val().trim();
    if (text) {
      window.open(`https://www.google.com/search?q=${encodeURIComponent(text)}`, '_blank');
    }
  });

  /* ==========================================================================
     Log History Tracker
     ========================================================================== */
  function getHistory() {
    const history = localStorage.getItem('scanqr_history');
    return history ? JSON.parse(history) : [];
  }

  function saveToHistory(type, content) {
    const history = getHistory();
    // Avoid double entries in quick sequence
    const duplicateIndex = history.findIndex(item => item.type === type && item.content === content);
    if (duplicateIndex > -1) {
      history.splice(duplicateIndex, 1);
    }
    
    history.unshift({
      id: 'hqr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: type,
      content: content,
      timestamp: new Date().toLocaleString()
    });
    
    if (history.length > 30) {
      history.pop();
    }
    
    localStorage.setItem('scanqr_history', JSON.stringify(history));
    renderHistory();
  }

  function deleteHistoryItem(id) {
    let history = getHistory();
    history = history.filter(item => item.id !== id);
    localStorage.setItem('scanqr_history', JSON.stringify(history));
    renderHistory();
    showToast("History log removed.");
  }

  function clearAllHistory() {
    localStorage.removeItem('scanqr_history');
    renderHistory();
    showToast("All logs cleared.");
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function renderHistory() {
    const history = getHistory();
    const $tbody = $('#history-table-body');
    $tbody.empty();
    
    if (history.length === 0) {
      $tbody.append(`
        <tr id="history-empty-row">
          <td colspan="4" class="text-center py-4 text-muted">
            <i class="fa-solid fa-circle-info me-2 opacity-50"></i>No items in history yet. Scanned/generated codes will show up here.
          </td>
        </tr>
      `);
      return;
    }
    
    history.forEach(item => {
      const isScan = item.type === 'scan';
      const badgeClass = isScan ? 'badge-scan' : 'badge-generate';
      const typeLabel = isScan ? 'Scanned' : 'Generated';
      const typeIcon = isScan ? 'fa-camera' : 'fa-wand-magic-sparkles';
      
      const displayContent = item.content.length > 55 
        ? item.content.substring(0, 52) + '...' 
        : item.content;
        
      const actionButtons = isScan 
        ? `<button class="btn btn-xs btn-outline-secondary me-1 btn-history-copy" data-content="${escapeHtml(item.content)}" title="Copy content"><i class="fa-solid fa-copy"></i></button>
           ${isValidUrl(item.content) ? `<a href="${item.content}" target="_blank" class="btn btn-xs btn-outline-primary me-1" title="Open Link"><i class="fa-solid fa-external-link"></i></a>` : ''}`
        : `<button class="btn btn-xs btn-outline-info me-1 btn-history-load" data-content="${escapeHtml(item.content)}" title="Load into generator"><i class="fa-solid fa-arrows-spin"></i></button>
           <button class="btn btn-xs btn-outline-secondary me-1 btn-history-copy" data-content="${escapeHtml(item.content)}" title="Copy content"><i class="fa-solid fa-copy"></i></button>`;
           
      $tbody.append(`
        <tr data-id="${item.id}">
          <td>
            <span class="badge ${badgeClass}">
              <i class="fa-solid ${typeIcon} me-1 small"></i>${typeLabel}
            </span>
          </td>
          <td class="font-monospace text-break table-content-cell cursor-pointer" title="Click to copy full text" data-content="${escapeHtml(item.content)}">
            ${escapeHtml(displayContent)}
          </td>
          <td class="text-muted small">${item.timestamp}</td>
          <td class="text-end">
            ${actionButtons}
            <button class="btn btn-xs btn-outline-danger btn-history-delete" data-id="${item.id}" title="Remove"><i class="fa-solid fa-trash"></i></button>
          </td>
        </tr>
      `);
    });
  }

  // History Event Listeners
  $(document).on('click', '.table-content-cell', function() {
    const content = $(this).attr('data-content');
    if (content) copyToClipboard(content);
  });

  $(document).on('click', '.btn-history-copy', function() {
    const content = $(this).attr('data-content');
    if (content) copyToClipboard(content);
  });

  $(document).on('click', '.btn-history-load', function() {
    const content = $(this).attr('data-content');
    if (content) {
      $('#qr-input-text').val(content);
      generateQr(false);
      showToast("QR content loaded.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });

  $(document).on('click', '.btn-history-delete', function() {
    const id = $(this).attr('data-id');
    if (id) deleteHistoryItem(id);
  });

  $('#btn-clear-history').on('click', function() {
    if (confirm("Are you sure you want to clear your entire scan/generation log?")) {
      clearAllHistory();
    }
  });

  /* ==========================================================================
     Initialize Application State
     ========================================================================== */
  initTheme();
  renderHistory();
  loadCameras();
});
