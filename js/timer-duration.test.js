/* ========================================
   TimerComponent Duration Tests (Task 4.3)
   Testing: setDuration(), preset/custom handlers, persistence
   ======================================== */

// Mock DOM element with querySelector and querySelectorAll support
class MockElement {
    constructor() {
        this.textContent = '';
        this.value = '';
        this.children = new Map();
        this.classList = new MockClassList();
        this.eventListeners = {};
    }
    
    querySelector(selector) {
        return this.children.get(selector) || null;
    }
    
    querySelectorAll(selector) {
        const results = [];
        for (const [key, value] of this.children.entries()) {
            if (key.startsWith(selector.replace('[data-duration]', '[data-duration='))) {
                results.push(value);
            }
        }
        return results;
    }
    
    addChild(selector, element) {
        this.children.set(selector, element);
    }
    
    addEventListener(event, handler) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(handler);
    }
    
    getAttribute(name) {
        return this[`_attr_${name}`];
    }
    
    setAttribute(name, value) {
        this[`_attr_${name}`] = value;
    }
    
    click() {
        if (this.eventListeners['click']) {
            this.eventListeners['click'].forEach(handler => handler({ target: this }));
        }
    }
}

class MockClassList {
    constructor() {
        this.classes = new Set();
    }
    
    add(className) {
        this.classes.add(className);
    }
    
    remove(className) {
        this.classes.delete(className);
    }
    
    contains(className) {
        return this.classes.has(className);
    }
}

// Mock StateManager with subscription support
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
        this.subscribers = {};
    }
    
    getState(key) {
        return this.state[key];
    }
    
    setState(key, value) {
        this.state[key] = value;
        if (this.subscribers[key]) {
            this.subscribers[key].forEach(callback => callback(value));
        }
    }
    
    subscribe(key, callback) {
        if (!this.subscribers[key]) {
            this.subscribers[key] = [];
        }
        this.subscribers[key].push(callback);
        return () => {
            const index = this.subscribers[key].indexOf(callback);
            if (index > -1) {
                this.subscribers[key].splice(index, 1);
            }
        };
    }
}

// Import TimerComponent (implementation from app.js)
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
        
        this.presetButtons = this.element.querySelectorAll('[data-duration]');
        this.customInput = this.element.querySelector('[data-duration-input]');
        this.customSetButton = this.element.querySelector('[data-duration-set]');
        
        this.presetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const duration = parseInt(button.getAttribute('data-duration'), 10);
                this.setDuration(duration, false);
            });
        });
        
        if (this.customSetButton) {
            this.customSetButton.addEventListener('click', () => {
                const customDuration = parseInt(this.customInput.value, 10);
                if (this.validateCustomDuration(customDuration)) {
                    this.setDuration(customDuration, true);
                }
            });
        }
        
        if (this.customInput) {
            this.customInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const customDuration = parseInt(this.customInput.value, 10);
                    if (this.validateCustomDuration(customDuration)) {
                        this.setDuration(customDuration, true);
                    }
                }
            });
        }
        
        this.stateManager.subscribe('timer', () => {
            this.render();
            this.updateDurationUI();
        });
        
        this.render();
        this.updateDurationUI();
    }

    setDuration(minutes, isCustom = false) {
        const timerState = this.stateManager.getState('timer');
        
        if (timerState.isRunning) {
            console.warn('Cannot change duration while timer is running');
            return;
        }
        
        if (minutes < 1 || minutes > 180) {
            console.error('Duration must be between 1 and 180 minutes');
            return;
        }
        
        const remainingSeconds = minutes * 60;
        
        this.stateManager.setState('timer', {
            ...timerState,
            duration: minutes,
            isCustom: isCustom,
            remainingSeconds: remainingSeconds
        });
        
        if (this.customInput && isCustom) {
            this.customInput.value = '';
        }
    }
    
    validateCustomDuration(duration) {
        if (isNaN(duration)) {
            console.error('Duration must be a number');
            return false;
        }
        
        if (duration < 1 || duration > 180) {
            console.error('Duration must be between 1 and 180 minutes');
            return false;
        }
        
        return true;
    }
    
    updateDurationUI() {
        const timerState = this.stateManager.getState('timer');
        const currentDuration = timerState?.duration || 25;
        const isCustom = timerState?.isCustom || false;
        
        this.presetButtons.forEach(button => {
            const buttonDuration = parseInt(button.getAttribute('data-duration'), 10);
            
            if (!isCustom && buttonDuration === currentDuration) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        if (isCustom) {
            this.presetButtons.forEach(button => {
                button.classList.remove('active');
            });
        }
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
console.log('Running TimerComponent Duration Tests (Task 4.3)');
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

// Helper to create timer with preset buttons
function createTimerWithPresets() {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    // Create preset buttons
    const preset15 = new MockElement();
    preset15.setAttribute('data-duration', '15');
    element.addChild('[data-duration=15]', preset15);
    
    const preset25 = new MockElement();
    preset25.setAttribute('data-duration', '25');
    element.addChild('[data-duration=25]', preset25);
    
    const preset45 = new MockElement();
    preset45.setAttribute('data-duration', '45');
    element.addChild('[data-duration=45]', preset45);
    
    const preset60 = new MockElement();
    preset60.setAttribute('data-duration', '60');
    element.addChild('[data-duration=60]', preset60);
    
    // Create custom input and button
    const customInput = new MockElement();
    element.addChild('[data-duration-input]', customInput);
    
    const customSetButton = new MockElement();
    element.addChild('[data-duration-set]', customSetButton);
    
    const stateManager = new MockStateManager();
    const timer = new TimerComponent(element, stateManager);
    
    return { timer, stateManager, element, preset15, preset25, preset45, preset60, customInput, customSetButton };
}

// Test 1: setDuration() updates timer state with new duration
test('setDuration() updates timer state with new duration', () => {
    const { timer, stateManager } = createTimerWithPresets();
    timer.init();
    
    timer.setDuration(45, false);
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.duration, 45);
    assertEqual(timerState.remainingSeconds, 2700); // 45 * 60
    assertEqual(timerState.isCustom, false);
});

// Test 2: setDuration() blocks duration changes when timer is running
test('setDuration() blocks duration changes when timer is running', () => {
    const { timer, stateManager } = createTimerWithPresets();
    timer.init();
    
    // Set timer to running
    stateManager.setState('timer', {
        duration: 25,
        isCustom: false,
        isRunning: true,
        remainingSeconds: 1500
    });
    
    timer.setDuration(45, false);
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.duration, 25); // Should not change
});

// Test 3: setDuration() validates minimum duration (1 minute)
test('setDuration() rejects duration less than 1 minute', () => {
    const { timer, stateManager } = createTimerWithPresets();
    timer.init();
    
    timer.setDuration(0, false);
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.duration, 25); // Should remain default
});

// Test 4: setDuration() validates maximum duration (180 minutes)
test('setDuration() rejects duration greater than 180 minutes', () => {
    const { timer, stateManager } = createTimerWithPresets();
    timer.init();
    
    timer.setDuration(181, false);
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.duration, 25); // Should remain default
});

// Test 5: setDuration() accepts valid durations within range
test('setDuration() accepts valid durations within 1-180 range', () => {
    const { timer, stateManager } = createTimerWithPresets();
    timer.init();
    
    timer.setDuration(1, false);
    assertEqual(stateManager.getState('timer').duration, 1);
    
    timer.setDuration(180, false);
    assertEqual(stateManager.getState('timer').duration, 180);
});

// Test 6: Preset button click sets duration
test('Clicking preset button sets duration', () => {
    const { timer, stateManager, preset45 } = createTimerWithPresets();
    timer.init();
    
    preset45.click();
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.duration, 45);
    assertEqual(timerState.isCustom, false);
});

// Test 7: Custom input sets custom duration
test('Custom input sets custom duration', () => {
    const { timer, stateManager, customInput, customSetButton } = createTimerWithPresets();
    timer.init();
    
    customInput.value = '90';
    customSetButton.click();
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.duration, 90);
    assertEqual(timerState.isCustom, true);
});

// Test 8: Custom input clears after setting
test('Custom input clears after setting duration', () => {
    const { timer, customInput, customSetButton } = createTimerWithPresets();
    timer.init();
    
    customInput.value = '90';
    customSetButton.click();
    
    assertEqual(customInput.value, '');
});

// Test 9: validateCustomDuration() rejects NaN
test('validateCustomDuration() rejects non-numeric input', () => {
    const { timer } = createTimerWithPresets();
    
    const result = timer.validateCustomDuration(NaN);
    assertEqual(result, false);
});

// Test 10: validateCustomDuration() rejects out of range values
test('validateCustomDuration() rejects values outside 1-180 range', () => {
    const { timer } = createTimerWithPresets();
    
    assertEqual(timer.validateCustomDuration(0), false);
    assertEqual(timer.validateCustomDuration(181), false);
});

// Test 11: validateCustomDuration() accepts valid values
test('validateCustomDuration() accepts valid values in range', () => {
    const { timer } = createTimerWithPresets();
    
    assertEqual(timer.validateCustomDuration(1), true);
    assertEqual(timer.validateCustomDuration(90), true);
    assertEqual(timer.validateCustomDuration(180), true);
});

// Test 12: updateDurationUI() highlights active preset
test('updateDurationUI() highlights active preset button', () => {
    const { timer, stateManager, preset25 } = createTimerWithPresets();
    timer.init();
    
    stateManager.setState('timer', {
        duration: 25,
        isCustom: false,
        isRunning: false,
        remainingSeconds: 1500
    });
    
    assert(preset25.classList.contains('active'), 'Preset 25 should have active class');
});

// Test 13: updateDurationUI() removes active from other presets
test('updateDurationUI() removes active from non-selected presets', () => {
    const { timer, stateManager, preset15, preset45, preset60 } = createTimerWithPresets();
    timer.init();
    
    stateManager.setState('timer', {
        duration: 25,
        isCustom: false,
        isRunning: false,
        remainingSeconds: 1500
    });
    
    assert(!preset15.classList.contains('active'), 'Preset 15 should not have active class');
    assert(!preset45.classList.contains('active'), 'Preset 45 should not have active class');
    assert(!preset60.classList.contains('active'), 'Preset 60 should not have active class');
});

// Test 14: updateDurationUI() clears active for custom duration
test('updateDurationUI() clears all preset active states for custom duration', () => {
    const { timer, stateManager, preset15, preset25, preset45, preset60 } = createTimerWithPresets();
    timer.init();
    
    stateManager.setState('timer', {
        duration: 90,
        isCustom: true,
        isRunning: false,
        remainingSeconds: 5400
    });
    
    assert(!preset15.classList.contains('active'), 'Preset 15 should not have active class');
    assert(!preset25.classList.contains('active'), 'Preset 25 should not have active class');
    assert(!preset45.classList.contains('active'), 'Preset 45 should not have active class');
    assert(!preset60.classList.contains('active'), 'Preset 60 should not have active class');
});

// Test 15: Duration persists to state manager (auto-saves to localStorage)
test('Duration changes persist through state manager', () => {
    const { timer, stateManager } = createTimerWithPresets();
    timer.init();
    
    timer.setDuration(60, false);
    
    // Verify state is updated (StateManager auto-saves to localStorage)
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.duration, 60);
    assertEqual(timerState.remainingSeconds, 3600);
});

// Test 16: Display updates when duration changes
test('Timer display updates when duration changes', () => {
    const { timer, stateManager, element } = createTimerWithPresets();
    const displayElement = element.querySelector('[data-timer-display]');
    timer.init();
    
    timer.setDuration(15, false);
    
    assertEqual(displayElement.textContent, '15:00');
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
