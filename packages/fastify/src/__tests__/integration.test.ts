import { ApolloServer, ApolloServerOptions, BaseContext } from "@apollo/server";
// import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import {
  CreateServerForIntegrationTestsOptions,
  defineIntegrationTestSuite,
} from "@apollo/server-integration-testsuite";
// import { createServer, Server } from "http";
import type { Server } from "http";
import type { AddressInfo } from "net";
import { format } from "url";
import { fastifyPlugin } from "..";
import fastify from "fastify";

describe("fastifyPlugin", () => {
  defineIntegrationTestSuite(async function (
    serverOptions: ApolloServerOptions<BaseContext>,
    testOptions?: CreateServerForIntegrationTestsOptions,
  ) {
    // const httpServer = createServer();
    const server = new ApolloServer({
      ...serverOptions,
      plugins: [
        ...(serverOptions.plugins ?? []),
        // ApolloServerPluginDrainHttpServer({
        //   httpServer,
        // }),
      ],
    });

    const app = fastify();

    await server.start();
    app.register(fastifyPlugin(server, testOptions));

    // app.get('/', (_request, reply) => {
    //   reply.send('');
    // });

    // app.post('/', (_request, reply) => {
    //   reply.send('');
    // })
    
    // app.listen({ port: 0 }, (_err) => {
    //   debugger;
    // });
    // await new Promise<void>((resolve) => {
    //   httpServer.listen({ port: 0 }, resolve);
    // });
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

// Stolen from apollo server integration tests
export function urlForHttpServer(httpServer: Server): string {
  const { address, port } = httpServer.address() as AddressInfo;

  // Convert IPs which mean "any address" (IPv4 or IPv6) into localhost
  // corresponding loopback ip. Note that the url field we're setting is
  // primarily for consumption by our test suite. If this heuristic is wrong for
  // your use case, explicitly specify a frontend host (in the `host` option
  // when listening).
  const hostname = address === "" || address === "::" ? "localhost" : address;

  return format({
    protocol: "http",
    hostname,
    port,
    pathname: "/",
  });
}
