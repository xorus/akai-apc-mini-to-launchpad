/**
 * Created by Xorus on 20/05/2017.
 */

let apcColors = {
    off: 0,
    green: 1,
    red: 3,
    yellow: 5
};

function Transformer() {
    // index for fast led update
    this.currentIndex = 0;
}

Transformer.prototype.controllerToDaw = function (input, callback) {
    if (input[0] !== 0x90 && input[0] !== 0x80) {
        return;
    }

    let velocity = input[0] === 0x80 ? 0 : 127; // note on = full velocity; note off = 0 velocity

    // right column buttons
    if (input[0] === 0x90 && input[1] >= 82 && input[1] <= 89) {
        let i = input[1] - 82;
        let index = i * 16 + 8;
        console.log(input[1], index);
        callback([0x90, index, velocity]);
    }

    // bottom row buttons
    if (input[1] >= 64 && input[1] <= 71) {
        console.log(input[1], input[1] - 64 + 104);
        callback([176, input[1] - 64 + 104, velocity]);
    }

    input[1] = this.akaiToLaunchpadIndex(input[1]);
    callback([0x90, input[1], velocity]);
};

Transformer.prototype.akaiToLaunchpadIndex = function (index) {
    let y = Math.floor(index / 8);
    let yIndex = (8 * y) * 2; // skip 1 on 2 line
    let x = index % 8;
    return 119 - (yIndex + (7 - x));
};

Transformer.prototype.lauchpadToAkaiIndex = function (index) {
    let x = index % 16;
    let y = Math.floor(index / 16);

    if (x > 8) {
        console.log("this aint a pad", index);
        return 82 + y;
    }
    let yIndex = 8 * y;
    return 63 - (yIndex + (7 - x));
};

Transformer.prototype.lauchpadButtonToAkaiIndex = function (index) {
    // received CC command
    let x = index % 16;
    let y = Math.floor(index / 16);

    if (index >= 104 && index <= 111) {
        return 64 + x - 8;
    }

    console.log("wtf ", index);
    return 89;
};

Transformer.prototype.lauchpadToAkaiColor = function (color) {
    let bits = [];
    for (let i = 0; i < 7; i++) {
        let bit = color & (1 << i) ? 1 : 0;
        bits.push(bit);
    }

    let red = bits[1] + bits[0] * 2;
    let green = bits[5] + bits[4] * 2;
    // console.log("===> " + red + " " + green + " " + bits[0] + " " + bits[1]);

    let apcColor = apcColors.off;
    if (red > 1 && green > 1) {
        apcColor = apcColors.yellow;
    } else if (red >= 1) {
        apcColor = apcColors.red;
    } else if (green >= 1) {
        apcColor = apcColors.green;
    }

    // console.log('color = ' + red + ' ' + green + ' > ' + apcColor);
    return apcColor;
};

Transformer.prototype.clearController = function (callback, color) {
    color = typeof color === "undefined" ? 0 : color;
    for (let i = 0; i <= 89; i++) {
        callback([0x90, i, color]);
    }
};

Transformer.prototype.dawToController = function (input, callback) {
    // console.log([input[0], input[1], input[2]]);

    switch (input[0]) {
        // Message : color pad LED
        case 144:
            this.currentIndex = 0;
            callback([0x90, this.lauchpadToAkaiIndex(input[1]), this.lauchpadToAkaiColor(input[2])]);
            return;
        case 176:
            this.currentIndex = 0;
            if (input[1] === 0) {
                // reset code
                if (input[2] === 0)
                    this.clearController(callback);
                else if (input[2] >= 125)
                    this.clearController(callback, apcColors.yellow);
                return;
            }
            if (input[1] === 30 || input[1] === 31) {
                // change brightness
                // console.log("CC 30/31");
                return;
            }

            callback([0x90, this.lauchpadButtonToAkaiIndex(input[1]), this.lauchpadToAkaiColor(input[2])]);
            return;
        // }
        //
        // callback([0x90, this.lauchpadToAkaiIndex(input[1]), this.lauchpadToAkaiColor(input[2])]);
        // return;
        // Message : color cursor LED
        // callback([0x90, this.lauchpadButtonToAkaiIndex(input[1]), this.lauchpadToAkaiColor(input[2])]);
        // return;
        case 146:
            callback([0x90, 63 - this.currentIndex++, this.lauchpadToAkaiColor(input[1])]);
            callback([0x90, 63 - this.currentIndex++, this.lauchpadToAkaiColor(input[2])]);
            return;
    }

    console.log("not handled " + input);

    // callback([input[0], input[1], input[2]]);
};

module.exports = Transformer;