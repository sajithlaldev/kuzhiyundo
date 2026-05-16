<div align="center">
  <img src="public/favicon.svg" alt="Kuzhiyundo Logo" width="100" />
  <h1>Kuzhiyundo?</h1>
  <p><strong>Community-driven Pothole & Road Defect Tracking Platform</strong></p>
  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#contributing">Contributing</a> •
    <a href="#license">License</a>
  </p>
</div>

---

**Kuzhiyundo?** is an open-source, community-driven platform designed to crowdsource the mapping of potholes and bad road conditions. By empowering users to report, vote on, and avoid road hazards, the project aims to promote safer driving and hold authorities accountable.

*The name "Kuzhiyundo" translates roughly to "Are there potholes?" in Malayalam.*

## 🚀 Features

- 🗺️ **Interactive Dark Map:** A sleek, fully featured interactive map for browsing and hunting for potholes seamlessly.
- ✍️ **Route Drawing Engine:** Automatically maps out the most accurate pothole segment using OSRM routing. No more guessing exactly where the bad road starts and ends.
- 🚦 **Severity Indicators:** Color-coded paths and neon markers denote the severity of the road defect (Low, Medium, High).
- 👍 **Voting System:** Community members can upvote or downvote reported potholes to ensure report accuracy and prioritize repair efforts.
- 📸 **Image Uploading:** Users can attach visual evidence of potholes (automatically compressed, with limits applied).
- 🔐 **Authentication:** Secure Google Sign-In using Firebase Authentication.
- ⚡ **Realtime Updates:** Potholes and votes sync instantly to all connected users without a page reload using Firestore real-time listeners.

## 🛠️ Tech Stack

**Frontend**
- [Next.js 15 (App Router)](https://nextjs.org/)
- [React 19](https://react.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Leaflet](https://leafletjs.com/) & [react-leaflet](https://react-leaflet.js.org/) for interactive maps
- [react-leaflet-cluster](https://github.com/akursat/react-leaflet-cluster) for marker clustering
- [Lucide React](https://lucide.dev/) for iconography

**Backend & Data**
- [Firebase Firestore](https://firebase.google.com/docs/firestore) (Database)
- [Firebase Auth](https://firebase.google.com/docs/auth) (Google Provider Auth)
- [Firebase Storage](https://firebase.google.com/docs/storage) (Images/Blobs - optional per config)

**External APIs**
- [OSRM Router API](http://project-osrm.org/) for routing polylines
- [Google Maps Polyline Codec](https://github.com/googlemaps/js-polyline-codec) for encoding/decoding OSRM routes

## 🏁 Getting Started

### Prerequisites

Ensure you have the following installed on your local machine:
- Node.js (v18 or higher)
- npm or yarn or pnpm
- A Firebase Project (with Firestore and Authentication enabled)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/kuzhiyundo.git
   cd kuzhiyundo
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory based on the `.env.example`:
   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) with your browser to see the application running.

## 🤝 Contributing

This is an open-source project, and contributions are highly appreciated! Whether it's adding new features, fixing bugs, or improving documentation, you can help make **Kuzhiyundo?** better.

### How to Contribute

1. Fork the project.
2. Create your Feature Branch: `git checkout -b feature/AmazingFeature`
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`
4. Push to the Branch: `git push origin feature/AmazingFeature`
5. Open a Pull Request.

### Development Guidelines
- Always format your code before committing (`npm run lint`, formatting configuration).
- Keep components modular and reusable where possible.
- Update documentation when adding new configuration or system capabilities.

## 🐛 Bug Reports & Feature Requests

Please use the [Issue Tracker](https://github.com/yourusername/kuzhiyundo/issues) to report technical bugs or suggest feature extensions.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---
<div align="center">
  <sub>Built with ❤️ by the open-source community for better, safer roads.</sub>
</div>
