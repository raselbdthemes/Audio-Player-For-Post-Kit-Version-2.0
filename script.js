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

class AudioPlayer {
  constructor({container, songs, hasPlaylist = true}) {
    this.container = container;
    this.songs = songs;
    this.hasPlaylist = hasPlaylist;
    // DOM elements
    this.audio = container.querySelector('audio');
    // Register this audio element for global single-play control
    if (!allAudioElements.includes(this.audio)) {
      allAudioElements.push(this.audio);
    }
    this.cover = container.querySelector('.cover, .cover-dark, .cover-minimal');
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
    this.isShuffle = false;
    this.isRepeat = false;
    this.isMuted = false;
    this.shuffledOrder = [];
    this.playlistVisible = true;
    this.isDraggingProgress = false;
    this.volumeBarTimeout = null;
    // Bind events
    this.bindEvents();
    // Initial render
    this.loadSong(this.currentSong);
    if (this.hasPlaylist && this.playlistDiv) this.renderPlaylist();
    this.updateSongDurations();
  }
  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
  loadSong(index) {
    const song = this.songs[index];
    // Determine fallback cover based on player container
    let fallbackCover = "songs/song-cover-photo-01.png";
    if (this.container.classList.contains('player-dark')) {
      fallbackCover = "songs/song-cover-photo-04.png";
    } else if (this.container.classList.contains('player-minimal')) {
      fallbackCover = "songs/song-cover-photo-10.png";
    }
    this.audio.src = song.src;
    this.cover.src = song.cover || fallbackCover;
    this.title.textContent = song.title;
    this.artist.textContent = song.artist;
    this.durationEl.textContent = this.formatTime(song.duration);
    this.currentTimeEl.textContent = "0:00";
    if (this.progressBar) this.progressBar.style.width = "0%";
    this.highlightPlaylistItem(index);
  }
  playSong() {
    // Pause all other audio elements before playing this one
    allAudioElements.forEach(aud => {
      if (aud !== this.audio) aud.pause();
    });
    this.audio.play();
    this.isPlaying = true;
    this.playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
    this.highlightPlaylistItem(this.currentSong);
  }
  pauseSong() {
    this.audio.pause();
    this.isPlaying = false;
    this.playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
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
      });
    }
    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => {
        this.isMuted = !this.isMuted;
        this.audio.muted = this.isMuted;
        this.muteBtn.innerHTML = this.isMuted
          ? '<i class="fa-solid fa-volume-xmark"></i>'
          : '<i class="fa-solid fa-volume-up"></i>';
      });
    }
    if (this.volumeControlWrapper && this.volumeBar) {
      this.audio.volume = 0.5;
      this.volumeBar.value = 1 - 0.5;
      this.volumeBar.addEventListener('input', (e) => {
        const reversedValue = 1 - e.target.value;
        this.audio.volume = reversedValue;
        this.isMuted = this.audio.volume === 0;
        this.audio.muted = this.isMuted;
        this.muteBtn.innerHTML = this.isMuted
          ? '<i class="fa-solid fa-volume-xmark"></i>'
          : '<i class="fa-solid fa-volume-up"></i>';
      });
      // Only for modern player: hover to show/hide volume bar
      if (this.container.classList.contains('player-modern')) {
        const bar = this.volumeControlWrapper.querySelector('.volume-bar-container');
        this.volumeControlWrapper.addEventListener('mouseenter', () => {
          clearTimeout(this.volumeBarTimeout);
          if (bar) {
            bar.style.opacity = '1';
            bar.style.pointerEvents = 'auto';
            bar.style.transform = 'translateX(-50%) translateY(-10px)';
          }
        });
        this.volumeControlWrapper.addEventListener('mouseleave', () => {
          this.volumeBarTimeout = setTimeout(() => {
            if (bar) {
              bar.style.opacity = '0';
              bar.style.pointerEvents = 'none';
              bar.style.transform = 'translateX(-50%) translateY(0)';
            }
          }, 200);
        });
      }
      // For dark player: do nothing, always visible by CSS
    }
    if (this.hasPlaylist && this.playlistToggleBtn && this.playlistDiv) {
      this.playlistDiv.classList.add('show');
      this.playlistToggleBtn.addEventListener('click', () => {
        if (this.playlistDiv.classList.contains('show')) {
          this.playlistDiv.classList.remove('show');
        } else {
          this.playlistDiv.classList.add('show');
        }
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
        const barBg = this.progressContainer.querySelector('.progress-bar-bg, .progress-bar-bg-dark');
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
      });
      item.querySelector('.playlist-play-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this.currentSong = idx;
        this.loadSong(this.currentSong);
        this.playSong();
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
      // Ensure the cover image is always visible
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
  // Player 1
  const playlist1 = getPlaylistFromDOM('playlist');
  new AudioPlayer({
    container: document.querySelector('.player-modern'),
    songs: playlist1,
    hasPlaylist: true
  });

  // Player 2
  const playlist2 = getPlaylistFromDOM('playlist-dark');
  new AudioPlayer({
    container: document.querySelector('.player-dark'),
    songs: playlist2,
    hasPlaylist: true
  });

  // Player 3
  const minimalContainer = document.querySelector('.player-minimal');
  if (minimalContainer) {
    const playlist3 = getPlaylistFromDOM('playlist-minimal');
    new AudioPlayer({
      container: minimalContainer,
      songs: playlist3,
      hasPlaylist: true
    });
  }
});

