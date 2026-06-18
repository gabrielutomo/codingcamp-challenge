/* ========================================
   TimerComponent Controls Tests (Task 4.2)
   Testing: start(), stop(), reset(), tick()
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
            preferences: {
                theme: 'dark',
                soundEnabled: true,
                userName: null
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
        // Notify subscribers
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

// Import TimerComponent (with start, stop, reset, tick methods)
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

    start() {
        const timerState = this.stateManager.getState('timer');
        
        if (timerState.isRunning || timerState.remainingSeconds <= 0) {
            return;
        }
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.stateManager.setState('timer', {
            ...timerState,
            isRunning: true
        });
        
        this.intervalId = setInterval(() => {
            this.tick();
        }, 1000);
    }

    stop() {
        const timerState = this.stateManager.getState('timer');
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        this.stateManager.setState('timer', {
            ...timerState,
            isRunning: false
        });
    }

    reset() {
        const timerState = this.stateManager.getState('timer');
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        const durationInSeconds = timerState.duration * 60;
        
        this.stateManager.setState('timer', {
            ...timerState,
            isRunning: false,
            remainingSeconds: durationInSeconds
        });
        
        this.render();
    }

    tick() {
        const timerState = this.stateManager.getState('timer');
        
        let newRemainingSeconds = timerState.remainingSeconds - 1;
        if (newRemainingSeconds < 0) {
            newRemainingSeconds = 0;
        }
        
        if (newRemainingSeconds === 0) {
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }
            
            this.stateManager.setState('timer', {
                ...timerState,
                isRunning: false,
                remainingSeconds: 0
            });
            
            const preferences = this.stateManager.getState('preferences');
            if (preferences?.soundEnabled) {
                this.playNotification();
            }
        } else {
            this.stateManager.setState('timer', {
                ...timerState,
                remainingSeconds: newRemainingSeconds
            });
        }
        
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

    playNotification() {
        // Mock implementation - just log
        console.log('🔔 Timer notification played');
    }
}

// Test Suite
console.log('========================================');
console.log('Running TimerComponent Controls Tests (Task 4.2)');
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

// Test 1: start() sets isRunning to true
test('start() updates state to isRunning: true', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager();
    const timer = new TimerComponent(element, stateManager);
    
    timer.start();
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.isRunning, true);
});

// Test 2: start() creates an interval
test('start() creates setInterval for ticking', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager();
    const timer = new TimerComponent(element, stateManager);
    
    timer.start();
    
    assert(timer.intervalId !== null, 'intervalId should not be null');
    clearInterval(timer.intervalId);
});

// Test 3: start() does not start if already running
test('start() does not start when already running', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: true,
            remainingSeconds: 1500
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    const oldIntervalId = timer.intervalId;
    timer.start();
    
    assertEqual(timer.intervalId, oldIntervalId);
});

// Test 4: start() does not start if remainingSeconds is 0
test('start() does not start when remainingSeconds is 0', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: false,
            remainingSeconds: 0
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.start();
    
    assertEqual(timer.intervalId, null);
});

// Test 5: start() clears existing interval before creating new one
test('start() clears existing interval before creating new one', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager();
    const timer = new TimerComponent(element, stateManager);
    
    // Manually set an interval ID
    timer.intervalId = 12345;
    
    timer.start();
    
    // Should have a new interval ID
    assert(timer.intervalId !== 12345, 'Should create new interval');
    assert(timer.intervalId !== null, 'Should have new interval ID');
    clearInterval(timer.intervalId);
});

// Test 6: stop() sets isRunning to false
test('stop() updates state to isRunning: false', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: true,
            remainingSeconds: 1500
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.stop();
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.isRunning, false);
});

// Test 7: stop() clears the interval
test('stop() clears the interval', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager();
    const timer = new TimerComponent(element, stateManager);
    
    timer.start();
    assert(timer.intervalId !== null, 'Interval should exist');
    
    timer.stop();
    assertEqual(timer.intervalId, null);
});

// Test 8: stop() preserves remainingSeconds
test('stop() preserves remainingSeconds', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: true,
            remainingSeconds: 900
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.stop();
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.remainingSeconds, 900);
});

// Test 9: reset() restores remainingSeconds to duration
test('reset() restores remainingSeconds to duration', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: false,
            remainingSeconds: 600
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.reset();
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.remainingSeconds, 1500); // 25 * 60
});

// Test 10: reset() sets isRunning to false
test('reset() sets isRunning to false', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: true,
            remainingSeconds: 600
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.reset();
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.isRunning, false);
});

// Test 11: reset() clears the interval
test('reset() clears the interval', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager();
    const timer = new TimerComponent(element, stateManager);
    
    timer.start();
    assert(timer.intervalId !== null, 'Interval should exist');
    
    timer.reset();
    assertEqual(timer.intervalId, null);
});

// Test 12: reset() works with custom duration
test('reset() works with custom duration', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 45,
            isCustom: true,
            isRunning: false,
            remainingSeconds: 1200
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.reset();
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.remainingSeconds, 2700); // 45 * 60
});

// Test 13: tick() decrements remainingSeconds by 1
test('tick() decrements remainingSeconds by 1', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: true,
            remainingSeconds: 1500
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.tick();
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.remainingSeconds, 1499);
});

// Test 14: tick() guards against negative remainingSeconds
test('tick() guards against negative remainingSeconds', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: true,
            remainingSeconds: 0
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    timer.tick();
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.remainingSeconds, 0);
});

// Test 15: tick() stops timer when reaching 0
test('tick() stops timer and sets isRunning to false when reaching 0', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: true,
            remainingSeconds: 1
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    // Manually set interval to simulate running timer
    timer.intervalId = setInterval(() => {}, 1000);
    
    timer.tick();
    
    const timerState = stateManager.getState('timer');
    assertEqual(timerState.remainingSeconds, 0);
    assertEqual(timerState.isRunning, false);
    assertEqual(timer.intervalId, null);
});

// Test 16: tick() calls playNotification when reaching 0 and sound enabled
test('tick() calls playNotification when timer reaches 0 with sound enabled', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: true,
            remainingSeconds: 1
        },
        preferences: {
            soundEnabled: true
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    let notificationCalled = false;
    timer.playNotification = () => {
        notificationCalled = true;
    };
    
    timer.tick();
    
    assert(notificationCalled, 'playNotification should be called');
});

// Test 17: tick() does not call playNotification when sound disabled
test('tick() does not call playNotification when sound is disabled', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: true,
            remainingSeconds: 1
        },
        preferences: {
            soundEnabled: false
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    let notificationCalled = false;
    timer.playNotification = () => {
        notificationCalled = true;
    };
    
    timer.tick();
    
    assert(!notificationCalled, 'playNotification should not be called');
});

// Test 18: tick() updates display via render()
test('tick() calls render() to update display', () => {
    const element = new MockElement();
    const displayElement = new MockElement();
    element.addChild('[data-timer-display]', displayElement);
    
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: true,
            remainingSeconds: 125
        }
    });
    const timer = new TimerComponent(element, stateManager);
    timer.init();
    
    assertEqual(displayElement.textContent, '02:05');
    
    timer.tick();
    
    assertEqual(displayElement.textContent, '02:04');
});

// Test 19: Full start-tick-stop workflow
test('Full workflow: start -> tick -> stop preserves state correctly', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: false,
            remainingSeconds: 1500
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    // Start timer
    timer.start();
    let timerState = stateManager.getState('timer');
    assertEqual(timerState.isRunning, true);
    assertEqual(timerState.remainingSeconds, 1500);
    
    // Tick once
    timer.tick();
    timerState = stateManager.getState('timer');
    assertEqual(timerState.isRunning, true);
    assertEqual(timerState.remainingSeconds, 1499);
    
    // Stop timer
    timer.stop();
    timerState = stateManager.getState('timer');
    assertEqual(timerState.isRunning, false);
    assertEqual(timerState.remainingSeconds, 1499);
});

// Test 20: Reset after partial countdown
test('Reset after partial countdown restores full duration', () => {
    const element = new MockElement();
    const stateManager = new MockStateManager({
        timer: {
            duration: 25,
            isCustom: false,
            isRunning: false,
            remainingSeconds: 1500
        }
    });
    const timer = new TimerComponent(element, stateManager);
    
    // Start and tick a few times
    timer.start();
    timer.tick();
    timer.tick();
    timer.tick();
    
    let timerState = stateManager.getState('timer');
    assertEqual(timerState.remainingSeconds, 1497);
    
    // Reset
    timer.reset();
    timerState = stateManager.getState('timer');
    assertEqual(timerState.remainingSeconds, 1500);
    assertEqual(timerState.isRunning, false);
    assertEqual(timer.intervalId, null);
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
    process.exit(0);
} else {
    console.log('✗ Some tests failed');
    process.exit(1);
}
