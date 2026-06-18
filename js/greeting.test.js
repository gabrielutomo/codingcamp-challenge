/* ========================================
   GreetingComponent Unit Tests
   ======================================== */

// Mock localStorage for testing
class MockLocalStorage {
    constructor() {
        this.store = {};
    }

    getItem(key) {
        return this.store[key] || null;
    }

    setItem(key, value) {
        this.store[key] = value.toString();
    }

    removeItem(key) {
        delete this.store[key];
    }

    clear() {
        this.store = {};
    }
}

// Setup global localStorage mock
global.localStorage = new MockLocalStorage();

// Mock StorageService
class StorageService {
    static KEY = 'todoLifeDashboard';

    static getDefaultState() {
        return {
            timer: {
                duration: 25,
                isCustom: false,
                isRunning: false,
                remainingSeconds: 1500
            },
            tasks: [],
            links: [],
            preferences: {
                theme: 'dark',
                soundEnabled: true,
                userName: null
            }
        };
    }

    static load() {
        try {
            const stored = localStorage.getItem(this.KEY);
            
            if (!stored) {
                return this.getDefaultState();
            }

            const state = JSON.parse(stored);
            
            if (!state || typeof state !== 'object') {
                return this.getDefaultState();
            }

            return {
                ...this.getDefaultState(),
                ...state
            };
        } catch (error) {
            return this.getDefaultState();
        }
    }

    static save(state) {
        try {
            const serialized = JSON.stringify(state);
            localStorage.setItem(this.KEY, serialized);
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                console.error('Storage quota exceeded - unable to save state');
            } else {
                console.error('Failed to save state to localStorage:', error);
            }
        }
    }

    static clear() {
        try {
            localStorage.removeItem(this.KEY);
        } catch (error) {
            console.error('Failed to clear storage:', error);
        }
    }
}

// StateManager class
class StateManager {
    constructor(storage) {
        this.storage = storage;
        
        this.state = {
            timer: {
                duration: 25,
                isCustom: false,
                isRunning: false,
                remainingSeconds: 1500
            },
            tasks: [],
            links: [],
            preferences: {
                theme: 'dark',
                soundEnabled: true,
                userName: null
            }
        };
        
        this.subscribers = {
            timer: [],
            tasks: [],
            links: [],
            preferences: []
        };
    }

    getState(key) {
        return this.state[key];
    }

    setState(key, value) {
        this.state[key] = value;
        
        if (this.subscribers[key]) {
            this.subscribers[key].forEach(callback => {
                try {
                    callback(value);
                } catch (error) {
                    console.error(`Error in subscriber callback for key "${key}":`, error);
                }
            });
        }
        
        this.saveState();
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

    loadState() {
        try {
            const loadedState = this.storage.load();
            
            this.state = {
                ...this.state,
                ...loadedState
            };
        } catch (error) {
            console.error('Failed to load state from storage:', error);
        }
    }

    saveState() {
        try {
            this.storage.save(this.state);
        } catch (error) {
            console.error('Failed to save state to storage:', error);
        }
    }
}

// GreetingComponent class (copied from app.js for testing)
class GreetingComponent {
    constructor(element, stateManager) {
        this.element = element;
        this.stateManager = stateManager;
        this.unsubscribe = null;
    }

    init() {
        this.unsubscribe = this.stateManager.subscribe('preferences', () => {
            this.render();
        });
        
        this.render();
    }

    render() {
        const greetingText = this.getGreetingText();
        const formattedDate = this.getFormattedDate();
        const preferences = this.stateManager.getState('preferences');
        const userName = preferences?.userName;
        
        let message = greetingText;
        if (userName) {
            message += `, ${userName}`;
        }
        
        this.element.innerHTML = `
            <div class="greeting-text">${message}</div>
            <div class="date-text">${formattedDate}</div>
        `;
    }

    getGreetingText() {
        const now = new Date();
        const hours = now.getHours();
        
        if (hours >= 5 && hours <= 11) {
            return 'Good morning';
        } else if (hours >= 12 && hours <= 16) {
            return 'Good afternoon';
        } else if (hours >= 17 && hours <= 20) {
            return 'Good evening';
        } else {
            return 'Good night';
        }
    }

    getFormattedDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        return now.toLocaleDateString('en-US', options);
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }
    }
}

// Mock DOM element
class MockElement {
    constructor() {
        this.innerHTML = '';
    }
}

// Test Suite
console.log('========================================');
console.log('Running GreetingComponent Tests');
console.log('========================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
    try {
        localStorage.clear();
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
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(message || `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
    }
}

function assertContains(str, substring, message) {
    if (!str.includes(substring)) {
        throw new Error(message || `Expected "${str}" to contain "${substring}"`);
    }
}

// Test 1: Constructor initializes with element and stateManager
test('Constructor accepts element and stateManager', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    assert(greeting.element === mockElement, 'Element should be set');
    assert(greeting.stateManager === stateManager, 'StateManager should be set');
    assert(greeting.unsubscribe === null, 'Unsubscribe should be null initially');
});

// Test 2: getGreetingText returns "Good morning" for morning hours (5-11)
test('getGreetingText() returns "Good morning" for hours 5-11', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    // Mock Date to return specific hours
    const originalDate = Date;
    global.Date = class extends originalDate {
        getHours() { return 8; } // 8 AM
    };
    
    const greetingText = greeting.getGreetingText();
    assertEqual(greetingText, 'Good morning');
    
    global.Date = originalDate;
});

// Test 3: getGreetingText returns "Good afternoon" for afternoon hours (12-16)
test('getGreetingText() returns "Good afternoon" for hours 12-16', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    const originalDate = Date;
    global.Date = class extends originalDate {
        getHours() { return 14; } // 2 PM
    };
    
    const greetingText = greeting.getGreetingText();
    assertEqual(greetingText, 'Good afternoon');
    
    global.Date = originalDate;
});

// Test 4: getGreetingText returns "Good evening" for evening hours (17-20)
test('getGreetingText() returns "Good evening" for hours 17-20', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    const originalDate = Date;
    global.Date = class extends originalDate {
        getHours() { return 19; } // 7 PM
    };
    
    const greetingText = greeting.getGreetingText();
    assertEqual(greetingText, 'Good evening');
    
    global.Date = originalDate;
});

// Test 5: getGreetingText returns "Good night" for night hours (21-4)
test('getGreetingText() returns "Good night" for hours 21-4', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    const originalDate = Date;
    
    // Test 11 PM
    global.Date = class extends originalDate {
        getHours() { return 23; }
    };
    assertEqual(greeting.getGreetingText(), 'Good night');
    
    // Test 2 AM
    global.Date = class extends originalDate {
        getHours() { return 2; }
    };
    assertEqual(greeting.getGreetingText(), 'Good night');
    
    global.Date = originalDate;
});

// Test 6: getGreetingText boundary tests
test('getGreetingText() handles boundary hours correctly', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    const originalDate = Date;
    
    // 5 AM - first hour of morning
    global.Date = class extends originalDate {
        getHours() { return 5; }
    };
    assertEqual(greeting.getGreetingText(), 'Good morning');
    
    // 11 AM - last hour of morning
    global.Date = class extends originalDate {
        getHours() { return 11; }
    };
    assertEqual(greeting.getGreetingText(), 'Good morning');
    
    // 12 PM - first hour of afternoon
    global.Date = class extends originalDate {
        getHours() { return 12; }
    };
    assertEqual(greeting.getGreetingText(), 'Good afternoon');
    
    // 16 PM - last hour of afternoon
    global.Date = class extends originalDate {
        getHours() { return 16; }
    };
    assertEqual(greeting.getGreetingText(), 'Good afternoon');
    
    // 17 PM - first hour of evening
    global.Date = class extends originalDate {
        getHours() { return 17; }
    };
    assertEqual(greeting.getGreetingText(), 'Good evening');
    
    // 20 PM - last hour of evening
    global.Date = class extends originalDate {
        getHours() { return 20; }
    };
    assertEqual(greeting.getGreetingText(), 'Good evening');
    
    // 21 PM - first hour of night
    global.Date = class extends originalDate {
        getHours() { return 21; }
    };
    assertEqual(greeting.getGreetingText(), 'Good night');
    
    // 4 AM - last hour of night
    global.Date = class extends originalDate {
        getHours() { return 4; }
    };
    assertEqual(greeting.getGreetingText(), 'Good night');
    
    global.Date = originalDate;
});

// Test 7: getFormattedDate returns properly formatted date
test('getFormattedDate() returns readable date string', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    const formattedDate = greeting.getFormattedDate();
    
    // Should contain day of week, month, day, and year
    assert(typeof formattedDate === 'string', 'Should return a string');
    assert(formattedDate.length > 0, 'Should not be empty');
    // Check for comma which is part of the format
    assertContains(formattedDate, ',', 'Should contain comma in formatted date');
});

// Test 8: render() updates DOM without user name
test('render() updates DOM with greeting and date (no user name)', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    const originalDate = Date;
    global.Date = class extends originalDate {
        getHours() { return 10; } // Morning
    };
    
    greeting.render();
    
    assertContains(mockElement.innerHTML, 'Good morning', 'Should contain greeting');
    assertContains(mockElement.innerHTML, 'greeting-text', 'Should contain greeting-text class');
    assertContains(mockElement.innerHTML, 'date-text', 'Should contain date-text class');
    
    global.Date = originalDate;
});

// Test 9: render() updates DOM with user name
test('render() includes user name in greeting when set', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    // Set user name in state
    stateManager.setState('preferences', {
        theme: 'dark',
        soundEnabled: true,
        userName: 'Alice'
    });
    
    const originalDate = Date;
    global.Date = class extends originalDate {
        getHours() { return 14; } // Afternoon
    };
    
    greeting.render();
    
    assertContains(mockElement.innerHTML, 'Good afternoon, Alice', 'Should contain greeting with user name');
    
    global.Date = originalDate;
});

// Test 10: init() subscribes to preferences changes
test('init() subscribes to preferences and renders', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    greeting.init();
    
    assert(greeting.unsubscribe !== null, 'Should have unsubscribe function');
    assert(mockElement.innerHTML.length > 0, 'Should render on init');
});

// Test 11: Component re-renders when userName changes
test('Component re-renders when userName changes', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    const originalDate = Date;
    global.Date = class extends originalDate {
        getHours() { return 10; }
    };
    
    greeting.init();
    
    // Initial render without name
    assertContains(mockElement.innerHTML, 'Good morning', 'Should contain initial greeting');
    assert(!mockElement.innerHTML.includes('Alice'), 'Should not contain user name yet');
    
    // Update user name
    stateManager.setState('preferences', {
        theme: 'dark',
        soundEnabled: true,
        userName: 'Alice'
    });
    
    // Should re-render with name
    assertContains(mockElement.innerHTML, 'Good morning, Alice', 'Should contain greeting with user name');
    
    global.Date = originalDate;
});

// Test 12: destroy() unsubscribes from state changes
test('destroy() unsubscribes from state changes', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    greeting.init();
    
    const initialHTML = mockElement.innerHTML;
    
    // Destroy component
    greeting.destroy();
    
    assert(greeting.unsubscribe === null, 'Unsubscribe should be null after destroy');
    
    // Change preferences - should NOT trigger re-render
    stateManager.setState('preferences', {
        theme: 'light',
        soundEnabled: false,
        userName: 'Bob'
    });
    
    // HTML should not change (no re-render)
    assertEqual(mockElement.innerHTML, initialHTML, 'HTML should not change after destroy');
});

// Test 13: render() handles missing preferences gracefully
test('render() handles null/undefined preferences gracefully', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    // Manually set preferences to undefined
    stateManager.state.preferences = undefined;
    
    // Should not throw
    greeting.render();
    
    assert(mockElement.innerHTML.length > 0, 'Should render even with undefined preferences');
});

// Test 14: Multiple preference changes trigger multiple re-renders
test('Multiple preference changes trigger multiple re-renders', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    const originalDate = Date;
    global.Date = class extends originalDate {
        getHours() { return 15; } // Afternoon
    };
    
    greeting.init();
    
    // First change
    stateManager.setState('preferences', {
        theme: 'dark',
        soundEnabled: true,
        userName: 'Alice'
    });
    assertContains(mockElement.innerHTML, 'Alice', 'Should contain Alice');
    
    // Second change
    stateManager.setState('preferences', {
        theme: 'dark',
        soundEnabled: true,
        userName: 'Bob'
    });
    assertContains(mockElement.innerHTML, 'Bob', 'Should contain Bob');
    assert(!mockElement.innerHTML.includes('Alice'), 'Should not contain Alice anymore');
    
    global.Date = originalDate;
});

// Test 15: Clearing user name removes it from greeting
test('Clearing user name removes it from greeting', () => {
    const mockElement = new MockElement();
    const stateManager = new StateManager(StorageService);
    const greeting = new GreetingComponent(mockElement, stateManager);
    
    const originalDate = Date;
    global.Date = class extends originalDate {
        getHours() { return 9; }
    };
    
    greeting.init();
    
    // Set user name
    stateManager.setState('preferences', {
        theme: 'dark',
        soundEnabled: true,
        userName: 'Charlie'
    });
    assertContains(mockElement.innerHTML, 'Charlie', 'Should contain user name');
    
    // Clear user name
    stateManager.setState('preferences', {
        theme: 'dark',
        soundEnabled: true,
        userName: null
    });
    assert(!mockElement.innerHTML.includes('Charlie'), 'Should not contain user name');
    assertContains(mockElement.innerHTML, 'Good morning', 'Should still contain greeting');
    
    global.Date = originalDate;
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
