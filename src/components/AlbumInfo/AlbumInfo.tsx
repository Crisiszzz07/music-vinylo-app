import React from 'react';
import { motion } from 'framer-motion';
import type { Album } from '../../App';
import './AlbumInfo.css';

interface AlbumInfoProps {
  album: Album;
  onViewDetails: () => void; 
}

const AlbumInfo: React.FC<AlbumInfoProps> = ({ album, onViewDetails }) => {
  const infoVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const getLargestImage = (images: Album['image']) => {
    const largeImage = images.find(img => img.size === 'extralarge' || img.size === 'mega');
    const mediumImage = images.find(img => img.size === 'large');
    const smallImage = images.find(img => img.size === 'medium');

    return largeImage?.['#text'] || mediumImage?.['#text'] || smallImage?.['#text'] || '';
  };

  const imageUrl = getLargestImage(album.image);

  return (
    <motion.div
      key={album.name}
      variants={infoVariants}
      initial="hidden"
      animate="visible"
      className="album-info-card"
    >
      {imageUrl && <img src={imageUrl} alt={album.name} className="album-info-cover" />}
      <h2 className="album-info-title">{album.name}</h2>
      <h3 className="album-info-artist">{album.artist}</h3>
      <p className="album-info-description">
        "Sumérgete en los sonidos únicos de este álbum. Una experiencia auditiva inolvidable."
      </p>
      {}
      <button onClick={onViewDetails} className="album-info-link">
        Más sobre el álbum
      </button>
    </motion.div>
  );
};

export default AlbumInfo;