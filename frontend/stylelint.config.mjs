/*
 * Tokens-only rule (design-system/quality.md → Lint gates).
 * Colours, radii, shadows, font sizes/weights/families, line heights and z-index must come from tokens.css.
 * tokens.css itself and the global base are exempt. affect-ui ports keep their CSS inside .tsx and are not linted.
 */
const KEYWORDS = ["inherit", "initial", "unset", "currentColor", "transparent", "none", "0", "1", "50%", "100%", "auto", "normal"];

export default {
  plugins: ["stylelint-declaration-strict-value"],
  ignoreFiles: ["src/styles/tokens.css", "dist/**", "node_modules/**"],
  rules: {
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla", "oklch"],
    "scale-unlimited/declaration-strict-value": [
      [
        "/color$/", "fill", "stroke", "background", "background-color",
        "border-radius", "box-shadow",
        "font-size", "font-weight", "font-family", "line-height", "letter-spacing", "z-index",
        "transition-timing-function",
      ],
      {
        ignoreValues: KEYWORDS,
        // calc(var(--x) * n) and color-mix(var(...)) are fine; raw rgb/hsl are banned by function-disallowed-list
        ignoreFunctions: true,
        disableFix: true,
        message: "Use a token from src/styles/tokens.css for \"${property}\" (got \"${value}\")",
      },
    ],
  },
  overrides: [
    {
      // global.css sets the base and the .sr-only utility
      files: ["src/styles/global.css"],
      rules: { "scale-unlimited/declaration-strict-value": null },
    },
  ],
};
