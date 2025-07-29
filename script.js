// =====================
// Helper: Get Playlist from DOM data-attributes
// =====================

function getPlaylistFromDOM(playlistContainerId) {
  const playlist = [];
  const items = document.querySelectorAll(`#${playlistContainerId} .playlist-item`);
  items.forEach(item => {
    playlist.push({
      title: item.dataset.title,
      artist: item.dataset.artist,
      src: item.dataset.src,
      cover: item.dataset.cover
    });
  });
  return playlist;
}

// =====================
// Global Audio Elements Array for Single-Play Control
// =====================

const allAudioElements = [];

// =====================
// User Preferences System
// =====================

// Default preferences
const defaultPreferences = {
  volume: 0.5,
  muted: false,
  shuffle: false,
  repeat: false,
  playlistVisible: true
};

// Load user preferences from localStorage
function loadUserPreferences() {
  try {
    const saved = localStorage.getItem('audioPlayerPreferences');
    if (saved) {
      const preferences = JSON.parse(saved);
      return { ...defaultPreferences, ...preferences };
    }
  } catch (error) {
    console.warn('Failed to load user preferences:', error);
  }
  return { ...defaultPreferences };
}

// Save user preferences to localStorage
function saveUserPreferences(preferences) {
  try {
    localStorage.setItem('audioPlayerPreferences', JSON.stringify(preferences));
  } catch (error) {
    console.warn('Failed to save user preferences:', error);
  }
}

// Update specific preference
function updatePreference(key, value) {
  const preferences = loadUserPreferences();
  preferences[key] = value;
  saveUserPreferences(preferences);
  return preferences;
}

// Get current preferences
let userPreferences = loadUserPreferences();

// =====================
// Global Volume Control
// =====================

// Global volume state - initialize from saved preferences
let globalVolume = userPreferences.volume;
let globalMuted = userPreferences.muted;

// Function to update volume across all players
function updateGlobalVolume(volume) {
  globalVolume = volume;
  allAudioElements.forEach(audio => {
    audio.volume = volume;
    audio.muted = globalMuted;
  });
  updatePreference('volume', volume);
}

// Function to update mute state across all players
function updateGlobalMute(muted) {
  globalMuted = muted;
  allAudioElements.forEach(audio => {
    audio.muted = muted;
  });
  updatePreference('muted', muted);
}

// Function to sync volume controls across all players
function syncVolumeControls() {
  const volumeBars = document.querySelectorAll('#volume-bar, #volume-bar-dark, #volume-bar-minimal');
  const muteButtons = document.querySelectorAll('#mute, #mute-dark, #mute-minimal');
  
  // Update all volume bars
  volumeBars.forEach(bar => {
    if (bar) {
      if (bar.id === 'volume-bar') {
        bar.value = globalVolume;
      } else {
        bar.value = 1 - globalVolume;
      }
    }
  });
  
  // Update all mute buttons
  muteButtons.forEach(btn => {
    if (btn) {
      btn.innerHTML = globalMuted
        ? '<i class="fa-solid fa-volume-xmark"></i>'
        : '<i class="fa-solid fa-volume-up"></i>';
    }
  });
}

// =====================
// AudioPlayer Class
// =====================

class AudioPlayer {
  constructor({container, songs, hasPlaylist = true}) {
    this.container = container;
    this.songs = songs;
    this.hasPlaylist = hasPlaylist;
    
    // DOM elements
    this.audio = container.querySelector('audio');
    if (!allAudioElements.includes(this.audio)) {
      allAudioElements.push(this.audio);
    }
    
    this.cover = container.querySelector('.cover, .cover-dark, .cover-minimal');
    if (!this.cover && container.classList.contains('player-minimal')) {
      this.cover = null;
    }
    
    this.title = container.querySelector('#title, #title-dark, #title-minimal');
    this.artist = container.querySelector('#artist, #artist-dark, #artist-minimal');
    this.playBtn = container.querySelector('#play, #play-dark, #play-minimal');
    this.prevBtn = container.querySelector('#prev, #prev-dark, #prev-minimal');
    this.nextBtn = container.querySelector('#next, #next-dark, #next-minimal');
    this.shuffleBtn = container.querySelector('#shuffle, #shuffle-dark, #shuffle-minimal');
    this.repeatBtn = container.querySelector('#repeat, #repeat-dark, #repeat-minimal');
    this.muteBtn = container.querySelector('#mute, #mute-dark, #mute-minimal');
    this.progressBar = container.querySelector('#progress-bar, #progress-bar-dark, #progress-bar-minimal');
    this.progressContainer = container.querySelector('#progress-container, #progress-container-dark, #progress-container-minimal');
    this.progressPointer = container.querySelector('#progress-pointer, #progress-pointer-dark, #progress-pointer-minimal');
    this.currentTimeEl = container.querySelector('#current-time, #current-time-dark, #current-time-minimal');
    this.durationEl = container.querySelector('#duration, #duration-dark, #duration-minimal');
    this.volumeControlWrapper = container.querySelector('.volume-control-wrapper, .volume-control-wrapper-dark, .volume-control-wrapper-minimal');
    this.volumeBar = container.querySelector('#volume-bar, #volume-bar-dark, #volume-bar-minimal');
    this.playlistDiv = container.querySelector('#playlist, #playlist-dark, #playlist-minimal');
    this.playlistToggleBtn = container.querySelector('#playlist-toggle, #playlist-toggle-dark, #playlist-toggle-minimal');
    
    // State
    this.currentSong = 0;
    this.isPlaying = false;
    this.isShuffle = userPreferences.shuffle;
    this.isRepeat = userPreferences.repeat;
    this.shuffledOrder = [];
    this.playlistVisible = userPreferences.playlistVisible;
    this.isDraggingProgress = false;
    this.volumeBarTimeout = null;
    
    // Initialize
    this.bindEvents();
    this.loadSong(this.currentSong);
    if (this.hasPlaylist && this.playlistDiv) this.renderPlaylist();
    this.updateSongDurations();
    
    this.audio.volume = globalVolume;
    this.audio.muted = globalMuted;
  }
  
  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
  
  loadSong(index) {
    const song = this.songs[index];
    let fallbackCover = "songs/song-cover-photo-01.png";
    if (this.container.classList.contains('player-dark')) {
      fallbackCover = "songs/song-cover-photo-04.png";
    } else if (this.container.classList.contains('player-minimal')) {
      fallbackCover = "songs/song-cover-photo-10.png";
    }
    
    this.audio.src = song.src;
    if (this.cover) {
      this.cover.src = song.cover || fallbackCover;
    }
    if (this.title) {
      this.title.textContent = song.title;
    }
    if (this.artist) {
      this.artist.textContent = song.artist;
    }
    if (this.durationEl) {
      this.durationEl.textContent = this.formatTime(song.duration);
    }
    if (this.currentTimeEl) {
      this.currentTimeEl.textContent = "0:00";
    }
    if (this.progressBar) this.progressBar.style.width = "0%";
    this.highlightPlaylistItem(index);
  }
  
  playSong() {
    allAudioElements.forEach(aud => {
      if (aud !== this.audio) aud.pause();
    });
    this.audio.play();
    this.isPlaying = true;
    updateAllPlayButtons(this.audio);
    this.highlightPlaylistItem(this.currentSong);
  }
  
  pauseSong() {
    this.audio.pause();
    this.isPlaying = false;
    updateAllPlayButtons();
    this.highlightPlaylistItem(this.currentSong);
  }
  
  prevSong() {
    if (this.isShuffle) {
      this.currentSong = this.getPrevShuffledIndex();
    } else {
      this.currentSong = (this.currentSong - 1 + this.songs.length) % this.songs.length;
    }
    this.loadSong(this.currentSong);
    this.playSong();
  }
  
  nextSong() {
    if (this.isShuffle) {
      this.currentSong = this.getNextShuffledIndex();
    } else {
      this.currentSong = (this.currentSong + 1) % this.songs.length;
    }
    this.loadSong(this.currentSong);
    this.playSong();
  }
  
  shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  
  getNextShuffledIndex() {
    let idx = this.shuffledOrder.indexOf(this.currentSong);
    if (idx === -1) idx = 0;
    idx = (idx + 1) % this.shuffledOrder.length;
    return this.shuffledOrder[idx];
  }
  
  getPrevShuffledIndex() {
    let idx = this.shuffledOrder.indexOf(this.currentSong);
    if (idx === -1) idx = 0;
    idx = (idx - 1 + this.shuffledOrder.length) % this.shuffledOrder.length;
    return this.shuffledOrder[idx];
  }
  
  bindEvents() {
    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => {
        this.isPlaying ? this.pauseSong() : this.playSong();
      });
    }
    
    if (this.prevBtn) {
      this.prevBtn.addEventListener('click', () => this.prevSong());
    }
    
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.nextSong());
    }
    
    if (this.shuffleBtn) {
      this.shuffleBtn.addEventListener('click', () => {
        this.isShuffle = !this.isShuffle;
        this.shuffleBtn.classList.toggle('active', this.isShuffle);
        updatePreference('shuffle', this.isShuffle);
        if (this.isShuffle) {
          this.shuffledOrder = this.shuffleArray([...Array(this.songs.length).keys()]);
          const idx = this.shuffledOrder.indexOf(this.currentSong);
          if (idx > 0) {
            this.shuffledOrder.splice(idx, 1);
            this.shuffledOrder.unshift(this.currentSong);
          }
        } else {
          this.shuffledOrder = [];
        }
      });
    }
    
    if (this.repeatBtn) {
      this.repeatBtn.addEventListener('click', () => {
        this.isRepeat = !this.isRepeat;
        this.repeatBtn.classList.toggle('active', this.isRepeat);
        updatePreference('repeat', this.isRepeat);
      });
    }
    
    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => {
        globalMuted = !globalMuted;
        updateGlobalMute(globalMuted);
        syncVolumeControls();
      });
    }
    
    if (this.volumeControlWrapper && this.volumeBar) {
      if (this.volumeBar.id === 'volume-bar') {
        this.volumeBar.value = globalVolume;
      } else {
        this.volumeBar.value = 1 - globalVolume;
      }
      
      this.volumeBar.addEventListener('input', (e) => {
        let volumeValue;
        if (this.volumeBar.id === 'volume-bar') {
          volumeValue = e.target.value;
        } else {
          volumeValue = 1 - e.target.value;
        }
        updateGlobalVolume(volumeValue);
        syncVolumeControls();
      });
      
      if (this.container.classList.contains('player-modern') || this.container.classList.contains('player-minimal')) {
        const bar = this.volumeControlWrapper.querySelector('.volume-bar-container, .volume-bar-container-minimal');
        if (bar) {
          this.volumeControlWrapper.addEventListener('mouseenter', () => {
            clearTimeout(this.volumeBarTimeout);
            bar.style.opacity = '1';
            bar.style.pointerEvents = 'auto';
          });
          this.volumeControlWrapper.addEventListener('mouseleave', () => {
            this.volumeBarTimeout = setTimeout(() => {
              bar.style.opacity = '0';
              bar.style.pointerEvents = 'none';
            }, 200);
          });
        }
      }
    }
    
    if (this.hasPlaylist && this.playlistToggleBtn && this.playlistDiv) {
      if (this.playlistVisible) {
        this.playlistDiv.classList.add('show');
        this.playlistToggleBtn.classList.add('active');
      } else {
        this.playlistDiv.classList.remove('show');
        this.playlistToggleBtn.classList.remove('active');
      }
      
      this.playlistToggleBtn.addEventListener('click', () => {
        if (this.playlistDiv.classList.contains('show')) {
          this.playlistDiv.classList.remove('show');
          this.playlistToggleBtn.classList.remove('active');
          this.playlistVisible = false;
        } else {
          this.playlistDiv.classList.add('show');
          this.playlistToggleBtn.classList.add('active');
          this.playlistVisible = true;
        }
        updatePreference('playlistVisible', this.playlistVisible);
      });
    }
    
    if (this.audio) {
      this.audio.addEventListener('timeupdate', () => {
        if (this.isDraggingProgress) return;
        const song = this.songs[this.currentSong];
        const percent = (this.audio.currentTime / song.duration) * 100;
        if (this.progressBar) this.progressBar.style.width = `${percent}%`;
        if (this.currentTimeEl) this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
        if (this.progressPointer) {
          const barBg = this.progressBar.parentElement;
          const barWidth = barBg.offsetWidth;
          const pointerLeft = (percent / 100) * barWidth;
          this.progressPointer.style.left = `${pointerLeft}px`;
        }
      });
      
      this.audio.addEventListener('ended', () => {
        const song = this.songs[this.currentSong];
        if (this.audio.currentTime < song.duration - 0.5) {
          this.audio.pause();
          return;
        }
        if (this.isRepeat) {
          this.audio.currentTime = 0;
          this.playSong();
        } else {
          this.nextSong();
        }
      });
      
      this.audio.addEventListener('loadedmetadata', () => {
        if (!isNaN(this.audio.duration) && this.audio.duration > 0) {
          this.songs[this.currentSong].duration = Math.round(this.audio.duration);
          if (this.durationEl) this.durationEl.textContent = this.formatTime(this.songs[this.currentSong].duration);
          if (this.hasPlaylist && this.playlistDiv) {
            const playlistItems = this.playlistDiv.querySelectorAll('.playlist-item');
            if (playlistItems[this.currentSong]) {
              const durationSpan = playlistItems[this.currentSong].querySelector('.playlist-duration');
              if (durationSpan) {
                durationSpan.textContent = this.formatTime(this.songs[this.currentSong].duration);
              }
            }
          }
        }
      });
    }
    
    if (this.progressContainer && this.progressBar) {
      this.progressContainer.addEventListener('click', (e) => {
        const barBg = this.progressContainer.querySelector('.progress-bar-bg, .progress-bar-bg-dark, .progress-bar-bg-minimal');
        if (!barBg) return;
        const rect = barBg.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percent = x / rect.width;
        const song = this.songs[this.currentSong];
        this.audio.currentTime = percent * song.duration;
      });
    }
    
    if (this.progressPointer && this.progressBar) {
      this.progressPointer.addEventListener('mousedown', (e) => {
        this.isDraggingProgress = true;
        document.body.style.userSelect = 'none';
      });
      
      document.addEventListener('mousemove', (e) => {
        if (!this.isDraggingProgress) return;
        const rect = this.progressBar.parentElement.getBoundingClientRect();
        let x = e.clientX - rect.left;
        x = Math.max(0, Math.min(x, rect.width));
        const percent = x / rect.width;
        const song = this.songs[this.currentSong];
        this.progressBar.style.width = `${percent * 100}%`;
        this.progressPointer.style.left = `${x}px`;
        if (this.currentTimeEl) this.currentTimeEl.textContent = this.formatTime(percent * song.duration);
      });
      
      document.addEventListener('mouseup', (e) => {
        if (this.isDraggingProgress) {
          const rect = this.progressBar.parentElement.getBoundingClientRect();
          let x = e.clientX - rect.left;
          x = Math.max(0, Math.min(x, rect.width));
          const percent = x / rect.width;
          const song = this.songs[this.currentSong];
          this.audio.currentTime = percent * song.duration;
          this.isDraggingProgress = false;
          document.body.style.userSelect = '';
        }
      });
    }
  }
  
  renderPlaylist() {
    if (!this.hasPlaylist || !this.playlistDiv) return;
    this.playlistDiv.innerHTML = '';
    this.songs.forEach((song, idx) => {
      const item = document.createElement('div');
      item.className = 'playlist-item';
      item.innerHTML = `
        <div class="playlist-cover-wrapper">
          <img src="${song.cover}" class="playlist-cover" alt="cover">
          <span class="playlist-play-btn"><i class="fa-solid fa-play"></i></span>
        </div>
        <div class="playlist-info">
          <span class="playlist-title">${song.title}</span>
          <span class="playlist-artist">${song.artist}</span>
        </div>
        <span class="playlist-duration">${this.formatTime(song.duration)}</span>
      `;
      
      item.addEventListener('click', () => {
        this.currentSong = idx;
        this.loadSong(this.currentSong);
        this.playSong();
        
        if (this.container.classList.contains('player-dark')) {
          setTimeout(() => {
            this.playlistDiv.classList.remove('show');
            this.playlistToggleBtn.classList.remove('active');
            this.playlistVisible = false;
            updatePreference('playlistVisible', this.playlistVisible);
          }, 300);
        }
      });
      
      item.querySelector('.playlist-play-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.currentSong = idx;
        this.loadSong(this.currentSong);
        this.playSong();
        
        if (this.container.classList.contains('player-dark')) {
          setTimeout(() => {
            this.playlistDiv.classList.remove('show');
            this.playlistToggleBtn.classList.remove('active');
            this.playlistVisible = false;
            updatePreference('playlistVisible', this.playlistVisible);
          }, 300);
        }
      });
      
      this.playlistDiv.appendChild(item);
    });
    this.highlightPlaylistItem(this.currentSong);
  }
  
  highlightPlaylistItem(index) {
    if (!this.hasPlaylist || !this.playlistDiv) return;
    const items = this.playlistDiv.querySelectorAll('.playlist-item');
    items.forEach((item, i) => {
      item.classList.toggle('active', i === index);
      const icon = item.querySelector('.playlist-play-btn i');
      if (icon) {
        if (i === index && this.isPlaying) {
          icon.className = 'fa-solid fa-pause';
        } else {
          icon.className = 'fa-solid fa-play';
        }
      }
      const cover = item.querySelector('.playlist-cover');
      if (cover) {
        cover.style.display = '';
      }
    });
  }
  
  updateSongDurations() {
    this.songs.forEach((song, idx) => {
      const tempAudio = document.createElement('audio');
      tempAudio.src = song.src;
      tempAudio.addEventListener('loadedmetadata', () => {
        if (!isNaN(tempAudio.duration) && tempAudio.duration > 0) {
          song.duration = Math.round(tempAudio.duration);
          if (this.hasPlaylist && this.playlistDiv) {
            const playlistItems = this.playlistDiv.querySelectorAll('.playlist-item');
            if (playlistItems[idx]) {
              const durationSpan = playlistItems[idx].querySelector('.playlist-duration');
              if (durationSpan) {
                durationSpan.textContent = this.formatTime(song.duration);
              }
            }
          }
          if (idx === this.currentSong && this.durationEl) {
            this.durationEl.textContent = this.formatTime(song.duration);
          }
        }
      });
    });
  }
}

// =====================
// Initialize All Players
// =====================

document.addEventListener('DOMContentLoaded', function() {
  const players = {};
  
  // Player 1 - Modern
  const playlist1 = getPlaylistFromDOM('playlist');
  players.modern = new AudioPlayer({
    container: document.querySelector('.player-modern'),
    songs: playlist1,
    hasPlaylist: true
  });

  // Player 2 - Dark
  const playlist2 = getPlaylistFromDOM('playlist-dark');
  players.dark = new AudioPlayer({
    container: document.querySelector('.player-dark'),
    songs: playlist2,
    hasPlaylist: true
  });

  // Player 3 - Minimal
  const minimalContainer = document.querySelector('.player-minimal');
  if (minimalContainer) {
    const playlist3 = getPlaylistFromDOM('playlist-minimal');
    players.minimal = new AudioPlayer({
      container: minimalContainer,
      songs: playlist3,
      hasPlaylist: true
    });
  }
});

// Helper function to update all play buttons reliably
function updateAllPlayButtons(currentAudio) {
  document.querySelectorAll('.player-modern, .player-dark, .player-minimal').forEach(player => {
    const audio = player.querySelector('audio');
    const playBtn = player.querySelector('#play, #play-dark, #play-minimal');
    if (playBtn) {
      if (audio === currentAudio && !audio.paused) {
        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      } else {
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      }
    }
  });
}

