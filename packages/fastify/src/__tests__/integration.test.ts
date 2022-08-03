import { ApolloServer, ApolloServerOptions, BaseContext } from "@apollo/server";
import {
  CreateServerForIntegrationTestsOptions,
  defineIntegrationTestSuite,
} from "@apollo/server-integration-testsuite";
import { fastifyDrainPlugin, fastifyHandler } from "..";
import fastify from "fastify";

describe("fastifyPlugin", () => {
  defineIntegrationTestSuite(async function (
    serverOptions: ApolloServerOptions<BaseContext>,
    testOptions?: CreateServerForIntegrationTestsOptions,
  ) {
    const app = fastify();

    const server = new ApolloServer({
      ...serverOptions,
      plugins: [...(serverOptions.plugins ?? []), fastifyDrainPlugin(app)],
    });

    await server.start();

    app.route({
      // Note: we register for HEAD mostly because the integration test suite
      // ensures that our middleware appropriate rejects such requests. In your
      // app, you would only want to register for GET and POST.
      method: ["GET", "POST", "HEAD"],
      url: "/",
      handler: fastifyHandler(server, { context: testOptions?.context }),
    });

    const url = await app.listen({ port: 0 });

    return {
      server,
      url,
      async extraCleanup() {
        await app.close();
      },
    };
  });
});
