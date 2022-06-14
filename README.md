[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version/ivangsa.asyncapi-preview.svg 'Current Release')](https://marketplace.visualstudio.com/items?itemName=ivangsa.asyncapi-preview) [![Marketplace Downloads](https://vsmarketplacebadge.apphb.com/downloads-short/ivangsa.asyncapi-preview.svg 'Current Release')](https://marketplace.visualstudio.com/items?itemName=ivangsa.asyncapi-preview.svg)

# AsyncAPI Preview

Preview AsyncAPI documents inside VSCode.

AsyncAPI Preview was simplified and reworked from scratch to use the latest [@asyncapi/asyncapi-react](https://github.com/asyncapi/asyncapi-react/tree/next), removing old dependencies on Express, socket.io and js-yaml with better startup performance and bundle size.

You can open AsyncAPI Preview from the editor title/context menu.

![AsyncAPI Preview](docs/asyncapi-editor-title-context.png)

## Automatic hot-reloading

Automatic hot-reloading on editor save, but currently, it doesn't reload when saving referenced external files.

### Credits

AsyncAPI Viewer utilizes the following open source projects:

- [@asyncapi/asyncapi-react](https://github.com/asyncapi/asyncapi-react/tree/next)

### Contributors

Ivan Garcia Sainz-Aja [ivangsa](https://github.com/ivangsa)
