function logTestResult(testName, startMark, endMark) {
    console.log(testName, performance.measure(testName, startMark, endMark).duration);
}
function ObjectIterationTest() {
    return "KeysForLoopTest with .3 tied with Entries and no destructuring";
    const obj = {};
    const obj_count = 1_000;

    // Populate the object with random values
    for (let i = 0; i < obj_count; i++) {
        obj[`a${i}`] = Math.random();
    }

    // Method 1: for...in loop
    performance.mark("for_in_start");
    for (let i = 0; i < obj_count; i++) {
        for (const key in obj) {
            const str = `${key}: ${obj[key]}`;
        }
    }
    performance.mark("for_in_end");

    // Method 2: Object.keys() with forEach
    performance.mark("keys_forEach_start");
    Object.keys(obj).forEach((key) => {
        const str = `${key}: ${obj[key]}`;
    });
    performance.mark("keys_forEach_end");

    // Method 3: Object.keys() with for loop
    performance.mark("keys_for_loop_start");
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const str = `${key}: ${obj[key]}`;
    }
    performance.mark("keys_for_loop_end");

    // Method 4: Object.entries() with forEach
    performance.mark("entries_forEach_start");
    Object.entries(obj).forEach(([key, value]) => {
        const str = `${key}: ${value}`;
    });
    performance.mark("entries_forEach_end");

    // Method 5: Object.entries() with for loop
    performance.mark("entries_for_loop_start");
    const entries = Object.entries(obj);
    for (let i = 0; i < entries.length; i++) {
        const [key, value] = entries[i];
        const str = `${key}: ${value}`;
    }
    performance.mark("entries_for_loop_end");
    // Method 5: Object.entries() with for loop
    performance.mark("entries_for_loop_start_no_destruct");
    const entries2 = Object.entries(obj);
    for (let i = 0; i < entries2.length; i++) {
        const str = `${entries2[i][0]}: ${entries2[i][1]}`;
    }
    performance.mark("entries_for_loop_end_no_destruct");
    console.log(performance.measure("ForInTest", "for_in_start", "for_in_end"));
    console.log(performance.measure("KeysForEachTest", "keys_forEach_start", "keys_forEach_end"));
    console.log(performance.measure("KeysForLoopTest", "keys_for_loop_start", "keys_for_loop_end"));
    console.log(performance.measure("EntriesForEachTest", "entries_forEach_start", "entries_forEach_end"));
    console.log(
        "EntriesForLoopTest",
        performance.measure("EntriesForLoopTest", "entries_for_loop_start", "entries_for_loop_end").duration
    );
    console.log(
        "EntriesForLoopTestNoDestruct",
        performance.measure(
            "EntriesForLoopTestNoDestruct",
            "entries_for_loop_start_no_destruct",
            "entries_for_loop_end_no_destruct"
        ).duration
    );
}
function ObjectApplyVsAssignTest() {
    return "Assign wins by about x2";
    const obj_apply = [];
    const obj_assign = [];
    const obj_count = 100_000;
    const prop_count = 10_000;
    const obj_to_add = {
        ontest: () => {},
        ontest2: ObjectIterationTest,
    };
    // Populate the object with random values
    for (let i = 0; i < prop_count; i++) {
        obj_to_add[`a${i}`] = Math.random();
    }
    performance.mark("apply_start");
    for (let i = 0; i < obj_count; i++) {
        const obj = {};
        Object.apply(obj, obj_to_add);
        obj_apply.push(obj);
    }
    performance.mark("apply_end");
    performance.mark("assign_start");
    for (let i = 0; i < obj_count; i++) {
        const obj = {};
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            obj[key] = obj_to_add[key];
        }
        obj_assign.push(obj);
    }
    performance.mark("assign_end");
    logTestResult("apply-duration", "apply_start", "apply_end");
    logTestResult("assign-duration", "assign_start", "assign_end");
}
function SelectPropertiesTests() {
    return "FilterOnForLoopTest was best .3 vs .7[keys.filter]";
    const obj = {};
    const obj_count = 1_000;

    // Populate the object with random values
    for (let i = 0; i < obj_count; i++) {
        obj[`a${i}`] = Math.random();
        obj[`onEvent${i}`] = () => Math.random();
    }

    // Method 1: Filtering properties starting with 'on' using Object.keys() and filter
    performance.mark("filter_on_keys_start");
    const onPropertiesKeysFilter = Object.keys(obj).filter((key) => key.startsWith("on"));
    performance.mark("filter_on_keys_end");
    logTestResult("FilterOnKeysTest", "filter_on_keys_start", "filter_on_keys_end");

    // Method 2: Filtering properties starting with 'on' using Object.entries() and filter
    performance.mark("filter_on_entries_start");
    const onPropertiesEntriesFilter = Object.entries(obj).filter(([key, value]) => key.startsWith("on"));
    performance.mark("filter_on_entries_end");
    logTestResult("FilterOnEntriesTest", "filter_on_entries_start", "filter_on_entries_end");

    // Method 3: Using a for loop to filter properties starting with 'on'
    performance.mark("filter_on_for_loop_start");
    const onPropertiesForLoopFilter = [];
    const keysForLoopFilter = Object.keys(obj);
    for (let i = 0; i < keysForLoopFilter.length; i++) {
        const key = keysForLoopFilter[i];
        if (key.startsWith("on")) {
            onPropertiesForLoopFilter.push(key);
        }
    }
    performance.mark("filter_on_for_loop_end");
    logTestResult("FilterOnForLoopTest", "filter_on_for_loop_start", "filter_on_for_loop_end");
}
function RequestAnimationFuncCalling() {
    return "Testing was harder but 21,000 V 400 ms Bached function is faster than multiple, it keep it as a tree";
    function benchmarkMultipleFunctions() {
        const numFunctions = 10;

        // Create multiple functions hooked up to requestAnimationFrame
        for (let i = 1; i <= numFunctions; i++) {
            const func = function () {
                ctx.fillStyle = "rgb(100,100," + Math.random() * 200 + ")";
                ctx.fillRect(0, 0, Math.random() * 100, 1); // Placeholder for function logic
                requestAnimationFrame(func);
            };
            requestAnimationFrame(func);
        }
    }

    function benchmarkSingleFunction(funcs) {
        // Single function that calls all other functions
        function animateAll(timestamp) {
            for (const func of funcs) {
                func(); // Placeholder for function logic
            }
            requestAnimationFrame(animateAll);
        }

        // Hook up the single function
        requestAnimationFrame(animateAll);
    }

    // Run the benchmark tests
    performance.mark("MultipleFunctions-start");
    for (let i = 0; i < 1000; i++) benchmarkMultipleFunctions();
    performance.mark("MultipleFunctions-end");

    performance.mark("SingleFunction-start");
    const numFunctions = 10;

    // Create multiple functions
    const funcs = Array.from({ length: numFunctions }, () => () => {
        ctx.fillStyle = "rgb(100,100," + Math.random() * 200 + ")";
        ctx.fillRect(0, 0, Math.random() * 100, 1);
    });
    for (let i = 0; i < 1000; i++) benchmarkSingleFunction(funcs);
    performance.mark("SingleFunction-end");
    logTestResult("MultipleFunctions", "MultipleFunctions-start", "MultipleFunctions-end");
    logTestResult("SingleFunction", "SingleFunction-start", "SingleFunction-end");
}
function RaiseFunctionTest() {
    return "raiseIfProperty is the winner but it won't works if they try to raise properties";

    const testIterations = 1_000_000; // Adjust the number of iterations as needed

    //Tried Object.hasOwn() but its slower
    // Create an object with different versions of the 'raise' function
    const testObject = new (class a {
        prop = 3;
        existingMethod = (arg1, arg2) => arg1 + arg2; //{console.log(this)}
        raise = (call, ...args) => {
            this[call] && this[call].call(this, ...args);
        };
        raiseWithIfCheck = (call, ...args) => {
            if (this[call]) this[call].call(this, ...args);
        };
        raiseIfProperty = (call, ...args) => {
            if (this.hasOwnProperty(call)) this[call].call(this, ...args);
        };
        raiseTypeCheck = (call, ...args) => {
            if (typeof this[call] === "function") {
                this[call].call(this, ...args);
            }
        };
        raiseIfNoCall = (call, ...args) => {
            if (this[call]) this[call](...args);
        };
        raiseIfPropertyNoCall = (call, ...args) => {
            if (this.hasOwnProperty(call)) this[call](...args);
        };
        raiseTypeNoCall = (call, ...args) => {
            if (typeof this[call] === "function") this[call](...args);
        };
    })();
    // testObject.raiseWithIfCheck('existingMethod','args','args2')
    // testObject.raiseNoCall('existingMethod','args','args2')
    // return

    // Method 1: With existence check
    performance.mark("raise_with_check_start");
    for (let i = 0; i < testIterations; i++) {
        testObject.raise("existingMethod", "arg1", "arg2");
        testObject.raise("nonExistingMethod", "arg1", "arg2");
        // testObject.raise('prop');
    }
    performance.mark("raise_with_check_end");

    // Method 2: With 'if' existence check
    performance.mark("raise_with_if_check_start");
    for (let i = 0; i < testIterations; i++) {
        testObject.raiseWithIfCheck("existingMethod", "arg1", "arg2");
        testObject.raiseWithIfCheck("nonExistingMethod", "arg1", "arg2");
        // testObject.raiseWithIfCheck('prop');
    }
    performance.mark("raise_with_if_check_end");

    // Method 3: With type check
    performance.mark("raise_type_check_start");
    for (let i = 0; i < testIterations; i++) {
        testObject.raiseTypeCheck("existingMethod", "arg1", "arg2");
        testObject.raiseTypeCheck("nonExistingMethod", "arg1", "arg2");
        testObject.raiseTypeCheck("prop");
    }
    performance.mark("raise_type_check_end");

    // Method 4: With 'if' hasOwnProperty check
    performance.mark("raise_with_property_start");
    for (let i = 0; i < testIterations; i++) {
        testObject.raiseIfProperty("existingMethod", "arg1", "arg2");
        testObject.raiseIfProperty("nonExistingMethod", "arg1", "arg2");
        // testObject.raiseWithIfCheck('prop');
    }
    performance.mark("raise_with_property_end");

    // Method 5: With 'if' existence check no call
    performance.mark("raise_if_no_call_start");
    for (let i = 0; i < testIterations; i++) {
        testObject.raiseIfNoCall("existingMethod", "arg1", "arg2");
        testObject.raiseIfNoCall("nonExistingMethod", "arg1", "arg2");
        // testObject.raiseIfNoCall('prop');
    }
    performance.mark("raise_if_no_call_end");

    // Method 6: With type check no call
    performance.mark("raise_type_no_call_start");
    for (let i = 0; i < testIterations; i++) {
        testObject.raiseTypeNoCall("existingMethod", "arg1", "arg2");
        testObject.raiseTypeNoCall("nonExistingMethod", "arg1", "arg2");
        testObject.raiseTypeNoCall("prop");
    }
    performance.mark("raise_type_no_call_end");

    // Method 7: With 'if' hasOwnProperty check
    performance.mark("raise_with_property_no_call_start");
    for (let i = 0; i < testIterations; i++) {
        testObject.raiseIfPropertyNoCall("existingMethod", "arg1", "arg2");
        testObject.raiseIfPropertyNoCall("nonExistingMethod", "arg1", "arg2");
        // testObject.raiseWithIfCheck('prop');
    }
    performance.mark("raise_with_property_no_call_end");
    // Log test results
    logTestResult("RaiseWithCheckTest", "raise_with_check_start", "raise_with_check_end");
    logTestResult("RaiseWithIfCheckTest", "raise_with_if_check_start", "raise_with_if_check_end");
    logTestResult("RaiseWithIfPropertyTest", "raise_with_property_start", "raise_with_property_end");
    logTestResult("RaiseTypeCheckTest", "raise_type_check_start", "raise_type_check_end");
    logTestResult("RaiseIfNoCallTest", "raise_if_no_call_start", "raise_if_no_call_end");
    logTestResult("RaisePropertyNoCallTest", "raise_with_property_no_call_start", "raise_with_property_no_call_end");
}

// Run the tests
console.log(ObjectIterationTest());
console.log(ObjectApplyVsAssignTest());
console.log(SelectPropertiesTests());
console.log(RequestAnimationFuncCalling());
console.log(RaiseFunctionTest());
