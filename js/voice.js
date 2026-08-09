/* 
  Baig Tiles & Granite CRM - Speech-to-Text Voice Input Helper (voice.js)
  Uses native Web Speech API (SpeechRecognition / webkitSpeechRecognition)
  Supports dedicated English (en-IN) and Marathi (mr-IN) speech recognition buttons for address entry.
*/

class VoiceAddressManager {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.targetInputId = 'customerAddressInput';
    this.currentLocale = 'en-IN';
    this.activeButtonId = null;
    this.initSpeechEngine();
  }

  initSpeechEngine() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser environment.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = false;
    this.recognition.interimResults = false;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateMicButtonUI(true);
    };

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const targetInput = document.getElementById(this.targetInputId);
      if (targetInput) {
        // Append transcribed text cleanly
        targetInput.value = targetInput.value ? `${targetInput.value} ${transcript}` : transcript;
        // Trigger input event for live reactive state updates
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.stopListening();
    };

    this.recognition.onend = () => {
      this.stopListening();
    };
  }

  startVoiceInput(locale = 'en-IN', targetInputId = 'customerAddressInput', btnId = null) {
    if (!this.recognition) {
      alert('Voice speech recognition is not supported in your browser. Please type the address manually.');
      return;
    }

    this.targetInputId = targetInputId;
    this.activeButtonId = btnId;
    this.currentLocale = locale;

    if (this.isListening) {
      this.recognition.stop();
      this.isListening = false;
      this.updateMicButtonUI(false);
      return;
    }

    try {
      this.recognition.lang = locale;
      this.recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      this.stopListening();
    }
  }

  stopListening() {
    this.isListening = false;
    this.updateMicButtonUI(false);
  }

  updateMicButtonUI(active) {
    const btnEn = document.getElementById('voiceMicBtnEn');
    const btnMr = document.getElementById('voiceMicBtnMr');

    if (btnEn) {
      if (active && this.currentLocale === 'en-IN') {
        btnEn.classList.remove('btn-outline-primary');
        btnEn.classList.add('btn-danger');
        btnEn.innerHTML = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path></svg> Listening in English...`;
      } else {
        btnEn.classList.remove('btn-danger');
        btnEn.classList.add('btn-outline-primary');
        btnEn.innerHTML = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path></svg> Speak (English)`;
      }
    }

    if (btnMr) {
      if (active && this.currentLocale === 'mr-IN') {
        btnMr.classList.remove('btn-outline-primary');
        btnMr.classList.add('btn-danger');
        btnMr.innerHTML = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path></svg> ऐकत आहे (मराठी)...`;
      } else {
        btnMr.classList.remove('btn-danger');
        btnMr.classList.add('btn-outline-primary');
        btnMr.innerHTML = `<svg class="svg-icon" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path></svg> मराठी मध्ये बोला`;
      }
    }
  }
}

window.voiceManager = new VoiceAddressManager();

