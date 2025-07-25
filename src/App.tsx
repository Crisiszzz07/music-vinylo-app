import { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'; 
import Header from './components/Header/Header';
import VinylPlayer from './components/VinylPlayer/VinylPlayer';
import AlbumInfo from './components/AlbumInfo/AlbumInfo'; 
import AlbumDetailPage from './pages/AlbumDetailPage/AlbumDetailPage'; 
import './App.css';


export interface Album {
  name: string;
  artist: string;
  image: Array<{ '#text': string; size: string }>;
  url: string;
  mbid?: string; 
  wiki?: {
    summary: string;
    content: string;
  };
}


function HomePageContent({ albums, selectedAlbumIndex, setSelectedAlbumIndex, getLargestImage }: {
  albums: Album[];
  selectedAlbumIndex: number;
  setSelectedAlbumIndex: (index: number) => void;
  getLargestImage: (images: Album['image']) => string;
}) {
  const navigate = useNavigate();

  
  const handleViewDetailsClick = () => {
    if (albums.length > 0 && albums[selectedAlbumIndex]?.mbid) {
      navigate(`/album/${albums[selectedAlbumIndex].mbid}`);
    } else {
      console.warn("No MBID available for the selected album or no album selected.");
    }
  };

  return (
    <div className="main-content">
      <div className="album-info-area">
        {albums.length > 0 && (
          <AlbumInfo
            album={albums[selectedAlbumIndex]}
            onViewDetails={handleViewDetailsClick} 
          />
        )}
      </div>
      <div className="vinyl-player-area">
        {albums.length > 0 && (
          <VinylPlayer
            albums={albums}
            onAlbumChange={setSelectedAlbumIndex}
            initialIndex={selectedAlbumIndex}
          />
        )}
      </div>
    </div>
  );
}

// maneja la carga de datos y las rutas
function AppContent() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbumIndex, setSelectedAlbumIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const LASTFM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY;
  const LASTFM_API_URL = 'https://ws.audioscrobbler.com/2.0/';

  const getLargestImage = (images: Album['image']) => {
    const largeImage = images.find(img => img.size === 'extralarge' || img.size === 'mega');
    const mediumImage = images.find(img => img.size === 'large');
    const smallImage = images.find(img => img.size === 'medium');
    return largeImage?.['#text'] || mediumImage?.['#text'] || smallImage?.['#text'] || '';
  };

  useEffect(() => {
    const fetchAlbums = async () => {
      try {
        setLoading(true);

        const topArtistsResponse = await axios.get(LASTFM_API_URL, {
          params: {
            method: 'chart.gettopartists',
            api_key: LASTFM_API_KEY,
            format: 'json',
            limit: 7,
          },
        });

        const artists = topArtistsResponse.data.artists.artist;
        const albumPromises: Promise<Album[] | null>[] = [];

        for (const artist of artists) {
          albumPromises.push(
            axios.get(LASTFM_API_URL, {
              params: {
                method: 'artist.gettopalbums',
                artist: artist.name,
                api_key: LASTFM_API_KEY,
                format: 'json',
                limit: 7,
              },
            }).then(response => {
              const topAlbums = response.data.topalbums.album;
              
              const validAlbums = topAlbums.filter((a: any) => 
                a.name !== '(null)' && a.image && a.image[0]['#text'] && a.mbid && a.url
              );

              return validAlbums.map((album: any) => ({
                name: album.name,
                artist: artist.name,
                image: album.image,
                url: album.url,
                mbid: album.mbid,
              }));
            }).catch(error => {
              console.warn(`Error fetching albums for ${artist.name}:`, error);
              return null;
            })
          );
        }

        const fetchedAlbums = (await Promise.all(albumPromises)).flat().filter(Boolean) as Album[];
        // Filtrar duplicados por MBID
        const uniqueAlbums = Array.from(new Map(fetchedAlbums.map(item => [item['mbid'], item])).values());
        
        if (uniqueAlbums.length === 0) {
            setError('No se encontraron álbumes. Intenta recargar o verifica la API Key.');
        } else {
            setAlbums(uniqueAlbums);
        }

      } catch (err) {
        console.error("Error fetching data from Last.fm:", err);
        setError('Falló la carga de datos de álbumes. Verifica tu API Key o conexión de red.');
      } finally {
        setLoading(false);
      }
    };

    fetchAlbums();
  }, [LASTFM_API_KEY]);

  useEffect(() => {
    if (albums.length > 0) {
      const currentAlbum = albums[selectedAlbumIndex];
      const imageUrl = getLargestImage(currentAlbum.image);
      document.documentElement.style.setProperty('--bg-album-image', `url(${imageUrl})`);
    } else {
      document.documentElement.style.setProperty('--bg-album-image', 'none');
    }
  }, [albums, selectedAlbumIndex]);

  if (loading) {
    return <div className="loading-screen">Cargando álbumes...</div>;
  }

  if (error) {
    return <div className="error-screen">Error: {error}</div>;
  }

  return (
    <div className="app-container">
      <Header />
      <Routes>
        <Route path="/" element={
          <HomePageContent
            albums={albums}
            selectedAlbumIndex={selectedAlbumIndex}
            setSelectedAlbumIndex={setSelectedAlbumIndex}
            getLargestImage={getLargestImage}
          />
        } />
        <Route path="/album/:mbid" element={<AlbumDetailPage albums={albums} />} />
      </Routes>
    </div>
  );
}

export default function App() { 
  return (
    <Router>
      <AppContent />
    </Router>
  );
}