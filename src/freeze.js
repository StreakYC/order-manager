/* @flow */

const freeze: <T>(x: T) => T = global.Object.freeze || (x => x);
export default freeze;
