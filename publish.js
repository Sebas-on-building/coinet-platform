// publish.js - Script to run the AutomatedNewsPublisher

// First install required packages if needed:
// npm install --save-dev esbuild typescript

const { build } = require("esbuild");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

async function bundleAndRun() {
  try {
    console.log("Bundling AutomatedNewsPublisher...");

    // Create output directory if it doesn't exist
    const outdir = path.join(__dirname, "dist");
    if (!fs.existsSync(outdir)) {
      fs.mkdirSync(outdir, { recursive: true });
    }

    // Use esbuild to bundle the TypeScript code
    await build({
      entryPoints: ["src/examples/AutomatedNewsPublishing.ts"],
      bundle: true,
      platform: "node",
      target: "node16",
      outfile: path.join(outdir, "publisher.js"),
      loader: { ".ts": "ts" },
      external: ["natural", "@tensorflow/tfjs", "@tensorflow/tfjs-node"],
    });

    console.log(
      "Bundle created successfully. Running AutomatedNewsPublisher...",
    );

    // Run the bundled code
    const child = spawn("node", [path.join(outdir, "publisher.js")], {
      stdio: "inherit",
    });

    // Handle process exit
    child.on("close", (code) => {
      console.log(`AutomatedNewsPublisher process exited with code ${code}`);
    });

    // Handle signals to gracefully stop the child process
    process.on("SIGINT", () => {
      console.log("Stopping AutomatedNewsPublisher...");
      child.kill("SIGINT");
    });
  } catch (error) {
    console.error("Error bundling or running AutomatedNewsPublisher:", error);
    process.exit(1);
  }
}

bundleAndRun();
