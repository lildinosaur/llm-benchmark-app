import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ModelList from '../app/components/ModelList';

// Mock du client Ollama
const mockOllamaClient = {
  fetchModels: jest.fn()
};

// Remplacer l'import original par le mock
jest.mock('../lib/ollamaClient', () => ({
  ollamaClient: mockOllamaClient
}));

describe('ModelList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should display loading state initially', () => {
    mockOllamaClient.fetchModels.mockResolvedValue([]);

    render(<ModelList />);

    expect(screen.getByText('Chargement des modèles...')).toBeInTheDocument();
  });

  test('should display models when loaded successfully', async () => {
    const mockModels = [
      { name: 'llama2' },
      { name: 'mistral' }
    ];

    mockOllamaClient.fetchModels.mockResolvedValue(mockModels);

    render(<ModelList />);

    // Attendre que les modèles soient chargés
    await waitFor(() => {
      expect(screen.getByText('llama2')).toBeInTheDocument();
      expect(screen.getByText('mistral')).toBeInTheDocument();
    });
  });

  test('should display error message when loading fails', async () => {
    mockOllamaClient.fetchModels.mockRejectedValue(new Error('Network error'));

    render(<ModelList />);

    await waitFor(() => {
      expect(screen.getByText('Erreur lors du chargement')).toBeInTheDocument();
    });
  });

  test('should display no models message when no models available', async () => {
    mockOllamaClient.fetchModels.mockResolvedValue([]);

    render(<ModelList />);

    await waitFor(() => {
      expect(screen.getByText('Aucun modèle disponible')).toBeInTheDocument();
    });
  });
});