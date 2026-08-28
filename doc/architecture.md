# Source architecture

Production TypeScript under `src/` follows a one-symbol ownership rule:

- each named top-level function, function-valued constant, class, interface, type alias, or enum has its own file;
- related files live in a folder named for a single, defined scope;
- consumers import symbols directly from the file that owns each declaration;
- barrels, re-exports, and empty subclass compatibility shims are not allowed;
- imports are grouped as Node built-ins, external packages, and project-relative modules, with alphabetical ordering inside each group;
- anonymous callbacks may remain inline when they are local implementation details;
- functions and classes require JSDoc, and class/interface methods require JSDoc.

Run the architectural guard locally with:

```bash
npm run check:architecture
```

The CI workflow runs the same command so new barrels, subclass shims, multi-symbol modules, or undocumented callable APIs cannot be merged accidentally. TypeScript also rejects unused imports through `noUnusedLocals`.
