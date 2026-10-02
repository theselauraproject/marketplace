// sharp relies on native binaries that cannot run (or be bundled) on
// Cloudflare Workers. Next only calls sharp() when a request performs image
// optimization; exporting a throwing shim keeps the bundle buildable while
// failing loudly if image optimization is actually invoked.
function missingSharp() {
  throw new Error(
    "sharp is not available in this runtime (Cloudflare Workers). Use a custom image loader or unoptimized images.",
  );
}

module.exports = missingSharp;
module.exports.default = missingSharp;
module.exports.block = () => {};
module.exports.unblock = () => {};
module.exports.concurrency = () => {};
module.exports.cache = () => {};
module.exports.counters = () => ({});
