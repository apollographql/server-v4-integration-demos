import type {
  ApolloServer,
  ApolloServerPlugin,
  BaseContext,
  ContextFunction,
  HTTPGraphQLRequest,
} from "@apollo/server";
import type { WithRequired } from "@apollo/utils.withrequired";
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  RouteHandlerMethod,
} from "fastify";
import { parse as urlParse } from "url";

export interface FastifyContextFunctionArgument {
  request: FastifyRequest;
  reply: FastifyReply;
}

export interface FastifyHandlerOptions<TContext extends BaseContext> {
  context?:
    | ContextFunction<[FastifyContextFunctionArgument], TContext>
    | undefined;
}

export function fastifyHandler(
  server: ApolloServer<BaseContext>,
  options?: FastifyHandlerOptions<BaseContext>,
): RouteHandlerMethod;
export function fastifyHandler<TContext extends BaseContext>(
  server: ApolloServer<TContext>,
  options: WithRequired<FastifyHandlerOptions<TContext>, "context">,
): RouteHandlerMethod;
export function fastifyHandler<TContext extends BaseContext>(
  server: ApolloServer<TContext>,
  options?: FastifyHandlerOptions<TContext>,
): RouteHandlerMethod {
  server.assertStarted("fastifyHandler()");

  // This `any` is safe because the overload above shows that context can
  // only be left out if you're using BaseContext as your context, and {} is a
  // valid BaseContext.
  const defaultContext: ContextFunction<
    [FastifyContextFunctionArgument],
    any
  > = async () => ({});

  const contextFunction: ContextFunction<
    [FastifyContextFunctionArgument],
    TContext
  > = options?.context ?? defaultContext;

  return async (request, reply) => {
    const headers = new Map<string, string>();
    for (const [key, value] of Object.entries(request.headers)) {
      if (value !== undefined) {
        headers.set(key, Array.isArray(value) ? value.join(", ") : value);
      }
    }

    const httpGraphQLRequest: HTTPGraphQLRequest = {
      method: request.method,
      headers,
      search: urlParse(request.url).search ?? "",
      body: request.body,
    };

    const httpGraphQLResponse = await server.executeHTTPGraphQLRequest({
      httpGraphQLRequest,
      context: () => contextFunction({ request, reply }),
    });

    if (httpGraphQLResponse.completeBody === null) {
      throw Error("Incremental delivery not implemented");
    }

    reply.code(httpGraphQLResponse.statusCode ?? 200);
    reply.headers(Object.fromEntries(httpGraphQLResponse.headers));
    reply.send(httpGraphQLResponse.completeBody);

    return reply;
  };
}

// Add this plugin to your ApolloServer to drain the server during shutdown.
// This works best with Node 18.2.0 or newer; with that version, Fastify will
// use the new server.closeIdleConnections() to close idle connections, and the
// plugin will close any other connections 10 seconds later. (With older Node,
// the drain phase will hang until all connections naturally close; you can also
// call `fastify({forceCloseConnections: true})` to make all connections immediately
// close without grace.)
export function fastifyDrainPlugin<TContext extends BaseContext>(
  app: FastifyInstance,
): ApolloServerPlugin<TContext> {
  return {
    async serverWillStart() {
      return {
        async drainServer() {
          let timeout;
          if ("closeAllConnections" in app.server) {
            timeout = setTimeout(
              () => (app.server as any).closeAllConnections(),
              10_000,
            );
          }
          await app.close();
          if (timeout) {
            clearTimeout(timeout);
          }
        },
      };
    },
  };
}
