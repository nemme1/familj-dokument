import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

console.log("🚀 Starting FamiljDokument app...");

try {
  if (!window.location.hash) {
    window.location.hash = "#/";
  }

  console.log("📍 Setting up hash routing...");

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found!");
  }

  console.log("🎯 Creating React root...");
  const root = createRoot(rootElement);

  console.log("⚛️ Rendering App...");
  root.render(<App />);

  console.log("✅ App rendered successfully");

  // Register service worker for PWA
  // Temporarily disabled for debugging
  // if ("serviceWorker" in navigator) {
  //   console.log("🔧 Registering service worker...");
  //   window.addEventListener("load", () => {
  //     navigator.serviceWorker.register("./sw.js")
  //       .then(registration => {
  //         console.log("✅ Service worker registered:", registration);
  //       })
  //       .catch(error => {
  //         console.error("❌ Service worker registration failed:", error);
  //       });
  //   });
  // } else {
  //   console.log("⚠️ Service worker not supported");
  // }

} catch (error) {
  console.error("💥 Fatal error during app initialization:", error);
  // Show error on page
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: monospace; color: red;">
        <h1>🚨 App Initialization Error</h1>
        <pre>${error instanceof Error ? error.message : String(error)}</pre>
        <details>
          <summary>Stack Trace</summary>
          <pre>${error instanceof Error ? error.stack : 'No stack trace available'}</pre>
        </details>
      </div>
    `;
  }
}
