import { ApolloServer, ApolloServerOptions, BaseContext } from "@apollo/server";
import {
  CreateServerForIntegrationTestsOptions,
  defineIntegrationTestSuite,
} from "@apollo/server-integration-testsuite";
import { fastifyPlugin } from "..";
import fastify from "fastify";

describe("fastifyPlugin", () => {
  defineIntegrationTestSuite(async function (
    serverOptions: ApolloServerOptions<BaseContext>,
    testOptions?: CreateServerForIntegrationTestsOptions,
  ) {
    const server = new ApolloServer({
      ...serverOptions,
      plugins: [
        ...(serverOptions.plugins ?? []),
      ],
    });

    const app = fastify();

    await server.start();
    app.register(fastifyPlugin(server, testOptions));

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
