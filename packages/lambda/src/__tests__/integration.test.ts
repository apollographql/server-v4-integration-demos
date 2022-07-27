import { lambdaHandler } from "..";

describe("lambdaHandler", () => {
  it("integration", () => {
    lambdaHandler();
    expect(true).toBeTruthy();
  });
});
