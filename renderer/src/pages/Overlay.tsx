// renderer/src/App.tsx
import React, { useState, useEffect } from 'react';
import type { MouseEvent} from 'react'
import '../App.css';

interface Point {
  x: number;
  y: number;
}

function Overlay() {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<Point | null>(null);
  const [selectionRect, setSelectionRect] = useState<React.CSSProperties>({});
  const [screenshotPath, setScreenshotPath] = useState('');

  useEffect(() => {
    // URLからスクリーンショットのパスを取得
    const query = new URLSearchParams(window.location.search);
    const path = query.get('screenshotPath');
    if (path) {
      setScreenshotPath(decodeURIComponent(path));
    }

    // Escキーでのキャンセル
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI.closeCaptureWindow();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    document.body.classList.add("cross-pointer");
    document.documentElement.classList.add("cross-pointer");

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove("cross-pointer");
      document.documentElement.classList.remove("cross-pointer");
    };
  }, []);

  const handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setStartPos({ x: e.clientX, y: e.clientY });
    setSelectionRect({
      left: e.clientX,
      top: e.clientY,
      width: 0,
      height: 0,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !startPos) return;

    const currentX = e.clientX;
    const currentY = e.clientY;

    const newX = Math.min(startPos.x, currentX);
    const newY = Math.min(startPos.y, currentY);
    const width = Math.abs(currentX - startPos.x);
    const height = Math.abs(currentY - startPos.y);

    setSelectionRect({ left: newX, top: newY, width, height });
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (e.button !== 0 || !startPos) return;
    setIsDragging(false);

    const rect = {
      x: selectionRect.left as number,
      y: selectionRect.top as number,
      width: selectionRect.width as number,
      height: selectionRect.height as number,
    };

    if (rect.width < 5 || rect.height < 5) {
      window.electronAPI.closeCaptureWindow();
    } else {
      window.electronAPI.sendCaptureRect(rect, screenshotPath);
    }
  };

  return (
    <div
      className="capture-container"
      style={{ backgroundImage: `url(${screenshotPath})` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div className="overlay"></div>
      {isDragging && <div className="selection-box" style={selectionRect}></div>}
    </div>
  );
}

export default Overlay;