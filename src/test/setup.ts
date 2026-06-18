import React from "react";

// Vitest + jsx preserve: ensure React is in scope for tested components.
(globalThis as typeof globalThis & { React: typeof React }).React = React;
