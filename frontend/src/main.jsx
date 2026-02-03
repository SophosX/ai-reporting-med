/**
 * @fileoverview main - Einstiegspunkt der React-Anwendung.
 *
 * Diese Datei initialisiert die React-Anwendung und rendert sie
 * in das DOM-Element mit der ID "root".
 *
 * Importierte Styles:
 * - index.css: Tailwind CSS und globale Styles
 * - markdown-editor.css: Styles für den MDEditor
 * - markdown.css: Styles für Markdown-Preview
 *
 * StrictMode:
 * - Aktiviert zusätzliche Entwicklungs-Checks
 * - Doppelte Renders im Dev-Mode für Effect-Prüfung
 * - Warnt vor veralteten APIs und Patterns
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

/**
 * Rendert die App-Komponente in den DOM.
 *
 * Verwendet React 18's createRoot API für Concurrent Features.
 * StrictMode aktiviert zusätzliche Entwicklungs-Prüfungen.
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
