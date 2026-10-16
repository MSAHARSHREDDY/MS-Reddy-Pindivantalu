import React, { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX, Music } from 'lucide-react';

export const BackgroundMusic: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.4;
    audio.loop = true;

    const playAudio = () => {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.log('Autoplay blocked, waiting for user click:', err);
      });
    };

    playAudio();

    const handleInteraction = () => {
      if (audio.paused) {
        audio.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {});
      }
    };

    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.error('Playback failed:', err);
      });
    }
  };

  return (
    <>
      <audio
        ref={audioRef}
        src="/background-music.mp3"
        preload="auto"
        loop
      />
      {/* Floating Icon-Only Music Toggle Widget */}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={togglePlay}
          type="button"
          className={`w-11 h-11 flex items-center justify-center rounded-full shadow-xl transition-all duration-300 cursor-pointer ${
            isPlaying
              ? 'bg-amber-900 text-amber-200 ring-2 ring-amber-400/70 shadow-amber-900/30'
              : 'bg-stone-900 text-stone-200 hover:bg-stone-800 shadow-stone-900/20'
          }`}
          title={isPlaying ? 'Pause Music' : 'Play Music'}
          aria-label="Toggle Background Music"
        >
          {isPlaying ? (
            <Volume2 className="w-5 h-5 text-amber-300 animate-pulse" />
          ) : (
            <VolumeX className="w-5 h-5 text-stone-400" />
          )}
        </button>
      </div>
    </>
  );
};
