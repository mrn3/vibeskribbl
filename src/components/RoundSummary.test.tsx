import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import RoundSummary from './RoundSummary';

describe('RoundSummary', () => {
  // Mock data for testing
  const mockProps = {
    word: 'elephant',
    players: [
      {
        id: 'player1',
        name: 'Drawer Player',
        score: 120,
        previousScore: 80,
        isDrawing: true,
        hasGuessedCorrectly: false
      },
      {
        id: 'player2',
        name: 'Fast Guesser',
        score: 200,
        previousScore: 100,
        isDrawing: false,
        hasGuessedCorrectly: true
      },
      {
        id: 'player3',
        name: 'Slow Guesser',
        score: 140,
        previousScore: 100,
        isDrawing: false,
        hasGuessedCorrectly: true
      }
    ],
    drawer: {
      id: 'player1',
      name: 'Drawer Player'
    },
    isVisible: true,
    onClose: jest.fn()
  };

  // Mock timer for testing auto-close functionality
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test('renders the round summary when visible', () => {
    render(<RoundSummary {...mockProps} />);
    
    // Check that the component renders correctly
    expect(screen.getByText('Round Summary')).toBeInTheDocument();
    expect(screen.getByText(/The word was:/)).toBeInTheDocument();
    expect(screen.getByText('elephant')).toBeInTheDocument();
    expect(screen.getByText(/Drawn by:/)).toBeInTheDocument();
    
    // Use getAllByText for elements that might appear multiple times
    const drawerElements = screen.getAllByText('Drawer Player');
    expect(drawerElements.length).toBeGreaterThan(0);
  });

  test('does not render when not visible', () => {
    render(<RoundSummary {...mockProps} isVisible={false} />);
    
    // Component should not be in the document
    expect(screen.queryByText('Round Summary')).not.toBeInTheDocument();
  });

  test('displays players sorted by score', () => {
    render(<RoundSummary {...mockProps} />);
    
    // Get all player name elements and verify they are ordered correctly
    const playerElements = screen.getAllByTestId('player-item');
    
    // First player should have Fast Guesser text somewhere in its content
    expect(playerElements[0].textContent).toContain('Fast Guesser');
    
    // Next should have Slow Guesser
    expect(playerElements[1].textContent).toContain('Slow Guesser');
    
    // Last should have Drawer Player
    expect(playerElements[2].textContent).toContain('Drawer Player');
  });

  test('displays points gained for each player', () => {
    render(<RoundSummary {...mockProps} />);
    
    // Check that points gained are displayed correctly
    expect(screen.getByText('+100')).toBeInTheDocument(); // Fast Guesser: 200 - 100 = 100
    
    // Use getAllByText for elements that might appear multiple times
    const pointElements = screen.getAllByText('+40');
    expect(pointElements.length).toBe(2); // Two players with +40 points
  });

  test('shows drawer badge for the drawer', () => {
    render(<RoundSummary {...mockProps} />);
    
    // Check that drawer badge is displayed
    expect(screen.getByText('Drawer')).toBeInTheDocument();
  });

  test('displays scoring explanation section', () => {
    render(<RoundSummary {...mockProps} />);
    
    // Check that scoring explanation is displayed
    expect(screen.getByText('Scoring System')).toBeInTheDocument();
    expect(screen.getByText(/Fast guess/)).toBeInTheDocument();
    expect(screen.getByText(/Quick guess/)).toBeInTheDocument();
    expect(screen.getByText(/Standard guess/)).toBeInTheDocument();
    expect(screen.getByText(/First correct guess/)).toBeInTheDocument();
    expect(screen.getByText(/Drawer reward/)).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    render(<RoundSummary {...mockProps} />);
    
    // Find and click the close button
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    
    // Check that onClose was called
    expect(mockProps.onClose).toHaveBeenCalledTimes(1);
  });

  test('auto-closes after timer expires', () => {
    // Create a fresh mock for onClose
    const onCloseMock = jest.fn();
    
    // Mock setTimeout to immediately execute the callback
    jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
      callback();
      return 123 as any; // Return a timer ID
    });
    
    render(
      <RoundSummary 
        {...mockProps} 
        onClose={onCloseMock}
      />
    );
    
    // Since our mock immediately executes the callback, 
    // the timeLeft will go from 10 to 0 immediately
    // and onClose should be called
    
    // We need to run act 10 times to simulate 10 seconds passing
    for (let i = 0; i < 10; i++) {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
    
    // Check that onClose was called
    expect(onCloseMock).toHaveBeenCalledTimes(1);
    
    // Restore the original setTimeout
    (global.setTimeout as jest.Mock).mockRestore();
  });
}); 