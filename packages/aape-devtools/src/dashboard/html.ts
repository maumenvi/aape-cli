import type { DevtoolsDashboardOptions } from '../types.ts';
import { resolveDashboardPaths } from './paths.ts';

export function renderDashboardHtml(options: DevtoolsDashboardOptions = {}): string {
  const paths = resolveDashboardPaths(options);
  const endpoints = {
    run: paths.runPath,
    events: paths.eventsPath,
    timeline: paths.timelinePath,
    clear: paths.clearPath,
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>@maumenvi/aape-devtools</title>
    <link rel="stylesheet" href="https://esm.sh/reactflow@11.11.4/dist/style.css" />
    <link rel="stylesheet" href="${paths.stylesPath}" />
    <script type="importmap">
      {
        "imports": {
          "react": "https://esm.sh/react@18.3.1",
          "react/jsx-runtime": "https://esm.sh/react@18.3.1/jsx-runtime",
          "react-dom/client": "https://esm.sh/react-dom@18.3.1/client?deps=react@18.3.1",
          "reactflow": "https://esm.sh/reactflow@11.11.4?deps=react@18.3.1,react-dom@18.3.1"
        }
      }
    </script>
  </head>
  <body>
    <div class="page">
      <div id="root"></div>
    </div>
    <script>
      window.__AAPE_DEVTOOLS_ENDPOINTS__ = ${JSON.stringify(endpoints)};
    </script>
    <script type="module" src="${paths.appPath}"></script>
  </body>
</html>`;
}
