import { ApolloServer, ApolloServerOptions, BaseContext } from "@apollo/server";
import {
  CreateServerForIntegrationTestsOptions,
  defineIntegrationTestSuite,
} from "@apollo/server-integration-testsuite";
import { createServer, Server } from "http";
import type { AddressInfo } from "net";
import { format } from "url";
import { startServerAndCreateLambdaHandler } from "..";
import { createMockServer as createAPIGatewayMockServer } from "./mockAPIGatewayServer";

describe("startServerAndCreateLambdaHandler", () => {
  defineIntegrationTestSuite(
    async function (
      serverOptions: ApolloServerOptions<BaseContext>,
      testOptions?: CreateServerForIntegrationTestsOptions,
    ) {
      const httpServer = createServer();
      const server = new ApolloServer(serverOptions);

      const handler = testOptions
        ? startServerAndCreateLambdaHandler(server, testOptions)
        : startServerAndCreateLambdaHandler(server);

      httpServer.addListener("request", createAPIGatewayMockServer(handler));

      await new Promise<void>((resolve) => {
        httpServer.listen({ port: 0 }, resolve);
      });

      return {
        server,
        url: urlForHttpServer(httpServer),
        extraCleanup: async () => {
          httpServer.close();
        },
      };
    },
    {
      serverIsStartedInBackground: true,
    },
  );
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
