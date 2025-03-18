"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("@testing-library/react");
require("@testing-library/jest-dom");
const RoundSummary_1 = __importDefault(require("./RoundSummary"));
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
        (0, react_1.render)(<RoundSummary_1.default {...mockProps}/>);
        // Check that the component renders correctly
        expect(react_1.screen.getByText('Round Summary')).toBeInTheDocument();
        expect(react_1.screen.getByText(/The word was:/)).toBeInTheDocument();
        expect(react_1.screen.getByText('elephant')).toBeInTheDocument();
        expect(react_1.screen.getByText(/Drawn by:/)).toBeInTheDocument();
        // Use getAllByText for elements that might appear multiple times
        const drawerElements = react_1.screen.getAllByText('Drawer Player');
        expect(drawerElements.length).toBeGreaterThan(0);
    });
    test('does not render when not visible', () => {
        (0, react_1.render)(<RoundSummary_1.default {...mockProps} isVisible={false}/>);
        // Component should not be in the document
        expect(react_1.screen.queryByText('Round Summary')).not.toBeInTheDocument();
    });
    test('displays players sorted by score', () => {
        (0, react_1.render)(<RoundSummary_1.default {...mockProps}/>);
        // Get all player name elements and verify they are ordered correctly
        const playerElements = react_1.screen.getAllByTestId('player-item');
        // First player should have Fast Guesser text somewhere in its content
        expect(playerElements[0].textContent).toContain('Fast Guesser');
        // Next should have Slow Guesser
        expect(playerElements[1].textContent).toContain('Slow Guesser');
        // Last should have Drawer Player
        expect(playerElements[2].textContent).toContain('Drawer Player');
    });
    test('displays points gained for each player', () => {
        (0, react_1.render)(<RoundSummary_1.default {...mockProps}/>);
        // Check that points gained are displayed correctly
        expect(react_1.screen.getByText('+100')).toBeInTheDocument(); // Fast Guesser: 200 - 100 = 100
        // Use getAllByText for elements that might appear multiple times
        const pointElements = react_1.screen.getAllByText('+40');
        expect(pointElements.length).toBe(2); // Two players with +40 points
    });
    test('shows drawer badge for the drawer', () => {
        (0, react_1.render)(<RoundSummary_1.default {...mockProps}/>);
        // Check that drawer badge is displayed
        expect(react_1.screen.getByText('Drawer')).toBeInTheDocument();
    });
    test('displays scoring explanation section', () => {
        (0, react_1.render)(<RoundSummary_1.default {...mockProps}/>);
        // Check that scoring explanation is displayed
        expect(react_1.screen.getByText('Scoring System')).toBeInTheDocument();
        expect(react_1.screen.getByText(/Fast guess/)).toBeInTheDocument();
        expect(react_1.screen.getByText(/Quick guess/)).toBeInTheDocument();
        expect(react_1.screen.getByText(/Standard guess/)).toBeInTheDocument();
        expect(react_1.screen.getByText(/First correct guess/)).toBeInTheDocument();
        expect(react_1.screen.getByText(/Drawer reward/)).toBeInTheDocument();
    });
    test('calls onClose when close button is clicked', () => {
        (0, react_1.render)(<RoundSummary_1.default {...mockProps}/>);
        // Find and click the close button
        const closeButton = react_1.screen.getByRole('button');
        react_1.fireEvent.click(closeButton);
        // Check that onClose was called
        expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });
    test('auto-closes after timer expires', () => {
        // Create a fresh mock for onClose
        const onCloseMock = jest.fn();
        // Mock setTimeout to immediately execute the callback
        jest.spyOn(global, 'setTimeout').mockImplementation((callback) => {
            callback();
            return 123; // Return a timer ID
        });
        (0, react_1.render)(<RoundSummary_1.default {...mockProps} onClose={onCloseMock}/>);
        // Since our mock immediately executes the callback, 
        // the timeLeft will go from 10 to 0 immediately
        // and onClose should be called
        // We need to run act 10 times to simulate 10 seconds passing
        for (let i = 0; i < 10; i++) {
            (0, react_1.act)(() => {
                jest.runOnlyPendingTimers();
            });
        }
        // Check that onClose was called
        expect(onCloseMock).toHaveBeenCalledTimes(1);
        // Restore the original setTimeout
        global.setTimeout.mockRestore();
    });
});
