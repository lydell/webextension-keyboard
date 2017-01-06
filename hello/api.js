class API extends ExtensionAPI {
  getAPI(context) {
    return {
      hello: {
        hello() {
          return "Hello, world!"
        },
      },
    };
  }
}
