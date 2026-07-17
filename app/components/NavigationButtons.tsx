import React from 'react';

interface NavigationButtonsProps {
  models: unknown[];
  currentModelIndex: number;
  onNavigate: (index: number) => void;
}

export default function NavigationButtons({
  models,
  currentModelIndex,
  onNavigate
}: NavigationButtonsProps) {
  const handlePrevious = () => {
    if (currentModelIndex > 0) {
      onNavigate(currentModelIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentModelIndex < models.length - 1) {
      onNavigate(currentModelIndex + 1);
    }
  };

  if (models.length <= 1) {
    return null; // Pas besoin de boutons si un seul modèle
  }

  return (
    <div className="navigation-buttons">
      <button
        onClick={handlePrevious}
        disabled={currentModelIndex === 0}
        className={`nav-button ${currentModelIndex === 0 ? 'disabled' : ''}`}
      >
        ← Modèle précédent
      </button>

      <span className="model-counter">
        {currentModelIndex + 1} / {models.length}
      </span>

      <button
        onClick={handleNext}
        disabled={currentModelIndex === models.length - 1}
        className={`nav-button ${currentModelIndex === models.length - 1 ? 'disabled' : ''}`}
      >
        Modèle suivant →
      </button>
    </div>
  );
}
