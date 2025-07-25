import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion'; // Removido AnimatePresence si no se usa para transiciones de salida complejas
import axios from 'axios';
import type { Album } from '../../App';
import './AlbumDetailPage.css';

interface Track {
  name: string;
  duration: string;
  url: string;
}

interface FullAlbumDetails extends Album {
  tracks?: {
    track: Track[];
  };
  wiki?: {
    summary: string;
    content: string;
  };
  releasedate?: string;
}

interface AlbumDetailPageProps {
  albums: Album[]; // Se sigue pasando la lista completa de álbumes
}

const AlbumDetailPage: React.FC<AlbumDetailPageProps> = ({ albums }) => {
  const { mbid } = useParams<{ mbid: string }>();
  const navigate = useNavigate();

  const [albumDetails, setAlbumDetails] = useState<FullAlbumDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY;
  const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

  const getLargestImage = (images: Album['image']) => {
    const largeImage = images.find(img => img.size === 'extralarge' || img.size === 'mega');
    const mediumImage = images.find(img => img.size === 'large');
    const smallImage = images.find(img => img.size === 'small');
    return largeImage?.['#text'] || mediumImage?.['#text'] || smallImage?.['#text'] || '';
  };

  useEffect(() => {
    const fetchAlbumDetails = async () => {
      if (!mbid) {
        setError('No MBID provided for album details.');
        setLoading(false);
        return;
      }

      // Reiniciar detalles y estado de carga para el nuevo MBID
      setAlbumDetails(null); 
      setError(null);
      setLoading(true);

      try {
        const response = await axios.get(LASTFM_API_URL, {
          params: {
            method: 'album.getinfo',
            api_key: LASTFM_API_KEY,
            mbid: mbid,
            format: 'json',
          },
        });

        if (response.data.album) {
          const fetchedAlbum: FullAlbumDetails = {
            name: response.data.album.name,
            artist: response.data.album.artist,
            image: response.data.album.image,
            url: response.data.album.url,
            mbid: response.data.album.mbid,
            tracks: response.data.album.tracks,
            wiki: response.data.album.wiki,
            releasedate: response.data.album.releasedate,
          };
          setAlbumDetails(fetchedAlbum);
        } else {
          setError('Album not found.');
        }
      } catch (err) {
        console.error("Error fetching album details:", err);
        setError('Failed to fetch album details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumDetails();
  }, [mbid, LASTFM_API_KEY]); // Dependencia clave: mbid

  // Lógica para navegar al álbum anterior/siguiente (HAY QUE MEJORAR, NO SIRVE AÚN)
  const navigateToAdjacentAlbum = (direction: 'prev' | 'next') => {
    if (!albumDetails || albums.length === 0) return;

    
    const currentMbid = albumDetails.mbid;
    if (!currentMbid) return;

    const currentIndex = albums.findIndex(a => a.mbid === currentMbid);
    if (currentIndex === -1) {
        console.warn("Current album MBID not found in the provided albums list.");
        return;
    }

    let nextIndex;
    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % albums.length;
    } else {
      nextIndex = (currentIndex - 1 + albums.length) % albums.length;
    }

    const nextAlbum = albums[nextIndex];
    if (nextAlbum && nextAlbum.mbid) {
      navigate(`/album/${nextAlbum.mbid}`);
    } else {
      console.warn(`No valid MBID found for ${direction} album at index ${nextIndex}.`);
    }
  };

  if (loading) {
    return <div className="detail-loading-screen">Cargando detalles del álbum...</div>;
  }

  if (error) {
    return <div className="detail-error-screen">Error: {error}</div>;
  }

  if (!albumDetails) {
    return <div className="detail-error-screen">Álbum no encontrado o datos incompletos.</div>;
  }

  const albumImageUrl = getLargestImage(albumDetails.image);

  return (
    <div className="album-detail-page">
      <motion.div
        className="detail-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
      >
        {/* Panel Izquierdo: Tracklist */}
        <div className="detail-panel left-panel">
          <h3>Tracklist</h3>
          <div className="tracklist-scroll-container">
            <ol className="tracklist">
              {albumDetails.tracks?.track.length ? (
                albumDetails.tracks.track.map((track, index) => (
                  <li key={index} className="track-item">
                    <a href={track.url} target="_blank" rel="noopener noreferrer" className="track-link">
                      <span className="track-number">{index + 1}.</span>
                      <span className="track-name">{track.name}</span>
                      {track.duration && (
                        <span className="track-duration">
                          {Math.floor(parseInt(track.duration, 10) / 60)}:
                          {(parseInt(track.duration, 10) % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </a>
                  </li>
                ))
              ) : (
                <p>No tracks available.</p>
              )}
            </ol>
          </div>
        </div>

        {/* Vinilo */}
        <motion.div
            className="detail-vinyl"
            initial={{ scale: 0.5, rotate: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ type: "spring", stiffness: 50, damping: 10 }}
        >
            <div className="detail-vinyl-center"></div>
            <div className="detail-vinyl-grooves"></div>
            {albumImageUrl && (
                <img src={albumImageUrl} alt={albumDetails.name} className="detail-vinyl-cover-center" />
            )}
            <div className="turntable-arm"></div>
        </motion.div>


        {/* Panel Derecho: Información del Álbum */}
        <div className="detail-panel right-panel">
          <img src={albumImageUrl} alt={albumDetails.name} className="detail-album-cover" />
          <h2 className="detail-album-title">{albumDetails.name}</h2>
          <h3 className="detail-album-artist">{albumDetails.artist}</h3>
          {albumDetails.releasedate && <p className="detail-album-release-date">Lanzamiento: {albumDetails.releasedate.split(',')[0]}</p>}
          
          {albumDetails.wiki?.summary && (
            <p className="detail-album-description">
              {albumDetails.wiki.summary.split('<a')[0]}
            </p>
          )}

          <div className="detail-buttons">
            <a href={albumDetails.url} target="_blank" rel="noopener noreferrer" className="detail-button primary">
              Más en Last.fm
            </a>
            <button onClick={() => navigate('/')} className="detail-button secondary">
              Volver
            </button>
          </div>
        </div>
      </motion.div>

      {/* Navegación entre álbumes */}
      <div className="album-navigation">
        <button className="nav-button" onClick={() => navigateToAdjacentAlbum('prev')}>
          <i className="arrow left"></i> Anterior
        </button>
        <button className="nav-button" onClick={() => navigateToAdjacentAlbum('next')}>
          Siguiente <i className="arrow right"></i>
        </button>
      </div>
    </div>
  );
};

export default AlbumDetailPage;