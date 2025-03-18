// jest.setup.js
import '@testing-library/jest-dom';

// Mock the window.scrollTo function which is used in some components
if (typeof window !== 'undefined') {
  window.scrollTo = jest.fn();
}

// Mock the IntersectionObserver which is used by some Next.js functions
if (typeof window !== 'undefined') {
  class MockIntersectionObserver {
    constructor(callback) {
      this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.IntersectionObserver = MockIntersectionObserver;
}

// Mock timers if we need to test animations or timeouts
jest.useFakeTimers();

// Global afterEach to clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Add a custom matcher for testing scrolling functionality
expect.extend({
  toHaveBeenScrolledIntoView(element) {
    const scrollIntoViewMock = element.scrollIntoView;
    const hasBeenCalled = scrollIntoViewMock && scrollIntoViewMock.mock.calls.length > 0;
    
    return {
      pass: hasBeenCalled,
      message: () => `Expected element ${hasBeenCalled ? 'not ' : ''}to have been scrolled into view`,
    };
  },
}); 