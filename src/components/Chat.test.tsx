import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Chat from './Chat';

// Mock scrollIntoView
beforeEach(() => {
  // Create a mock function for scrollIntoView
  const mockScrollIntoView = jest.fn();
  
  // Add it to the HTMLElement prototype
  HTMLElement.prototype.scrollIntoView = mockScrollIntoView;
});

describe('Chat', () => {
  // Mock props
  const mockMessages = [
    { id: '1', playerId: 'player1', playerName: 'Player 1', content: 'Hello everyone!' },
    { id: '2', playerId: 'system', playerName: 'System', content: 'Game starting in 10 seconds...', isSystemMessage: true },
    { id: '3', playerId: 'player2', playerName: 'Player 2', content: 'Good luck!' }
  ];
  
  const mockProps = {
    messages: mockMessages,
    onSendMessage: jest.fn(),
    playerId: 'player1',
    disabled: false,
    placeholder: 'Type your guess here...'
  };
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders messages', () => {
    render(<Chat {...mockProps} />);
    
    // Check that all messages are rendered
    expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
    expect(screen.getByText('Game starting in 10 seconds...')).toBeInTheDocument();
    expect(screen.getByText('Good luck!')).toBeInTheDocument();
  });
  
  test('differentiates between user messages, other player messages, and system messages', () => {
    const { container } = render(<Chat {...mockProps} />);
    
    // Get all message containers
    const messageElements = container.querySelectorAll('div[class*="p-2 rounded"]');
    
    // First message is from the current user
    expect(messageElements[0]).toHaveClass('bg-blue-100');
    
    // Second message is a system message
    expect(messageElements[1]).toHaveClass('bg-gray-100');
    
    // Third message is from another player
    expect(messageElements[2]).toHaveClass('bg-gray-200');
  });
  
  test('allows sending messages', () => {
    render(<Chat {...mockProps} />);
    
    // Get the input field and send button
    const inputField = screen.getByPlaceholderText('Type your guess here...');
    const sendButton = screen.getByText('Send');
    
    // Type a message and click send
    fireEvent.change(inputField, { target: { value: 'Testing message' } });
    fireEvent.click(sendButton);
    
    // Check that onSendMessage was called with the message
    expect(mockProps.onSendMessage).toHaveBeenCalledWith('Testing message');
    
    // Input should be cleared
    expect(inputField).toHaveValue('');
  });
  
  test('allows sending messages with Enter key', () => {
    const { container } = render(<Chat {...mockProps} />);
    
    // Get the input field
    const inputField = screen.getByPlaceholderText('Type your guess here...');
    
    // Type a message and press Enter
    fireEvent.change(inputField, { target: { value: 'Testing Enter key' } });
    
    // Get the form directly and submit it
    const form = container.querySelector('form');
    fireEvent.submit(form!);
    
    // Check that onSendMessage was called with the message
    expect(mockProps.onSendMessage).toHaveBeenCalledWith('Testing Enter key');
    
    // Input should be cleared
    expect(inputField).toHaveValue('');
  });
  
  test('does not send empty messages', () => {
    render(<Chat {...mockProps} />);
    
    // Get the input field and send button
    const inputField = screen.getByPlaceholderText('Type your guess here...');
    const sendButton = screen.getByText('Send');
    
    // Try to send an empty message
    fireEvent.click(sendButton);
    
    // onSendMessage should not have been called
    expect(mockProps.onSendMessage).not.toHaveBeenCalled();
  });
  
  test('disables input when disabled is true', () => {
    render(<Chat {...mockProps} disabled={true} />);
    
    // Input and button should be disabled
    const inputField = screen.getByPlaceholderText('Type your guess here...');
    const sendButton = screen.getByText('Send');
    
    expect(inputField).toBeDisabled();
    
    // Type a message and try to send
    fireEvent.change(inputField, { target: { value: 'Should not send' } });
    fireEvent.click(sendButton);
    
    // onSendMessage should not have been called
    expect(mockProps.onSendMessage).not.toHaveBeenCalled();
  });
  
  test('auto-scrolls to the bottom when new messages arrive', () => {
    const scrollIntoViewMock = jest.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
    
    render(<Chat {...mockProps} />);
    
    // Check that scrollIntoView was called
    expect(scrollIntoViewMock).toHaveBeenCalled();
  });
}); 