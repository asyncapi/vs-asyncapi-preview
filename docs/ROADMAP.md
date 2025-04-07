# VS Code AsyncAPI Preview Extension Roadmap

This roadmap outlines the planned features and improvements for the VS Code AsyncAPI Preview extension. It's meant to guide development and provide visibility into the project's direction.

## Short-term Goals (1-3 months)

### Performance Improvements
- [ ] Optimize loading time for large AsyncAPI documents
- [ ] Improve webview panel rendering performance
- [ ] Minimize memory usage for multiple open documents

### Bug Fixes
- [ ] Fix issues with relative references in AsyncAPI documents
- [ ] Resolve inconsistencies between YAML and JSON parsing
- [ ] Address edge cases in Smart Paste functionality

### Documentation
- [ ] Complete contributor documentation
- [ ] Add more code comments for better maintainability
- [ ] Create troubleshooting guide

## Medium-term Goals (3-6 months)

### Enhanced Linting and Validation
- [ ] Add more predefined quick fixes for common issues
- [ ] Support custom rules via JavaScript/TypeScript functions
- [ ] Create a rule management UI for enabling/disabling rules

### UI Improvements
- [ ] Implement dark theme support for preview panels
- [ ] Add zoom controls for the visualizer
- [ ] Create a split view with preview and code side-by-side

### Testing
- [ ] Implement unit tests for core functionality
- [ ] Add integration tests for UI components
- [ ] Create testing guidelines for contributors

## Long-term Goals (6+ months)

### Advanced Features
- [ ] Support for AsyncAPI 3.0
- [ ] Code generation from AsyncAPI documents
- [ ] Two-way editing (update code from preview changes)
- [ ] Real-time collaboration support

### Community and Ecosystem
- [ ] Create extension API for other extensions to integrate with
- [ ] Develop plugin system for custom visualizations and renderers
- [ ] Integrate with other AsyncAPI tools in the ecosystem

### Stability and Sustainability
- [ ] Comprehensive error handling and recovery mechanisms
- [ ] Automated testing and deployment pipeline
- [ ] Long-term maintenance plan with multiple maintainers

## Continuous Improvements

These items are ongoing efforts that don't have a specific timeline:

- Keeping dependencies up to date
- Responding to community feedback and feature requests
- Supporting new VS Code features as they become available
- Performance optimizations
- Bug fixes and stability improvements

## How to Contribute

If you're interested in working on any of these items or have additional ideas:

1. Check the [open issues](https://github.com/asyncapi/vs-asyncapi-preview/issues) to see if it's already being discussed
2. Create a new issue if needed to discuss implementation details
3. Follow the [contribution guidelines](CONTRIBUTING_GUIDE.md) to submit your changes

This roadmap is a living document and will be updated as priorities shift and new ideas emerge. Your feedback is welcome! 