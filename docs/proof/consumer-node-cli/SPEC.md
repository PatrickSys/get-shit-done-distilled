# Hello Proof Spec

## Product

`hello-proof` is a tiny framework-free Node CLI used to prove Workspine's launch flow in a fresh consumer repo.

## Must-Have Requirements

- `HP-01`: Running `node index.js` prints `Hello, world!`
- `HP-02`: Running `node index.js --name Ada` prints `Hello, Ada!`
- `HP-03`: A stranger can run one automated test command immediately after setup

## Constraints

- Keep the project intentionally small
- Use plain Node.js without a framework
- Document the run and test commands in `README.md`
