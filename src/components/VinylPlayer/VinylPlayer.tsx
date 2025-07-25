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
const ALBUM_COVER_BASE_SIZE_PX = 90; // Tamaño base de la portada en píxeles

const VinylPlayer: React.FC<VinylPlayerProps> = ({ albums, onAlbumChange, initialIndex }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const vinylRef = useRef<HTMLDivElement>(null);

  const lastX = useRef(0);
  const isDragging = useRef(false);

  const rotation = useMotionValue(0);
  const smoothRotation = useSpring(rotation, { stiffness: 100, damping: 20 });

  const [currentSelectionIndex, setCurrentSelectionIndex] = useState(initialIndex);
  const [albumPositions, setAlbumPositions] = useState<any[]>([]);

  const [currentVinylRadius, setCurrentVinylRadius] = useState(0);
  const [currentAlbumCoverSize, setCurrentAlbumCoverSize] = useState(0);

  
  console.log('VinylPlayer: Initial Render');

  useLayoutEffect(() => {
    const updateSizes = () => {
      if (vinylRef.current) {
        const computedStyle = getComputedStyle(vinylRef.current);
        const vinylWidth = parseFloat(computedStyle.width);
        if (!isNaN(vinylWidth) && vinylWidth > 0) {
          const newVinylRadius = vinylWidth / 2;
          const newAlbumCoverSize = vinylWidth * 0.18;
          setCurrentVinylRadius(newVinylRadius);
          setCurrentAlbumCoverSize(newAlbumCoverSize);
          console.log(`useLayoutEffect: Sizes updated. VinylWidth: ${vinylWidth}, NewVinylRadius: ${newVinylRadius}, NewAlbumCoverSize: ${newAlbumCoverSize}`);
        }
      } else {
     
        setCurrentVinylRadius(VINYL_BASE_RADIUS_PX);
        setCurrentAlbumCoverSize(ALBUM_COVER_BASE_SIZE_PX);
        console.log('useLayoutEffect: vinylRef.current is null, using fallback sizes.');
      }
    };

    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => {
      window.removeEventListener('resize', updateSizes);
      console.log('useLayoutEffect: Cleanup resize listener.');
    };
  }, []);

  useEffect(() => {
    console.log(`useEffect: currentSelectionIndex changed to ${currentSelectionIndex}. Calling onAlbumChange.`);
    onAlbumChange(currentSelectionIndex);
  }, [currentSelectionIndex, onAlbumChange]);

  
  useEffect(() => {
    console.log(`useEffect (initial rotation): Albums length: ${albums.length}, currentVinylRadius: ${currentVinylRadius}`);
    if (albums.length > 0 && currentVinylRadius > 0) {
      const albumAngle = 360 / albums.length;
      const targetRotationForInitial = -(initialIndex * albumAngle);

      rotation.set(targetRotationForInitial);
      smoothRotation.set(targetRotationForInitial);
      console.log(`useEffect (initial rotation): Setting initial rotation to ${targetRotationForInitial} for index ${initialIndex}.`);
    } else if (albums.length === 0) {
      console.log('useEffect (initial rotation): Albums not loaded yet.');
    } else if (currentVinylRadius === 0) {
      console.log('useEffect (initial rotation): currentVinylRadius is 0, deferring initial rotation setup.');
    }
  }, [albums, initialIndex, rotation, currentVinylRadius, smoothRotation]);

  useEffect(() => {
    console.log(`useEffect (album positions): currentVinylRadius: ${currentVinylRadius}, albums.length: ${albums.length}`);
    if (currentVinylRadius === 0 || albums.length === 0) {
      setAlbumPositions([]);
      console.log('useEffect (album positions): Clearing album positions as radius or albums are not ready.');
      return;
    }

    const unsubscribe = smoothRotation.on("change", (latestRotation) => {
      console.log(`smoothRotation changed: ${latestRotation}`);
      const currentRotValue = typeof latestRotation === 'number' ? latestRotation : 0;
      const vinylRad = typeof currentVinylRadius === 'number' ? currentVinylRadius : 0;

      if (vinylRad === 0 || albums.length === 0) {
        console.warn('smoothRotation.on: Received invalid vinylRad or albums length during rotation update.');
        return;
      }

     
      const displayAlbums = albums.filter((_, idx) => idx !== 0); 
      const newPositions = displayAlbums.map((album, index) => {
        const albumAngle = 360 / displayAlbums.length; 
        let currentAlbumAngle = index * albumAngle + currentRotValue;
        
        
        currentAlbumAngle = ((currentAlbumAngle % 360) + 360) % 360;
        
       
        const adjustedAngle = index === 0 && Math.abs(currentAlbumAngle) < 0.1 ? 
          currentAlbumAngle + 0.5 : currentAlbumAngle;
        
        const rad = (adjustedAngle * Math.PI) / 180;

        const xPos = vinylRad * COVER_DISTANCE_RATIO * Math.cos(rad);
        let yPos = vinylRad * COVER_DISTANCE_RATIO * Math.sin(rad);

        
        if (index === 0 && Math.abs(yPos) < 0.1) {
          yPos = yPos > 0 ? 0.1 : -0.1;
        }

        let angleFromFocus = Math.abs(currentAlbumAngle % 360);
        if (angleFromFocus > 180) {
          angleFromFocus = 360 - angleFromFocus;
        }
        const prominence = 1 - (angleFromFocus / 180);

        let calculatedScale = 0.7 + (prominence * 0.5);
        const opacity = 0.2 + (prominence * 0.8);
        const isFocused = (index + 1) === currentSelectionIndex; 

        console.log(`Album ${index + 1} (${album.name}): 
          angle: ${currentAlbumAngle.toFixed(2)}°, 
          x: ${xPos.toFixed(2)}, 
          y: ${yPos.toFixed(2)}, 
          scale: ${isFocused ? '1.30 (Forced)' : calculatedScale.toFixed(2)}, 
          opacity: ${isFocused ? '1.00 (Forced)' : opacity.toFixed(2)}, 
          zIndex: ${isFocused ? 20 : (yPos > 0 ? 5 : 15)}`);

        return {
          x: xPos,
          y: yPos,
          scale: isFocused ? 1.3 : calculatedScale,
          opacity: isFocused ? 1 : opacity,
          zIndex: isFocused ? 20 : (yPos > 0 ? 5 : 15),
          isFocused: isFocused,
          originalIndex: albums.indexOf(album), 
        };
      });
      setAlbumPositions(newPositions);
    });

    return () => {
      unsubscribe();
      console.log('useEffect (album positions): Unsubscribed from smoothRotation changes.');
    };
  }, [albums, smoothRotation, currentSelectionIndex, currentVinylRadius, COVER_DISTANCE_RATIO]);

  const handlePointerDown = (event: React.PointerEvent) => {
    isDragging.current = true;
    lastX.current = event.clientX;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    console.log('handlePointerDown: Dragging started.');
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!isDragging.current) return;

    const deltaX = event.clientX - lastX.current;
    rotation.set(rotation.get() + deltaX * DRAG_SENSITIVITY);
    lastX.current = event.clientX;

    const displayAlbums = albums.filter((_, idx) => idx !== 0);
    const albumAngle = 360 / displayAlbums.length;
    let currentDeg = rotation.get();
    let newIndex = Math.round(wrap(0, displayAlbums.length, -currentDeg / albumAngle));
    newIndex = (newIndex % displayAlbums.length + displayAlbums.length) % displayAlbums.length;

    
    const originalAlbumIndex = displayAlbums[newIndex] ? albums.indexOf(displayAlbums[newIndex]) : 0; // Fallback to 0

    if (originalAlbumIndex !== currentSelectionIndex) {
      setCurrentSelectionIndex(originalAlbumIndex);
      console.log(`handlePointerMove: New selection index (original array): ${originalAlbumIndex}`);
    }
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    isDragging.current = false;
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);

    const displayAlbums = albums.filter((_, idx) => idx !== 0); 
    const albumAngle = 360 / displayAlbums.length;
    
    
    const indexOfSelectedInDisplayed = displayAlbums.findIndex(album => albums.indexOf(album) === currentSelectionIndex);

    const targetRotation = -(indexOfSelectedInDisplayed * albumAngle); 
    smoothRotation.set(targetRotation);
    rotation.set(targetRotation);
    console.log(`handlePointerUp: Dragging ended. Settling to target rotation: ${targetRotation} for original index ${currentSelectionIndex}`);
  };

  const getCoverImageUrl = (images: Album['image']) => {
    const largeImage = images.find(img => img.size === 'large');
    const mediumImage = images.find(img => img.size === 'medium');
    const smallImage = images.find(img => img.size === 'small');
    return largeImage?.['#text'] || mediumImage?.['#text'] || smallImage?.['#text'] || '';
  };

  const handleAlbumCoverClick = (originalIndex: number) => {
    if (!isDragging.current) {
      
      const displayAlbums = albums.filter((_, idx) => idx !== 0);
      const indexOfClickedInDisplayed = displayAlbums.findIndex(album => albums.indexOf(album) === originalIndex);

      if (indexOfClickedInDisplayed !== -1) {
        const albumAngle = 360 / displayAlbums.length;
        const targetRotation = -(indexOfClickedInDisplayed * albumAngle);
        smoothRotation.set(targetRotation);
        rotation.set(targetRotation);
        setCurrentSelectionIndex(originalIndex);
        console.log(`handleAlbumCoverClick: Clicked album original index ${originalIndex}. Setting target rotation: ${targetRotation}`);
      }
    } else {
      console.log('handleAlbumCoverClick: Click ignored, still dragging.');
    }
  };

  const albumsToDisplay = albums.filter((_, index) => index !== 0);

  return (
    <div className="vinyl-player-container" ref={containerRef}>
      {/* Vinilo */}
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
      {albumsToDisplay.map((album, index) => { 
        const pos = albumPositions[index]; 
        if (!pos || currentVinylRadius === 0 || currentAlbumCoverSize === 0) {
          console.log(`Album ${index} not rendered: missing position data`);
          return null;
        }

       
        const isAlbum0 = index === 0; 
        const adjustedY = isAlbum0 ? (pos.y === 0 ? 0.1 : pos.y) : pos.y;

        return (
          <motion.div
            key={`${album.mbid}-${album.name}`} 
            className={`album-cover-wrapper ${pos.isFocused ? 'focused' : ''} ${isAlbum0 ? 'album-0' : ''}`}
            style={{
              x: pos.x,
              y: adjustedY,
              scale: pos.scale,
              opacity: pos.opacity,
              zIndex: pos.zIndex,
              position: 'absolute',
              left: '50%',
              top: '50%',
              translateX: `${-currentAlbumCoverSize / 2 + pos.x}px`,
              translateY: `${-currentAlbumCoverSize / 2 + adjustedY}px`,
              pointerEvents: isDragging.current ? 'none' : 'auto',
            }}
            onClick={() => handleAlbumCoverClick(pos.originalIndex)} // Pass original index
            initial={false}
          >
            <AlbumCover 
              album={{
                ...album,
                image: album.image.map(img => ({ 
                  '#text': getCoverImageUrl(album.image), 
                  size: img.size 
                }))
              }} 
              style={{ 
                width: currentAlbumCoverSize, 
                height: currentAlbumCoverSize,
                transform: isAlbum0 ? 'translateZ(0.1px)' : 'none'
              }} 
            />
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