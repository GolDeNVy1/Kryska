<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h2>🐭 Kryska - The Mischievous Music Bot 🐭</h2>
  <p align="center">
    <img src="https://i.pinimg.com/736x/cb/b4/b7/cbb4b734101329d6a41591541408ba12.jpg" alt="Kryska the Rat" style="border-radius: 50%; width: 200px; height: 200px;">
  </p>
  <p align="center">
    Meet Kryska, your cheeky and charming Discord music companion. With Kryska around, your server will never have a dull moment again! Designed to deliver high-quality tunes and some rodent-inspired fun, Kryska guarantees a squeak-tacular experience.
    <br /><br />
    <a href="https://github.com/GolDeNVy1/Kryska/issues">Report a Bug 🐞</a>
    ·
    <a href="https://github.com/GolDeNVy1/Kryska/issues">Request a Feature 🛠️</a>
  </p>
</div>

---

## 🎉 v2.0 is here — the rat got an upgrade!

> Kryska just crawled out of the walls with a shiny new set of tricks. Here's what's new in **v2.0**:

- 🔕 **Silent messages** — all bot messages are now sent without notification pings. No more ding-ding at 3AM.
- 🔍 **New search priority order** — Deezer → YouTube (yt-dlp) → SoundCloud. More songs found, fewer failures.
- 🔗 **Playlist names are clickable links** — tap the playlist name in the "Added to queue" message to open it directly.
- 🛠️ **yt-dlp updated** — fixed broken YouTube audio after Google's API changes. The rat is back on track.
- 🐛 **Various stability fixes** — resolver improvements, better error handling, and a smoother overall experience.

---

### 🐾 **Kryska's Rules of Fun**

- 🎵 High-quality music playback from platforms like Spotify, YouTube, Apple Music, Deezer, SoundCloud and more.
- ⚡ Lightning-fast commands to keep the vibe going.
- 🔧 Highly customizable settings for your server's unique needs.
- 🐭 Adorable Slash commands that are as cheeky as Kryska herself.

---

### 🎛️ **What You Need to Get Started**

- Node.js v20+ (Kryska won't work without her cheese... or Node.js).
- A Discord Token (grab one [here](https://discord.com/developers/applications)).
- (Optional) API keys for Spotify, Apple Music, Deezer, or Yandex Music for full platform support.
- A Lavalink server for audio playback (requires Java v17+).

---

### 🛠️ **How to Set Kryska Loose**

#### 🐁 **Option 1: The Docker Wheel (Recommended)**
1. [Install Docker](https://www.docker.com/get-started) on your system.
2. [Install Git](https://git-scm.com/downloads) on your system.
3. Clone Kryska's repository:
   ```bash
   git clone https://github.com/GolDeNVy1/Kryska.git
   ```
4. Fill out the config files (`application.yml` and `.env`) with your credentials.
5. Let Kryska run wild:
   ```bash
   ./entrypoint.sh
   ```
6. And finally I recommend you to clean your docker when you don't use it:
   ```bash
   ./clean_your_docker.sh
   ```

#### 🐁 **Option 2: Classic Setup (For the Brave)**
1. Clone the repository:
   ```bash
   git clone https://github.com/GolDeNVy1/Kryska.git
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start Kryska:
   ```bash
   node src/index.js
   ```

---

### 🐀 **Get Help or Join the Colony**
If you run into trouble or just want to hang out with Kryska and her team, join our [support server](https://discord.gg/T6ayr3U92N).

---

### ❤️ **License**
Kryska is distributed under the MIT License. See `LICENSE` for details.
