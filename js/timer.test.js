/* ========================================
   TimerComponent Unit Tests (Task 4.1)
   Testing: constructor, init(), render()
   ======================================== */

// Mock DOM element with querySelector support
class MockElement {
    constructor() {
        this.textContent = '';
        this.children = new Map();
    }
    
    querySelector(selector) {
        return this.children.get(selector) || null;
    }
    
    addChild(selector, element) {
        this.children.set(selector, element);
    }
}

// Mock StateManager
class MockStateManager {
    constructor(initialState = {}) {
        this.state = {
            timer: {
                duration: 25,
                isCustom: false,
                isRunning: false,
                remainingSeconds: 1500
            },
            ...initialState
        };
    }
    
    getState(key) {
        return this.state[key];
    }
    
    setState(key, value) {
        this.state[key] = value;
    }
}

// Import TimerComponent (copied from app.js)
class TimerComponent {
    constructor(element, stateManager) {
        this.element = element;
        this.stateManager = stateManager;
        this.intervalId = null;
        
        this.displayElement = null;
        this.startButton = null;
        this.stopButton = null;
        this.resetButton = null;
    }

    init() {
        this.displayElement = this.element.querySelector('[data-timer-display]');
        this.startButton = this.element.querySelector('[data-timer-start]');
        this.stopButton = this.element.querySelector('[data-timer-stop]');
        this.resetButton = this.element.querySelector('[data-timer-reset]');
        
        this.render();
    }

    render() {
        const timerState = this.stateManager.getState('timer');
        const remainingSeconds = timerState?.remainingSeconds || 0;
        
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        
        const formattedTime = `${this.padZero(minutes)}:${this.padZero(seconds)}`;
        
        if (this.displayElement) {
            this.displayElement.textContent = formattedTime;
        }
    }

    padZero(value) {
        return value.toString().padStart(2, '0');
    }
}

// Test Suite
console.log('========================================');
console.log('Running TimerComponent Tests (Task 4.1)');
console.log('========================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
    try {
        fn();
        console.log(`✓ ${description}`);
        testsPassed++;
    } catch (error) {
        console.error(`✗ ${description}`);
        console.error(`  Error: ${error.message}`);
        testsFailed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected} but got ${actual}`);
    }
}

// Test 1: Constructor accepts DOM element and StateManager
test('constructor() accepts and stores element and stateManager', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager();
    const timer = new TimerComponent(element, stateManager);
    
    assertEqual(timer.element, element);
    assertEqual(timer.stateManager, stateManager);
    assertEqual(timer.intervalId, null);
});

// Test 2: Constructor initializes DOM references to null
test('constructor() initializes DOM references to null', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager();
    const timer = new TimerComponent(element, stateManager);
    
    assertEqual(timer.displayElement, null);
    assertEqual(timer.startButton, null);
    assertEqual(timer.stopButton, null);
    assertEqual(timer.resetButton, null);
});

// Test 3: init() sets up DOM references
test('init() queries and stores DOM references', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    const startButton = new MockElement();
    const stopButton = new MockElement();
    const resetButton = new MockElement();
    
    element.addChild('[data-timer-display]', displayElement);
    element.addChild('[data-timer-start]', startButton);
    element.addChild('[data-timer-stop]', stopButton);
    element.addChild('[data-timer-reset]', resetButton);
    
    const stateManager = new MockStateManager();
    const timer = new TimerComponent(element, stateManager);
    
    timer.init();
    
    assertEqual(timer.displayElement, displayElement);
    assertEqual(timer.startButton, startButton);
    assertEqual(timer.stopButton, stopButton);
    assertEqual(timer.resetButton, resetButton);
});

// Test 4: init() calls render()
test('init() calls render() to display initial time', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    const stateManager = new MockStateManager();
    const timer = new TimerComponent(element, stateManager);
    
    timer.init();
    
    // Should have rendered time in MM:SS format
    assert(displayElement.textContent.match(/^\d{2}:\d{2}$/), 'Should render MM:SS format');
});

// Test 5: render() formats time as MM:SS
test('render() displays time in MM:SS format', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    const stateManager = new MockStateManager({
        timer: { remainingSeconds: 1500 } // 25:00
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.init();
    
    assertEqual(displayElement.textContent, '25:00');
});

// Test 6: render() handles zero seconds correctly
test('render() displays 00:00 for zero seconds', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    const stateManager = new MockStateManager({
        timer: { remainingSeconds: 0 }
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.init();
    
    assertEqual(displayElement.textContent, '00:00');
});

// Test 7: render() pads single-digit minutes and seconds
test('render() pads single-digit minutes and seconds with leading zeros', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    const stateManager = new MockStateManager({
        timer: { remainingSeconds: 307 } // 5 minutes, 7 seconds
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.init();
    
    assertEqual(displayElement.textContent, '05:07');
});

// Test 8: render() handles double-digit values correctly
test('render() displays double-digit minutes and seconds without extra padding', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    const stateManager = new MockStateManager({
        timer: { remainingSeconds: 3599 } // 59 minutes, 59 seconds
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.init();
    
    assertEqual(displayElement.textContent, '59:59');
});

// Test 9: render() converts seconds to minutes correctly
test('render() correctly converts total seconds to MM:SS', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    const stateManager = new MockStateManager({
        timer: { remainingSeconds: 125 } // 2 minutes, 5 seconds
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.init();
    
    assertEqual(displayElement.textContent, '02:05');
});

// Test 10: render() handles exactly 60 seconds (1 minute)
test('render() displays 01:00 for exactly 60 seconds', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    const stateManager = new MockStateManager({
        timer: { remainingSeconds: 60 }
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.init();
    
    assertEqual(displayElement.textContent, '01:00');
});

// Test 11: render() handles 45 minute duration (2700 seconds)
test('render() displays 45:00 for 2700 seconds', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    const stateManager = new MockStateManager({
        timer: { remainingSeconds: 2700 }
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.init();
    
    assertEqual(displayElement.textContent, '45:00');
});

// Test 12: render() handles 60 minute duration (3600 seconds)
test('render() displays 60:00 for 3600 seconds', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    const stateManager = new MockStateManager({
        timer: { remainingSeconds: 3600 }
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.init();
    
    assertEqual(displayElement.textContent, '60:00');
});

// Test 13: render() is safe when displayElement is null
test('render() does not throw when displayElement is null', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager();
    const timer = new TimerComponent(element, stateManager);
    
    // Don't call init() - displayElement will be null
    timer.render(); // Should not throw
    
    assertEqual(timer.displayElement, null);
});

// Test 14: render() handles missing timer state gracefully
test('render() displays 00:00 when timer state is missing', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    const stateManager = new MockStateManager({
        timer: null // Missing state
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.init();
    
    assertEqual(displayElement.textContent, '00:00');
});

// Test 15: render() handles undefined remainingSeconds
test('render() displays 00:00 when remainingSeconds is undefined', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    const stateManager = new MockStateManager({
        timer: {} // No remainingSeconds property
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.init();
    
    assertEqual(displayElement.textContent, '00:00');
});

// Test 16: padZero() adds leading zeros for single digits
test('padZero() adds leading zeros for single-digit values', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager();
    const timer = new TimerComponent(element, stateManager);
    
    assertEqual(timer.padZero(0), '00');
    assertEqual(timer.padZero(5), '05');
    assertEqual(timer.padZero(9), '09');
});

// Test 17: padZero() preserves double digits
test('padZero() preserves double-digit values', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager();
    const timer = new TimerComponent(element, stateManager);
    
    assertEqual(timer.padZero(10), '10');
    assertEqual(timer.padZero(25), '25');
    assertEqual(timer.padZero(59), '59');
});

// Test 18: render() can be called multiple times
test('render() can be called multiple times to update display', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    const stateManager = new MockStateManager({
        timer: { remainingSeconds: 1500 }
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.init();
    assertEqual(displayElement.textContent, '25:00');
    
    // Update state and render again
    stateManager.setState('timer', { remainingSeconds: 1499 });
    timer.render();
    assertEqual(displayElement.textContent, '24:59');
});

// Print results
console.log('\n========================================');
console.log('Test Results');
console.log('========================================');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);
console.log('========================================\n');

if (testsFailed === 0) {
    console.log('✓ All tests passed!');
} else {
    console.log('✗ Some tests failed');
    process.exit(1);
}
