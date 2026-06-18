/* ========================================
   ClockComponent Unit Tests
   ======================================== */

// Mock DOM element
class MockElement {
    constructor() {
        this.textContent = '';
    }
}

// Mock setInterval and clearInterval
const intervals = new Map();
let intervalIdCounter = 1;

global.setInterval = (callback, delay) => {
    const id = intervalIdCounter++;
    intervals.set(id, { callback, delay, active: true });
    return id;
};

global.clearInterval = (id) => {
    const interval = intervals.get(id);
    if (interval) {
        interval.active = false;
        intervals.delete(id);
    }
};

// Import ClockComponent (copied from app.js)
class ClockComponent {
    constructor(element) {
        this.element = element;
        this.intervalId = null;
    }

    init() {
        this.render();
        this.intervalId = setInterval(() => {
            this.render();
        }, 1000);
    }

    destroy() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    render() {
        const time = this.getCurrentTime();
        const formattedTime = `${this.padZero(time.hours)}:${this.padZero(time.minutes)}:${this.padZero(time.seconds)}`;
        this.element.textContent = formattedTime;
    }

    getCurrentTime() {
        const now = new Date();
        return {
            hours: now.getHours(),
            minutes: now.getMinutes(),
            seconds: now.getSeconds()
        };
    }

    padZero(value) {
        return value.toString().padStart(2, '0');
    }
}

// Test Suite
console.log('========================================');
console.log('Running ClockComponent Tests');
console.log('========================================\n');

let testsPassed = 0;
let testsFailed = 0;

function test(description, fn) {
    try {
        intervals.clear();
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

// Test 1: Constructor accepts DOM element
test('constructor() accepts and stores DOM element', () => {
    const element = new MockElement();
    const clock = new ClockComponent(element);
    
    assertEqual(clock.element, element);
    assertEqual(clock.intervalId, null);
});

// Test 2: init() starts setInterval with 1000ms
test('init() starts setInterval with 1000ms delay', () => {
    const element = new MockElement();
    const clock = new ClockComponent(element);
    
    clock.init();
    
    assert(clock.intervalId !== null, 'intervalId should be set');
    const interval = intervals.get(clock.intervalId);
    assert(interval, 'Interval should be registered');
    assertEqual(interval.delay, 1000, 'Interval delay should be 1000ms');
});

// Test 3: init() renders immediately
test('init() renders time immediately', () => {
    const element = new MockElement();
    const clock = new ClockComponent(element);
    
    clock.init();
    
    // Should have rendered time in HH:MM:SS format
    assert(element.textContent.match(/^\d{2}:\d{2}:\d{2}$/), 'Should render HH:MM:SS format');
});

// Test 4: getCurrentTime() returns object with hours, minutes, seconds
test('getCurrentTime() returns correct time object', () => {
    const element = new MockElement();
    const clock = new ClockComponent(element);
    
    const time = clock.getCurrentTime();
    
    assert(typeof time.hours === 'number', 'hours should be a number');
    assert(typeof time.minutes === 'number', 'minutes should be a number');
    assert(typeof time.seconds === 'number', 'seconds should be a number');
    assert(time.hours >= 0 && time.hours <= 23, 'hours should be 0-23');
    assert(time.minutes >= 0 && time.minutes <= 59, 'minutes should be 0-59');
    assert(time.seconds >= 0 && time.seconds <= 59, 'seconds should be 0-59');
});

// Test 5: padZero() adds leading zeros for single digits
test('padZero() adds leading zeros for single-digit values', () => {
    const element = new MockElement();
    const clock = new ClockComponent(element);
    
    assertEqual(clock.padZero(0), '00');
    assertEqual(clock.padZero(5), '05');
    assertEqual(clock.padZero(9), '09');
});

// Test 6: padZero() doesn't modify double digits
test('padZero() preserves double-digit values', () => {
    const element = new MockElement();
    const clock = new ClockComponent(element);
    
    assertEqual(clock.padZero(10), '10');
    assertEqual(clock.padZero(15), '15');
    assertEqual(clock.padZero(23), '23');
    assertEqual(clock.padZero(59), '59');
});

// Test 7: render() updates DOM with formatted time HH:MM:SS
test('render() updates element.textContent with HH:MM:SS format', () => {
    const element = new MockElement();
    const clock = new ClockComponent(element);
    
    clock.render();
    
    // Check format: HH:MM:SS with zero-padding
    const timePattern = /^\d{2}:\d{2}:\d{2}$/;
    assert(timePattern.test(element.textContent), `Time should match HH:MM:SS format, got: ${element.textContent}`);
});

// Test 8: render() uses 24-hour format
test('render() uses 24-hour format (0-23)', () => {
    const element = new MockElement();
    const clock = new ClockComponent(element);
    
    // Mock getCurrentTime to return a specific time
    clock.getCurrentTime = () => ({ hours: 14, minutes: 30, seconds: 45 });
    
    clock.render();
    
    assertEqual(element.textContent, '14:30:45', 'Should display 14:30:45 in 24-hour format');
});

// Test 9: render() pads all single digits with zeros
test('render() pads all single-digit values with leading zeros', () => {
    const element = new MockElement();
    const clock = new ClockComponent(element);
    
    // Mock getCurrentTime to return single-digit values
    clock.getCurrentTime = () => ({ hours: 5, minutes: 3, seconds: 7 });
    
    clock.render();
    
    assertEqual(element.textContent, '05:03:07', 'Should display 05:03:07 with zero-padding');
});

// Test 10: render() handles midnight correctly
test('render() handles midnight (00:00:00) correctly', () => {
    const element = new MockElement();
    const clock = new ClockComponent(element);
    
    // Mock getCurrentTime to return midnight
    clock.getCurrentTime = () => ({ hours: 0, minutes: 0, seconds: 0 });
    
    clock.render();
    
    assertEqual(element.textContent, '00:00:00', 'Should display 00:00:00 for midnight');
});

// Test 11: destroy() clears the interval
test('destroy() clears the interval', () => {
    const element = new MockElement();
    const clock = new ClockComponent(element);
    
    clock.init();
    const intervalId = clock.intervalId;
    
    assert(intervals.has(intervalId), 'Interval should be active');
    
    clock.destroy();
    
    assert(!intervals.has(intervalId), 'Interval should be cleared');
    assertEqual(clock.intervalId, null, 'intervalId should be null');
});

// Test 12: destroy() can be called multiple times safely
test('destroy() can be called multiple times without errors', () => {
    const element = new MockElement();
    const clock = new ClockComponent(element);
    
    clock.init();
    clock.destroy();
    clock.destroy(); // Should not throw
    
    assertEqual(clock.intervalId, null);
});

// Test 13: destroy() is safe to call before init()
test('destroy() is safe to call before init()', () => {
    const element = new MockElement();
    const clock = new ClockComponent(element);
    
    clock.destroy(); // Should not throw
    
    assertEqual(clock.intervalId, null);
});

// Test 14: Multiple clocks can run independently
test('Multiple ClockComponent instances run independently', () => {
    const element1 = new MockElement();
    const element2 = new MockElement();
    const clock1 = new ClockComponent(element1);
    const clock2 = new ClockComponent(element2);
    
    clock1.init();
    clock2.init();
    
    assert(clock1.intervalId !== clock2.intervalId, 'Each clock should have unique interval ID');
    assert(intervals.has(clock1.intervalId), 'Clock 1 interval should be active');
    assert(intervals.has(clock2.intervalId), 'Clock 2 interval should be active');
    
    clock1.destroy();
    
    assert(!intervals.has(clock1.intervalId), 'Clock 1 interval should be cleared');
    assert(intervals.has(clock2.intervalId), 'Clock 2 interval should still be active');
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
