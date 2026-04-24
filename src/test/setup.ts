import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

/**
 * Global test setup.
 *
 * `@testing-library/jest-dom/vitest` registers the matcher bundle
 * (toBeInTheDocument, toHaveClass, toHaveAttribute, etc.) onto Vitest's
 * `expect`. The `afterEach(cleanup)` unmounts any React tree that a test
 * rendered so state never leaks across tests.
 *
 * Most of our test surface is pure-library (utils / sanitize / crypto /
 * translations parity) and doesn't need the DOM — those files run in
 * happy-dom anyway at basically zero cost, so we keep a single global env
 * rather than splitting per-file.
 */
afterEach(() => {
  cleanup();
});
