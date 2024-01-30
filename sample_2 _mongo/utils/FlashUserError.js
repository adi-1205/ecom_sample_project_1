module.exports = class FlashUserError extends Error {
    constructor(messge) {
        super(messge)
    }
}