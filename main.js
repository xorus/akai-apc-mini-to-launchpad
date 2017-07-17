let navigator = require('web-midi-api');
let term = require('terminal-kit').terminal;
let Transformer = require('./transformer');

let midi;
let inputs;
let outputs;

function onMIDIFailure(msg) {
    console.log('Failed to get MIDI access - ' + msg);
    process.exit(1);
}

function onMIDISuccess(midiAccess) {
    midi = midiAccess;

    inputs = midi.inputs;
    outputs = midi.outputs;

    let targetDawInput = 'loopMIDI Port 1';
    let targetDawOutput = 'loopMIDI Port';
    let targetController = 'APC MINI';

    let controllerInput = null;
    let controllerOutput = null;
    let dawOutput = null;
    let dawInput = null;

    for (let input of inputs.values()) {
        if (input.name === targetController) {
            controllerInput = input;
            console.log(term.green.str("Found controller input"));
        } else if (input.name === targetDawInput) {
            dawInput = input;
            console.log(term.green.str("Found daw input"));
        }
    }
    for (let output of outputs.values()) {
        if (output.name === targetDawOutput) {
            dawOutput = output;
            console.log(term.green.str("Found daw output"));
        } else if (output.name === targetController) {
            controllerOutput = output;
            console.log(term.green.str("Found controller output"));
        }
    }

    if (controllerInput === null || dawOutput === null) {
        term.red.error("Input or output device not found");
        process.exit(1);
    }

    let transformer = new Transformer();

    controllerInput.onmidimessage = function (a) {
        transformer.controllerToDaw(a.data, data => {
            console.log('Input', a.data, data);
            dawOutput.send(data);
        });
    };

    controllerInput.open();
    controllerOutput.open();
    dawInput.open();
    dawOutput.open();

    transformer.clearController((d) => controllerOutput.send(d));

    dawInput.onmidimessage = function (a) {
        console.log(a);
        transformer.dawToController(a.data, data => {
            console.log('DAW ', a.data, data);
            controllerOutput.send(data);
        });
    };

    // inputDevice.open();
    // inputDevice.addEventListener('midimessage', msg => console.log(msg.data));

    //     .then(a => {
    //     console.log(a);
    //     a.addEventListener('midimessage', msg => console.log(msg.data));
    // })
}

function stopInputs() {
    console.log('Thank you!');
    navigator.close(); // This will close MIDI inputs, otherwise Node.js will wait for MIDI input forever.
    process.exit(0);
}

// navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure).catch(e => {
    console.error(e);
});