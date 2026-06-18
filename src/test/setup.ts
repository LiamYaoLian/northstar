import React from "react";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));

// Vitest + jsx preserve: ensure React is in scope for tested components.
(globalThis as typeof globalThis & { React: typeof React }).React = React;
