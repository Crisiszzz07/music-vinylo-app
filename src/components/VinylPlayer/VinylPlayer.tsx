import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { motion, useMotionValue, useSpring, wrap } from 'framer-motion';

import AlbumCover from '../AlbumCover/AlbumCover';
import type { Album } from '../../App';
import './VinylPlayer.css';

interface VinylPlayerProps {
  albums: Album[];
  onAlbumChange: (index: number) => void;
  initialIndex: number;
}


const VINYL_BASE_RADIUS_PX = 250; // Radio base del vinilo en píxeles (para cálculos)
const COVER_DISTANCE_RATIO = 0.6;
const DRAG_SENSITIVITY = 0.15;
const ALBUM_COVER_BASE_SIZE_PX = 90; 

const VinylPlayer: React.FC<VinylPlayerProps> = ({ albums, onAlbumChange, initialIndex }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vinylRef = useRef<HTMLDivElement>(null);

  const lastX = useRef(0);
  const isDragging = useRef(false);

  const rotation = useMotionValue(0);
  const smoothRotation = useSpring(rotation, { stiffness: 100, damping: 20 });

  const [currentSelectionIndex, setCurrentSelectionIndex] = useState(initialIndex);
  const [albumPositions, setAlbumPositions] = useState<any[]>([]);

  const [currentVinylRadius, setCurrentVinylRadius] = useState(VINYL_BASE_RADIUS_PX);
  const [currentAlbumCoverSize, setCurrentAlbumCoverSize] = useState(ALBUM_COVER_BASE_SIZE_PX);

  useLayoutEffect(() => {
    const updateSizes = () => {
      if (vinylRef.current) {
        const computedStyle = getComputedStyle(vinylRef.current);
        const vinylWidth = parseFloat(computedStyle.width);
        setCurrentVinylRadius(vinylWidth / 2);
        setCurrentAlbumCoverSize(vinylWidth * 0.18); // Ajusta este ratio si la portada es muy pequeña/grande
      } else {
        setCurrentVinylRadius(250);
        setCurrentAlbumCoverSize(90);
      }
    };

    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => window.removeEventListener('resize', updateSizes);
  }, []);

  useEffect(() => {
    onAlbumChange(currentSelectionIndex);
  }, [currentSelectionIndex, onAlbumChange]);

  useEffect(() => {
    if (albums.length > 0 && currentVinylRadius > 0) {
      const albumAngle = 360 / albums.length;
      const targetRotationForInitial = -(initialIndex * albumAngle);

      rotation.set(targetRotationForInitial);
      smoothRotation.set(targetRotationForInitial);
    }
  }, [albums, initialIndex, rotation, currentVinylRadius, smoothRotation]);

  useEffect(() => {
    const unsubscribe = smoothRotation.on("change", (latestRotation) => {
      const currentRotValue = typeof latestRotation === 'number' ? latestRotation : 0;
      const vinylRad = typeof currentVinylRadius === 'number' ? currentVinylRadius : 0;

      if (vinylRad === 0 || albums.length === 0) return;

      const newPositions = albums.map((album, index) => {
        const albumAngle = 360 / albums.length;
        const currentAlbumAngle = index * albumAngle + currentRotValue;
        const rad = (currentAlbumAngle * Math.PI) / 180;

        const xPos = vinylRad * COVER_DISTANCE_RATIO * Math.cos(rad);
        const yPos = vinylRad * COVER_DISTANCE_RATIO * Math.sin(rad);

        let angleFromFocus = Math.abs(currentAlbumAngle % 360);
        if (angleFromFocus > 180) {
            angleFromFocus = 360 - angleFromFocus;
        }
        const prominence = 1 - (angleFromFocus / 180);

        const scale = 0.7 + (prominence * 0.5);
        const opacity = 0.2 + (prominence * 0.8);
        const isFocused = index === currentSelectionIndex;

        return {
          x: xPos,
          y: yPos,
          scale: isFocused ? 1.3 : scale,
          opacity: isFocused ? 1 : opacity,
          zIndex: isFocused ? 20 : (yPos > 0 ? 5 : 15),
          isFocused: isFocused,
        };
      });
      setAlbumPositions(newPositions);
    });

    return () => unsubscribe();
  }, [albums, smoothRotation, currentSelectionIndex, currentVinylRadius, COVER_DISTANCE_RATIO]);

  const handlePointerDown = (event: React.PointerEvent) => {
    isDragging.current = true;
    lastX.current = event.clientX;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!isDragging.current) return;

    const deltaX = event.clientX - lastX.current;
    rotation.set(rotation.get() + deltaX * DRAG_SENSITIVITY);
    lastX.current = event.clientX;

    const albumAngle = 360 / albums.length;
    let currentDeg = rotation.get();
    let newIndex = Math.round(wrap(0, albums.length, -currentDeg / albumAngle));
    newIndex = (newIndex % albums.length + albums.length) % albums.length;

    if (newIndex !== currentSelectionIndex) {
      setCurrentSelectionIndex(newIndex);
    }
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    isDragging.current = false;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);

    const albumAngle = 360 / albums.length;
    const targetRotation = -(currentSelectionIndex * albumAngle);
    smoothRotation.set(targetRotation);
    rotation.set(targetRotation);
  };

  const getCoverImageUrl = (images: Album['image']) => {
    const largeImage = images.find(img => img.size === 'large');
    const mediumImage = images.find(img => img.size === 'medium');
    const smallImage = images.find(img => img.size === 'small');
    return largeImage?.['#text'] || mediumImage?.['#text'] || smallImage?.['#text'] || '';
  };


  const handleAlbumCoverClick = (index: number) => {
    if (!isDragging.current) {
      const albumAngle = 360 / albums.length;
      const targetRotation = -(index * albumAngle);
      smoothRotation.set(targetRotation);
      rotation.set(targetRotation);
      setCurrentSelectionIndex(index);
    }
  };

  return (
    <div className="vinyl-player-container" ref={containerRef}>
      {}
      <motion.div
        className="vinyl"
        ref={vinylRef}
    
        style={{ rotate: smoothRotation }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="vinyl-center"></div>
        <div className="vinyl-grooves"></div>
      </motion.div>

      {/* Portadas de Álbumes */}
      {albums.map((album, index) => {
        const pos = albumPositions[index];
        if (!pos || currentVinylRadius === 0) return null;

        return (
          <motion.div
            key={album.name}
            className={`album-cover-wrapper ${pos.isFocused ? 'focused' : ''}`}
            style={{
              x: pos.x,
              y: pos.y,
              scale: pos.scale,
              opacity: pos.opacity,
              zIndex: pos.zIndex,
              position: 'absolute',
              left: '50%',
              top: '50%',
              translateX: `${-currentAlbumCoverSize / 2 + pos.x}px`,
              translateY: `${-currentAlbumCoverSize / 2 + pos.y}px`,
              pointerEvents: isDragging.current ? 'none' : 'auto',
            }}
            onClick={() => handleAlbumCoverClick(index)} 
          >
            <AlbumCover album={{
              ...album,
              image: album.image.map(img => ({ '#text': getCoverImageUrl(album.image), size: img.size }))
            }} style={{ width: currentAlbumCoverSize, height: currentAlbumCoverSize }} />
          </motion.div>
        );
      })}

      <p className="drag-indicator">
        Arrastra el vinilo para navegar por los álbumes
        <br />
        <span className="drag-arrow">↓</span>
      </p>
    </div>
  );
};

export default VinylPlayer;