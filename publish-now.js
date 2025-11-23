// Script to immediately publish an article
const { build } = require("esbuild");
const fs = require("fs");
const path = require("path");

async function bundleAndPublish() {
  try {
    console.log("Bundling code...");

    // Create output directory if it doesn't exist
    const outdir = path.join(__dirname, "dist");
    if (!fs.existsSync(outdir)) {
      fs.mkdirSync(outdir, { recursive: true });
    }

    // Build the templates module first
    await build({
      entryPoints: ["src/templates/traditional-news-template.js"],
      bundle: false,
      platform: "node",
      target: "node16",
      outfile: path.join(outdir, "templates/traditional-news-template.js"),
      allowOverwrite: true,
    });

    // Make sure the templates directory exists in dist
    if (!fs.existsSync(path.join(outdir, "templates"))) {
      fs.mkdirSync(path.join(outdir, "templates"), { recursive: true });
    }

    // Build the publisher again
    await build({
      entryPoints: ["src/examples/AutomatedNewsPublishing.ts"],
      bundle: true,
      platform: "node",
      target: "node16",
      outfile: path.join(outdir, "publisher.js"),
      loader: { ".ts": "ts" },
      external: [
        "natural",
        "@tensorflow/tfjs",
        "@tensorflow/tfjs-node",
        "../templates/traditional-news-template",
      ],
    });

    console.log("Bundle created. Executing publisher...");

    // Execute code to publish a Bitcoin article
    const publisherCode = `
      // Access the bundled publisher and publish immediately
      const process = require('process');
      
      // Wait a moment for modules to load properly
      setTimeout(async () => {
        try {
          // Import the publisher
          const { AutomatedNewsPublisher } = require('./tools/AutomatedNewsPublisher');
          
          // Create a publisher instance
          const publisher = new AutomatedNewsPublisher('./auto-generated-articles', './publishing-config.json');
          
          // Publish right away
          const result = await publisher.publishNow('daily-bitcoin');
          
          // Show the results
          if (result) {
            console.log('Article published successfully:');
            console.log('Title:', result.title);
            console.log('File:', result.filePath);
            console.log('Date:', result.publishDate);
          } else {
            console.log('Failed to publish article');
          }
          
          // Exit when done
          process.exit(0);
        } catch (error) {
          console.error('Error publishing article:', error);
          process.exit(1);
        }
      }, 1000);
    `;

    // Write the execution code to a file
    fs.writeFileSync(path.join(outdir, "publish-now.js"), publisherCode);

    // Execute the code
    console.log("Running publisher...");
    require("child_process").execSync(
      `node ${path.join(outdir, "publish-now.js")}`,
      { stdio: "inherit" },
    );
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

bundleAndPublish();
