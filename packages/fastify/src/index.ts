import type {
  ApolloServer,
  BaseContext,
  ContextFunction,
  HTTPGraphQLRequest,
} from "@apollo/server";
import type { WithRequired } from "@apollo/utils.withrequired";
import type {
  FastifyPluginCallback,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import type { PluginMetadata } from "fastify-plugin";
import fp from "fastify-plugin";

const pluginMetadata: PluginMetadata = {
  fastify: "4.x",
  name: "apollo-server-integration-fastify",
};

export interface FastifyContextFunctionArgument {
  request: FastifyRequest;
  reply: FastifyReply;
}

export interface LambdaHandlerOptions<TContext extends BaseContext> {
  context?: ContextFunction<[FastifyContextFunctionArgument], TContext>;
}

export function fastifyPlugin(
  server: ApolloServer<BaseContext>,
  options?: LambdaHandlerOptions<BaseContext>,
): FastifyPluginCallback;
export function fastifyPlugin<TContext extends BaseContext>(
  server: ApolloServer<TContext>,
  options: WithRequired<LambdaHandlerOptions<TContext>, "context">,
): FastifyPluginCallback;
export function fastifyPlugin(
  server: ApolloServer<BaseContext>,
  options?: LambdaHandlerOptions<BaseContext>,
) {
  return fp(fastifyHandler(server, options), pluginMetadata);
}

function fastifyHandler(
  server: ApolloServer<BaseContext>,
  options?: LambdaHandlerOptions<BaseContext>,
): FastifyPluginCallback;
function fastifyHandler<TContext extends BaseContext>(
  server: ApolloServer<TContext>,
  options: WithRequired<LambdaHandlerOptions<TContext>, "context">,
): FastifyPluginCallback;
function fastifyHandler<TContext extends BaseContext>(
  server: ApolloServer<TContext>,
  options?: LambdaHandlerOptions<TContext>,
): FastifyPluginCallback {
  server.assertStarted("fastifyHandler()");
  
  return async (fastify) => {

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

    fastify.addHook("preHandler", async (request, reply) => {
      const headers = new Map<string, string>();
      for (const [key, value] of Object.entries(request.headers)) {
        // TODO: how does fastify handle duplicate headers?
        if (value !== undefined) {
          headers.set(key, Array.isArray(value) ? value.join(", ") : value);
        }
      }

      const httpGraphQLRequest: HTTPGraphQLRequest = {
        method: request.method,
        headers,
        search:
          typeof request.raw.url === "string"
            ? request.raw.url.substring(1)
            : "",
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
    });
  };
}
