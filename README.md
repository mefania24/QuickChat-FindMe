# QuickChat (Meet Me in RP)

**QuickChat** is a lightweight, modern, and completely ephemeral 1-on-1 random chat application. 

---

## 🌟 Core Features

1. **Clean Base Page with Central "FIND" Button**:
   - Prominent glowing **FIND** button centered on the screen.
   - Live badge displaying currently connected users.
   - Built-in audio cues for matching, messages, and disconnection (with mute toggle).

2. **Instant Matchmaking Queue**:
   - Clicking **FIND** places the user in an ephemeral matchmaking queue.
   - Concentric radar pulse search animation with elapsed timer and a **Cancel** button.
   - When two users are looking for a chat, they are paired into an isolated temporary room.

3. **Ephemeral 1-on-1 Real-time Chatbox**:
   - Zero-database architecture: messages live strictly in transit and are **never saved to disk or database**.
   - Live typing indicators ("Stranger is typing...").
   - Responsive message bubbles with auto-scrolling and timestamps.

4. **"End" & "Person Left" / "Leave" Cycle**:
   - **Ending the Chat**: If a user clicks **"End"**, they immediately leave and return to the main base page.
   - **Notification for Partner**: The person left behind receives an immediate notification banner and modal stating **"Person Left"** (*"The other person has left the conversation"*).
   - **"Leave" Button**: Clicking **"Leave"** wipes all messages from the screen and directs the user back to the base page.
   - **"Find Next" Button**: A quick shortcut allowing the user to immediately search for another conversation with one click.
   - **Memory Wipe**: Once a conversation ends, all chat history in the browser DOM and server memory is deleted.

---

## 🚀 How to Deploy on Render.com (Step-by-Step)

### Step 1: Create a GitHub Repository & Push Your Code

In this folder, run:
```bash
# 1. Initialize git (if not already done)
git init

# 2. Add files and make your first commit
git add .
git commit -m "Initial commit of QuickChat"

# 3. Create a new repository on https://github.com (e.g. quickchat)
# Then link and push:
git remote add origin https://github.com/<YOUR_USERNAME>/<YOUR_REPO_NAME>.git
git branch -M main
git push -u origin main
```

---

### Step 2: Deploy on Render.com

1. Go to [https://render.com](https://render.com) and log in (or sign up with your GitHub account).
2. Click **New +** in the top right and select **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your GitHub repository.
4. Set the following settings:
   - **Name**: `quickchat` (or any name you prefer)
   - **Region**: Choose the closest region (e.g., Singapore, Oregon, Frankfurt)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Click **Create Web Service**.

Render will automatically build and deploy your app. Once finished, Render will give you a public URL (e.g., `https://quickchat.onrender.com`).

Anyone across the world visiting your URL will automatically be placed in the online pool, click **FIND**, and be matched with other users in real time!

---

## 💻 Running Locally

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Server**:
   ```bash
   npm start
   ```

3. **Open in Browser**:
   Navigate to [http://localhost:3000](http://localhost:3000) in two separate tabs to test matching and chatting between two users.
