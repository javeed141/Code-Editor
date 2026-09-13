import type { RepoFile } from "@/src/types/editor";

export const repositoryName = "demo-project";

export const mockRepository: RepoFile[] = [
  {
    path: "src",
    name: "src",
    type: "folder",
    children: [
      {
        path: "src/components",
        name: "components",
        type: "folder",
        children: [
          {
            path: "src/components/App.tsx",
            name: "App.tsx",
            type: "file",
            content: `import React, { useState } from "react";

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="container">
      <h1>AI Code Editor Demo</h1>
      <p>Current count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
`,
          },
          {
            path: "src/components/styles.css",
            name: "styles.css",
            type: "file",
            content: `/* Application styles */
.container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #007acc;
}

button {
  background-color: #007acc;
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

button:hover {
  background-color: #0062a3;
}
`,
          },
        ],
      },
      {
        path: "src/routes",
        name: "routes",
        type: "folder",
        children: [
          {
            path: "src/routes/users.js",
            name: "users.js",
            type: "file",
            content: `const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    users: [
      { id: 1, name: "Alice", role: "admin" },
      { id: 2, name: "Bob", role: "developer" }
    ]
  });
});

module.exports = router;
`,
          },
        ],
      },
      {
        path: "src/middleware",
        name: "middleware",
        type: "folder",
        children: [
          {
            path: "src/middleware/logger.js",
            name: "logger.js",
            type: "file",
            content: `function logger(req, res, next) {
  console.log(\`[\${new Date().toISOString()}] \${req.method} \${req.url}\`);
  next();
}

module.exports = logger;
`,
          },
        ],
      },
      {
        path: "src/server.js",
        name: "server.js",
        type: "file",
        content: `const express = require("express");
const usersRouter = require("./routes/users");
const logger = require("./middleware/logger");

const app = express();

app.use(express.json());
app.use(logger);
app.use("/users", usersRouter);

app.get("/", (req, res) => {
  res.json({
    message: "Hello from demo project"
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
`,
      },
    ],
  },
  {
    path: "public",
    name: "public",
    type: "folder",
    children: [
      {
        path: "public/index.html",
        name: "index.html",
        type: "file",
        content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>AI Code Editor Demo</title>
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>
`,
      },
    ],
  },
  {
    path: "package.json",
    name: "package.json",
    type: "file",
    content: `{
  "name": "demo-project",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js",
    "build": "tsc"
  },
  "dependencies": {
    "express": "^5.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
`,
  },
  {
    path: "tsconfig.json",
    name: "tsconfig.json",
    type: "file",
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true
  }
}
`,
  },
  {
    path: ".gitignore",
    name: ".gitignore",
    type: "file",
    content: `node_modules
.next
dist
.env
*.log
`,
  },
  {
    path: "README.md",
    name: "README.md",
    type: "file",
    content: `# Demo Project

A small Express & React service used to explore the AI Code Editor.

## Getting started

Install dependencies and start the development server:

\`\`\`bash
npm install
npm start
\`\`\`
`,
  },
];
