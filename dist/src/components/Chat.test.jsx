"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
require("@testing-library/jest-dom");
const Chat_1 = __importDefault(require("./Chat"));
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
        (0, react_1.render)(<Chat_1.default {...mockProps}/>);
        // Check that all messages are rendered
        expect(react_1.screen.getByText('Hello everyone!')).toBeInTheDocument();
        expect(react_1.screen.getByText('Game starting in 10 seconds...')).toBeInTheDocument();
        expect(react_1.screen.getByText('Good luck!')).toBeInTheDocument();
    });
    test('differentiates between user messages, other player messages, and system messages', () => {
        const { container } = (0, react_1.render)(<Chat_1.default {...mockProps}/>);
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
        (0, react_1.render)(<Chat_1.default {...mockProps}/>);
        // Get the input field and send button
        const inputField = react_1.screen.getByPlaceholderText('Type your guess here...');
        const sendButton = react_1.screen.getByText('Send');
        // Type a message and click send
        react_1.fireEvent.change(inputField, { target: { value: 'Testing message' } });
        react_1.fireEvent.click(sendButton);
        // Check that onSendMessage was called with the message
        expect(mockProps.onSendMessage).toHaveBeenCalledWith('Testing message');
        // Input should be cleared
        expect(inputField).toHaveValue('');
    });
    test('allows sending messages with Enter key', () => {
        const { container } = (0, react_1.render)(<Chat_1.default {...mockProps}/>);
        // Get the input field
        const inputField = react_1.screen.getByPlaceholderText('Type your guess here...');
        // Type a message and press Enter
        react_1.fireEvent.change(inputField, { target: { value: 'Testing Enter key' } });
        // Get the form directly and submit it
        const form = container.querySelector('form');
        react_1.fireEvent.submit(form);
        // Check that onSendMessage was called with the message
        expect(mockProps.onSendMessage).toHaveBeenCalledWith('Testing Enter key');
        // Input should be cleared
        expect(inputField).toHaveValue('');
    });
    test('does not send empty messages', () => {
        (0, react_1.render)(<Chat_1.default {...mockProps}/>);
        // Get the input field and send button
        const inputField = react_1.screen.getByPlaceholderText('Type your guess here...');
        const sendButton = react_1.screen.getByText('Send');
        // Try to send an empty message
        react_1.fireEvent.click(sendButton);
        // onSendMessage should not have been called
        expect(mockProps.onSendMessage).not.toHaveBeenCalled();
    });
    test('disables input when disabled is true', () => {
        (0, react_1.render)(<Chat_1.default {...mockProps} disabled={true}/>);
        // Input and button should be disabled
        const inputField = react_1.screen.getByPlaceholderText('Type your guess here...');
        const sendButton = react_1.screen.getByText('Send');
        expect(inputField).toBeDisabled();
        // Type a message and try to send
        react_1.fireEvent.change(inputField, { target: { value: 'Should not send' } });
        react_1.fireEvent.click(sendButton);
        // onSendMessage should not have been called
        expect(mockProps.onSendMessage).not.toHaveBeenCalled();
    });
    test('auto-scrolls to the bottom when new messages arrive', () => {
        const scrollIntoViewMock = jest.fn();
        HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;
        (0, react_1.render)(<Chat_1.default {...mockProps}/>);
        // Check that scrollIntoView was called
        expect(scrollIntoViewMock).toHaveBeenCalled();
    });
});
