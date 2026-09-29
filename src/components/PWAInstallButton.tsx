import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, CheckCircle, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface Props {
  className?: string;
  variant?: 'button' | 'compact' | 'banner';
}

export const PWAInstallButton: React.FC<Props> = ({ className = '', variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  // Déjà installé
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    const success = await install();
    if (success) {
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 4000);
    }
  };

  if (installedSuccess) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-700 text-xs font-medium border border-emerald-500/30">
        <CheckCircle className="w-4 h-4 text-emerald-600" />
        <span>Application installée !</span>
      </div>
    );
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={handleInstallClick}
        aria-label="Installer l'application sur votre appareil"
        className={`group inline-flex items-center gap-2 rounded-xl bg-teal-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-1 ${className}`}
      >
        <Smartphone className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
        <span>Installer l'App</span>
        <span className="hidden sm:inline text-[10px] bg-teal-700/60 px-1.5 py-0.5 rounded text-teal-100">PWA</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-1.5 text-xs font-semibold text-teal-800 hover:bg-teal-100/90 active:scale-95 transition ${className}`}
        >
          <Download className="w-3.5 h-3.5 text-teal-700" />
          <span>Installer sur iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="w-12 h-12 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6" />
              </div>

              <h3 className="text-base font-bold text-slate-900">
                Installer l'App Cabinet Orthophonie
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Accédez rapidement à votre planning et vos dossiers patients directement depuis votre écran d'accueil iOS.
              </p>

              <div className="mt-4 space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs text-slate-700">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <div>
                    Appuyez sur le bouton <strong>Partager</strong> <Share2 className="w-3.5 h-3.5 inline text-teal-600 mx-1" /> dans la barre de Safari (en bas).
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px]">
                    2
                  </span>
                  <div>
                    Faites défiler vers le bas et sélectionnez <strong>Sur l'écran d'accueil</strong> <PlusSquare className="w-3.5 h-3.5 inline text-teal-600 mx-1" />.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-[10px]">
                    3
                  </span>
                  <div>
                    Appuyez sur <strong>Ajouter</strong> en haut à droite. L'application est prête !
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-teal-600 py-2.5 text-xs font-semibold text-white hover:bg-teal-700 active:scale-98 transition shadow"
              >
                J'ai compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
