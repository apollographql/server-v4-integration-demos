import { ApolloServer } from "@apollo/server";

export function lambdaHandler() {
  new ApolloServer({ typeDefs: `type Query { hello: String! }` });
}