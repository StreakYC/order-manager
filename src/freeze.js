/* @flow */

const freeze: <T>(x: T) => T = global.Object.freeze || ((x => x): any);
export default freeze;
