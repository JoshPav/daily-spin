# 🎵 Daily Spin

Track the albums you actually listen to — automatically.

**Album History** connects to your Spotify account, polls your daily listening activity, and builds a personal history of the albums you’ve listened to over time.

---

## ✨ Features

* 🎧 **Daily Spotify polling**
  Automatically tracks albums from your daily listening activity.

* 📚 **Album listening history**
  View a chronological history of all albums you’ve listened to.

* 🔄 **Automatic updates**
  Keeps your listening history up to date without manual input.

* ☁️ **Cloud-hosted**
  Deployed on **Vercel** for fast, reliable access.

---

## 🛠 Tech Stack

* **Framework**: [Nuxt](https://nuxt.com/)
* **Runtime**: **Node.js 24**
* **Package Manager / Runner**: **Bun**
* **Database ORM**: [Prisma](https://www.prisma.io/)
* **Database**: PostgreSQL
* **Deployment**: [Vercel](https://vercel.com/)
* **External APIs**: Spotify Web API

---

## 🚀 Getting Started

### Prerequisites

* **Node.js 24**
* **Bun**
* **Docker** (required for integration tests)
* PostgreSQL (local development or Docker)
* Spotify Developer account

---

### Installation

```bash
# Install dependencies
bun install

# Generate Prisma client
bunx prisma generate

# Run database migrations
bunx prisma migrate dev
```

---

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/album_history

SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback
```

---

### Development

```bash
bun run dev
```

App available at:

```
http://localhost:3000
```

---

## 🧪 Testing

This project includes **unit** and **integration** tests.

### Unit Tests

Run fast, isolated tests without external dependencies:

```bash
bun run test:unit
```

---

### Integration Tests

Integration tests spin up a **PostgreSQL Docker container** and run tests against a real database.

```bash
bun run test:integration
```

> ⚠️ **Docker is required** for integration tests.

The test database is created and torn down automatically during the test run.

---

## 📦 Deployment

The app is deployed on **Vercel**.

### Deployment Notes

* Ensure all environment variables are configured in the Vercel dashboard
* Prisma migrations should be handled as part of CI or a dedicated migration step
* Uses **Node 24 runtime** on Vercel

---

## 🔐 Spotify Permissions

The app requests access to:

* Recently played tracks
* User listening history

These permissions are used **only** to track album listens and are never shared.

---

## 📈 Roadmap

* 📊 Listening insights & trends
* 📆 Calendar-based album history
* 🏷 Album tagging & notes
* 📤 Export listening history

---

