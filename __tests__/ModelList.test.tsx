import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModelList from '../app/components/ModelList';
import type { OllamaModel } from '../app/lib/types';

// Mock du client Ollama. Le chemin doit correspondre au module effectivement
// importé par ModelList (app/lib/ollamaClient), résolu ici depuis __tests__.
const mockFetchModels = jest.fn<Promise<OllamaModel[]>, []>();

jest.mock('../app/lib/ollamaClient', () => ({
  ollamaClient: {
    fetchModels: () => mockFetchModels()
  }
}));

describe('ModelList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // ModelList appelle aussi /api/results et /api/benchmark/status au montage :
    // on stubbe fetch pour éviter des rejets non gérés en environnement de test.
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [], run: null }) })
    ) as unknown as typeof fetch;
  });

  test('should display loading state initially', () => {
    mockFetchModels.mockResolvedValue([]);

    render(<ModelList />);

    expect(screen.getByText('Chargement des modèles...')).toBeInTheDocument();
  });

  test('should display models when loaded successfully', async () => {
    const mockModels: OllamaModel[] = [
      { name: 'llama2' },
      { name: 'mistral' }
    ];

    mockFetchModels.mockResolvedValue(mockModels);

    render(<ModelList />);

    // Attendre que les modèles soient chargés
    await waitFor(() => {
      expect(screen.getByText('llama2')).toBeInTheDocument();
      expect(screen.getByText('mistral')).toBeInTheDocument();
    });
  });

  test('should display error message when loading fails', async () => {
    mockFetchModels.mockRejectedValue(new Error('Network error'));

    render(<ModelList />);

    await waitFor(() => {
      expect(screen.getByText('Erreur lors du chargement')).toBeInTheDocument();
    });
  });

  test('should display no models message when no models available', async () => {
    mockFetchModels.mockResolvedValue([]);

    render(<ModelList />);

    await waitFor(() => {
      expect(screen.getByText('Aucun modèle disponible')).toBeInTheDocument();
    });
  });
});
