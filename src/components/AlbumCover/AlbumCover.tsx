import React from 'react';
import { motion } from 'framer-motion';
import type { Album } from '../../App';
import './AlbumCover.css';

interface AlbumCoverProps {
  album: Album;
  style?: React.CSSProperties; 
}

const AlbumCover: React.FC<AlbumCoverProps> = ({ album, style }) => {
  const getSmallestImage = (images: Album['image']) => {
    const smallImage = images.find(img => img.size === 'small');
    const mediumImage = images.find(img => img.size === 'medium');
    const largeImage = images.find(img => img.size === 'large');
    return smallImage?.['#text'] || mediumImage?.['#text'] || largeImage?.['#text'] || '';
  };

  const imageUrl = getSmallestImage(album.image);

  return (
    <motion.div
      className="album-cover-container"
      style={{
        ...style,
        width: style?.width || '100px',
        height: style?.height || '100px',
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={album.name}
          className="album-cover-image"
        />
      ) : (
        <div className="album-cover-placeholder">
          {album.name}
          <br />
          {album.artist}
        </div>
      )}
      <div className="album-cover-text">
        <p className="album-cover-artist">{album.artist}</p>
        <p className="album-cover-name">{album.name}</p>
      </div>
    </motion.div>
  );
};


export default AlbumCover;