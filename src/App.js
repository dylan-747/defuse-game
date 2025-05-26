// src/App.js
import React from "react";
import DefuseGame from "./DefuseGame";
import "./App.css";

export default function App() {
  return (
    <div className="app-wrapper">
      <DefuseGame />
      <footer className="app-footer">
        Built by{' '}
        <a href="mailto:jgdylan@icloud.com">
          Dylan Galloway
        </a>
      </footer>
    </div>
  );
}