const ExpoEnvironment = require('jest-expo/src/preset/nativeEnvironment');

// Expo installs `expo/fetch` as the global fetch, and under Jest its native module is a stub.
// Keep Node's fetch so axios reaches MSW, which intercepts it like a real request.
class AppTestEnvironment extends ExpoEnvironment {
  constructor(config, context) {
    super(config, context);
    this.global.__nodeFetch = { fetch, Request, Response, Headers };
  }
}

module.exports = AppTestEnvironment;
