import type { RepoFile } from "@/src/types/editor";

export const repositoryName = "demo-project";

export const mockRepository: RepoFile[] = [
  {
    path: "src",
    name: "src",
    type: "folder",
    children: [
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
    users: []
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
  console.log(\`\${req.method} \${req.url}\`);
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
    path: "package.json",
    name: "package.json",
    type: "file",
    content: `{
  "name": "demo-project",
  "version": "1.0.0",
  "main": "src/server.js",
  "scripts": {
    "start": "node src/server.js"
  },
  "dependencies": {
    "express": "^5.0.0"
  }
}
`,
  },
  {
    path: "README.md",
    name: "README.md",
    type: "file",
    content: `# Demo Project

A small Express service used to explore the AI Code Editor.

## Getting started

Install dependencies and start the development server:

\`\`\`bash
npm install
npm start
\`\`\`
`,
  },
];
